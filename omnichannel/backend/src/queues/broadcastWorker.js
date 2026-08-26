import { Worker } from 'bullmq';
import pool from '../config/db.js';
import IORedis from 'ioredis'; // Direct Import
import { redisConfig } from '../config/redis.js'; // Import Config
import * as waService from '../services/waGatewayService.js';
import MetaService from '../services/MetaService.js';
import * as RotatorService from '../services/RotatorService.js';
import * as ShortLinkService from '../services/ShortLinkService.js';
import crypto from 'crypto';
import { triggerAutoRecovery } from '../controllers/broadcastController.js';
import { sendBroadcastTelegramReport } from '../services/broadcastTelegramService.js';
import { sendBroadcastEmailReport } from '../services/broadcastEmailService.js';
import { normalizeWhatsappPhone as normalizePhone } from '../utils/phoneHelper.js';

// Helper: Get Conversation ID
const getConversationId = async (orgId, contactId, phone, isGroup, sessionId, assignedAgentId) => {
  // For 1-on-1, try by contact_id
  if (!isGroup && contactId) {
    let res = null;
    if (sessionId) {
      res = await pool.query('SELECT id FROM conversations WHERE contact_id = $1 AND organization_id = $2 AND whatsapp_session_id = $3', [contactId, orgId, sessionId]);
    }
    if (!res || res.rows.length === 0) {
      res = await pool.query('SELECT id FROM conversations WHERE contact_id = $1 AND organization_id = $2', [contactId, orgId]);
    }

    if (res && res.rows.length > 0) {
      const convId = res.rows[0].id;
      // Parse agent ID to integer and include organization_id in WHERE clause for safety
      const parsedAgentId = assignedAgentId ? parseInt(assignedAgentId) : null;
      if (parsedAgentId && !isNaN(parsedAgentId)) {
        await pool.query('UPDATE conversations SET assigned_to_agent_id = $1 WHERE id = $2 AND organization_id = $3', [parsedAgentId, convId, orgId]);
      }
      return convId;
    }

    // Create new conversation
    const parsedAgentId = assignedAgentId ? parseInt(assignedAgentId) : null;
    if (sessionId) {
      const ins = await pool.query(
        `INSERT INTO conversations (organization_id, contact_id, whatsapp_session_id, channel, status, created_at, assigned_to_agent_id)
               VALUES ($1, $2, $3, 'whatsapp', 'open', NOW(), $4) RETURNING id`,
        [orgId, contactId, sessionId, parsedAgentId || null]
      );
      return ins.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO conversations (organization_id, contact_id, status, created_at, assigned_to_agent_id)
               VALUES ($1, $2, 'open', NOW(), $3) RETURNING id`,
        [orgId, contactId, parsedAgentId || null]
      );
      return ins.rows[0].id;
    }
  }
  return null; // Group logic omitted for brevity/safety unless crucial
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Helper to enforce perâ€‘session rate limit using Redis (max 10 msgs per second per session)
const enforceRateLimit = async (sessionId, redisClient) => {
  const key = `rate:${sessionId}`;
  const count = await redisClient.incr(key);
  await redisClient.expire(key, 1); // 1â€‘second window
  // Limit to 2 messages per second per session for stricter safety
  if (count > 2) {
    // If we exceed the perâ€‘session limit, wait a longer random jitter (0.5â€‘1.5s) before proceeding
    await sleep(Math.floor(Math.random() * 1000) + 500);
  }
};

// ============================================================
// SMART ANTI-BAN SYSTEM - Fixed Rules (Cannot Be Bypassed)
// These are MINIMUM values - User can set HIGHER, not LOWER
// ============================================================
const ANTI_BAN = {
  // Base delay between messages (MINIMUM - user cannot set lower)
  BASE_DELAY_MIN: 60000,        // 60 seconds minimum
  BASE_DELAY_RANDOM_MIN: 10000,  // +10-30s random
  BASE_DELAY_RANDOM_MAX: 30000,

  // Typing simulation before send (human typing)
  TYPING_BEFORE_SEND_MIN: 30000, // 30-60 seconds typing before Enter
  TYPING_BEFORE_SEND_MAX: 60000,

  // Batch pause every 10 messages (4-7 minutes)
  BATCH_SIZE: 10,
  BATCH_PAUSE_MIN: 240000,      // 4 minutes minimum
  BATCH_PAUSE_MAX: 420000,      // 7 minutes maximum

  // Medium pause every 50 messages (15-20 minutes)
  MEDIUM_THRESHOLD: 50,
  MEDIUM_PAUSE_MIN: 900000,     // 15 minutes minimum
  MEDIUM_PAUSE_MAX: 1200000,    // 20 minutes maximum

  // Major pause every 100 messages (30-45 minutes)
  MAJOR_THRESHOLD: 100,
  MAJOR_PAUSE_MIN: 1800000,    // 30 minutes minimum
  MAJOR_PAUSE_MAX: 2700000,    // 45 minutes maximum

  // Daily max broadcast messages per campaign/day
  DAILY_LIMIT: 300,            // 300 messages max per day

  // Human behavior simulation
  TYPING_MIN: 2000,            // 2-4 seconds typing indicator
  TYPING_MAX: 4000,
  HUMAN_VARIANCE: 0.3,         // 30% chance of human-like variance
  BURST_CHANCE: 0.1,           // 10% chance of burst (fast sending)
  SLOW_CHANCE: 0.2,            // 20% chance of very slow

  // Safety limits
  PER_RECIPIENT_MIN: 2,        // messages per minute per recipient
  PER_SESSION_MAX: 2,           // messages per second per session
};

// Helper: Get random integer inclusive
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ============================================================
// ENFORCE MINIMUM ANTI-BAN DELAYS
// Ensures user cannot set values LOWER than system minimums
// ============================================================
const getEnforcedDelay = (envKey, minimum) => {
  const userValue = parseInt(process.env[envKey] || '0');
  // User can only set HIGHER than minimum, never lower
  return userValue > minimum ? userValue : minimum;
};

const getEnforcedBatchPause = () => {
  const userValue = parseInt(process.env.ANTI_BAN_BATCH_PAUSE || '0');
  return userValue > ANTI_BAN.BATCH_PAUSE_MIN ? userValue : ANTI_BAN.BATCH_PAUSE_MIN;
};

const getEnforcedMediumPause = () => {
  const userValue = parseInt(process.env.ANTI_BAN_MEDIUM_PAUSE || '0');
  return userValue > ANTI_BAN.MEDIUM_PAUSE_MIN ? userValue : ANTI_BAN.MEDIUM_PAUSE_MIN;
};

const getEnforcedMajorPause = () => {
  const userValue = parseInt(process.env.ANTI_BAN_MAJOR_PAUSE || '0');
  return userValue > ANTI_BAN.MAJOR_PAUSE_MIN ? userValue : ANTI_BAN.MAJOR_PAUSE_MIN;
};

// ============================================================
// HUMAN BEHAVIOR SIMULATION
// ============================================================
const simulateHumanBehavior = async () => {
  const rand = Math.random();

  // 10% chance of burst (fast sending - riskier but human-like)
  if (rand < ANTI_BAN.BURST_CHANCE) {
    console.log(`[HUMAN-SIM] Burst mode: sending faster`);
    return Math.floor(Math.random() * 10000) + 5000; // 5-15s
  }

  // 20% chance of very slow (reading/replying)
  if (rand < ANTI_BAN.BURST_CHANCE + ANTI_BAN.SLOW_CHANCE) {
    console.log(`[HUMAN-SIM] Slow mode: reading/replying`);
    return Math.floor(Math.random() * 30000) + 15000; // 15-45s extra
  }

  // 70% normal variance
  return Math.floor(Math.random() * 10000) - 5000; // -5s to +5s variance
};

// Helper for interruptible sleep that checks campaign cancellation/pause status every second
const interruptibleSleep = async (ms, broadcastId, redisClient) => {
  const checkInterval = 1000;
  let elapsed = 0;
  while (elapsed < ms) {
    if (redisClient && broadcastId) {
      const isCancelled = await redisClient.get(`broadcast_cancelled:${broadcastId}`);
      if (isCancelled) {
        throw new Error("CAMPAIGN_CANCELLED");
      }
      const isPaused = await redisClient.get(`broadcast_paused:${broadcastId}`);
      if (isPaused) {
        throw new Error("CAMPAIGN_PAUSED");
      }
    }
    if (elapsed > 0 && elapsed % 5000 === 0 && broadcastId) {
      const campCheck = await pool.query('SELECT status FROM broadcasts WHERE id = $1', [broadcastId]);
      if (campCheck.rows.length > 0) {
        if (campCheck.rows[0].status === 'cancelled') throw new Error("CAMPAIGN_CANCELLED");
        if (campCheck.rows[0].status === 'paused') throw new Error("CAMPAIGN_PAUSED");
      }
    }
    const sleepChunk = Math.min(checkInterval, ms - elapsed);
    await sleep(sleepChunk);
    elapsed += sleepChunk;
  }
};

// ============================================================
// ENFORCED ANTI-BAN DELAY LOGIC
// Called before EVERY message send
// messageNumber is already calculated before calling this function
// ============================================================
const awaitAntiBanDelay = async (recipientId, broadcastId, messageNumber, redisClient) => {
  console.log(`[ANTI-BAN] ========== Processing message #${messageNumber} ==========`);

  // 1. TYPING INDICATOR (short indicator to recipient)
  const typingDelay = getRandomInt(ANTI_BAN.TYPING_MIN, ANTI_BAN.TYPING_MAX);
  console.log(`[ANTI-BAN] Typing indicator: ${typingDelay}ms`);
  await interruptibleSleep(typingDelay, broadcastId, redisClient);

  // 2. PER-RECIPIENT RATE LIMIT (safety net)
  const minuteKey = `rate_min:${recipientId}`;
  const minuteCount = await redisClient.incr(minuteKey);
  await redisClient.expire(minuteKey, 60);
  if (minuteCount > ANTI_BAN.PER_RECIPIENT_MIN) {
    console.log(`[ANTI-BAN] Per-recipient rate exceeded (${minuteCount}/${ANTI_BAN.PER_RECIPIENT_MIN} per min). Cooling 60s...`);
    await interruptibleSleep(60000, broadcastId, redisClient);
  }

  // 3. BASE DELAY (ENFORCED MINIMUM - cannot be bypassed)
  const baseDelay = getEnforcedDelay('ANTI_BAN_BASE_DELAY', ANTI_BAN.BASE_DELAY_MIN);
  const randDelay = getRandomInt(ANTI_BAN.BASE_DELAY_RANDOM_MIN, ANTI_BAN.BASE_DELAY_RANDOM_MAX);
  const humanVariance = await simulateHumanBehavior();
  const totalBaseDelay = baseDelay + randDelay + humanVariance;
  console.log(`[ANTI-BAN] Base delay: ${totalBaseDelay}ms (base:${baseDelay} + rand:${randDelay} + human:${humanVariance})`);
  await interruptibleSleep(Math.max(0, totalBaseDelay), broadcastId, redisClient); // Ensure non-negative

  // 4. TYPING BEFORE SEND (30-60 seconds - human typing message)
  const typingBeforeSend = getRandomInt(ANTI_BAN.TYPING_BEFORE_SEND_MIN, ANTI_BAN.TYPING_BEFORE_SEND_MAX);
  console.log(`[ANTI-BAN] Human typing simulation: ${typingBeforeSend}ms (${typingBeforeSend / 1000}s)`);
  await interruptibleSleep(typingBeforeSend, broadcastId, redisClient);

  // 5. MAJOR PAUSE (every 100 messages) - Priority 1 (30-45 minutes)
  if (messageNumber > 0 && messageNumber % ANTI_BAN.MAJOR_THRESHOLD === 0) {
    const majorPause = getEnforcedMajorPause();
    const majorPauseActual = getRandomInt(ANTI_BAN.MAJOR_PAUSE_MIN, ANTI_BAN.MAJOR_PAUSE_MAX); // 30-45 min random
    console.log(`[ANTI-BAN] ========== MAJOR PAUSE at #${messageNumber} ==========`);
    console.log(`[ANTI-BAN] Long rest ${majorPauseActual / 1000}s (${Math.round(majorPauseActual / 60000)} mins)...`);
    await interruptibleSleep(majorPauseActual, broadcastId, redisClient);
  }
  // 6. MEDIUM PAUSE (every 50 messages, if not a multiple of 100) - Priority 2 (15-20 minutes)
  else if (messageNumber > 0 && messageNumber % ANTI_BAN.MEDIUM_THRESHOLD === 0) {
    const mediumPause = getEnforcedMediumPause();
    const mediumPauseActual = getRandomInt(ANTI_BAN.MEDIUM_PAUSE_MIN, ANTI_BAN.MEDIUM_PAUSE_MAX); // 15-20 min random
    console.log(`[ANTI-BAN] ========== MEDIUM PAUSE at #${messageNumber} ==========`);
    console.log(`[ANTI-BAN] Medium rest ${mediumPauseActual / 1000}s (${Math.round(mediumPauseActual / 60000)} mins)...`);
    await interruptibleSleep(mediumPauseActual, broadcastId, redisClient);
  }
  // 7. BATCH PAUSE (every 10 messages, if not a multiple of 50 or 100) - Priority 3 (4-7 minutes)
  else if (messageNumber > 0 && messageNumber % ANTI_BAN.BATCH_SIZE === 0) {
    const batchPause = getEnforcedBatchPause();
    const batchPauseActual = getRandomInt(ANTI_BAN.BATCH_PAUSE_MIN, ANTI_BAN.BATCH_PAUSE_MAX); // 4-7 min random
    console.log(`[ANTI-BAN] ========== BATCH PAUSE at #${messageNumber} ==========`);
    console.log(`[ANTI-BAN] Resting ${batchPauseActual / 1000}s (${Math.round(batchPauseActual / 60000)} mins)...`);
    await interruptibleSleep(batchPauseActual, broadcastId, redisClient);
  }

  console.log(`[ANTI-BAN] Ready to send message #${messageNumber}`);
};

// ============================================================
// MESSAGE PROCESSING HELPERS
// ============================================================
const processSpintax = (text) => {
  if (!text || typeof text !== 'string') return '';
  let prev = '';
  let result = text;
  const regex = /\{([^{}]+)\}|\[([^[\]]+)\]/g;
  let iterations = 0;
  while (prev !== result && iterations < 10) {
    prev = result;
    iterations++;
    result = result.replace(regex, (match, p1, p2) => {
      const choicesStr = p1 || p2;
      if (!choicesStr || !choicesStr.includes('|')) return match;
      const choices = choicesStr.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }
  return result;
};

// Updated to handle Custom Variables dynamically with safety checks
const replaceVariables = async (text, recipientName, orgId, broadcastId, contactId, customVars) => {
  if (!text || typeof text !== 'string') return '';

  let processed = text.replace(/\{name\}|\[name\]/gi, recipientName || 'Kak');

  // Handle Custom Vars (for Invoicing etc)
  if (customVars && typeof customVars === 'object') {
    for (const [key, value] of Object.entries(customVars)) {
      // Ensure value is a string or number, not object/null
      const safeValue = (value === null || value === undefined) ? '' : String(value);

      // Replace {key} or [key] with value
      const regex = new RegExp(`\\{${key}\\}|\\[${key}\\]`, 'gi');
      processed = processed.replace(regex, safeValue);
    }
  }

  // Handle Unsubscribe Link Generation
  if (processed.includes('{unsubscribe_url}')) {
    const baseUrl = process.env.APP_URL;

    if (contactId && baseUrl) {
      try {
        const slug = await ShortLinkService.createUnsubscribeLink(orgId, broadcastId, contactId);
        processed = processed.replace('{unsubscribe_url}', `${baseUrl}/u/${slug}`);
      } catch (e) {
        console.warn("Failed to generate unsubscribe link", e);
        processed = processed.replace('{unsubscribe_url}', '');
      }
    } else {
      processed = processed.replace('{unsubscribe_url}', '');
    }
  }

  return processed;
};

// ============================================================
// WORKER INITIALIZATION
// ============================================================
export const initBroadcastWorker = (io) => {
  console.log("[BroadcastWorker] === STARTING WORKER ===");

  try {
    console.log("[BroadcastWorker] Creating Redis connections...");

    // Create a dedicated connection for this worker to avoid blocking issues
    const workerConnection = new IORedis(redisConfig, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    const redisClient = new IORedis(redisConfig);

    // Event Listeners for Redis Connection
    workerConnection.on('error', (err) => console.error('[BroadcastWorker] Redis Worker Error:', err));
    workerConnection.on('connect', () => console.log('[BroadcastWorker] Redis Worker Connected'));
    workerConnection.on('ready', () => console.log('[BroadcastWorker] Redis Worker Ready'));
    redisClient.on('error', (err) => console.error('[BroadcastWorker] Redis Client Error:', err));
    redisClient.on('connect', () => console.log('[BroadcastWorker] Redis Client Connected'));

    console.log("[BroadcastWorker] Creating BullMQ Worker...");
    const worker = new Worker('broadcast-queue', async (job) => {
      // console.log(`[BroadcastWorker] Processing job ${job.id}`);

      // Extract customVars from job data
      const { broadcastId, recipientId, contactId, messageTemplate, mediaUrl, rotatorGroupId, deviceId, orgId, isGroup, customVars, showInHistory, assignedAgentId } = job.data;
      const APP_URL = process.env.APP_URL;

      try {
        console.log(`[BroadcastWorker] Processing job ${job.id} for broadcast ${broadcastId}, recipient ${recipientId}`);

        // 0. CHECK CAMPAIGN STATUS
        const campaignRes = await pool.query('SELECT status FROM broadcasts WHERE id = $1', [broadcastId]);
        if (campaignRes.rows.length === 0) {
          console.log(`[BroadcastWorker] Campaign ${broadcastId} not found, skipping`);
          return;
        }

        const status = campaignRes.rows[0].status;
        if (status === 'cancelled') {
          console.log(`[BroadcastWorker] Campaign ${broadcastId} is cancelled, skipping`);
          return;
        }
        if (status === 'paused') {
          console.log(`[BroadcastWorker] Campaign ${broadcastId} is paused, re-queuing`);
          throw new Error("CAMPAIGN_PAUSED");
        }

        // 1. Fetch Recipient Data (Include custom_vars from DB as fallback or merge)
        const recipientRes = await pool.query(
          "UPDATE broadcast_recipients SET status = $1 WHERE id = $2 AND status NOT IN ('cancelled', 'sent', 'failed') RETURNING phone_number, name, group_name, custom_vars",
          ['processing', recipientId]
        );

        if (recipientRes.rows.length === 0) {
          console.log(`[BroadcastWorker] Recipient ${recipientId} not found, skipping`);
          return;
        }
        console.log(`[BroadcastWorker] Recipient ${recipientId} status updated to processing`);
        const { phone_number, name, group_name, custom_vars: dbCustomVars } = recipientRes.rows[0];

        // Merge job vars with DB vars (job vars take precedence over DB vars)
        let parsedDbVars = {};
        if (dbCustomVars) {
          try {
            parsedDbVars = typeof dbCustomVars === 'string' ? JSON.parse(dbCustomVars) : dbCustomVars;
          } catch (e) {
            console.warn('[BroadcastWorker] Failed to parse dbCustomVars:', e);
          }
        }
        let parsedJobVars = {};
        if (customVars) {
          try {
            parsedJobVars = typeof customVars === 'string' ? JSON.parse(customVars) : customVars;
          } catch (e) {
            console.warn('[BroadcastWorker] Failed to parse customVars:', e);
          }
        }
        const finalCustomVars = { ...parsedDbVars, ...parsedJobVars };
        const displayName = isGroup ? (group_name || 'Everyone') : name;

        // 3. SELECT SESSION
        console.log(`[BroadcastWorker] Selecting session for recipient ${recipientId} (deviceId: ${deviceId}, rotatorGroupId: ${rotatorGroupId})`);
        let selectedSession = null;

        if (deviceId) {
          // console.log(`[BroadcastWorker] Using specific device ${deviceId}`);
          const devRes = await pool.query('SELECT id, session_id, name, type, access_token, phone_number_id, waba_id, organization_id FROM whatsapp_sessions WHERE id = $1', [deviceId]);
          if (devRes.rows.length === 0) throw new Error("Selected device not found");
          selectedSession = devRes.rows[0];
        } else if (rotatorGroupId) {
          selectedSession = await RotatorService.getBestSession(rotatorGroupId, orgId);
          // console.log(`[BroadcastWorker] Rotator selected session: ${selectedSession ? selectedSession.id : 'NONE'}`);

          if (!selectedSession) {
            console.warn(`[BroadcastWorker] No healthy sessions found for Rotator ${rotatorGroupId}. Re-queueing.`);
            // Re-queue job for later execution
            await job.moveToDelayed(Date.now() + 60000, job.token);
            return;
          }
        } else {
          throw new Error("No Device ID or Rotator Group ID provided for this broadcast job.");
        }

        const usedSessionId = selectedSession.id;

        // 4. EXECUTE SEND BASED ON TYPE
        try {
          // Ensure we respect perâ€‘session rate limit before sending any message
          await enforceRateLimit(selectedSession.session_id, redisClient);
          if (selectedSession.type === 'official') {
            if (isGroup) throw new Error("Group broadcast not supported on Official API yet.");

            // Add a small jitter before sending official template to mimic human pacing
            await sleep(Math.floor(Math.random() * 5000) + 3000); // 3â€‘8â€¯s delay

            let templateObj;
            try {
              templateObj = typeof messageTemplate === 'string' ? JSON.parse(messageTemplate) : messageTemplate;
            } catch (e) {
              // Fallback: If not JSON, treat as Body Text (should ideally use official template structure)
              // But Meta requires Template ID/Name. Assuming messageTemplate is the JSON structure for official.
              // If it failed parsing, it's likely raw text which fails on Official API broadcast unless using Session Message (24h window).
              // We assume Broadcasts MUST be templates for Official.
              throw new Error("Invalid Official Template Format. Must be JSON object.");
            }

            // Process Variables inside Component Parameters
            if (templateObj.components) {
              const componentPromises = templateObj.components.map(async (comp) => {
                if (comp.parameters) {
                  const paramPromises = comp.parameters.map(async (param) => {
                    if (param.type === 'text') {
                      // Perform replacement here too for Official API templates
                      const replacedText = await replaceVariables(param.text, displayName, orgId, broadcastId, contactId, finalCustomVars);
                      return { ...param, text: replacedText };
                    }
                    return param;
                  });
                  const newParams = await Promise.all(paramPromises);
                  return { ...comp, parameters: newParams };
                }
                return comp;
              });
              templateObj.components = await Promise.all(componentPromises);
            }

            const metaRes = await MetaService.sendMessage(selectedSession, phone_number, 'template', templateObj);

            // Official API Success Update
            const metaMsgId = metaRes?.messages?.[0]?.id || null;
            await pool.query(
              'UPDATE broadcast_recipients SET status = $1, sent_at = NOW(), used_session_id = $2, wa_message_id = $3 WHERE id = $4',
              ['sent', usedSessionId, metaMsgId, recipientId]
            );

            if (showInHistory && metaMsgId) {
              try {
                const convId = await getConversationId(orgId, contactId, phone_number, isGroup, usedSessionId, assignedAgentId);
                if (convId) {
                  const msgRes = await pool.query(
                    `INSERT INTO messages (organization_id, conversation_id, from_me, type, content, status, wa_message_id, created_at)
                             VALUES ($1, $2, true, 'text', $3, 'sent', $4, NOW()) RETURNING *`,
                    [orgId, convId, 'Template Broadcast', metaMsgId]
                  );
                  await pool.query('UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2', ['Template Broadcast', convId]);

                  if (msgRes.rows.length > 0) {
                    io.to(`org_${orgId}`).emit('new_message', {
                      conversationId: convId,
                      message: msgRes.rows[0]
                    });
                  }

                  if (assignedAgentId) {
                    const parsedAgentId = parseInt(assignedAgentId);
                    if (parsedAgentId && !isNaN(parsedAgentId)) {
                      io.to(`org_${orgId}`).emit('conversation_assigned', {
                        conversationId: convId,
                        assigned_to_agent_id: parsedAgentId
                      });
                    }
                  }
                }
              } catch (err) {
                console.error("[BroadcastWorker] History Insert Error Official:", err);
              }
            }

            return { status: 'sent', provider: 'official' };

          } else {
            // --- UNOFFICIAL GATEWAY ---

            // Validate content
            if (!messageTemplate && !mediaUrl) {
              throw new Error("Message content empty");
            }

            let finalMessage = "";
            if (messageTemplate) {
              try {
                finalMessage = await replaceVariables(messageTemplate, displayName, orgId, broadcastId, contactId, finalCustomVars);
                finalMessage = processSpintax(finalMessage);
              } catch (processingError) {
                console.error("[BroadcastWorker] Text Processing Error:", processingError);
                finalMessage = messageTemplate; // Fallback to raw if processing fails
              }
            }

            let publicMediaUrl = null;
            if (mediaUrl) {
              if (mediaUrl.startsWith('http')) {
                publicMediaUrl = mediaUrl;
              } else {
                if (APP_URL) {
                  const baseUrl = APP_URL.endsWith('/') ? APP_URL.slice(0, -1) : APP_URL;
                  const path = mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`;
                  publicMediaUrl = `${baseUrl}${path}`;
                }
              }
            }

            // --- HISTORY & ECHO --
            const msgType = publicMediaUrl ? 'image' : 'text'; // Simplified type assumption
            // Use simpler echo key without content hash to ensure webhook can match
            // The key is based on session + phone + unique broadcast marker
            const echoPhone = normalizePhone(phone_number);
            const broadcastMarker = `bc_${broadcastId}_${recipientId}`;
            const echoKey = `echo:${selectedSession.session_id}:${echoPhone}:${broadcastMarker}`;

            // Set Echo Key (Block Webhook) BEFORE sending to prevent race condition
            // We MUST block the webhook.
            await redisClient.set(echoKey, '1', 'EX', 120);
            
            // --- CHECK DAILY BROADCAST LIMIT (300 MSGS/DAY PER CAMPAIGN) ---
            const dateStr = new Date().toISOString().split('T')[0];
            const dailyKey = `daily_bc_counter:${broadcastId}:${dateStr}`;
            const todaySent = parseInt(await redisClient.get(dailyKey) || '0');

            if (todaySent >= ANTI_BAN.DAILY_LIMIT) {
              console.log(`[BROADCAST] Daily limit reached (${todaySent}/${ANTI_BAN.DAILY_LIMIT}) for broadcast ${broadcastId} on ${dateStr}. Deferring job to tomorrow 08:00 AM.`);
              
              // Revert recipient status from 'processing' to 'pending' so it will execute tomorrow
              await pool.query('UPDATE broadcast_recipients SET status = $1 WHERE id = $2', ['pending', recipientId]);

              // Calculate delay until tomorrow 08:00 AM local time
              const now = new Date();
              const tomorrow = new Date(now);
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(8, 0, 0, 0); // 08:00 AM tomorrow
              let delayMs = tomorrow.getTime() - now.getTime();
              if (delayMs <= 0) delayMs = 12 * 3600 * 1000; // Fallback 12h if calculation anomaly

              console.log(`[BROADCAST] Moving recipient ${recipientId} to delayed queue (+${Math.round(delayMs / 60000)} mins).`);
              await job.moveToDelayed(Date.now() + delayMs, job.token);
              return;
            }

            let sendResult;
            // SMART ANTI-BAN: Get current message count BEFORE incrementing, then apply delays
            const globalKey = `global_counter:${broadcastId}`;
            const currentCount = parseInt(await redisClient.get(globalKey) || '0');
            const messageNumber = currentCount + 1; // This will be the message number
            console.log(`[BROADCAST] Sending message #${messageNumber} (Today: ${todaySent + 1}/${ANTI_BAN.DAILY_LIMIT}) to ${phone_number}`);
            await awaitAntiBanDelay(recipientId, broadcastId, messageNumber, redisClient);

            // Pre-send check: ensure campaign or recipient was not cancelled or paused during anti-ban delay
            const preSendCheck = await pool.query(
              'SELECT b.status as campaign_status, br.status as recipient_status FROM broadcasts b JOIN broadcast_recipients br ON br.broadcast_id = b.id WHERE b.id = $1 AND br.id = $2',
              [broadcastId, recipientId]
            );

            if (preSendCheck.rows.length === 0 || preSendCheck.rows[0].campaign_status === 'cancelled' || preSendCheck.rows[0].recipient_status === 'cancelled') {
              console.log(`[BroadcastWorker] Campaign ${broadcastId} or recipient ${recipientId} cancelled right before sending. Aborting.`);
              return;
            }

            if (preSendCheck.rows[0].campaign_status === 'paused') {
              console.log(`[BroadcastWorker] Campaign ${broadcastId} paused right before sending. Re-queueing recipient.`);
              await pool.query("UPDATE broadcast_recipients SET status = 'queued' WHERE id = $1 AND status = 'processing'", [recipientId]);
              throw new Error("CAMPAIGN_PAUSED");
            }

            if (publicMediaUrl) {
              sendResult = await waService.sendMedia(selectedSession.session_id, phone_number, publicMediaUrl, finalMessage);
            } else {
              sendResult = await waService.sendText(selectedSession.session_id, phone_number, finalMessage);
            }

            const messageId = sendResult?.data?.key?.id || sendResult?.data?.id || sendResult?.key?.id || `BC-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

            if (showInHistory) {
              try {
                // If showing in history, we insert MANUALLY.
                const convId = await getConversationId(orgId, contactId, phone_number, isGroup, usedSessionId, assignedAgentId);

                if (convId) {
                  const msgRes = await pool.query(
                    `INSERT INTO messages (organization_id, conversation_id, from_me, type, content, status, wa_message_id, created_at)
                             VALUES ($1, $2, true, $3, $4, 'sent', $5, NOW()) RETURNING *`,
                    [orgId, convId, msgType, finalMessage, messageId]
                  );
                  // Update conversation last message
                  await pool.query('UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2', [finalMessage, convId]);

                  if (msgRes.rows.length > 0) {
                    io.to(`org_${orgId}`).emit('new_message', {
                      conversationId: convId,
                      message: msgRes.rows[0]
                    });
                  }

                  if (assignedAgentId) {
                    const parsedAgentId = parseInt(assignedAgentId);
                    if (parsedAgentId && !isNaN(parsedAgentId)) {
                      io.to(`org_${orgId}`).emit('conversation_assigned', {
                        conversationId: convId,
                        assigned_to_agent_id: parsedAgentId
                      });
                    }
                  }
                }
              } catch (err) {
                console.error("[BroadcastWorker] History Insert Error:", err);
              }
            }
            // ---------------------

            // 5. Success Update (Unofficial API)
            await pool.query(
              'UPDATE broadcast_recipients SET status = $1, sent_at = NOW(), used_session_id = $2, wa_message_id = $3 WHERE id = $4',
              ['sent', usedSessionId, messageId, recipientId]
            );

            // INCREMENT DAILY & GLOBAL COUNTERS after successful send
            await redisClient.incr(dailyKey);
            await redisClient.expire(dailyKey, 172800); // Expire after 48h
            await redisClient.incr(`global_counter:${broadcastId}`);
            await redisClient.expire(`global_counter:${broadcastId}`, 86400);
          }

          // UPDATE CONTACT WITH LAST BROADCAST FOR TRACKING
          // Store both broadcast ID and assigned agent ID for reply tracking
          if (contactId && broadcastId) {
            try {
              const parsedAgentId = assignedAgentId ? parseInt(assignedAgentId) : null;
              if (parsedAgentId && !isNaN(parsedAgentId)) {
                // Store both broadcast ID and assigned agent ID
                await pool.query(
                  'UPDATE contacts SET last_broadcast_id = $1, last_broadcast_at = NOW(), last_broadcast_assigned_agent_id = $2 WHERE id = $3',
                  [broadcastId, parsedAgentId, contactId]
                );
              } else {
                // No agent assigned, just track the broadcast
                await pool.query(
                  'UPDATE contacts SET last_broadcast_id = $1, last_broadcast_at = NOW() WHERE id = $2',
                  [broadcastId, contactId]
                );
              }
            } catch (e) {
              console.error('[BroadcastWorker] Failed to update contact last_broadcast fields', e);
            }
          }

          // SMART ANTI-BAN: Clear failure counter on success
          await redisClient.del(`broadcast_fail:${broadcastId}`);

          io.to(`org_${orgId}`).emit('broadcast_progress', {
            broadcastId, recipientId, status: 'sent'
          });

        } catch (sendErr) {
          // If WhatsApp returns a 429 (Too Many Requests), apply exponential backâ€‘off and reâ€‘queue the job
          if (sendErr?.response?.status === 429) {
            const retryCount = job.attemptsMade || 0;
            // Increase backâ€‘off factor for higher safety (max ~60â€¯s)
            const backoff = Math.min(Math.pow(2, Math.min(retryCount, 5)) * 2000, 60000); // 2â€‘60â€¯s
            console.warn(`[BroadcastWorker] 429 received, retry #${retryCount + 1} after ${backoff}ms`);
            await job.moveToDelayed(Date.now() + backoff, job.token);
            return; // Do not mark as failed, will be retried
          }

          if (rotatorGroupId && !deviceId) {
            await RotatorService.handleError(selectedSession.id);
          }

          // SMART ANTI-BAN: Auto Pause on 5 consecutive failures
          const failKey = `broadcast_fail:${broadcastId}`;
          const fails = await redisClient.incr(failKey);
          await redisClient.expire(failKey, 3600); // 1 hour

          if (fails >= 5) {
            console.warn(`[SMART ANTI-BAN] Campaign ${broadcastId} reached ${fails} failures. Auto-pausing.`);

            try {
              const campRes = await pool.query('SELECT delay_settings FROM broadcasts WHERE id = $1', [broadcastId]);
              let delaySettings = {};
              if (campRes.rows.length > 0 && campRes.rows[0].delay_settings) {
                if (typeof campRes.rows[0].delay_settings === 'string') {
                  try { delaySettings = JSON.parse(campRes.rows[0].delay_settings); } catch (e) { }
                } else {
                  delaySettings = campRes.rows[0].delay_settings;
                }
              }
              delaySettings.pausedAt = Date.now();
              await pool.query("UPDATE broadcasts SET status = 'paused', delay_settings = $1 WHERE id = $2", [JSON.stringify(delaySettings), broadcastId]);
            } catch (e) {
              await pool.query("UPDATE broadcasts SET status = 'paused' WHERE id = $1", [broadcastId]);
            }

            io.to(`org_${orgId}`).emit('notification', {
              type: 'error',
              title: 'Broadcast Auto-Paused',
              message: 'Terdeteksi banyak pesan gagal terkirim (indikasi pemblokiran nomor). Kampanye dihentikan sementara secara otomatis.'
            });

            // Trigger Telegram & Email Alerts
            sendBroadcastTelegramReport({
              broadcastId,
              eventType: 'paused',
              reason: 'Terdeteksi 5 pesan gagal terkirim beruntun (Proteksi Circuit Breaker Anti-Ban).',
              orgId
            }).catch(e => console.error('[BroadcastWorker Telegram Pause Alert Error]', e.message));

            sendBroadcastEmailReport({
              broadcastId,
              eventType: 'paused',
              reason: 'Terdeteksi 5 pesan gagal terkirim beruntun (Proteksi Circuit Breaker Anti-Ban).',
              orgId
            }).catch(e => console.error('[BroadcastWorker Email Pause Alert Error]', e.message));
          }

          throw sendErr;
        }

      } catch (error) {
        if (error.message === "CAMPAIGN_CANCELLED") {
          console.log(`[BroadcastWorker] Job for recipient ${recipientId} aborted clean because campaign ${broadcastId} was cancelled.`);
          return;
        }

        if (error.message === "CAMPAIGN_PAUSED") {
          await pool.query("UPDATE broadcast_recipients SET status = 'queued' WHERE id = $1 AND status = 'processing'", [recipientId]);
          throw error;
        }

        // Auto-heal stuck "connected" status if gateway reports session is dead
        if (error.message.includes("Sesi tidak aktif")) {
          try {
            await pool.query("UPDATE whatsapp_sessions SET status = 'disconnected', connected_at = NULL WHERE id = $1", [selectedSession?.id]);
          } catch (e) {
            console.error("[BroadcastWorker] Failed to sync disconnected status:", e.message);
          }
        }

        console.error(`[BroadcastWorker] Job ${job.id} failed:`, error.message);

        await pool.query(
          'UPDATE broadcast_recipients SET status = $1, error_log = $2 WHERE id = $3',
          ['failed', error.message.substring(0, 255), recipientId]
        );

        io.to(`org_${orgId}`).emit('broadcast_progress', {
          broadcastId, recipientId, status: 'failed'
        });
      }
    }, {
      connection: workerConnection, // Use dedicated connection
      concurrency: 1, // Serial processing: only 1 message at a time for maximum antiâ€‘ban safety
      // Very low limiter; actual pacing handled by antiâ€‘ban logic
      limiter: { max: 1, duration: 1000 }
    });

    worker.on('active', (job) => {
      console.log(`[BroadcastWorker] Job ${job.id} is now active (processing)`);
    });

    worker.on('error', (err) => {
      console.error('[BroadcastWorker] Worker error:', err);
    });

    worker.on('failed', (job, err) => {
      console.error(`[BroadcastWorker] Job ${job?.id} failed:`, err.message);
    });

    worker.on('completed', async (job) => {
      try {
        const orgId = job.data.orgId;
        const broadcastId = job.data.broadcastId;

        const currentQRes = await pool.query(`
              SELECT COUNT(*) as count FROM broadcast_recipients
              WHERE broadcast_id = $1 AND status IN ('queued', 'processing')
          `, [broadcastId]);

        const currentQueued = parseInt(currentQRes.rows[0].count) || 0;

        if (currentQueued === 0) {
          const updateRes = await pool.query(
            "UPDATE broadcasts SET status = 'completed' WHERE id = $1 AND status NOT IN ('cancelled', 'paused') RETURNING id",
            [broadcastId]
          );
          if (updateRes.rows.length > 0) {
            sendBroadcastTelegramReport({
              broadcastId,
              eventType: 'completed',
              orgId
            }).catch(err => console.error("[BroadcastWorker Telegram Complete Report Error]", err.message));

            sendBroadcastEmailReport({
              broadcastId,
              eventType: 'completed',
              orgId
            }).catch(err => console.error("[BroadcastWorker Email Complete Report Error]", err.message));
          }
          // Trigger global recovery when a campaign finishes
          triggerAutoRecovery(orgId).catch(err => console.error("[AutoRecovery Worker] Failed:", err));
        }
      } catch (err) {
        console.error("[BroadcastWorker Completed Event Error]", err);
      }
    });

    console.log("Smart Broadcast Worker Initialized");

  } catch (err) {
    console.error("[BroadcastWorker] FATAL ERROR during initialization:", err);
  }
};
