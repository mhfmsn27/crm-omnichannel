
import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import TelegramService from '../services/TelegramService.js';
import MetaService from '../services/MetaService.js';
import MessengerService from '../services/MessengerService.js';
import InstagramService from '../services/InstagramService.js';

// Helper to log API calls
const logApi = async (appId, endpoint, method, status, payload, response) => {
    try {
        await pool.query(
            `INSERT INTO developer_api_logs (developer_app_id, endpoint, method, status_code, payload, response)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [appId, endpoint, method, status, JSON.stringify(payload), JSON.stringify(response)]
        );
    } catch (e) { console.error("Failed to log API", e); }
};

export const sendMessage = async (req, res) => {
    const { channel, session_id, to, type, content, media_url } = req.body;
    const appId = req.devApp.id;

    // Validation
    if (!channel || !to || !content) {
        return res.status(400).json({ error: "Missing required fields: channel, to, content" });
    }

    try {
        // 1. Detect Session (If not provided, use Default mapped one if singular, else error)
        let targetSessionId = session_id;

        if (!targetSessionId) {
            const mappings = await pool.query(
                `SELECT session_id FROM developer_app_channels WHERE developer_app_id = $1 AND channel_type = $2 LIMIT 2`,
                [appId, channel]
            );
            if (mappings.rows.length === 1) {
                targetSessionId = mappings.rows[0].session_id;
            } else if (mappings.rows.length === 0) {
                throw new Error(`No ${channel} session linked to this App.`);
            } else {
                throw new Error(`Multiple ${channel} sessions found. Please specify 'session_id'.`);
            }
        } else {
            // Strict check is done in middleware 'validateChannelAccess'
        }

        // 2. Process Sending
        let result = null;

        if (channel === 'whatsapp') {
            // Check if Official or Unofficial
            if (targetSessionId.startsWith('meta-')) {
                // Need to fetch token from DB
                const sess = await pool.query('SELECT access_token, phone_number_id, organization_id FROM whatsapp_sessions WHERE session_id = $1', [targetSessionId]);
                if (sess.rows.length === 0) throw new Error("Session not found");

                // Use Meta Service
                // Fix: Extract text string, don't wrap in object because MetaService wraps it in { body: ... }
                let textBody = '';
                if (typeof content === 'string') textBody = content;
                else if (typeof content === 'object') textBody = content.text || content.caption || '';

                // For template, we might pass the whole object
                const msgContent = type === 'template' ? content : textBody;

                result = await MetaService.sendMessage(sess.rows[0], to, type, msgContent, media_url);

            } else {
                // Unofficial
                let textBody = '';
                if (typeof content === 'string') textBody = content;
                else if (typeof content === 'object') textBody = content.text || content.caption || '';

                if (type === 'text') {
                    await waService.sendText(targetSessionId, to, textBody);
                } else {
                    // Media
                    await waService.sendMedia(targetSessionId, to, media_url, textBody);
                }
                result = { status: 'queued', id: Date.now() };
            }

        } else if (channel === 'telegram') {
            // session_id IS the bot token for Telegram in our DB mapping
            if (media_url) {
                // Simple logic: check type
                if (type === 'image') await TelegramService.sendPhoto(targetSessionId, to, media_url, content.text);
                else await TelegramService.sendDocument(targetSessionId, to, media_url, content.text);
            } else {
                await TelegramService.sendMessage(targetSessionId, to, content.text);
            }
            result = { status: 'sent' };
        }

        // Log Success
        logApi(appId, '/messages', 'POST', 200, req.body, result);
        res.json({ success: true, data: result });

    } catch (err) {
        const errorMsg = err.response?.data?.error || err.message;
        // Log Failure
        logApi(appId, '/messages', 'POST', 500, req.body, { error: errorMsg });
        res.status(500).json({ error: errorMsg });
    }
};


