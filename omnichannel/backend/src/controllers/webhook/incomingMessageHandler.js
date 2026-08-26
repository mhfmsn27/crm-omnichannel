import pool from '../../config/db.js';
import { generateResponse } from '../../services/aiService.js';
import * as waService from '../../services/waGatewayService.js';
import redisConnection from '../../config/redis.js';
import { checkFeatureAccess } from '../../services/featureGateService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import * as formService from '../../services/formService.js';
import { dispatchToApps, dispatchOrgEvent } from '../../services/webhookDispatcher.js';
import * as AutoReplyService from '../../services/AutoReplyService.js';
import * as FlowEngineService from '../../services/FlowEngineService.js';
import { uuidRegex } from '../../utils/validators.js';
import { fcmService } from '../../services/fcmService.js';
import { autoAssignConversation, getInboxIdForDevice } from '../inboxSettingsController.js';
import { initTicket } from '../ticketController.js';
import { isWithinWorkingHours } from '../workingHoursController.js';
import { analyzeMessage, persistAnalysis } from '../../services/messageAnalysisService.js';
import { processAndApplyAutoLabels, isContactFirstMessage } from '../../services/autoLabelService.js';
import { processFlow } from '../../services/flowExecutionService.js';
import { normalizeWhatsappPhone } from '../../utils/phoneHelper.js';
import { checkKeywords } from './webhookEventHandlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const debugLog = (msg) => {
    try {
        if (process.env.DEBUG_WEBHOOK === 'true') {
            fs.appendFileSync(path.join(__dirname, '../../../webhook-debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
        }
    } catch (e) { }
};

export const handleIncomingMessage = async (req, res) => {
    let {
        sessionId,
        text,
        from,
        rawJid,
        pushName,
        profilePicUrl,
        fromMe,
        type,
        mediaUrl,
        waMessageId,
        timestamp,
        mimetype,
        quotedMessageText,
        isGroupChat,
        groupAssignedAgentId,
        messageSender
    } = req.body;

    console.log(`[Webhook] === handleIncomingMessage START ===`);
    console.log(`[Webhook] sessionId=${sessionId}, from=${from}, fromMe=${fromMe}, type=${type}, waMessageId=${waMessageId}`);

    let contactId = null;

    try {
        // 1. Session Lookup
        const sessionRes = await pool.query('SELECT * FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
        if (sessionRes.rows.length === 0) {
            console.warn(`[Webhook] Process aborted. Session ${sessionId} not found in DB.`);
            return;
        }
        const sessionData = sessionRes.rows[0];
        const { id: dbSessionId, organization_id } = sessionData;
        console.log(`[Webhook] Found session: dbSessionId=${dbSessionId}, orgId=${organization_id}`);

        if (!fromMe) {
            const warmerRes = await pool.query(
                `SELECT * FROM warmer_settings
                 WHERE organization_id = $1 AND is_active = true
                 AND (session_id_1 = $2 OR session_id_2 = $2)`,
                [organization_id, dbSessionId]
            );

            if (warmerRes.rows.length > 0) {
                await pool.query(
                    'INSERT INTO warmer_logs (warmer_setting_id, sender_session_id, message_content) VALUES ($1, $2, $3)',
                    [warmerRes.rows[0].id, dbSessionId, text]
                );
            }
        }

        if (sessionData.device_info && sessionData.device_info.is_warmer_only === true) {
            debugLog(`[Handle] Dropped because is_warmer_only=true. sessionId=${sessionId}`);
            console.log(`[Webhook] Dropped: Warmer Only device`);
            return;
        }

        // 2. UPSERT CONTACT
        const cleanFrom = normalizeWhatsappPhone(from) || from;
        const displayName = fromMe ? cleanFrom : (pushName || cleanFrom);
        let currentContactName = displayName;
        let currentContactPic = profilePicUrl;

        const contactCheck = await pool.query(
            'SELECT id, name, profile_pic_url, is_blocked FROM contacts WHERE organization_id = $1 AND (phone_number = $2 OR phone_number = $3 OR whatsapp_lid = $2)',
            [organization_id, cleanFrom, from]
        );

        if (contactCheck.rows.length > 0) {
            if (contactCheck.rows[0].is_blocked) {
                console.log(`[Webhook] Ignoring message from blocked contact: ${from}`);
                return res.status(200).send('OK');
            }

            contactId = contactCheck.rows[0].id;
            const oldName = contactCheck.rows[0].name;
            const oldPic = contactCheck.rows[0].profile_pic_url;

            if (!currentContactPic) currentContactPic = oldPic;

            let shouldUpdate = false;
            let newName = oldName;
            let newPic = oldPic;

            if (!fromMe && (oldName === from || !oldName) && displayName !== from) {
                newName = displayName;
                shouldUpdate = true;
            }
            if (!fromMe && currentContactPic && currentContactPic !== oldPic) {
                newPic = currentContactPic;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                await pool.query(
                    'UPDATE contacts SET name = $1, profile_pic_url = $2, updated_at = NOW() WHERE id = $3',
                    [newName, newPic, contactId]
                );
                currentContactName = newName;
                currentContactPic = newPic;
            } else {
                await pool.query('UPDATE contacts SET updated_at = NOW() WHERE id = $1', [contactId]);
            }
        } else {
            if (from.includes('@lid') && pushName && pushName !== from) {
                const lidDupCheck = await pool.query(
                    `SELECT c.id, c.name FROM contacts c
                     JOIN conversations cv ON cv.contact_id = c.id
                     WHERE c.organization_id = $1
                     AND c.phone_number LIKE '%@lid'
                     AND c.name = $2
                     AND cv.whatsapp_session_id = $3
                     LIMIT 1`,
                    [organization_id, pushName, dbSessionId]
                );
                if (lidDupCheck.rows.length > 0) {
                    contactId = lidDupCheck.rows[0].id;
                    currentContactName = lidDupCheck.rows[0].name;
                    console.log(`[Webhook] LID Dedup: Reused contact ${contactId} for new LID ${from} (${pushName})`);
                }
            }

            if (!contactId) {
                const contactSource = isGroupChat ? 'Group_Participant_Restricted' : 'inbox';
                const insertRes = await pool.query(
                    `INSERT INTO contacts (organization_id, phone_number, name, profile_pic_url, updated_at, source)
                     VALUES ($1, $2, $3, $4, NOW(), $5)
                     ON CONFLICT (organization_id, phone_number) DO NOTHING
                     RETURNING id`,
                    [organization_id, from, displayName, currentContactPic, contactSource]
                );

                if (insertRes.rows.length > 0) {
                    contactId = insertRes.rows[0].id;
                    currentContactName = displayName;
                    dispatchOrgEvent(organization_id, 'contact.created', { contactId, name: displayName, phone: from }).catch(() => { });
                } else {
                    const retryRes = await pool.query(
                        'SELECT id, name FROM contacts WHERE organization_id = $1 AND (phone_number = $2 OR whatsapp_lid = $2)',
                        [organization_id, from]
                    );
                    if (retryRes.rows.length > 0) {
                        contactId = retryRes.rows[0].id;
                        currentContactName = retryRes.rows[0].name;
                    } else {
                        console.error(`[Webhook] Failed to resolve contact ID for ${from} after race condition.`);
                        return;
                    }
                }
            }
        }

        console.log(`[Webhook] Contact resolved: ${contactId} (${currentContactName})`);

        req.io?.to(`org_${organization_id}`).emit('contact_updated', {
            contactId,
            name: currentContactName,
            profile_pic_url: currentContactPic
        });

        // Background PP update
        const isWaUrlExpired = (url) => {
            if (!url) return true;
            if (!url.includes('oe=')) return false;
            try {
                const oeMatch = url.match(/oe=([0-9a-fA-F]+)/);
                if (oeMatch && oeMatch[1]) {
                    const expireTimestamp = parseInt(oeMatch[1], 16) * 1000;
                    return Date.now() > (expireTimestamp - 86400000);
                }
            } catch (e) {}
            return false;
        };

        const needsNewPic = !currentContactPic || isWaUrlExpired(currentContactPic) || Math.random() < 0.05;
        if (!fromMe && needsNewPic && uuidRegex.test(sessionId)) {
            const jidToFetch = rawJid || (from + "@s.whatsapp.net");
            if (jidToFetch.includes('@')) {
                waService.getContactProfile(sessionId, jidToFetch)
                    .then(async (fetchedUrl) => {
                        if (fetchedUrl && fetchedUrl !== currentContactPic) {
                            try {
                                await pool.query('UPDATE contacts SET profile_pic_url = $1, updated_at = NOW() WHERE id = $2', [fetchedUrl, contactId]);
                                req.io?.to(`org_${organization_id}`).emit('contact_updated', {
                                    contactId,
                                    name: currentContactName,
                                    profile_pic_url: fetchedUrl
                                });
                            } catch (e) { console.error("[Background PP Update Error]", e.message); }
                        }
                    })
                    .catch(() => { });
            }
        }

        let skipAutoReply = false;

        // CHECK UNSUBSCRIBE/SUBSCRIBE KEYWORDS
        if (!fromMe && type === 'text' && text) {
            const isHandled = await checkKeywords(organization_id, contactId, text, sessionId, from);
            if (isHandled) skipAutoReply = true;
        }

        // CHECK CHAT FORM
        if (!fromMe && !skipAutoReply) {
            if ((type === 'text' && text) || (type === 'image' || type === 'document' || type === 'video')) {
                try {
                    const formResult = await formService.handleIncomingMessage(
                        organization_id,
                        contactId,
                        dbSessionId,
                        sessionId,
                        text || `[${type}]`,
                        from,
                        'whatsapp',
                        {},
                        mediaUrl,
                        mimetype
                    );
                    if (formResult && formResult.handled) {
                        skipAutoReply = true;
                        console.log(`[Webhook] Message handled by Chat Form for contact ${contactId}`);
                    }
                } catch (e) {
                    console.error("[Webhook] Form Handler Error:", e);
                }
            }
        }

        // CHAT FLOW ENGINE
        if (!fromMe && !skipAutoReply && type === 'text' && text) {
            const flowResult = await FlowEngineService.processIncomingMessage(
                organization_id,
                contactId,
                dbSessionId,
                sessionId,
                text,
                from
            );

            if (flowResult.handled) {
                skipAutoReply = true;
                console.log(`[Webhook] Handled by Chat Flow`);
            }
        }

        // AUTO REPLY SERVICE
        if (!fromMe && !skipAutoReply && type === 'text' && text) {
            const replyResult = await AutoReplyService.processIncomingMessage(
                sessionData,
                contactId,
                text,
                from,
                'whatsapp',
                { conversationId: null }
            );

            if (replyResult.handled) {
                skipAutoReply = true;
                const posSuffix = replyResult.position ? ` - Antrian ke ${replyResult.position}` : '';
                console.log(`[Webhook] Handled by AutoReply (${replyResult.type})${posSuffix}`);
            }
        }

        // 3. UPSERT CONVERSATION
        let conversationId;
        let isChatbotActive = true;
        let conversationStatus = 'open';
        let assignedTo = null;

        const convLockKey = `lock:conv:${organization_id}:${contactId}:${dbSessionId}`;
        let lockAcquired = false;
        for (let i = 0; i < 3; i++) {
            lockAcquired = await redisConnection.set(convLockKey, '1', 'NX', 'EX', 5);
            if (lockAcquired) break;
            await new Promise(r => setTimeout(r, 200));
        }

        try {
            const convCheck = await pool.query(
                'SELECT id, is_chatbot_active, status, assigned_to_agent_id FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND whatsapp_session_id = $3',
                [organization_id, contactId, dbSessionId]
            );

            if (convCheck.rows.length > 0) {
                conversationId = convCheck.rows[0].id;
                isChatbotActive = convCheck.rows[0].is_chatbot_active;
                conversationStatus = convCheck.rows[0].status;
                assignedTo = convCheck.rows[0].assigned_to_agent_id;
            } else {
                const orphanCheck = await pool.query(
                    `SELECT c.id, c.is_chatbot_active, c.status, c.assigned_to_agent_id, s.whatsapp_number as old_number, s.id as old_session_exists
                     FROM conversations c
                     LEFT JOIN whatsapp_sessions s ON c.whatsapp_session_id = s.id
                     WHERE c.organization_id = $1 AND c.contact_id = $2
                     ORDER BY c.last_message_at DESC LIMIT 1`,
                    [organization_id, contactId]
                );

                if (orphanCheck.rows.length > 0) {
                    const orphan = orphanCheck.rows[0];
                    const currentNumber = sessionData.whatsapp_number;

                    if (!orphan.old_session_exists || (orphan.old_number && orphan.old_number === currentNumber)) {
                        console.log(`[Webhook] Merging conversation ${orphan.id} to new session ${dbSessionId}`);
                        await pool.query('UPDATE conversations SET whatsapp_session_id = $1 WHERE id = $2', [dbSessionId, orphan.id]);

                        conversationId = orphan.id;
                        isChatbotActive = orphan.is_chatbot_active;
                        conversationStatus = orphan.status;
                        assignedTo = orphan.assigned_to_agent_id;
                    }
                }

                if (!conversationId) {
                    const inboxId = await getInboxIdForDevice(dbSessionId, 'whatsapp');

                    const insertConv = await pool.query(
                        `INSERT INTO conversations (organization_id, contact_id, whatsapp_session_id, inbox_id, last_message, last_message_at, is_chatbot_active, unread_count, status, assigned_to_agent_id)
                         VALUES ($1, $2, $3, $4, $5, NOW(), true, 0, 'open', $6)
                         ON CONFLICT DO NOTHING
                         RETURNING id, is_chatbot_active, status`,
                        [organization_id, contactId, dbSessionId, inboxId, text, groupAssignedAgentId]
                    );

                    if (insertConv.rows.length > 0) {
                        conversationId = insertConv.rows[0].id;
                        isChatbotActive = insertConv.rows[0].is_chatbot_active;
                        conversationStatus = insertConv.rows[0].status;
                        if (groupAssignedAgentId) {
                            assignedTo = groupAssignedAgentId;
                        }
                        autoAssignConversation(organization_id, conversationId, req.io, 'CS', 'whatsapp', inboxId).catch(err => console.error('[WAWebhook] autoAssign failed:', err.message));
                        initTicket(organization_id, conversationId).catch(err => console.error('[WAWebhook] initTicket failed:', err.message));
                    } else {
                        const retryFetch = await pool.query(
                            'SELECT id, is_chatbot_active, status, assigned_to_agent_id FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND whatsapp_session_id = $3',
                            [organization_id, contactId, dbSessionId]
                        );
                        if (retryFetch.rows.length > 0) {
                            conversationId = retryFetch.rows[0].id;
                            isChatbotActive = retryFetch.rows[0].is_chatbot_active;
                            conversationStatus = retryFetch.rows[0].status;
                            assignedTo = retryFetch.rows[0].assigned_to_agent_id;
                        }
                    }
                }
            }
        } finally {
            if (lockAcquired) await redisConnection.del(convLockKey);
        }

        if (!conversationId) {
            console.error("[Webhook] Failed to resolve conversation ID");
            return;
        }

        console.log(`[Webhook] Conversation resolved: ${conversationId}`);

        // 4. ATOMIC DB INSERT MESSAGE
        const isOwn = fromMe === true;
        let messageTime;
        try {
            const tsNum = parseInt(timestamp);
            const epoch = tsNum > 1000000000000 ? tsNum : tsNum * 1000;
            messageTime = new Date(epoch);
            if (isNaN(messageTime.getTime())) messageTime = new Date();
        } catch (e) { messageTime = new Date(); }

        try {
            const isForwardedMsg = req.body.isForwarded === true;
            const isWAEcho = req.body._isWAEcho === true;
            let initialStatus = isOwn ? (isForwardedMsg || isWAEcho ? 'sent' : 'pending') : 'received';

            const msgRes = await pool.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at, quoted_message, is_forwarded, is_wa_echo, sender)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (wa_message_id) DO NOTHING
                 RETURNING *`,
                [conversationId, organization_id, isOwn, type || 'text', text || '', mediaUrl || null, initialStatus, waMessageId, messageTime, quotedMessageText, isForwardedMsg, isWAEcho, messageSender]
            );

            if (msgRes.rows.length > 0) {
                try {
                    const queuedAck = await redisConnection.get(`queued_ack:${waMessageId}`);
                    if (queuedAck) {
                        await pool.query('UPDATE messages SET status = $1 WHERE wa_message_id = $2', [queuedAck, waMessageId]);
                        initialStatus = queuedAck;
                        await redisConnection.del(`queued_ack:${waMessageId}`);
                    }
                } catch (rErr) {}
            }

            if (msgRes.rows.length > 0 && isOwn && waMessageId) {
                try {
                    const pendingData = {
                        orgId: organization_id,
                        conversationId: conversationId,
                        fromMe: true,
                        timestamp: Date.now()
                    };
                    await redisConnection.setex(`pending_status:${waMessageId}`, 60, JSON.stringify(pendingData));
                } catch (redisErr) {
                    console.warn(`[MessageAck] Failed to store pending_status in Redis: ${redisErr.message}`);
                }
            }

            if (msgRes.rows.length === 0) {
                console.log(`[DEDUPE-DB-ATOMIC] Message ${waMessageId} skipped (duplicate).`);
                try {
                    const existingMsgRes = await pool.query(
                        `SELECT m.id, c.contact_id, ct.phone_number as old_phone
                         FROM messages m
                         JOIN conversations c ON m.conversation_id = c.id
                         JOIN contacts ct ON c.contact_id = ct.id
                         WHERE m.wa_message_id = $1`,
                        [waMessageId]
                    );

                    if (existingMsgRes.rows.length > 0) {
                        const existingMsg = existingMsgRes.rows[0];
                        const oldPhone = existingMsg.old_phone;
                        const oldContactId = existingMsg.contact_id;

                        if (oldPhone && oldPhone.includes('@lid')) {
                            await pool.query(
                                'UPDATE conversations SET contact_id = $1 WHERE contact_id = $2 AND organization_id = $3',
                                [contactId, oldContactId, organization_id]
                            );
                            await pool.query(
                                'DELETE FROM contacts WHERE id = $1 AND organization_id = $2',
                                [oldContactId, organization_id]
                            );
                            await pool.query(
                                'UPDATE messages SET conversation_id = $1 WHERE id = $2',
                                [conversationId, existingMsg.id]
                            );
                            req.io?.to(`org_${organization_id}`).emit('contact_merged', {
                                oldId: oldContactId,
                                newId: contactId,
                                newPhone: from
                            });
                        }
                    }
                } catch (healErr) {
                    console.error('[ON-THE-FLY-HEAL] Error:', healErr.message);
                }
                return;
            }

            const newMessage = msgRes.rows[0];

            if (!isOwn) {
                const sentRes = await pool.query(
                    `UPDATE messages SET status = 'delivered'
                     WHERE conversation_id = $1 AND from_me = true AND status IN ('pending', 'sent')
                     RETURNING wa_message_id`,
                    [conversationId]
                );
                if (sentRes.rows.length > 0) {
                    await pool.query(
                        `UPDATE conversations SET last_message_status = 'delivered' WHERE id = $1 AND last_message_from_me = true AND last_message_status IN ('pending', 'sent')`,
                        [conversationId]
                    );
                }
                for (const row of sentRes.rows) {
                    req.io?.to(`org_${organization_id}`).emit('message_status_update', {
                        messageId: row.wa_message_id,
                        waMessageId: row.wa_message_id,
                        status: 'delivered',
                        conversationId,
                    });
                }
            }

            // BROADCAST REPLY TRACKING & AGENT ASSIGNMENT
            if (!isOwn) {
                try {
                    const contactWithAgent = await pool.query(
                        'SELECT last_broadcast_id, last_broadcast_at, last_broadcast_assigned_agent_id FROM contacts WHERE id = $1',
                        [contactId]
                    );

                    if (contactWithAgent.rows.length > 0) {
                        const { last_broadcast_id, last_broadcast_at, last_broadcast_assigned_agent_id } = contactWithAgent.rows[0];

                        if (last_broadcast_id && last_broadcast_at && last_broadcast_assigned_agent_id) {
                            const hoursSinceBroadcast = (new Date() - new Date(last_broadcast_at)) / (1000 * 60 * 60);

                            if (hoursSinceBroadcast <= 24) {
                                const agentCheck = await pool.query(
                                    'SELECT id, name FROM users WHERE id = $1 AND organization_id = $2 AND is_active = true',
                                    [last_broadcast_assigned_agent_id, organization_id]
                                );

                                if (agentCheck.rows.length > 0) {
                                    await pool.query(
                                        `UPDATE conversations SET assigned_to_agent_id = $1, assigned_at = NOW(), is_chatbot_active = false
                                         WHERE id = $2 AND organization_id = $3`,
                                        [last_broadcast_assigned_agent_id, conversationId, organization_id]
                                    );

                                    req.io?.to(`org_${organization_id}`).emit('conversation_assigned', {
                                        conversationId,
                                        assignedTo: last_broadcast_assigned_agent_id,
                                        assignedBy: 'broadcast'
                                    });
                                }

                                const bcRes = await pool.query('SELECT name FROM broadcasts WHERE id = $1', [last_broadcast_id]);
                                const bcName = bcRes.rows.length > 0 ? bcRes.rows[0].name : `ID: ${last_broadcast_id}`;
                                const noteContent = `🚀 Kontak ini membalas setelah menerima Broadcast: *${bcName}*. Obrolan telah di-assign ke agent: *${agentCheck.rows[0]?.name || 'Agent'}*`;
                                await pool.query(
                                    `INSERT INTO agent_notes (organization_id, conversation_id, created_by, note)
                                     VALUES ($1, $2, NULL, $3)`,
                                    [organization_id, conversationId, noteContent]
                                );

                                await pool.query(
                                    'UPDATE contacts SET last_broadcast_id = NULL, last_broadcast_at = NULL, last_broadcast_assigned_agent_id = NULL WHERE id = $1',
                                    [contactId]
                                );

                                req.io?.to(`org_${organization_id}`).emit('conversation_updated', { id: conversationId });
                            } else {
                                await pool.query(
                                    'UPDATE contacts SET last_broadcast_id = NULL, last_broadcast_at = NULL, last_broadcast_assigned_agent_id = NULL WHERE id = $1',
                                    [contactId]
                                );
                            }
                        } else if (last_broadcast_id && last_broadcast_at) {
                            const hoursSinceBroadcast = (new Date() - new Date(last_broadcast_at)) / (1000 * 60 * 60);
                            if (hoursSinceBroadcast <= 24) {
                                const bcRes = await pool.query('SELECT name FROM broadcasts WHERE id = $1', [last_broadcast_id]);
                                const bcName = bcRes.rows.length > 0 ? bcRes.rows[0].name : `ID: ${last_broadcast_id}`;
                                const noteContent = `💡 Kontak ini membalas setelah menerima Broadcast: *${bcName}*`;
                                await pool.query(
                                    `INSERT INTO agent_notes (organization_id, conversation_id, created_by, note)
                                     VALUES ($1, $2, NULL, $3)`,
                                    [organization_id, conversationId, noteContent]
                                );

                                await pool.query(
                                    'UPDATE contacts SET last_broadcast_id = NULL, last_broadcast_at = NULL WHERE id = $1',
                                    [contactId]
                                );

                                req.io?.to(`org_${organization_id}`).emit('conversation_updated', { id: conversationId });
                            }
                        }
                    }
                } catch (bcErr) {
                    console.error('[Webhook] Broadcast reply tracking error:', bcErr.message);
                }
            }

            let previewText;
            if (type === 'contact') {
                try {
                    const contactData = mediaUrl ? JSON.parse(mediaUrl) : {};
                    previewText = `[Contact] ${contactData.name || 'Shared contact'}`;
                } catch { previewText = '[Contact] Shared contact'; }
            } else if (type === 'poll') {
                try {
                    const pollData = mediaUrl ? JSON.parse(mediaUrl) : {};
                    previewText = `[Poll] ${pollData.title || 'New poll'}`;
                } catch { previewText = '[Poll] New poll'; }
            } else if (type === 'event') {
                try {
                    const eventData = mediaUrl ? JSON.parse(mediaUrl) : {};
                    previewText = `[Event] ${eventData.name || 'New event'}`;
                } catch { previewText = '[Event] New event'; }
            } else if (type === 'location') {
                previewText = '[Location] Shared location';
            } else if (type !== 'text') {
                previewText = `[${type.toUpperCase()}]`;
            } else {
                previewText = text;
            }

            let statusUpdate = !isOwn ? 'open' : conversationStatus;
            let isBotMsg = isOwn ? await AutoReplyService.checkIsBotMessage(organization_id, from, text) : false;

            if (!isBotMsg) {
                await pool.query(
                    `UPDATE conversations SET last_message = $1, last_message_at = $6, unread_count = unread_count + $2, status = $3, is_chatbot_active = $4, last_message_from_me = $7, last_message_status = $8 WHERE id = $5`,
                    [previewText, isOwn ? 0 : 1, statusUpdate, !isOwn ? isChatbotActive : false, conversationId, messageTime, isOwn, 'sent']
                );
            }

            if (req.io) {
                req.io.to(`org_${organization_id}`).emit('new_message', {
                    conversationId,
                    message: newMessage,
                    assigned_to: assignedTo,
                    sessionId: sessionId
                });
            }

            // Background Async Tasks
            (async () => {
                try {
                    if (!isOwn) {
                        const sentRes = await pool.query(
                            `UPDATE messages SET status = 'delivered' WHERE conversation_id = $1 AND from_me = true AND status IN ('pending','sent') RETURNING wa_message_id`,
                            [conversationId]
                        );
                        if (sentRes.rows.length > 0) {
                            await pool.query(
                                `UPDATE conversations SET last_message_status = 'delivered' WHERE id = $1 AND last_message_from_me = true AND last_message_status IN ('pending', 'sent')`,
                                [conversationId]
                            );
                        }
                        for (const row of sentRes.rows) {
                            req.io?.to(`org_${organization_id}`).emit('message_status_update', {
                                messageId: row.wa_message_id, waMessageId: row.wa_message_id, status: 'delivered', conversationId,
                            });
                        }
                    }

                    dispatchOrgEvent(organization_id, 'message.received', { conversationId, message: newMessage }).catch(() => {});

                    if (!isOwn) {
                        try {
                            const isFirst = await isContactFirstMessage(organization_id, contactId);
                            await processAndApplyAutoLabels(organization_id, contactId, conversationId, 'whatsapp', text, isFirst);
                        } catch (e) { }
                    }

                    let analysisResult = null;
                    if (!isOwn && text) {
                        try {
                            analysisResult = await analyzeMessage(text, organization_id);
                            await persistAnalysis(conversationId, newMessage.id, analysisResult, organization_id);
                            if (analysisResult.urgency.isUrgent) {
                                req.io?.to(`org_${organization_id}`).emit('conversation_urgent', { conversationId, urgencyScore: analysisResult.urgency.score, reason: analysisResult.urgency.reason });
                            }
                        } catch (e) { }
                    }

                    fcmService.sendNewMessageNotification(organization_id, assignedTo, conversationId, currentContactName || from, previewText, mediaUrl).catch(() => {});

                    if (isChatbotActive && !isOwn && !skipAutoReply) {
                        try {
                            const botLockKey = `bot_lock:${waMessageId}`;
                            if (!await redisConnection.set(botLockKey, '1', 'NX', 'EX', 60)) return;

                            const spamLimitKey = `ai_spam:${conversationId}`;
                            const spamCount = await redisConnection.incr(spamLimitKey);
                            if (spamCount === 1) {
                                await redisConnection.expire(spamLimitKey, 10);
                            }
                            if (spamCount > 2) {
                                console.warn(`[AI-Spam] Terlalu banyak chat dari ${conversationId}, AI dilewati.`);
                                return;
                            }

                            if (analysisResult && (analysisResult.sentiment.label === 'angry' || analysisResult.urgency.isUrgent)) {
                                await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                                req.io?.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true, reason: 'Negative Sentiment / Urgent' });
                                
                                const escText = "Mohon maaf atas ketidaknyamanan ini. Saya sedang menyambungkan Anda dengan staf/manajer kami untuk penanganan segera.";
                                const escMsgId = `bot.esc.${crypto.randomUUID()}`;
                                await pool.query('INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)', [conversationId, organization_id, 'text', escText, 'sent', escMsgId]);
                                req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId, message: { id: escMsgId, content: escText, type: 'text', from_me: true, status: 'sent' }});
                                
                                await waService.sendText(sessionId, from, escText);
                                await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), last_message_from_me = true, last_message_status = 'sent' WHERE id = $2`, [escText, conversationId]);
                                return;
                            }

                            const { withinHours, outsideMode, offlineMessage } = await isWithinWorkingHours(organization_id);
                            if (!withinHours && outsideMode === 'message' && offlineMessage) {
                                await waService.sendText(sessionId, from, offlineMessage);
                            }

                            const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
                            if (!access.allowed) return;

                            const flowText = text || `[${type.toUpperCase()}]`;
                            const flowResult = await processFlow(organization_id, conversationId, from, sessionId, req.io, flowText);
                            if (flowResult.handled) return;

                            if (type !== 'text' || !text) return;
                            const botCacheKey = `bot_settings:${dbSessionId}`;
                            let bot;
                            const cachedBot = await redisConnection.get(botCacheKey);
                            
                            if (cachedBot) {
                                bot = JSON.parse(cachedBot);
                            } else {
                                let botRes = await pool.query('SELECT * FROM chatbot_settings WHERE session_id = $1 AND is_active = true', [sessionId]);
                                if (botRes.rows.length === 0) {
                                    const devRes = await pool.query(`SELECT cs.* FROM chatbot_settings cs JOIN whatsapp_sessions ws ON cs.session_id = ws.session_id WHERE ws.id = $1 AND cs.is_active = true`, [dbSessionId]);
                                    if (devRes.rows.length > 0) botRes = devRes;
                                }
                                if (botRes.rows.length === 0) {
                                    await redisConnection.setex(botCacheKey, 30, JSON.stringify({ _inactive: true }));
                                    return;
                                }
                                bot = botRes.rows[0];
                                await redisConnection.setex(botCacheKey, 30, JSON.stringify(bot));
                            }

                            if (bot._inactive) return;

                            const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversationId]);
                            const aiResponse = await generateResponse(organization_id, text, historyRes.rows.reverse(), bot, '', { name: currentContactName || from, phone_number: from });

                            if (aiResponse === "[ESCALATE]") {
                                await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                                req.io?.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true });
                                
                                const escText = "Mohon tunggu sebentar, saya sambungkan dengan staf admin kami.";
                                const escMsgId = `bot.esc.${crypto.randomUUID()}`;
                                await pool.query('INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)', [conversationId, organization_id, 'text', escText, 'sent', escMsgId]);
                                req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId, message: { id: escMsgId, content: escText, type: 'text', from_me: true, status: 'sent' }});
                                
                                await waService.sendText(sessionId, from, escText);
                                await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), last_message_from_me = true, last_message_status = 'sent' WHERE id = $2`, [escText, conversationId]);
                            } else if (aiResponse) {
                                const botMsgId = `bot.res.${crypto.randomUUID()}`;
                                await pool.query('INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)', [conversationId, organization_id, 'text', aiResponse, 'sent', botMsgId]);
                                req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId, message: { id: botMsgId, content: aiResponse, type: 'text', from_me: true, status: 'sent' }});
                                await waService.sendText(sessionId, from, aiResponse);
                                await pool.query(`UPDATE conversations SET last_message = $1, last_message_at = NOW(), last_message_from_me = true, last_message_status = 'sent' WHERE id = $2`, [aiResponse, conversationId]);
                            }
                        } catch (aiError) {
                            console.error("[AI-LOGIC-ERROR]", aiError.message);
                        }
                    }
                } catch (err) {
                    console.error("[Webhook] Background error:", err.message);
                }
            })();

            return;
        } catch (insertErr) {
            if (insertErr.code === '23505') {
                console.warn(`[DEDUPE-DB] Message ${waMessageId} already exists.`);
                return;
            }
            throw insertErr;
        }
    } catch (err) {
        console.error("[Webhook] handleIncomingMessage ERROR:", err);
        console.error("[Webhook] Stack:", err.stack);
        if (res && !res.headersSent) res.sendStatus(500);
    } finally {
        console.log(`[Webhook] === handleIncomingMessage END ===`);
    }
};
