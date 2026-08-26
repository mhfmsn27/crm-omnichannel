import pool from '../../config/db.js';
import { downloadMedia } from '../../utils/mediaDownloader.js';
import MessengerService from '../../services/MessengerService.js';
import * as formService from '../../services/formService.js';
import { generateResponse } from '../../services/aiService.js';
import { checkFeatureAccess } from '../../services/featureGateService.js';
import * as AutoReplyService from '../../services/AutoReplyService.js';
import { processAndApplyAutoLabels } from '../../services/autoLabelService.js';
import redisConnection from '../../config/redis.js';
import crypto from 'crypto';
import { autoAssignConversation } from '../inboxSettingsController.js';
import { initTicket } from '../ticketController.js';
import { isWithinWorkingHours } from '../workingHoursController.js';

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'reply_saas_verify';

// ... verifyWebhook unchanged ...
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('MESSENGER_WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.warn(`[Messenger Webhook] Verification failed. Token mismatch: ${token} !== ${VERIFY_TOKEN}`);
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// ... handleWebhook unchanged ...
export const handleWebhook = async (req, res) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            const pageId = entry.id;
            const webhookEvent = entry.messaging ? entry.messaging[0] : null;

            if (webhookEvent) {
                const senderPsid = webhookEvent.sender.id;
                const recipientPsid = webhookEvent.recipient.id;
                
                if (webhookEvent.message) {
                    await handleMessage(pageId, senderPsid, recipientPsid, webhookEvent.message, req.io);
                } else if (webhookEvent.postback) {
                    await handlePostback(pageId, senderPsid, webhookEvent.postback, req.io);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
};

const handleMessage = async (pageId, senderId, recipientId, message, io) => {
    const isEcho = message.is_echo;
    const mid = message.mid;
    let text = message.text || '';

    // Determine IDs
    let contactPsid, businessPsid;
    if (isEcho) {
        contactPsid = recipientId;
        businessPsid = senderId;
    } else {
        contactPsid = senderId;
        businessPsid = recipientId;
    }

    // --- MEDIA HANDLING ---
    let msgType = 'text';
    let mediaUrl = null;

    // LOG RAW MESSAGE for Debugging Media
    console.log(`[Messenger] Received Message:`, JSON.stringify(message, null, 2));

    if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0];
        const type = attachment.type;
        const payload = attachment.payload;

        if (payload && payload.url) {
            // Download Media locally
            try {
                // If it's a sticker, we might want to keep the URL if it's external, but for robust display, let's download everything.
                // Note: Stickers are typically images.
                const localUrl = await downloadMedia(payload.url, 'messenger');
                if (localUrl) mediaUrl = localUrl;
                else mediaUrl = payload.url; // Fallback
            } catch (e) {
                console.error("[Messenger] Failed to download media", e);
                mediaUrl = payload.url;
            }

            if (type === 'image') msgType = 'image';
            else if (type === 'video') msgType = 'video';
            else if (type === 'audio') msgType = 'audio';
            else msgType = 'document';
        }
        if (message.sticker_id) msgType = 'image';
    }

    // 1. Find Page Config
    const pageRes = await pool.query('SELECT * FROM messenger_pages WHERE page_id = $1', [pageId]);
    if (pageRes.rows.length === 0) return console.warn(`[Messenger] Page ${pageId} not found in DB`);
    const page = pageRes.rows[0];
    const { organization_id, access_token, ai_active } = page;
    const dbSessionId = page.id;

    // 2. Upsert Contact
    let contactName = `FB User ${contactPsid.substring(0, 4)}`;

    const contactCheck = await pool.query(
        'SELECT id, name FROM contacts WHERE organization_id = $1 AND phone_number = $2',
        [organization_id, contactPsid]
    );

    if (contactCheck.rows.length > 0) {
        contactId = contactCheck.rows[0].id;
        contactName = contactCheck.rows[0].name;
        await pool.query('UPDATE contacts SET last_inbound_at = NOW() WHERE id = $1', [contactId]);
    } else {
        let profilePic = '';
        if (!isEcho) {
            try {
                const profile = await MessengerService.getUserProfile(contactPsid, access_token);
                contactName = `${profile.first_name} ${profile.last_name}`.trim() || contactName;
                profilePic = profile.profile_pic || '';
            } catch (e) {}
        }

        const safeName = contactName.substring(0, 250);

        const newContact = await pool.query(
            `INSERT INTO contacts (organization_id, name, phone_number, source, profile_pic_url, last_inbound_at)
             VALUES ($1, $2, $3, 'messenger', $4, NOW()) RETURNING id`,
            [organization_id, safeName, contactPsid, profilePic]
        );
        contactId = newContact.rows[0].id;
    }

    // 3. Upsert Conversation
    let conversationId;
    let isChatbotActive = true;

    const convRes = await pool.query(
        `SELECT id, is_chatbot_active FROM conversations 
         WHERE organization_id = $1 AND contact_id = $2 AND messenger_page_id = $3`,
        [organization_id, contactId, page.id]
    );

    if (convRes.rows.length > 0) {
        conversationId = convRes.rows[0].id;
        isChatbotActive = convRes.rows[0].is_chatbot_active;
        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + $2, status = 'open' WHERE id = $3`,
            [text || `[${msgType}]`, isEcho ? 0 : 1, conversationId]
        );
    } else {
        const newConv = await pool.query(
            `INSERT INTO conversations (organization_id, contact_id, messenger_page_id, channel, last_message, unread_count, status, is_chatbot_active)
             VALUES ($1, $2, $3, 'messenger', $4, $5, 'open', $6) RETURNING id`,
            [organization_id, contactId, page.id, text || `[${msgType}]`, isEcho ? 0 : 1, ai_active]
        );
        conversationId = newConv.rows[0].id;
        isChatbotActive = ai_active;
        autoAssignConversation(organization_id, conversationId, io, 'CS', 'messenger').catch(err => console.error('[Messenger] autoAssign failed:', err.message));
        initTicket(organization_id, conversationId).catch(err => console.error('[Messenger] initTicket failed:', err.message));
    }

    const safeMid = mid || `fb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 4. Save Message
    const msgRes = await pool.query(
        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
         ON CONFLICT (wa_message_id) DO NOTHING
         RETURNING *`,
        [conversationId, organization_id, isEcho, msgType, text || '', mediaUrl, isEcho ? 'sent' : 'received', safeMid]
    );

    console.log(`[Messenger] Saved Msg: ID=${conversationId}, Type=${msgType}, Media=${mediaUrl}`);

    if (msgRes.rows.length === 0) return; // Duplicate
    const savedMsg = msgRes.rows[0];
    io.to(`org_${organization_id}`).emit('new_message', { conversationId, message: savedMsg });

    if (!isEcho) {
        // AUTO-LABEL: Process and apply labels based on rules
        processAndApplyAutoLabels(organization_id, contactId, conversationId, 'messenger', text).catch(e =>
            console.error('[AutoLabel] Error:', e)
        );
    }

    let skipAi = false;

    // --- CHECK CHAT FORM (Messenger) ---
    // Executed AFTER message save so triggers happen in correct visual order
    if (text && !isEcho) {
        try {
            const formResult = await formService.handleIncomingMessage(
                organization_id,
                contactId,
                dbSessionId,
                contactPsid,
                text,
                contactPsid,
                'messenger',
                { pageAccessToken: access_token }
            );
            if (formResult && formResult.handled) {
                skipAi = true;
                console.log(`[Messenger] Message handled by Chat Form for contact ${contactId}`);
            }
        } catch (e) {
            console.error("[Messenger] Form Handler Error:", e);
        }
    }

    // 5. AI Chatbot
    if (!isEcho && isChatbotActive && ai_active && !skipAi && text) {
        const botLockKey = `bot_lock_fb:${mid}`;
        const lockAcquired = await redisConnection.set(botLockKey, '1', 'NX', 'EX', 60);
        if (!lockAcquired) return;

        try {
            const { withinHours, outsideMode, offlineMessage } = await isWithinWorkingHours(organization_id);
            if (!withinHours && outsideMode !== 'ai') {
                if (outsideMode === 'message' && offlineMessage) {
                    await MessengerService.sendMessage(access_token, psid, offlineMessage);
                    await pool.query(
                        'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                        [conversationId, organization_id, 'text', offlineMessage, 'sent', `offline.${crypto.randomUUID()}`]
                    );
                }
                return;
            }

            const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
            if (!access.allowed) return;

            const botRes = await pool.query(
                'SELECT * FROM chatbot_settings WHERE session_id = $1 AND is_active = true',
                [pageId]
            );

            if (botRes.rows.length === 0) return;

            const botConfig = botRes.rows[0];

            // DETECT QUEUE MODE CONTEXT / AUTO REPLY
            // Integrated AutoReplyService (Queue Mode + Keyword Reply)
            // Passes channel 'messenger' and pageAccessToken in extraData
            let extraContext = "";
            try {
                const autoReplyResult = await AutoReplyService.processIncomingMessage(
                    { organization_id: organization_id, session_id: pageId },
                    contactId,
                    text,
                    psid,
                    'messenger',
                    { pageAccessToken: access_token, conversationId: conversationId }
                );

                if (autoReplyResult && autoReplyResult.handled) {
                    console.log(`[Messenger] Handled by AutoReply (${autoReplyResult.type})`);
                    // If handled by queue/keyword, we might want to SKIP AI completely or inject context.
                    // Queue Mode usually implies we stop AI or put AI in "Waiting" mode.
                    // But if it's just a queue update, we return.
                    return;
                }

                // If NOT handled, check if we need to inject Queue Context for AI
                // (e.g. if user is waiting but AutoReply didn't stop flow - shouldn't happen if AutoReply logic is correct)
                // Re-using AutoReplyService's context logic inside it is better, but here we just check DB if needed.
                // AutoReplyService already handles Queue Position response.

            } catch (qErr) { console.error("AutoReply/Queue Error", qErr); }

            const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversationId]);
            const chatHistory = historyRes.rows.reverse();

            const aiResponse = await generateResponse(organization_id, text, chatHistory, botConfig, extraContext);

            if (aiResponse === "[ESCALATE]") {
                await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                io.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true });
                const fallback = "Please wait, a human agent will connect with you shortly.";
                const sentMsg = await MessengerService.sendMessage(access_token, psid, fallback);
                const sentMid = sentMsg?.message_id || `bot.esc.fb.${crypto.randomUUID()}`;

                await pool.query(
                    'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                    [conversationId, organization_id, 'text', fallback, 'sent', sentMid]
                );
            } else if (aiResponse) {
                const sentMsg = await MessengerService.sendMessage(access_token, psid, aiResponse);
                const sentMid = sentMsg?.message_id || `bot.res.fb.${crypto.randomUUID()}`;

                const aiMsg = await pool.query(
                    'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) RETURNING *',
                    [conversationId, organization_id, 'text', aiResponse, 'sent', sentMid]
                );

                if (aiMsg.rows.length > 0) {
                    io.to(`org_${organization_id}`).emit('new_message', { conversationId, message: aiMsg.rows[0] });
                }
            }
        } catch (e) { console.error("[Messenger Bot Error]", e); }
    }
};
// ... handlePostback unchanged ...
const handlePostback = async (pageId, psid, postback, io) => {
    const payload = postback.payload;
    if (payload === 'GET_STARTED') {
        await handleMessage(pageId, psid, { text: 'Hi', mid: `postback_${Date.now()}` }, io);
    }
};