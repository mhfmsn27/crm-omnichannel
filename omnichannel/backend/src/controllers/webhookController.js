/**
 * Webhook Controller — WhatsApp Gateway Event Router & Dispatcher
 *
 * Modularized into focused sub-modules:
 * - ./webhook/lidResolver.js (LID -> Real Phone resolution & conversation merging)
 * - ./webhook/historySyncHandler.js (Batch historical message processing)
 * - ./webhook/webhookEventHandlers.js (QR, Status, Ack, Keyword handlers)
 * - ./webhook/incomingMessageHandler.js (Core incoming message processing, auto-reply, AI routing)
 */

import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import redisConnection from '../config/redis.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { dispatchToApps } from '../services/webhookDispatcher.js';
import { uuidRegex } from '../utils/validators.js';
import { normalizeWhatsappPhone } from '../utils/phoneHelper.js';

// Modular Sub-handlers
import { resolveLidMappings, handleLidResolved } from './webhook/lidResolver.js';
import { handleHistorySync } from './webhook/historySyncHandler.js';
import { handleQrUpdate, handleStatusUpdate, handleMessageAck } from './webhook/webhookEventHandlers.js';
import { handleIncomingMessage } from './webhook/incomingMessageHandler.js';

// Re-export resolveLidMappings for external controllers (e.g. deviceController.js)
export { resolveLidMappings };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const debugLog = (msg) => {
    try {
        if (process.env.DEBUG_WEBHOOK === 'true') {
            fs.appendFileSync(path.join(__dirname, '../../webhook-debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
        }
    } catch (e) { }
};

// In-Memory LRU Cache for rapid content fingerprint checks
const recentContentFingerprints = new Map();
const MAX_CONTENT_CACHE = 2000;

const addContentFingerprint = (hash) => {
    if (recentContentFingerprints.size >= MAX_CONTENT_CACHE) {
        const firstKey = recentContentFingerprints.keys().next().value;
        recentContentFingerprints.delete(firstKey);
    }
    recentContentFingerprints.set(hash, Date.now());
};

const checkContentFingerprint = (hash) => {
    const timestamp = recentContentFingerprints.get(hash);
    if (!timestamp) return false;
    if (Date.now() - timestamp > 10000) {
        recentContentFingerprints.delete(hash);
        return false;
    }
    return true;
};

/**
 * Main Webhook Entrypoint for WhatsApp Gateway
 */
export const handleWAWebhook = async (req, res) => {
    const body = req.body;

    console.log(`[Webhook] RAW REQUEST body.type=${body.type}, body.event=${body.event}, body.instanceId=${body.instanceId}`);

    // 1. EXTRACT SESSION ID
    let sessionId = body.sessionId || body.session_id || body.instanceId || (body.data && body.data.sessionId);

    // Filter out Meta/Official Sessions
    if (sessionId && !uuidRegex.test(sessionId)) {
        if (String(sessionId).startsWith('meta-')) {
            console.log(`[Webhook] Filtered out Meta session: ${sessionId}`);
            return res.sendStatus(200);
        }
        try {
            const cleanNumber = String(sessionId).replace('@s.whatsapp.net', '').replace(/[^0-9]/g, '');
            const sessionRes = await pool.query(
                "SELECT session_id FROM whatsapp_sessions WHERE whatsapp_number = $1 AND type = 'unofficial' LIMIT 1",
                [cleanNumber]
            );
            if (sessionRes.rows.length > 0) {
                sessionId = sessionRes.rows[0].session_id;
            }
        } catch (e) { }
    }

    if (!sessionId || !uuidRegex.test(sessionId)) {
        console.log(`[Webhook] Invalid sessionId: ${sessionId}, ignoring webhook`);
        if (!res.headersSent) res.sendStatus(200);
        return;
    }

    // Acknowledge Gateway Immediately
    if (!res.headersSent) res.status(200).send('ok');

    // 2. EXTRACT DATA & FIELDS
    const data = body.data || body;
    const event = body.event || body.type || data.event || data.type;
    console.log(`[Webhook] session=${sessionId}, event=${event}, body.type=${body.type}, data.type=${data.type}`);

    // AUTO UPDATE STATUS IF MESSAGE OR HISTORY RECEIVED
    if (!event || event === 'message' || event === 'new_message' || event === 'history_sync') {
        try {
            await pool.query("UPDATE whatsapp_sessions SET status = 'connected', updated_at = NOW(), connected_at = COALESCE(connected_at, NOW()) WHERE session_id = $1", [sessionId]);
        } catch (e) { }
    }

    // 3. ROUTE SPECIAL EVENTS
    if (event === 'qr.received' || body.qr || data.qr) {
        const qr = body.qr || data.qr || (data.data && data.data.qr);
        return handleQrUpdate(req, res, sessionId, qr);
    }

    if (event === 'message.ack' || event === 'message_status_update' || (body.messageId && body.status && event !== 'new_message')) {
        return handleMessageAck(req, res);
    }

    if (event === 'lid.resolved' && Array.isArray(body.mappings) && body.mappings.length > 0) {
        handleLidResolved(req, res, sessionId, body.mappings).catch(err => {
            console.error('[lid.resolved] Error:', err.message);
        });
        return;
    }

    if (event === 'contacts.upsert' && Array.isArray(body.data)) {
        const mappings = [];
        for (const contact of body.data) {
            if (contact.lid && contact.id && !contact.id.includes('@lid')) {
                mappings.push({ lid: contact.lid, pn: contact.id });
            }
        }
        if (mappings.length > 0) {
            handleLidResolved(req, res, sessionId, mappings).catch(err => console.error('[contacts.upsert] LID Resolve Error:', err.message));
        }
        return;
    }

    // PRESENCE UPDATE
    if (event === 'presence.update' && data) {
        const presenceData = data;
        if (presenceData.id && presenceData.presences) {
            try {
                const sessionRes = await pool.query('SELECT organization_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1', [sessionId]);
                if (sessionRes.rows.length > 0) {
                    const orgId = sessionRes.rows[0].organization_id;
                    const phone = String(presenceData.id).split('@')[0];
                    const firstPresence = Object.values(presenceData.presences)[0];
                    const status = firstPresence?.lastKnownPresence || firstPresence?.lastActivity || 'available';
                    const lastActivityTs = firstPresence?.lastActivity;
                    const lastSeen = lastActivityTs ? new Date(lastActivityTs * 1000).toISOString() : null;

                    if (req.io) {
                        req.io.to(`org_${orgId}`).emit('contact_presence', {
                            sessionId,
                            phone,
                            status,
                            lastSeen
                        });
                    }
                }
            } catch (err) {
                console.error('[presence.update] Error:', err.message);
            }
        }
        if (!res.headersSent) res.sendStatus(200);
        return;
    }

    // HISTORY SYNC
    if (event === 'history_sync' && body.data) {
        const lidMappingsFromContacts = [];
        if (Array.isArray(body.data.contacts)) {
            for (const contact of body.data.contacts) {
                if (contact.lid && contact.id && !contact.id.includes('@lid')) {
                    lidMappingsFromContacts.push({ lid: contact.lid, pn: contact.id, name: contact.name || contact.notify });
                }
            }
        }

        if (Array.isArray(body.data.messages)) {
            handleHistorySync(req, res, sessionId, body.data.messages)
                .then(async () => {
                    if (lidMappingsFromContacts.length > 0) {
                        try {
                            await handleLidResolved(req, res, sessionId, lidMappingsFromContacts);
                        } catch (err) {
                            console.error('[history_sync] Post-sync LID Resolve Error:', err.message);
                        }
                    }
                })
                .catch(err => console.error('[history_sync] Error:', err.message));
        } else if (lidMappingsFromContacts.length > 0) {
            handleLidResolved(req, res, sessionId, lidMappingsFromContacts).catch(err => console.error('[history_sync] LID Resolve Error:', err.message));
        }

        // Conversations unread count sync
        if (Array.isArray(body.data.conversations)) {
            (async () => {
                try {
                    const sessionRes = await pool.query('SELECT id, organization_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1', [sessionId]);
                    if (!sessionRes.rows.length) return;
                    const { id: sessionDbId, organization_id } = sessionRes.rows[0];

                    for (const conv of body.data.conversations) {
                        if (!conv.id) continue;
                        const phone = String(conv.id).split('@')[0].replace(/[^0-9]/g, '');
                        if (!phone) continue;

                        let realPhone = phone;
                        if (realPhone.startsWith('0')) realPhone = '62' + realPhone.slice(1);
                        else if (realPhone.startsWith('8')) realPhone = '62' + realPhone;

                        const contactRes = await pool.query('SELECT id FROM contacts WHERE organization_id = $1 AND (phone_number = $2 OR phone_number = $3) LIMIT 1', [organization_id, conv.id, realPhone]);
                        if (!contactRes.rows.length) continue;

                        const unreadCount = conv.unreadCount;
                        if (unreadCount === undefined || unreadCount === null) continue;

                        const existingConv = await pool.query(
                            'SELECT id, unread_count FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND whatsapp_session_id = $3 LIMIT 1',
                            [organization_id, contactRes.rows[0].id, sessionDbId]
                        );

                        if (existingConv.rows.length > 0) {
                            const oldUnread = existingConv.rows[0].unread_count || 0;
                            await pool.query(
                                'UPDATE conversations SET unread_count = $1 WHERE organization_id = $2 AND contact_id = $3 AND whatsapp_session_id = $4',
                                [unreadCount, organization_id, contactRes.rows[0].id, sessionDbId]
                            );

                            if (req.io) {
                                if (unreadCount === 0 && oldUnread > 0) {
                                    req.io.to(`org_${organization_id}`).emit('conversation_read', { conversationId: existingConv.rows[0].id });
                                } else if (unreadCount > 0 && oldUnread === 0) {
                                    req.io.to(`org_${organization_id}`).emit('conversation_unread', { conversationId: existingConv.rows[0].id });
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('[history_sync] Conversations Sync Error:', err.message);
                }
            })();
        }
        return;
    }

    // STATUS UPDATE
    const isExplicitStatusEvent = event === 'status.update' || event === 'session.status.update';
    const isImplicitStatus = (body.status || data.status) && event !== 'new_message' && event !== 'message.ack' && !body.messageId;

    if (isExplicitStatusEvent || isImplicitStatus) {
        const status = body.status || data.status;
        if (status === 'NEED_QR' && !body.qr && !data.qr) {
            waService.getSessionQR(sessionId).then(fetchedQr => {
                if (fetchedQr) handleQrUpdate(req, null, sessionId, fetchedQr);
            }).catch(() => { });
        }
        return handleStatusUpdate(req, res, sessionId, status || event, body.phone || data.phone, body.reason || data.reason, body.statusCode || data.statusCode);
    }

    // 4. MESSAGE EXTRACTION & NORMALIZATION
    const key = data.key || body.key;
    const messageObj = data.message || body.message;

    if (!key && !messageObj) return;

    const isFromMe = key?.fromMe === true || body.fromMe === true;
    const waMessageId = key?.id || body.id || body.messageId;
    const timestamp = data.messageTimestamp || body.timestamp || Math.floor(Date.now() / 1000);

    debugLog(`[Incoming] Webhook received! event=${event}, sessionId=${sessionId}, fromMe=${isFromMe}, waMessageId=${waMessageId}`);

    let rawFrom;
    let remoteJid = key?.remoteJid || body.from || body.chatId;
    let messageSender = null;

    if (remoteJid && remoteJid.includes('@lid') && key?.remoteJidAlt) {
        remoteJid = key.remoteJidAlt;
    }

    if (isFromMe) {
        rawFrom = remoteJid || body.to;
    } else {
        const isGroup = remoteJid && remoteJid.endsWith('@g.us');
        if (isGroup) {
            rawFrom = remoteJid;
            messageSender = key?.participant || body.participant || body.sender;
            if (messageSender && messageSender.includes('@lid')) {
                const participantAlt = key?.participantAlt || body?.participantAlt;
                if (participantAlt && !participantAlt.includes('@lid') && !participantAlt.includes('@g.us')) {
                    messageSender = participantAlt;
                }
            }
        } else {
            rawFrom = remoteJid;
        }
    }

    if (rawFrom && rawFrom.includes('@lid') && (!remoteJid || !remoteJid.endsWith('@g.us'))) {
        const senderPn = body.senderPn || data?.senderPn;
        if (senderPn && !senderPn.includes('@lid') && !senderPn.includes('@g.us')) {
            handleLidResolved(req, res, sessionId, [{ lid: rawFrom, pn: senderPn }]).catch(() => { });
            rawFrom = senderPn;
        } else {
            const possibleJid = key?.participant || body.participant || body.sender || key?.participantAlt || key?.remoteJidAlt;
            if (possibleJid && !possibleJid.includes('@lid') && !possibleJid.includes('@g.us')) {
                handleLidResolved(req, res, sessionId, [{ lid: rawFrom, pn: possibleJid }]).catch(() => { });
                rawFrom = possibleJid;
            }
        }
    }

    if (!rawFrom || rawFrom === 'status@broadcast') {
        debugLog(`[Drop] Status broadcast or no rawFrom. rawFrom=${rawFrom}`);
        return;
    }

    let groupCompanyId = null;
    let groupAssignedAgentId = null;
    let isGroupChat = false;

    if (remoteJid && remoteJid.endsWith('@g.us')) {
        isGroupChat = true;
        try {
            const groupCheck = await pool.query('SELECT company_id, assigned_agent_id FROM registered_groups WHERE group_jid = $1 AND status = $2 LIMIT 1', [remoteJid, 'active']);
            if (groupCheck.rows.length === 0) {
                debugLog(`[Drop] Ignored non-whitelisted group message. remoteJid=${remoteJid}`);
                return;
            }
            groupCompanyId = groupCheck.rows[0].company_id;
            groupAssignedAgentId = groupCheck.rows[0].assigned_agent_id;
        } catch (err) {
            console.error(`[Webhook] Error checking registered_groups: ${err.message}`);
            return;
        }
    }

    if (rawFrom && rawFrom.includes('@lid')) {
        try {
            const sessionRes = await pool.query('SELECT organization_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1', [sessionId]);
            if (sessionRes.rows.length > 0) {
                const orgId = sessionRes.rows[0].organization_id;
                const lidDigits = String(rawFrom).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                const baseLid = lidDigits + '@lid';
                
                const dbCheck = await pool.query(
                    'SELECT phone_number FROM contacts WHERE organization_id = $1 AND (whatsapp_lid = $2 OR whatsapp_lid = $3) LIMIT 1',
                    [orgId, rawFrom, baseLid]
                );
                
                if (dbCheck.rows.length > 0) {
                    rawFrom = dbCheck.rows[0].phone_number;
                } else {
                    const waResult = await waService.resolveAllLids(sessionId);
                    const mappings = waResult?.mappings || [];
                    const foundMapping = mappings.find(m => m.lid === rawFrom || m.lid.includes(rawFrom.split('@')[0]));
                    if (foundMapping && foundMapping.pn) {
                        rawFrom = foundMapping.pn;
                    }
                }
            }
        } catch (e) {
            console.warn(`[Webhook] LID API/DB Check failed: ${e.message}`);
        }
    }

    // Handle Reactions
    if (messageObj && messageObj.reactionMessage) {
        const targetKey = messageObj.reactionMessage.key;
        const emoji = messageObj.reactionMessage.text || "";
        const targetMessageId = targetKey?.id;

        if (targetMessageId) {
            try {
                const sessionRes = await pool.query('SELECT organization_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1', [sessionId]);
                if (sessionRes.rows.length > 0) {
                    const orgId = sessionRes.rows[0].organization_id;
                    const msgCheck = await pool.query('SELECT id, reactions, conversation_id FROM messages WHERE wa_message_id = $1 AND organization_id = $2', [targetMessageId, orgId]);

                    if (msgCheck.rows.length > 0) {
                        const conversation_id = msgCheck.rows[0].conversation_id;
                        let reactions = msgCheck.rows[0].reactions || [];
                        const senderId = isFromMe ? 'me' : (rawFrom ? String(rawFrom).split('@')[0] : 'customer');

                        if (!emoji) {
                            reactions = reactions.filter(r => r.sender !== senderId);
                        } else {
                            const existingIdx = reactions.findIndex(r => r.sender === senderId);
                            if (existingIdx >= 0) reactions[existingIdx].emoji = emoji;
                            else reactions.push({ emoji, sender: senderId });
                        }

                        await pool.query('UPDATE messages SET reactions = $1::jsonb WHERE wa_message_id = $2', [JSON.stringify(reactions), targetMessageId]);
                        if (req.io) req.io.to(`org_${orgId}`).emit('message_reaction', { wa_message_id: targetMessageId, conversation_id, reactions });
                    }
                }
            } catch (e) {
                console.error('[Webhook] Reaction Error:', e.message);
            }
        }
        if (!res.headersSent) res.sendStatus(200);
        return;
    }

    let from = normalizeWhatsappPhone(rawFrom);
    if (!from) {
        debugLog(`[Drop] Failed to normalize phone. rawFrom=${rawFrom}`);
        return;
    }

    // ECHO CANCELLATION
    if (isFromMe) {
        let text = '';
        let msgType = 'text';

        if (messageObj) {
            if (messageObj.conversation) text = messageObj.conversation;
            else if (messageObj.extendedTextMessage) text = messageObj.extendedTextMessage.text;
            else if (messageObj.imageMessage) { msgType = 'image'; text = messageObj.imageMessage.caption || ""; }
            else if (messageObj.videoMessage) { msgType = 'video'; text = messageObj.videoMessage.caption || ""; }
            else if (messageObj.documentMessage) { msgType = 'document'; text = messageObj.documentMessage.caption || ""; }
            else if (messageObj.audioMessage) { msgType = 'audio'; }
            else if (messageObj.stickerMessage) { msgType = 'image'; }
        } else {
            text = body.text || data.text || '';
        }

        let echoPhone = String(from).replace(/[^0-9]/g, '');
        if (echoPhone.startsWith('0')) echoPhone = '62' + echoPhone.slice(1);
        else if (echoPhone.startsWith('8')) echoPhone = '62' + echoPhone;

        const broadcastEchoKey = `echo:${sessionId}:${echoPhone}:bc_`;
        const broadcastEchoExists = await redisConnection.exists(broadcastEchoKey);
        if (broadcastEchoExists) {
            console.log(`[Webhook] Broadcast echo detected for ${echoPhone}. Skipping.`);
            return;
        }

        const contentString = (text || '').trim() + msgType;
        const contentHash = crypto.createHash('md5').update(contentString).digest('hex');
        const echoKey = `echo:${sessionId}:${echoPhone}:${contentHash}`;
        const isEcho = await redisConnection.get(echoKey);
        if (isEcho) {
            console.log(`[Webhook] Echo detected (legacy). Skipping.`);
            return;
        }

        if (waMessageId && isFromMe) {
            try {
                const existingMsg = await pool.query(
                    `SELECT id, status, conversation_id FROM messages
                     WHERE wa_message_id = $1 AND from_me = true AND status = 'pending'
                     LIMIT 1`,
                    [waMessageId]
                );

                if (existingMsg.rows.length > 0) {
                    console.log(`[Webhook] Echo detected (wa_message_id match: ${waMessageId}). Marking existing message as sent.`);
                    await pool.query(`UPDATE messages SET status = 'sent' WHERE id = $1`, [existingMsg.rows[0].id]);
                    return;
                }

                req.body._isWAEcho = true;
            } catch (dbErr) {
                console.error(`[Webhook] Error checking echo in DB: ${dbErr.message}`);
            }
        }
    }

    // Message details extraction
    let text = '';
    let msgType = 'text';
    let hasMedia = false;
    let mimetype = null;
    let mediaUrl = null;
    let quotedMessageText = null;
    let isForwarded = false;

    if (messageObj) {
        // Message edits
        if (messageObj.protocolMessage && (messageObj.protocolMessage.type === 14 || messageObj.protocolMessage.type === 'MESSAGE_EDIT')) {
            const editKey = messageObj.protocolMessage.key;
            const editedMsgData = messageObj.protocolMessage.editedMessage;
            if (editKey && editedMsgData) {
                const originalMsgId = editKey.id;
                const newText = editedMsgData.conversation || editedMsgData.extendedTextMessage?.text || "";

                if (originalMsgId && newText) {
                    try {
                        const sessionRes = await pool.query('SELECT organization_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1', [sessionId]);
                        if (sessionRes.rows.length > 0) {
                            const orgId = sessionRes.rows[0].organization_id;
                            await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
                            await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`);

                            const updateRes = await pool.query(
                                `UPDATE messages SET content = $1, is_edited = TRUE, edited_at = NOW() WHERE wa_message_id = $2 AND organization_id = $3 RETURNING *`,
                                [newText.trim(), originalMsgId, orgId]
                            );

                            if (updateRes.rows.length > 0) {
                                const updatedMsg = updateRes.rows[0];
                                if (req.io) {
                                    req.io.to(`org_${orgId}`).emit('message_edited', {
                                        messageId: updatedMsg.id,
                                        conversationId: updatedMsg.conversation_id,
                                        newContent: updatedMsg.content,
                                        editedAt: updatedMsg.edited_at
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[Webhook] Inbound Edit Error:', e.message);
                    }
                }
            }
            if (!res.headersSent) res.sendStatus(200);
            return;
        }

        const contextInfo = messageObj.extendedTextMessage?.contextInfo
            || messageObj.imageMessage?.contextInfo
            || messageObj.videoMessage?.contextInfo
            || messageObj.documentMessage?.contextInfo
            || messageObj.audioMessage?.contextInfo
            || messageObj.contactMessage?.contextInfo
            || messageObj.locationMessage?.contextInfo;

        if (contextInfo?.isForwarded) isForwarded = true;
        if (contextInfo?.quotedMessage) {
            const qm = contextInfo.quotedMessage;
            quotedMessageText = qm.conversation || qm.extendedTextMessage?.text || qm.imageMessage?.caption || qm.videoMessage?.caption || null;
        }

        if (messageObj.conversation) text = messageObj.conversation;
        else if (messageObj.extendedTextMessage) text = messageObj.extendedTextMessage.text;
        else if (messageObj.templateButtonReplyMessage) text = messageObj.templateButtonReplyMessage.selectedDisplayText;
        else if (messageObj.buttonsResponseMessage) text = messageObj.buttonsResponseMessage.selectedDisplayText;
        else if (messageObj.listResponseMessage) text = messageObj.listResponseMessage.title;
        else if (messageObj.interactiveResponseMessage) {
            text = messageObj.interactiveResponseMessage?.body?.text || messageObj.interactiveResponseMessage?.nativeFlowResponseMessage?.name || "Interactive Response";
        }
        else if (messageObj.imageMessage) {
            msgType = 'image'; text = messageObj.imageMessage.caption || ""; hasMedia = true; mimetype = messageObj.imageMessage.mimetype;
        }
        else if (messageObj.videoMessage) {
            msgType = 'video'; text = messageObj.videoMessage.caption || ""; hasMedia = true; mimetype = messageObj.videoMessage.mimetype;
        }
        else if (messageObj.documentMessage) {
            msgType = 'document'; text = messageObj.documentMessage.caption || messageObj.documentMessage.fileName || "Document"; hasMedia = true; mimetype = messageObj.documentMessage.mimetype;
        }
        else if (messageObj.audioMessage) {
            msgType = 'audio'; hasMedia = true; mimetype = messageObj.audioMessage.mimetype;
        }
        else if (messageObj.stickerMessage) {
            msgType = 'image'; hasMedia = true; mimetype = messageObj.stickerMessage.mimetype;
        }
        else if (messageObj.contactMessage) {
            msgType = 'contact';
            const contactName = messageObj.contactMessage.displayName || 'Unknown Contact';
            const contactPhone = messageObj.contactMessage.vcard?.match(/TEL[^:]+:([^+]+)/)?.[1] || '';
            text = `[Contact] ${contactName}`;
            mediaUrl = JSON.stringify({
                name: contactName,
                phone: contactPhone,
                vcard: messageObj.contactMessage.vcard || null
            });
        }
        else if (messageObj.locationMessage) {
            msgType = 'location';
            const loc = messageObj.locationMessage;
            text = '[Location] Shared a location';
            mediaUrl = JSON.stringify({
                latitude: loc.degreesLatitude || loc.latitude,
                longitude: loc.degreesLongitude || loc.longitude,
                name: loc.name || null,
                address: loc.address || null
            });
        }
        else if (messageObj.pollCreationMessage) {
            msgType = 'poll';
            const poll = messageObj.pollCreationMessage;
            text = `[Poll] ${poll.title || 'Poll'}`;
            mediaUrl = JSON.stringify({
                title: poll.title || 'Poll',
                options: poll.options?.map(opt => ({
                    optionName: opt.optionName || opt.displayText || '',
                    pollName: opt.pollName || ''
                })) || [],
                isMultiSelect: poll.isMultiSelect || false
            });
        }
        else if (messageObj.eventCreationMessage) {
            msgType = 'event';
            const event = messageObj.eventCreationMessage;
            text = `[Event] ${event.name || 'Event'}`;
            mediaUrl = JSON.stringify({
                name: event.name || 'Event',
                description: event.description || null,
                location: event.location || null,
                startTime: event.startTime || null,
                endTime: event.endTime || null,
                organizer: event.organizer || null
            });
        }
        else if (messageObj.eventNotificationMessage) {
            msgType = 'event';
            const eventNotif = messageObj.eventNotificationMessage;
            text = `[Event Update] ${eventNotif.eventName || 'Event'}`;
            mediaUrl = JSON.stringify({
                name: eventNotif.eventName || 'Event',
                description: eventNotif.description || null,
                location: eventNotif.location || null,
                startTime: eventNotif.startTime || null,
                endTime: eventNotif.endTime || null,
                action: eventNotif.subtype || 'notification'
            });
        }
    } else {
        text = body.text || data.text || '';
    }

    if (!text && !hasMedia && msgType === 'text') {
        debugLog(`[Drop] Empty message (likely protocol/system message). rawFrom=${rawFrom}`);
        return;
    }

    let pushName = key?.pushName || body.pushName || data.pushName || body.notifyName;
    let profilePicUrl = body.profilePicUrl || data.profilePicUrl || data.senderProfilePicUrl;
    if (!profilePicUrl && body.message && body.message.senderProfilePicUrl) profilePicUrl = body.message.senderProfilePicUrl;
    else if (!profilePicUrl && data.message && data.message.senderProfilePicUrl) profilePicUrl = data.message.senderProfilePicUrl;

    // Deduplication via content fingerprint
    if (text || hasMedia) {
        const roughTs = Math.floor(timestamp / 10);
        const contentString = text + (mediaUrl || '') + msgType;
        const contentHash = crypto.createHash('md5').update(contentString).digest('hex');

        const fingerprintKey = waMessageId
            ? `dedupe:wamid:${waMessageId}`
            : `dedupe:${sessionId}:${from}:${isFromMe ? 'out' : 'in'}:${contentHash}:${roughTs}`;

        if (checkContentFingerprint(fingerprintKey)) {
            debugLog(`[Drop] In-memory fingerprint duplicate. key=${fingerprintKey}`);
            return;
        }
        const isNewContent = await redisConnection.set(fingerprintKey, '1', 'EX', 20, 'NX');
        if (!isNewContent) {
            debugLog(`[Drop] Redis fingerprint duplicate. key=${fingerprintKey}`);
            return;
        }
        addContentFingerprint(fingerprintKey);

        if (!isFromMe) {
            let warmerPhone = String(from).replace(/[^0-9]/g, '');
            if (warmerPhone.startsWith('0')) warmerPhone = '62' + warmerPhone.slice(1);
            else if (warmerPhone.startsWith('8')) warmerPhone = '62' + warmerPhone;

            const warmerIncomingKey = `warmer_incoming:${sessionId}:${warmerPhone}:${contentHash}`;
            const isWarmer = await redisConnection.get(warmerIncomingKey);
            if (isWarmer) {
                debugLog(`[Drop] Warmer Incoming dropped. warmerPhone=${warmerPhone}`);
                return;
            }
        }
    }

    // Media downloading
    if (hasMedia && sessionId && uuidRegex.test(sessionId)) {
        try {
            const messageWrapper = { key, message: messageObj };
            const mediaStream = await waService.downloadMedia(sessionId, messageWrapper);

            if (mediaStream) {
                let ext = 'bin';
                const mime = mimetype || '';
                if (mime.includes('image/jpeg') || mime.includes('image/jpg')) ext = 'jpg';
                else if (mime.includes('image/png')) ext = 'png';
                else if (mime.includes('image/webp')) ext = 'webp';
                else if (mime.includes('video/mp4')) ext = 'mp4';
                else if (mime.includes('audio/mpeg') || mime.includes('audio/mp4')) ext = 'mp3';
                else if (mime.includes('audio/ogg') || mime.includes('audio/opus')) ext = 'ogg';
                else if (mime.includes('application/pdf')) ext = 'pdf';

                const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
                const uploadDir = path.join(__dirname, '../../uploads');
                const uploadPath = path.join(uploadDir, filename);

                if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
                
                const writer = fs.createWriteStream(uploadPath);
                mediaStream.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                mediaUrl = `/uploads/${filename}`;
            }
        } catch (mediaErr) {
            console.error("[Webhook] Failed to download media:", mediaErr.message);
        }
    }

    // External developer apps webhook dispatch
    if (!isFromMe) {
        dispatchToApps(sessionId, 'message.received', {
            from: from,
            pushName: pushName,
            text: text,
            type: msgType,
            mediaUrl: mediaUrl,
            waMessageId: waMessageId,
            channel: 'whatsapp'
        });
    }

    // 5. DISPATCH TO INCOMING MESSAGE HANDLER
    const normalizedReq = {
        ...req,
        body: {
            ...req.body,
            sessionId,
            text,
            from,
            rawJid: rawFrom,
            pushName,
            profilePicUrl,
            fromMe: isFromMe,
            type: msgType,
            mediaUrl,
            waMessageId,
            timestamp,
            mimetype,
            quotedMessageText,
            isForwarded,
            isGroupChat,
            groupAssignedAgentId,
            messageSender
        }
    };

    debugLog(`[Process] Passed all checks. Dispatching to handleIncomingMessage. from=${from}, text=${text.substring(0, 50)}`);
    handleIncomingMessage(normalizedReq, res).catch(e => {
        debugLog(`[Error] handleIncomingMessage crashed: ${e.message}`);
        console.error("[Async Processor Error]", e);
    });
};
