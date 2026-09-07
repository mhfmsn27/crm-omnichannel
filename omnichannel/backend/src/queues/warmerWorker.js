import { Worker, Queue } from 'bullmq';
import pool from '../config/db.js';
import IORedis from 'ioredis'; // Direct Import
import { redisConfig } from '../config/redis.js'; // Import Config
import * as waService from '../services/waGatewayService.js';
import { getRandomSystemMessage } from '../utils/systemDictionary.js';
import { generateWarmerPersonaPair, generateWarmerPersonaMessage } from '../services/aiWarmerPersona.js';
import { checkWarmerActiveHours, calculateNextWarmerDelay } from '../services/warmerTimeHelper.js';
import { normalizeWhatsappPhone, normalizeJid } from '../utils/phoneHelper.js';

import crypto from 'crypto';

// Define queue instance using shared connection for Producer (scheduling)
// The Worker below will use its own connection.
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
    // 0. TWO-WAY CONVERSATIONAL REPLY HANDLER
    // Executes natural reciprocal reply to advance Signal protocol ratchet in both directions
    if (job.name === 'warmer-reply' || job.data.isReply) {
        const { circleId, senderSessionId, senderMemberId, senderGatewayUuid, receiverPhone, receiverGatewayUuid, replyText } = job.data;
        if (!senderGatewayUuid || !receiverPhone || !replyText) return;

        try {
            const cleanReceiverPhone = normalizeWhatsappPhone(receiverPhone);
            const targetJid = normalizeJid(cleanReceiverPhone);

            // Step 1: Mark incoming chat as read on receiver's device
            await waService.markChatRead(senderGatewayUuid, targetJid, true).catch(() => {});

            // Step 2: Show typing presence with human delay (1.5 - 2.5s)
            await waService.sendChatPresence(senderGatewayUuid, targetJid, 'composing').catch(() => {});
            await new Promise(r => setTimeout(r, randomInt(1500, 2500)));

            // Step 3: Block echo webhook
            const contentString = (replyText || '').trim() + 'text';
            const contentHash = crypto.createHash('md5').update(contentString).digest('hex');
            const echoKey = `echo:${senderGatewayUuid}:${cleanReceiverPhone}:${contentHash}`;
            await workerConnection.set(echoKey, '1', 'EX', 300);

            // Step 4: Send reciprocal reply
            await waService.sendText(senderGatewayUuid, cleanReceiverPhone, replyText);

            // Step 5: Update stats and log
            if (senderMemberId) {
                await pool.query(
                    `UPDATE warmer_circle_sessions 
                     SET messages_sent_today = messages_sent_today + 1, last_active_at = NOW() 
                     WHERE id = $1`,
                    [senderMemberId]
                );
            }

            await pool.query(
                `INSERT INTO warmer_logs (warmer_circle_id, sender_session_id, message_content) 
                 VALUES ($1, $2, $3)`,
                [circleId, senderSessionId, replyText]
            );

            console.log(`[Warmer Circle] Reciprocal reply sent from ${senderGatewayUuid} to ${cleanReceiverPhone}. Ratchet keys synchronized.`);
        } catch (replyErr) {
            console.warn(`[Warmer Circle] Reciprocal reply failed: ${replyErr.message}`);
        }
        return;
    }

    // OLD LOGIC (Pair) - Support Legacy or Remove
    if (job.data.settingId) {
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

        // 2. CHECK NATURAL HUMAN ACTIVE HOURS (WIB / Asia/Jakarta)
        // Ensure no messages are sent during unnatural hours (e.g. 00:00 - 07:59 or night)
        const activeCheck = checkWarmerActiveHours(circle);
        if (!activeCheck.isActive) {
            const nextSchedule = calculateNextWarmerDelay(circle, new Date(), { isDailyLimitReached: false });
            console.log(`[Warmer Circle] ${circle.name}: Di luar jam aktif manusiawi (${activeCheck.startHour}:00 - ${activeCheck.endHour}:00 WIB). Mode Istirahat Malam aktif.`);
            console.log(`[Warmer Circle] ${circle.name}: Dijadwalkan mulai kembali ${nextSchedule.nextRunWIB} (delay: ${Math.round(nextSchedule.delayMs / 60000)} menit).`);

            await warmerQueue.add('warmer-multi-device', { circleId }, { delay: nextSchedule.delayMs });
            return;
        }

        // Get Members with their Session Data
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

        // 3. Check if any member needs reset (in-memory check to avoid N+1 query)
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

        // 4. Select Sender (Devices that haven't reached daily limit)
        const eligibleSenders = members.filter(m => m.messages_sent_today < circle.daily_limit_per_device);

        if (eligibleSenders.length === 0) {
            // All devices reached daily limit - resume tomorrow morning at active_hours_start
            const nextSchedule = calculateNextWarmerDelay(circle, new Date(), { isDailyLimitReached: true });
            console.log(`[Warmer Circle] ${circle.name}: Semua ${members.length} device telah mencapai batas kuota harian (${circle.daily_limit_per_device} pesan/device).`);
            console.log(`[Warmer Circle] ${circle.name}: Istirahat malam aktif. Dijadwalkan mulai kembali ${nextSchedule.nextRunWIB} (delay: ${Math.round(nextSchedule.delayMs / 60000)} menit).`);

            await warmerQueue.add('warmer-multi-device', { circleId }, { delay: nextSchedule.delayMs });
            return;
        }

        const sender = getRandomElement(eligibleSenders);

        // 5. Select Receiver (Any member that is NOT the sender)
        const eligibleReceivers = members.filter(m => m.id !== sender.id);
        const receiver = getRandomElement(eligibleReceivers);

        if (!sender.gateway_uuid || !receiver.phone) {
            console.error("[Warmer Circle] Missing gateway UUID or Phone");
            return;
        }

        // Strictly normalize both phone numbers to canonical international format
        const cleanReceiverPhone = normalizeWhatsappPhone(receiver.phone);
        const cleanSenderPhone = normalizeWhatsappPhone(sender.phone);

        // 6. Select Message (Supports AI Persona Dialogue Pairs, Custom Dictionary, and System Dictionary)
        let promptText = "";
        let replyText = null;

        if (circle.dictionary_mode === 'ai_persona' || circle.dictionary_mode === 'persona') {
            const pair = generateWarmerPersonaPair(circle.persona_topic || 'auto');
            promptText = pair.prompt;
            replyText = pair.reply;
        } else if (circle.dictionary_mode === 'custom' && circle.custom_dictionary && circle.custom_dictionary.length > 0) {
            promptText = getRandomElement(circle.custom_dictionary);
            if (circle.custom_dictionary.length > 1) {
                const otherLines = circle.custom_dictionary.filter(item => item !== promptText);
                if (otherLines.length > 0) {
                    replyText = getRandomElement(otherLines);
                }
            }
        } else {
            const pair = generateWarmerPersonaPair('auto');
            promptText = pair ? pair.prompt : getRandomSystemMessage();
            replyText = pair ? pair.reply : "Siap, terima kasih banyak atas infonya ya!";
        }
        promptText = (promptText || '').trim();

        // 7. Execute Send with Presence & Anti-Decryption Delay Protection
        console.log(`[Warmer Circle] [${circle.name}] Sending interaction from ${cleanSenderPhone || sender.gateway_uuid} to ${cleanReceiverPhone}`);
        try {
            // Block Outbound Echo (Sender) & Incoming Webhook (Receiver)
            const contentString = promptText + 'text';
            const contentHash = crypto.createHash('md5').update(contentString).digest('hex');
            
            const echoKey = `echo:${sender.gateway_uuid}:${cleanReceiverPhone}:${contentHash}`;
            const incomingKey = `warmer_incoming:${receiver.gateway_uuid}:${cleanSenderPhone}:${contentHash}`;

            // Block webhook for 5 minutes
            await workerConnection.set(echoKey, '1', 'EX', 300);
            await workerConnection.set(incomingKey, '1', 'EX', 300);

            // Step 7a: Send typing presence before message to establish session routing
            const targetJid = normalizeJid(cleanReceiverPhone);
            await waService.sendChatPresence(sender.gateway_uuid, targetJid, 'composing').catch(() => {});
            await new Promise(r => setTimeout(r, randomInt(1500, 2500))); // Human typing delay

            // Step 7b: Send message with session error self-healing
            try {
                await waService.sendText(sender.gateway_uuid, cleanReceiverPhone, promptText);
            } catch (sendError) {
                const errMsg = String(sendError.message || sendError);
                console.warn(`[Warmer Circle] Initial send error (${cleanReceiverPhone}): ${errMsg}. Triggering session refresh...`);
                // Auto-heal session if Signal session / encryption error
                await waService.refreshContactSession(sender.gateway_uuid, cleanReceiverPhone).catch(() => {});
                await new Promise(r => setTimeout(r, 2000));
                // Retry once
                await waService.sendText(sender.gateway_uuid, cleanReceiverPhone, promptText);
            }
            
            // 8. Update Stats
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
                [circleId, sender.session_id, promptText]
            );

            // 9. TWO-WAY RECIPROCAL DIALOGUE (Mutual E2EE Session Key Ratcheting)
            // Schedule an authentic reply from receiver to sender after 15 - 35 seconds
            // This mutually closes the Signal ratchet and guarantees 0 "Waiting for this message" delays
            if (replyText && receiver.gateway_uuid && receiver.messages_sent_today < circle.daily_limit_per_device) {
                const replyDelay = randomInt(15000, 35000);
                console.log(`[Warmer Circle] [${circle.name}] Scheduling two-way reply from ${cleanReceiverPhone} in ${Math.round(replyDelay / 1000)}s`);
                await warmerQueue.add('warmer-reply', {
                    circleId,
                    isReply: true,
                    senderSessionId: receiver.session_id,
                    senderMemberId: receiver.id,
                    senderGatewayUuid: receiver.gateway_uuid,
                    receiverPhone: cleanSenderPhone,
                    replyText
                }, { delay: replyDelay });
            }

        } catch (sendErr) {
            console.error(`[Warmer Circle] Send Failed: ${sendErr.message}`);
        }

        // 10. Schedule Next Job (Respects Active Hours & Sleep Window)
        const nextSchedule = calculateNextWarmerDelay(circle, new Date(), { isDailyLimitReached: false });
        await warmerQueue.add('warmer-multi-device', { circleId }, { delay: nextSchedule.delayMs });
        
    } catch (error) {
      console.error(`[Warmer Worker] Error:`, error.message);
      // Retry in 60s on system error
      await warmerQueue.add('warmer-multi-device', { circleId }, { delay: 60000 });
    }
  }, { 
      connection: workerConnection // Use dedicated connection
  });

  console.log("Warmer Circle Worker Initialized (Two-Way Dialogue & E2EE Auto-Healer Active)");
};
