/**
 * Stuck Message Monitor
 * Automatically retries messages that are stuck in "pending" status
 * Addresses the "Waiting for this message" issue on iOS/WhatsApp
 * Handles BOTH agent messages AND chatbot/auto-reply messages
 *
 * CRON: Runs every 2 minutes to check for stuck messages
 */

import cron from 'node-cron';
import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import MetaService from '../services/MetaService.js';

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes - after this, consider message stuck
const MAX_AUTO_RETRIES = 2; // Max auto-retries per message
const BATCH_SIZE = 50; // Process in batches to avoid overwhelming the system
const ECHO_GRACE_PERIOD_MS = 60 * 60 * 1000; // 1 hour - messages pending longer than this are likely echoes (WA Web messages), not real stuck messages

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Normalize phone number for WhatsApp
 */
const normalizePhone = (phone) => {
  const str = String(phone);
  if (str.endsWith('@g.us')) return str;

  let p = str.replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  else if (p.startsWith('8') && p.length <= 12) p = '62' + p;
  return p;
};

/**
 * Cleanup old echoes - mark messages as 'sent' if they've been pending > 1 hour
 * These are likely echoes from WA Web that weren't sent by CRM
 */
const cleanupOldEchoes = async () => {
  try {
    const echoGraceThreshold = new Date(Date.now() - ECHO_GRACE_PERIOD_MS);

    // Find old pending messages that are likely echoes (WA Web messages)
    const oldEchoes = await pool.query(`
      UPDATE messages
      SET status = 'sent'
      WHERE status = 'pending'
        AND from_me = true
        AND created_at < $1
        AND (wa_message_id IS NULL OR wa_message_id NOT LIKE 'bot-auto-%')
        AND (wa_message_id IS NULL OR wa_message_id NOT LIKE 'pending-%')
      RETURNING id
    `, [echoGraceThreshold]);

    if (oldEchoes.rows.length > 0) {
      console.log(`[StuckMessageMonitor] Cleaned up ${oldEchoes.rows.length} old echo messages (marked as sent)`);
    }

    return oldEchoes.rows.length;
  } catch (err) {
    console.error('[StuckMessageMonitor] Error cleaning up old echoes:', err.message);
    return 0;
  }
};

/**
 * Find and retry stuck pending messages
 * Includes BOTH agent messages AND chatbot/auto-reply messages
 */
export const retryStuckMessages = async () => {
  try {
    // Find messages stuck in "pending" status for too long
    const stuckThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const echoGraceThreshold = new Date(Date.now() - ECHO_GRACE_PERIOD_MS);

    // IMPORTANT: We check ALL pending messages, not just from_me = true
    // This includes:
    // - Agent messages (from_me = true)
    // - Chatbot/Auto-reply messages (from_me = true, sent by system)
    // - Any other pending outbound messages
    //
    // EXCLUSION: Messages pending > 1 hour are likely echoes (WA Web messages)
    // that weren't sent by CRM. Don't retry these - just mark as sent.
    const stuckRes = await pool.query(`
      SELECT m.id, m.conversation_id, m.content, m.type, m.media_url, m.wa_message_id,
             m.retry_count, m.organization_id, m.created_at, m.sender_id,
             m.from_me,
             c.whatsapp_session_id, ws.session_id as wa_uuid, ws.type as device_type,
             ws.access_token, ws.phone_number_id,
             ct.phone_number
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
      WHERE m.status = 'pending'
        AND m.from_me = true  -- Only outbound messages
        AND m.created_at < $1
        AND m.created_at > $2  -- Exclude old echoes (> 1 hour old)
        AND COALESCE(m.retry_count, 0) < $3
        AND ws.session_id IS NOT NULL
        -- Exclude fake IDs (like 'bot-auto-*', 'pending-*' prefixes)
        AND (m.wa_message_id IS NULL OR m.wa_message_id NOT LIKE 'bot-auto-%')
        AND (m.wa_message_id IS NULL OR m.wa_message_id NOT LIKE 'pending-%')
      ORDER BY m.created_at ASC
      LIMIT $4
    `, [stuckThreshold, echoGraceThreshold, MAX_AUTO_RETRIES, BATCH_SIZE]);

    // Always run cleanup for old echoes, regardless of stuck messages
    // This ensures echoes from WA Mobile/Web that weren't properly detected are still cleaned up
    await cleanupOldEchoes();

    if (stuckRes.rows.length === 0) {
      return { processed: 0, retried: 0, failed: 0 };
    }

    console.log(`[StuckMessageMonitor] Found ${stuckRes.rows.length} stuck pending messages (includes chatbot/auto-reply)`);

    let retried = 0;
    let failed = 0;

    for (const msg of stuckRes.rows) {
      try {
        // Normalize phone
        const waPhone = normalizePhone(msg.phone_number);

        if (!msg.wa_uuid) {
          // No session - mark as failed
          await pool.query(
            `UPDATE messages SET status = 'failed', retry_count = COALESCE(retry_count, 0) + 1 WHERE id = $1`,
            [msg.id]
          );
          failed++;
          continue;
        }

        // Increment retry count
        await pool.query(
          `UPDATE messages SET retry_count = COALESCE(retry_count, 0) + 1 WHERE id = $1`,
          [msg.id]
        );

        // Small delay between retries to avoid rate limiting
        await sleep(1000);

        // Attempt to resend based on device type
        let result;
        if (msg.device_type === 'official') {
          // Official API - use MetaService
          if (msg.media_url) {
            result = await MetaService.sendMedia(
              { access_token: msg.access_token, phone_number_id: msg.phone_number_id },
              waPhone,
              msg.type === 'image' ? 'image' : 'text',
              msg.content || '',
              msg.media_url
            );
          } else {
            result = await MetaService.sendMessage(
              { access_token: msg.access_token, phone_number_id: msg.phone_number_id },
              waPhone,
              'text',
              msg.content || ''
            );
          }
        } else {
          // Unofficial Gateway - use waService
          if (msg.media_url) {
            result = await waService.sendMedia(
              msg.wa_uuid,
              waPhone,
              msg.media_url,
              msg.content || ''
            );
          } else {
            result = await waService.sendText(msg.wa_uuid, waPhone, msg.content || '');
          }
        }

        // Update with new message ID
        if (result?.data?.key?.id || result?.messages?.[0]?.id) {
          const newMsgId = result.data?.key?.id || result.messages?.[0]?.id;

          // Update the existing message with new wa_message_id and status
          await pool.query(
            `UPDATE messages
             SET wa_message_id = $1, status = 'sent'
             WHERE id = $2`,
            [newMsgId, msg.id]
          );

          retried++;
          console.log(`[StuckMessageMonitor] Retried message ${msg.id} (type: ${msg.from_me ? 'agent' : 'bot'}) with new ID ${newMsgId}`);
        } else {
          // Send succeeded but no key - keep as pending for next cycle
          console.warn(`[StuckMessageMonitor] Retry succeeded but no message key for ${msg.id}`);
        }
      } catch (err) {
        console.error(`[StuckMessageMonitor] Retry failed for message ${msg.id}:`, err.message);

        // Check if this was the last retry
        const currentRetry = (msg.retry_count || 0) + 1;
        if (currentRetry >= MAX_AUTO_RETRIES) {
          await pool.query(
            `UPDATE messages SET status = 'failed', retry_count = $1 WHERE id = $2`,
            [currentRetry, msg.id]
          );
          failed++;
        }
        // Otherwise, will be retried in next cycle
      }
    }

    console.log(`[StuckMessageMonitor] Cycle complete. Retried: ${retried}, Failed: ${failed}`);
    return { processed: stuckRes.rows.length, retried, failed };

  } catch (err) {
    console.error('[StuckMessageMonitor] Error:', err.message);
    return { processed: 0, retried: 0, failed: 0, error: err.message };
  }
};

/**
 * Start the stuck message monitor cron job
 */
export const startStuckMessageMonitor = () => {
  console.log('[StuckMessageMonitor] Starting cron job (runs every 2 minutes)...');

  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    try {
      const result = await retryStuckMessages();
      if (result.processed > 0) {
        console.log(`[StuckMessageMonitor] Cycle done: ${result.retried} retried, ${result.failed} failed`);
      }
    } catch (err) {
      console.error('[StuckMessageMonitor] Cron error:', err.message);
    }
  });

  // Also run once at startup after 30 seconds
  setTimeout(async () => {
    console.log('[StuckMessageMonitor] Running initial check...');
    await retryStuckMessages();
  }, 30000);
};

export default {
  retryStuckMessages,
  startStuckMessageMonitor
};
