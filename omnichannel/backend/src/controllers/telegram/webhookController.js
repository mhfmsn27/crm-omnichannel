import pool from '../../config/db.js';
import TelegramService from '../../services/TelegramService.js';
import { generateResponse } from '../../services/aiService.js';
import { checkFeatureAccess } from '../../services/featureGateService.js';
import redisConnection from '../../config/redis.js';
import crypto from 'crypto';
import * as formService from '../../services/formService.js';
import * as AutoReplyService from '../../services/AutoReplyService.js';
import { autoAssignConversation } from '../inboxSettingsController.js';
import { initTicket } from '../ticketController.js';
import { isWithinWorkingHours } from '../workingHoursController.js';

// ... handleWebhook unchanged ...
export const handleWebhook = async (req, res) => {
    const { token } = req.params;
    const body = req.body;

    try {
        // 1. Identify Bot
        const botRes = await pool.query('SELECT * FROM telegram_bots WHERE bot_token = $1', [token]);
        if (botRes.rows.length === 0) {
            console.warn(`[Telegram Webhook] Unknown Bot Token: ${token.substring(0, 10)}...`);
            return res.sendStatus(200);
        }

        const bot = botRes.rows[0];
        const { organization_id } = bot;

        // 2. Handle Message
        if (body.message) {
            await processMessage(organization_id, bot, body.message, req.io);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error("[Telegram Webhook] Error:", err);
        res.sendStatus(500);
    }
};

const processMessage = async (orgId, botConfig, message, io) => {
    const chatId = message.chat.id;
    const msgId = message.message_id;

    // --- MEDIA HANDLING ---
    let text = message.text || message.caption || '';
    let msgType = 'text';
    let mediaUrl = null;

    if (message.photo) {
        msgType = 'image';
        const fileId = message.photo[message.photo.length - 1].file_id;
        mediaUrl = await TelegramService.getFileLink(botConfig.bot_token, fileId);
    } else if (message.video) {
        msgType = 'video';
        mediaUrl = await TelegramService.getFileLink(botConfig.bot_token, message.video.file_id);
    } else if (message.document) {
        msgType = 'document';
        mediaUrl = await TelegramService.getFileLink(botConfig.bot_token, message.document.file_id);
        if (!text) text = message.document.file_name;
    } else if (message.voice) {
        msgType = 'audio';
        mediaUrl = await TelegramService.getFileLink(botConfig.bot_token, message.voice.file_id);
    } else if (message.audio) {
        msgType = 'audio';
        mediaUrl = await TelegramService.getFileLink(botConfig.bot_token, message.audio.file_id);
    }

    // Contact Info
    const username = message.from.username || '';
    const firstName = message.from.first_name || '';
    const lastName = message.from.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const dbSessionId = botConfig.id;

    // 1. Upsert Contact
    let contactId;
    const contactCheck = await pool.query(
        'SELECT id FROM contacts WHERE organization_id = $1 AND telegram_id = $2',
        [orgId, chatId]
    );

    if (contactCheck.rows.length > 0) {
        contactId = contactCheck.rows[0].id;
        await pool.query('UPDATE contacts SET last_inbound_at = NOW(), name = $1 WHERE id = $2', [fullName, contactId]);
    } else {
        const newContact = await pool.query(
            `INSERT INTO contacts (organization_id, name, phone_number, telegram_id, username, source, last_inbound_at)
             VALUES ($1, $2, $3, $4, $5, 'telegram', NOW()) RETURNING id`,
            [orgId, fullName, String(chatId), chatId, username]
        );
        contactId = newContact.rows[0].id;
    }

    // 2. Upsert Conversation
    let conversationId;
    let isChatbotActive = true;

    const convRes = await pool.query(
        `SELECT id, is_chatbot_active FROM conversations 
         WHERE organization_id = $1 AND contact_id = $2 AND telegram_bot_id = $3`,
        [orgId, contactId, botConfig.id]
    );

    if (convRes.rows.length > 0) {
        conversationId = convRes.rows[0].id;
        isChatbotActive = convRes.rows[0].is_chatbot_active;
        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, status = 'open' WHERE id = $2`,
            [text || `[${msgType}]`, conversationId]
        );
    } else {
        const newConv = await pool.query(
            `INSERT INTO conversations (organization_id, contact_id, telegram_bot_id, channel, last_message, unread_count, status, is_chatbot_active)
             VALUES ($1, $2, $3, 'telegram', $4, 1, 'open', $5) RETURNING id`,
            [orgId, contactId, botConfig.id, text || `[${msgType}]`, botConfig.ai_active]
        );
        conversationId = newConv.rows[0].id;
        isChatbotActive = botConfig.ai_active;
        autoAssignConversation(orgId, conversationId, io, 'CS', 'telegram').catch(err => console.error('[Telegram] autoAssign failed:', err.message));
        initTicket(orgId, conversationId).catch(err => console.error('[Telegram] initTicket failed:', err.message));
    }

    // 3. Save Message (User's Message) - FIRST
    const waMessageId = `tg-${msgId}`;
    const msgRes = await pool.query(
        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at)
         VALUES ($1, $2, false, $3, $4, $5, 'received', $6, NOW()) 
         ON CONFLICT (wa_message_id) DO NOTHING
         RETURNING *`,
        [conversationId, orgId, msgType, text || '', mediaUrl, waMessageId]
    );

    if (msgRes.rows.length > 0) {
        const savedMsg = msgRes.rows[0];
        io.to(`org_${orgId}`).emit('new_message', { conversationId, message: savedMsg });
    }

    // 4. Check Form Triggers (AFTER user message saved)
    let skipAutoReply = false;
    if (text) {
        try {
            const formResult = await formService.handleIncomingMessage(
                orgId,
                contactId,
                dbSessionId,
                chatId,
                text,
                chatId,
                'telegram',
                { botToken: botConfig.bot_token }
            );
            if (formResult && formResult.handled) {
                skipAutoReply = true;
                console.log(`[Telegram] Message handled by Chat Form for contact ${contactId}`);
            }
        } catch (e) {
            console.error("[Telegram] Form Handler Error:", e);
        }
    }

    // 5. Automation (AI)
    if (text && isChatbotActive && botConfig.ai_active && !text.startsWith('/') && !skipAutoReply) {
        const botLockKey = `bot_lock_tg:${msgId}`;
        const lockAcquired = await redisConnection.set(botLockKey, '1', 'NX', 'EX', 60);
        if (!lockAcquired) return;

        try {
            const { withinHours, outsideMode, offlineMessage } = await isWithinWorkingHours(orgId);
            if (!withinHours && outsideMode !== 'ai') {
                if (outsideMode === 'message' && offlineMessage) {
                    await TelegramService.sendMessage(botConfig.bot_token, chatId.toString(), offlineMessage);
                    await pool.query(
                        'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                        [conversationId, orgId, 'text', offlineMessage, 'sent', `offline.${crypto.randomUUID()}`]
                    );
                }
                return;
            }

            const access = await checkFeatureAccess(orgId, 'feat_chatbot');
            if (!access.allowed) return;

            // --- LOAD REAL BOT CONFIG ---
            const botSettingsRes = await pool.query(
                'SELECT * FROM chatbot_settings WHERE session_id = $1 AND is_active = true',
                [botConfig.bot_token]
            );

            if (botSettingsRes.rows.length === 0) return;

            const realBotConfig = botSettingsRes.rows[0];

            const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversationId]);
            const chatHistory = historyRes.rows.reverse();

            // DETECT QUEUE MODE CONTEXT / AUTO REPLY
            let extraContext = "";
            try {
                const autoReplyResult = await AutoReplyService.processIncomingMessage(
                    { organization_id: orgId, session_id: botConfig.bot_token },
                    contactId,
                    text,
                    chatId,
                    'telegram',
                    { botToken: botConfig.bot_token, conversationId: conversationId }
                );

                if (autoReplyResult && autoReplyResult.handled) {
                    console.log(`[Telegram] Handled by AutoReply (${autoReplyResult.type})`);
                    return;
                }
            } catch (qErr) { console.error("AutoReply/Queue Error", qErr); }

            const aiResponse = await generateResponse(orgId, text, chatHistory, realBotConfig, extraContext);

            if (aiResponse === "[ESCALATE]") {
                await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                io.to(`org_${orgId}`).emit('bot_escalated', { conversationId, alert: true });

                const fallback = "Mohon tunggu, admin kami akan segera membalas.";
                const sentMsg = await TelegramService.sendMessage(botConfig.bot_token, chatId, fallback);
                const sentMid = sentMsg?.message_id ? `tg-${sentMsg.message_id}` : `bot.esc.tg.${crypto.randomUUID()}`;

                await pool.query(
                    'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                    [conversationId, orgId, 'text', fallback, 'sent', sentMid]
                );

            } else if (aiResponse) {
                const sentMsg = await TelegramService.sendMessage(botConfig.bot_token, chatId, aiResponse);
                const sentMid = sentMsg?.message_id ? `tg-${sentMsg.message_id}` : `bot.res.tg.${crypto.randomUUID()}`;

                const aiMsg = await pool.query(
                    'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) RETURNING *',
                    [conversationId, orgId, 'text', aiResponse, 'sent', sentMid]
                );

                io.to(`org_${orgId}`).emit('new_message', { conversationId, message: aiMsg.rows[0] });
            }
        } catch (e) {
            console.error("[Telegram Bot Error]", e);
        }
    }
};