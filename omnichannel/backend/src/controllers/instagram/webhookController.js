import pool from '../../config/db.js';
import { downloadMedia } from '../../utils/mediaDownloader.js';
import InstagramService from '../../services/InstagramService.js';
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
            console.log('INSTAGRAM_WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.warn(`[Instagram Webhook] Verification failed. Token mismatch: ${token} !== ${VERIFY_TOKEN}`);
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// ... handleWebhook unchanged ...
export const handleWebhook = async (req, res) => {
    const body = req.body;

    if (body.object === 'instagram') {
        for (const entry of body.entry) {
            const igAccountId = entry.id;
            const webhookEvent = entry.messaging ? entry.messaging[0] : null;

            if (webhookEvent) {
                const senderId = webhookEvent.sender.id;
                const recipientId = webhookEvent.recipient.id;
                // IG/Messenger logic: if echo, sender is us. if not, sender is user.
                // We pass both to handleMessage to resolve correct contact vs business

                if (webhookEvent.message) {
                    await handleMessage(igAccountId, senderId, recipientId, webhookEvent.message, req.io);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
};

const handleMessage = async (igAccountId, senderId, recipientId, message, io) => {
    const isEcho = message.is_echo;
    const mid = message.mid;
    const text = message.text || '';

    // Determine IDs
    let contactIgsid, businessIgsid;
    if (isEcho) {
        contactIgsid = recipientId;
        businessIgsid = senderId;
    } else {
        contactIgsid = senderId;
        businessIgsid = recipientId;
    }

    // 1. Find IG Account Config
    // Note: We use igAccountId from entry (which is Business ID) or businessIgsid (from message). They should match.
    const accRes = await pool.query('SELECT * FROM instagram_accounts WHERE ig_id = $1', [businessIgsid]);
    if (accRes.rows.length === 0) return console.warn(`[Instagram] Account ${businessIgsid} not found in DB`);
    const account = accRes.rows[0];
    const { organization_id, access_token, ai_active } = account;
    const dbSessionId = account.id;

    // 2. Upsert Contact
    let contactId;
    let contactName = `IG User ${contactIgsid.substring(0, 4)}`;

    const contactCheck = await pool.query(
        'SELECT id, name FROM contacts WHERE organization_id = $1 AND phone_number = $2',
        [organization_id, contactIgsid]
    );

    if (contactCheck.rows.length > 0) {
        contactId = contactCheck.rows[0].id;
        contactName = contactCheck.rows[0].name;
        await pool.query('UPDATE contacts SET last_inbound_at = NOW() WHERE id = $1', [contactId]);
    } else {
        // Fetch Profile only if not echo (to save API calls/rate limits)
        let profilePic = '';
        if (!isEcho) {
            try {
                const profile = await InstagramService.getUserProfile(contactIgsid, access_token);
                contactName = profile.name || profile.username || contactName;
                profilePic = profile.profile_picture_url || '';
            } catch (e) { }
        }

        // Truncate to avoid DB errors if migration missed
        const safeName = contactName.substring(0, 250);

        const newContact = await pool.query(
            `INSERT INTO contacts (organization_id, name, phone_number, source, profile_pic_url, last_inbound_at)
             VALUES ($1, $2, $3, 'instagram', $4, NOW()) RETURNING id`,
            [organization_id, safeName, contactIgsid, profilePic]
        );
        contactId = newContact.rows[0].id;
    }

    // --- MEDIA HANDLING ---
    let msgType = 'text';
    let mediaUrl = null;

    // LOG RAW MESSAGE for Debugging Media
    console.log(`[Instagram] Received Message:`, JSON.stringify(message, null, 2));

    if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0];
        const type = attachment.type;
        const payload = attachment.payload;
        if (payload && payload.url) {
            try {
                const localUrl = await downloadMedia(payload.url, 'instagram');
                mediaUrl = localUrl || payload.url;
            } catch (e) {
                console.error("[Instagram] Failed to download media", e);
                mediaUrl = payload.url;
            }

            if (type === 'image') msgType = 'image';
            else if (type === 'video') msgType = 'video';
            else if (type === 'audio') msgType = 'audio';
            else if (type === 'share') msgType = 'image';
            else if (type === 'story_mention') msgType = 'image';
            else msgType = 'document';
        }
    }

    let skipAi = false;

    // --- CHECK CHAT FORM ---
    if (text && !isEcho) {
        try {
            const formResult = await formService.handleIncomingMessage(
                organization_id,
                contactId,
                dbSessionId,
                contactIgsid,
                text,
                contactIgsid,
                'instagram',
                { accessToken: access_token }
            );
            if (formResult && formResult.handled) {
                skipAi = true;
                console.log(`[Instagram] Message handled by Chat Form for contact ${contactId}`);
            }
        } catch (e) {
            console.error("[Instagram] Form Handler Error:", e);
        }
    }

    // 3. Upsert Conversation
    let conversationId;
    let isChatbotActive = true;

    const convRes = await pool.query(
        `SELECT id, is_chatbot_active FROM conversations 
         WHERE organization_id = $1 AND contact_id = $2 AND instagram_account_id = $3`,
        [organization_id, contactId, account.id]
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
            `INSERT INTO conversations (organization_id, contact_id, instagram_account_id, channel, last_message, unread_count, status, is_chatbot_active)
             VALUES ($1, $2, $3, 'instagram', $4, $5, 'open', $6) RETURNING id`,
            [organization_id, contactId, account.id, text || `[${msgType}]`, isEcho ? 0 : 1, ai_active]
        );
        conversationId = newConv.rows[0].id;
        isChatbotActive = ai_active;
        autoAssignConversation(organization_id, conversationId, io, 'CS', 'instagram').catch(err => console.error('[Instagram] autoAssign failed:', err.message));
        initTicket(organization_id, conversationId).catch(err => console.error('[Instagram] initTicket failed:', err.message));
    }

    // 4. Save Message
    // Ensure mid is safe
    const safeMid = mid || `ig-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const msgRes = await pool.query(
        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
         ON CONFLICT (wa_message_id) DO NOTHING
         RETURNING *`,
        [conversationId, organization_id, isEcho, msgType, text || '', mediaUrl, isEcho ? 'sent' : 'received', safeMid]
    );

    console.log(`[Instagram] Saved Msg: ID=${conversationId}, Type=${msgType}, Media=${mediaUrl}`);

    if (msgRes.rows.length === 0) return; // Duplicate skipped
    const savedMsg = msgRes.rows[0];

    // Emit Socket
    io.to(`org_${organization_id}`).emit('new_message', { conversationId, message: savedMsg });

    // AUTO-LABEL: Process and apply labels based on rules (only for incoming messages)
    if (!isEcho) {
        processAndApplyAutoLabels(organization_id, contactId, conversationId, 'instagram', text).catch(e =>
            console.error('[AutoLabel] Error:', e)
        );
    }

    // 5. AI Chatbot (Text Only)
    if (!isEcho && text && isChatbotActive && ai_active && !skipAi) {
        const botLockKey = `bot_lock_ig:${safeMid}`;
        const lockAcquired = await redisConnection.set(botLockKey, '1', 'NX', 'EX', 60);
        if (!lockAcquired) return;

        try {
            const { withinHours, outsideMode, offlineMessage } = await isWithinWorkingHours(organization_id);
            if (!withinHours && outsideMode !== 'ai') {
                if (outsideMode === 'message' && offlineMessage) {
                    await InstagramService.sendMessage(access_token, contactIgsid, offlineMessage);
                    await pool.query(
                        'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                        [conversationId, organization_id, 'text', offlineMessage, 'sent', `offline.${crypto.randomUUID()}`]
                    );
                }
                return;
            }

            const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
            if (!access.allowed) return;

            // Load Bot Config (using businessIgsid as session_id)
            const botRes = await pool.query(
                'SELECT * FROM chatbot_settings WHERE session_id = $1 AND is_active = true',
                [businessIgsid]
            );

            if (botRes.rows.length === 0) return;

            const botConfig = botRes.rows[0];

            // DETECT QUEUE MODE CONTEXT / AUTO REPLY
            // Integrated AutoReplyService (Queue Mode + Keyword Reply)
            let extraContext = "";
            try {
                const autoReplyResult = await AutoReplyService.processIncomingMessage(
                    { organization_id: organization_id, session_id: businessIgsid },
                    contactId,
                    text,
                    contactIgsid, // Recipient/Sender IGSID
                    'instagram',
                    { accessToken: access_token, conversationId: conversationId }
                );

                if (autoReplyResult && autoReplyResult.handled) {
                    console.log(`[Instagram] Handled by AutoReply (${autoReplyResult.type})`);
                    return;
                }
            } catch (qErr) { console.error("AutoReply/Queue Error", qErr); }

            const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversationId]);
            const chatHistory = historyRes.rows.reverse();

            const aiResponse = await generateResponse(organization_id, text, chatHistory, botConfig, extraContext);

            if (aiResponse === "[ESCALATE]") {
                await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                io.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true });

                const fallback = "Please wait, a human agent will connect with you shortly.";
                const sentMsg = await InstagramService.sendMessage(access_token, contactIgsid, fallback);
                const sentMid = sentMsg?.message_id || `bot.esc.ig.${crypto.randomUUID()}`;

                await pool.query(
                    'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) ON CONFLICT (wa_message_id) DO NOTHING',
                    [conversationId, organization_id, 'text', fallback, 'sent', sentMid]
                );
            } else if (aiResponse) {
                const sentMsg = await InstagramService.sendMessage(access_token, contactIgsid, aiResponse);
                const sentMid = sentMsg?.message_id || `bot.res.ig.${crypto.randomUUID()}`;

                const aiMsg = await pool.query(
                    'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) ON CONFLICT (wa_message_id) DO NOTHING RETURNING *',
                    [conversationId, organization_id, 'text', aiResponse, 'sent', sentMid]
                );

                // IMPORTANT: Emit socket for the bot reply too
                if (aiMsg.rows.length > 0) {
                    await pool.query("UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2", [aiResponse, conversationId]);
                    io.to(`org_${organization_id}`).emit('new_message', { conversationId, message: aiMsg.rows[0] });
                }
            }
        } catch (e) { console.error("[Instagram Bot Error]", e); }
    }
};