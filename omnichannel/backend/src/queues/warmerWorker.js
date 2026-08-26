import { Worker, Queue } from 'bullmq';
import pool from '../config/db.js';
import IORedis from 'ioredis'; // Direct Import
import { redisConfig } from '../config/redis.js'; // Import Config
import * as waService from '../services/waGatewayService.js';
import { getRandomSystemMessage } from '../utils/systemDictionary.js';
import { generateWarmerPersonaMessage } from '../services/aiWarmerPersona.js';

import crypto from 'crypto';

// Define queue instance using shared connection for Producer (scheduling)
// The Worker below will use its own connection.
// NOTE: To fix the import in controller, we might need to ensure controller uses the default export from redis.js which is a connection instance.
// But here we need `Queue` which also needs a connection.
import defaultRedisConnection from '../config/redis.js';
const warmerQueue = new Queue('warmer-queue', { connection: defaultRedisConnection });

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export const initWarmerWorker = (io) => {
  // Create dedicated connection for Worker
  const workerConnection = new IORedis(redisConfig, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
  });

  const worker = new Worker('warmer-queue', async (job) => {
    // OLD LOGIC (Pair) - Support Legacy or Remove
    if (job.data.settingId) {
        // Legacy logic removed for brevity, assuming migration to Circles
        return;
    }

    // NEW LOGIC (Circle)
    const { circleId } = job.data;

    try {
        // 1. Load Circle & Members
        const circleRes = await pool.query('SELECT * FROM warmer_circles WHERE id = $1', [circleId]);
        if (circleRes.rows.length === 0) return;
        const circle = circleRes.rows[0];

        if (!circle.is_active) return; // Stop if deactivated

        // Get Members with their Session Data
        // FIX: Allow devices that are not strictly 'connected' string but valid
        const membersRes = await pool.query(`
            SELECT wcs.*, ws.whatsapp_number as phone, ws.session_id as gateway_uuid, ws.status as device_status
            FROM warmer_circle_sessions wcs
            JOIN whatsapp_sessions ws ON wcs.session_id = ws.id
            WHERE wcs.warmer_circle_id = $1
            AND ws.whatsapp_number IS NOT NULL
            AND ws.status != 'disconnected'
        `, [circleId]);

        const members = membersRes.rows;

        if (members.length < 2) {
            console.log(`[Warmer Circle] ${circle.name} has less than 2 connected devices. Pausing.`);
            return; // Don't reschedule - circle needs reactivation
        }

        // 2. Check if any member needs reset (in-memory check to avoid N+1 query)
        const now = new Date();
        const membersToReset = [];

        for (const member of members) {
            let needsReset = false;
            if (!member.last_reset_at) {
                needsReset = true;
            } else {
                const lastReset = new Date(member.last_reset_at);
                const timeDiff = now.getTime() - lastReset.getTime();
                if (timeDiff > 24 * 60 * 60 * 1000) {
                    needsReset = true;
                }
            }

            if (needsReset) {
                membersToReset.push(member.id);
                member.messages_sent_today = 0;
            }
        }

        if (membersToReset.length > 0) {
            console.log(`[Warmer Circle] ${membersToReset.length} devices need counter reset. Resetting in bulk...`);
            await pool.query(
                'UPDATE warmer_circle_sessions SET messages_sent_today = 0, last_reset_at = NOW() WHERE id = ANY($1::int[])',
                [membersToReset]
            );
        }

        // 3. Select Sender
        // Filter those who haven't reached daily limit
        const eligibleSenders = members.filter(m => m.messages_sent_today < circle.daily_limit_per_device);

        if (eligibleSenders.length === 0) {
            // All devices reached daily limit - this is normal end-of-day state
            console.log(`[Warmer Circle] ${circle.name}: All devices reached daily limit (${circle.daily_limit_per_device}). Pausing until midnight reset.`);

            // Calculate delay until midnight (00:00)
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const msUntilMidnight = midnight.getTime() - now.getTime();

            // Add buffer of 1 minute after midnight for scheduler to run
            const delayUntilResume = msUntilMidnight + 60000;

            console.log(`[Warmer Circle] ${circle.name}: Next resume in ${Math.round(delayUntilResume / 60000)} minutes (at midnight)`);
            await warmerQueue.add('warmer-multi-device', { circleId }, { delay: delayUntilResume });
            return;
        }

        const sender = getRandomElement(eligibleSenders);

        // 3. Select Receiver
        // Any member that is NOT the sender
        const eligibleReceivers = members.filter(m => m.id !== sender.id);
        const receiver = getRandomElement(eligibleReceivers);

        if (!sender.gateway_uuid || !receiver.phone) {
            console.error("[Warmer Circle] Missing gateway UUID or Phone");
            return;
        }

        // 4. Select Message (Supports AI Persona, Custom Dictionary, and System Dictionary)
        let messageText = "";
        if (circle.dictionary_mode === 'ai_persona' || circle.dictionary_mode === 'persona') {
            messageText = generateWarmerPersonaMessage(circle.persona_topic || 'auto');
        } else if (circle.dictionary_mode === 'custom' && circle.custom_dictionary && circle.custom_dictionary.length > 0) {
            messageText = getRandomElement(circle.custom_dictionary);
        } else {
            // Default to natural AI Persona or system dictionary
            messageText = generateWarmerPersonaMessage('auto') || getRandomSystemMessage();
        }
        messageText = (messageText || '').trim(); // Ensure text is trimmed for exact hash matching

        // 5. Execute Send
        console.log(`[Warmer Circle] Sending from ${sender.gateway_uuid} to ${receiver.phone}`);
        try {
            // Block Outbound Echo (Sender) & Incoming Webhook (Receiver)
            const contentString = (messageText || '').trim() + 'text';
            
            // Note: crypto is already imported at the top of the file
            const contentHash = crypto.createHash('md5').update(contentString).digest('hex');
            
            // Helper to normalize phone
            const normalizePhoneLocal = (phone) => {
                let p = String(phone).replace(/[^0-9]/g, '');
                if (p.startsWith('0')) p = '62' + p.slice(1);
                else if (p.startsWith('8')) p = '62' + p;
                return p;
            };

            const echoPhone = normalizePhoneLocal(receiver.phone);
            const echoKey = `echo:${sender.gateway_uuid}:${echoPhone}:${contentHash}`;
            
            const receiverEchoPhone = normalizePhoneLocal(sender.phone);
            const incomingKey = `warmer_incoming:${receiver.gateway_uuid}:${receiverEchoPhone}:${contentHash}`;

            // Block webhook for 5 minutes
            await workerConnection.set(echoKey, '1', 'EX', 300);
            await workerConnection.set(incomingKey, '1', 'EX', 300);

            await waService.sendText(sender.gateway_uuid, receiver.phone, messageText);
            
            // 6. Update Stats
            await pool.query(
                `UPDATE warmer_circle_sessions 
                 SET messages_sent_today = messages_sent_today + 1, last_active_at = NOW() 
                 WHERE id = $1`,
                [sender.id]
            );
            
            // Log
            await pool.query(
                `INSERT INTO warmer_logs (warmer_circle_id, sender_session_id, message_content) 
                 VALUES ($1, $2, $3)`,
                [circleId, sender.session_id, messageText]
            );

        } catch (sendErr) {
            console.error(`[Warmer Circle] Send Failed: ${sendErr.message}`);
        }

        // 7. Schedule Next Job
        const delay = randomInt(circle.interval_min, circle.interval_max) * 1000;
        await warmerQueue.add('warmer-multi-device', { circleId }, { delay });
        
    } catch (error) {
      console.error(`[Warmer Worker] Error:`, error.message);
      // Retry later on system error
      await warmerQueue.add('warmer-multi-device', { circleId }, { delay: 60000 });
    }
  }, { 
      connection: workerConnection // Use dedicated connection
  });

  console.log("Warmer Circle Worker Initialized");
};
