import pool from '../../config/db.js';
import * as waService from '../../services/waGatewayService.js';
import MetaService from '../../services/MetaService.js';
import MessengerService from '../../services/MessengerService.js';
import InstagramService from '../../services/InstagramService.js';
import TelegramService from '../../services/TelegramService.js';
import { sendOutboundEmail } from '../../services/channels/emailChannelService.js';
import { sendTikTokMessage } from '../../services/channels/tiktokChannelService.js';
import { sendLineMessage } from '../../services/channels/lineChannelService.js';
import { sendShopeeMessage } from '../../services/channels/shopeeChannelService.js';
import { sendTokopediaMessage } from '../../services/channels/tokopediaChannelService.js';
import redisConnection from '../../config/redis.js';
import crypto from 'crypto';

export const getMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const { organization_id } = req.user;
        const { limit = 50, before, after, load_all } = req.query;

        const check = await pool.query(
            'SELECT id, contact_id FROM conversations WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        const contactId = check.rows[0].contact_id;
        const convId = parseInt(id);
        const pageLimit = Math.min(parseInt(limit) || 50, 100);

        const totalMessages = 0;

        let messages = [];
        let hasMoreBefore = false;
        let hasMoreAfter = false;
        let loadedBefore = 0;
        let loadedAfter = 0;

        if (load_all === 'true') {
            const result = await pool.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 LEFT JOIN users u ON m.sender_id = u.id
                 JOIN conversations c ON m.conversation_id = c.id
                 WHERE c.contact_id = $1 AND c.organization_id = $2
                 ORDER BY m.created_at ASC`,
                [contactId, organization_id]
            );
            messages = result.rows;
        } else if (before) {
            const result = await pool.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 LEFT JOIN users u ON m.sender_id = u.id
                 JOIN conversations c ON m.conversation_id = c.id
                 WHERE c.contact_id = $1 AND c.organization_id = $2
                 AND m.id < $3
                 ORDER BY m.created_at DESC
                 LIMIT $4`,
                [contactId, organization_id, parseInt(before), pageLimit]
            );
            messages = result.rows.reverse();
            hasMoreBefore = messages.length === pageLimit;
            loadedAfter = 0;
        } else if (after) {
            const result = await pool.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 LEFT JOIN users u ON m.sender_id = u.id
                 JOIN conversations c ON m.conversation_id = c.id
                 WHERE c.contact_id = $1 AND c.organization_id = $2
                 AND m.id > $3
                 ORDER BY m.created_at ASC
                 LIMIT $4`,
                [contactId, organization_id, parseInt(after), pageLimit]
            );
            messages = result.rows;
            hasMoreAfter = messages.length === pageLimit;
            loadedBefore = 0;
        } else {
            const result = await pool.query(
                `SELECT m.*, u.name as sender_name
                 FROM messages m
                 LEFT JOIN users u ON m.sender_id = u.id
                 WHERE m.conversation_id = $1
                 ORDER BY m.created_at DESC
                 LIMIT $2`,
                [convId, pageLimit]
            );
            messages = result.rows.reverse();
            hasMoreAfter = false;
            hasMoreBefore = messages.length === pageLimit;
        }

        try {
            const lastMsgRes = await pool.query(
                `SELECT m.wa_message_id, c.whatsapp_session_id, co.phone_number
                 FROM messages m
                 JOIN conversations c ON m.conversation_id = c.id
                 JOIN contacts co ON c.contact_id = co.id
                 WHERE m.conversation_id = $1 AND m.from_me = false AND m.status != 'read'
                 ORDER BY m.created_at DESC LIMIT 1`,
                [convId]
            );
            if (lastMsgRes.rows.length > 0) {
                const row = lastMsgRes.rows[0];
                if (row.whatsapp_session_id) {
                    const sessionRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1', [row.whatsapp_session_id]);
                    if (sessionRes.rows.length > 0) {
                        waService.markRead(sessionRes.rows[0].session_id, row.phone_number, row.wa_message_id).catch(() => {});
                    }
                }
            }
        } catch (e) {}

        await pool.query('UPDATE conversations SET unread_count = 0 WHERE id = $1', [convId]);
        req.io?.to(`org_${organization_id}`).emit('conversation_read', { conversationId: convId });

        res.json({
            messages,
            pagination: {
                total: totalMessages,
                loaded: messages.length,
                hasMore: { before: hasMoreBefore, after: hasMoreAfter },
                loadedCounts: { before: loadedBefore, after: loadedAfter },
                oldestId: messages[0]?.id,
                newestId: messages[messages.length - 1]?.id
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const sendMessage = async (req, res) => {
    const { id } = req.params;
    const { content, type, media_url, mimetype, filename, is_internal } = req.body;
    const { organization_id, id: userId } = req.user;

    try {
        const convRes = await pool.query(
            `SELECT c.contact_id, c.whatsapp_session_id, c.channel, c.messenger_page_id, c.instagram_account_id, c.telegram_bot_id, c.webchat_config_id,
              c.assigned_to_agent_id, c.status,
              ct.phone_number, ct.telegram_id, ct.web_visitor_id, 
              ws.session_id as wa_uuid, ws.type as device_type, ws.access_token, ws.phone_number_id,
              mp.access_token as page_access_token,
              ia.access_token as ig_access_token,
              tb.bot_token as tg_token
       FROM conversations c 
       JOIN contacts ct ON c.contact_id = ct.id
       LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
       LEFT JOIN messenger_pages mp ON c.messenger_page_id = mp.id
       LEFT JOIN instagram_accounts ia ON c.instagram_account_id = ia.id
       LEFT JOIN telegram_bots tb ON c.telegram_bot_id = tb.id
       WHERE c.id = $1 AND c.organization_id = $2`,
            [id, organization_id]
        );

        if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        const sessionData = convRes.rows[0];

        const senderRes = await pool.query("SELECT role, division FROM users WHERE id = $1", [userId]);
        const sender = senderRes.rows[0];

        if (sender && sender.role !== 'super_admin' && sender.role !== 'admin_member') {
            const senderDiv = sender.division;
            const assignedAgentId = sessionData.assigned_to_agent_id;

            if (assignedAgentId && assignedAgentId !== userId) {
                return res.status(403).json({ error: "ACCESS_DENIED", message: "Access Denied: This chat is assigned to another agent. Ask them to transfer it first." });
            }

            if (!assignedAgentId && sessionData.contact_id) {
                const qRes = await pool.query("SELECT division FROM queues WHERE contact_id = $1 AND status = 'waiting' ORDER BY created_at DESC LIMIT 1", [sessionData.contact_id]);
                if (qRes.rows.length > 0) {
                    const targetDiv = qRes.rows[0].division;
                    if (targetDiv && senderDiv !== targetDiv) {
                        return res.status(403).json({ error: "ACCESS_DENIED", message: `Access Denied: Customer is waiting for ${targetDiv} division.` });
                    }
                }
            }
        }

        const { wa_uuid, phone_number, telegram_id, whatsapp_session_id, web_visitor_id, device_type, channel, page_access_token, ig_access_token, tg_token } = sessionData;

        const appBaseUrl = (process.env.APP_URL || process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const fullMediaUrl = media_url ? (media_url.startsWith('http') ? media_url : `${appBaseUrl}${media_url}`) : null;

        let providerMessageId = null;

        if (!sessionData.assigned_to_agent_id || sessionData.status === 'needs_agent') {
            await pool.query(
                "UPDATE conversations SET assigned_to_agent_id = $1, status = 'open' WHERE id = $2",
                [userId, id]
            );

            if (sessionData.contact_id) {
                await pool.query(
                    "DELETE FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting'",
                    [organization_id, sessionData.contact_id]
                );
            }

            const agentName = (await pool.query('SELECT name FROM users WHERE id = $1', [userId])).rows[0]?.name;
            req.io?.to(`org_${organization_id}`).emit('conversation_assigned', {
                conversationId: id,
                assignedTo: userId,
                agentName
            });
        }

        if (is_internal) {
            const pendingMsgId = `internal-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
            const msgResInternal = await pool.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, wa_message_id, status, sender_id, is_internal)
                 VALUES ($1, $2, true, $3, $4, $5, $6, 'sent', $7, true)
                 RETURNING *`,
                [id, organization_id, type || 'text', content || '', fullMediaUrl || null, pendingMsgId, userId]
            );
            const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
            const internalMsg = msgResInternal.rows[0];
            if (internalMsg) {
                internalMsg.sender_name = userRes.rows[0]?.name || 'Agent';
            }
            
            req.io?.to(`org_${organization_id}`).emit('new_message', {
                conversationId: id,
                message: internalMsg
            });
            
            return res.json({ success: true, message: internalMsg });
        }

        if (channel === 'telegram') {
            if (!tg_token) return res.status(400).json({ error: "Bot token missing" });
            const chatId = telegram_id || phone_number;
            let tgRes;
            if (fullMediaUrl) {
                if (type === 'image') tgRes = await TelegramService.sendPhoto(tg_token, chatId, fullMediaUrl, content);
                else tgRes = await TelegramService.sendDocument(tg_token, chatId, fullMediaUrl, content);
            } else {
                tgRes = await TelegramService.sendMessage(tg_token, chatId, content);
            }
            if (tgRes && tgRes.message_id) providerMessageId = `tg-${tgRes.message_id}`;
        }
        else if (channel === 'instagram') {
            if (!ig_access_token) return res.status(400).json({ error: "IG Account token missing" });
            const igRes = await InstagramService.sendMessage(ig_access_token, phone_number, content, fullMediaUrl, type);
            if (igRes && igRes.message_id) providerMessageId = igRes.message_id;
        }
        else if (channel === 'email') {
            const emailRes = await sendOutboundEmail({
                organizationId: organization_id,
                to: phone_number,
                subject: 'Customer Support Response',
                body: content,
                html: fullMediaUrl ? `<p>${(content || '').replace(/\n/g, '<br/>')}</p><p><a href="${fullMediaUrl}">Attachment</a></p>` : undefined
            });
            providerMessageId = emailRes.messageId || `email-${Date.now()}`;
        }
        else if (channel === 'tiktok') {
            const ttRes = await sendTikTokMessage({
                organizationId: organization_id,
                recipientOpenId: phone_number,
                text: content,
                mediaUrl: fullMediaUrl
            });
            providerMessageId = ttRes.messageId || `tt-${Date.now()}`;
        }
        else if (channel === 'line') {
            const lineRes = await sendLineMessage({
                organizationId: organization_id,
                lineUserId: phone_number,
                text: content,
                mediaUrl: fullMediaUrl
            });
            providerMessageId = lineRes.messageId || `line-${Date.now()}`;
        }
        else if (channel === 'shopee') {
            const shopeeRes = await sendShopeeMessage({
                organizationId: organization_id,
                recipientId: phone_number,
                text: content,
                mediaUrl: fullMediaUrl
            });
            providerMessageId = shopeeRes.message_id || `shopee-${Date.now()}`;
        }
        else if (channel === 'tokopedia') {
            const tokpedRes = await sendTokopediaMessage({
                organizationId: organization_id,
                msgId: phone_number,
                text: content,
                mediaUrl: fullMediaUrl
            });
            providerMessageId = tokpedRes.message_id || `tokopedia-${Date.now()}`;
        }
        else if (channel === 'webchat') {
            providerMessageId = `web-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        }
        else if (!whatsapp_session_id && !channel) {
            return res.status(400).json({ error: "No connected session for this chat" });
        }
        else if (whatsapp_session_id && !wa_uuid) {
            return res.status(400).json({ error: "WhatsApp session not found. Please reconnect your device." });
        }
        else if (device_type === 'official') {
            const metaRes = await MetaService.sendMessage(
                {
                    access_token: sessionData.access_token,
                    phone_number_id: sessionData.phone_number_id,
                    organization_id
                },
                phone_number,
                type === 'text' ? 'text' : type,
                content,
                fullMediaUrl
            );
            if (metaRes && metaRes.messages && metaRes.messages.length > 0) {
                providerMessageId = metaRes.messages[0].id;
            }
        }
        else if (wa_uuid) {
            let waPhone = String(phone_number).split('@')[0].replace(/[^0-9]/g, '');
            if (waPhone.startsWith('00')) waPhone = waPhone.slice(2);
            else if (waPhone.startsWith('0')) waPhone = '62' + waPhone.slice(1);
            else if (waPhone.startsWith('8') && waPhone.length <= 12) waPhone = '62' + waPhone;

            if (content || fullMediaUrl) {
                const msgType = type || 'text';
                const textContent = (content || '').trim();
                const contentString = textContent + msgType;
                const contentHash = crypto.createHash('md5').update(contentString).digest('hex');
                const echoKey = `echo:${wa_uuid}:${waPhone}:${contentHash}`;
                await redisConnection.set(echoKey, '1', 'EX', 300);
            }

            const pendingMsgId = `pending-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
            const msgResPending = await pool.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, wa_message_id, status, sender_id)
                 VALUES ($1, $2, true, $3, $4, $5, $6, 'pending', $7)
                 ON CONFLICT (wa_message_id) DO NOTHING
                 RETURNING *`,
                [id, organization_id, type || 'text', content || '', media_url || null, pendingMsgId, userId]
            );

            let newMessagePending = msgResPending.rows[0] || null;

            if (newMessagePending) {
                const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
                newMessagePending.sender_name = userRes.rows[0]?.name;
                req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId: id, message: newMessagePending });
            }

            let sendSuccess = false;
            try {
                let sendResult;
                if (type === 'text') {
                    sendResult = await waService.sendText(wa_uuid, waPhone, content);
                } else {
                    sendResult = await waService.sendMedia(wa_uuid, waPhone, fullMediaUrl, content || '', mimetype, filename);
                }
                if (sendResult?.details?.key?.id) {
                    providerMessageId = sendResult.details.key.id;
                    sendSuccess = true;
                }
            } catch (sendErr) {
                await pool.query(
                    `UPDATE messages SET status = 'failed' WHERE wa_message_id = $1`,
                    [pendingMsgId]
                );
                req.io?.to(`org_${organization_id}`).emit('message_status_update', {
                    messageId: pendingMsgId, waMessageId: pendingMsgId, status: 'failed', conversationId: id
                });
                throw sendErr;
            }

            if (sendSuccess) {
                try {
                    await pool.query(
                        `UPDATE messages SET status = 'sent', wa_message_id = $1 WHERE wa_message_id = $2`,
                        [providerMessageId, pendingMsgId]
                    );
                } catch (updateErr) {
                    if (updateErr.code === '23505') {
                        await pool.query(`DELETE FROM messages WHERE wa_message_id = $1`, [pendingMsgId]);
                    } else {
                        throw updateErr;
                    }
                }
                
                try {
                    const pendingData = {
                        orgId: organization_id,
                        conversationId: id,
                        fromMe: true,
                        timestamp: Date.now()
                    };
                    await redisConnection.setex(`pending_status:${providerMessageId}`, 120, JSON.stringify(pendingData));
                } catch (redisErr) {}

                req.io?.to(`org_${organization_id}`).emit('message_status_update', {
                    messageId: pendingMsgId, waMessageId: providerMessageId, status: 'sent', conversationId: id
                });
                if (newMessagePending) {
                    newMessagePending.wa_message_id = providerMessageId;
                }
            }

            if (newMessagePending) {
                const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
                newMessagePending.sender_name = userRes.rows[0]?.name;
            } else {
                const existingRes = await pool.query('SELECT * FROM messages WHERE wa_message_id = $1', [providerMessageId || pendingMsgId]);
                if (existingRes.rows[0]) {
                    newMessagePending = existingRes.rows[0];
                    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
                    newMessagePending.sender_name = userRes.rows[0]?.name;
                }
            }

            const waSendNewMessage = newMessagePending;
            const previewMsg = type === 'text' ? content : `[${type.toUpperCase()}]`;
            await pool.query(
                `UPDATE conversations
                 SET last_message = $1, last_message_at = NOW(), is_chatbot_active = false, status = 'open', unread_count = 0,
                     first_reply_at = COALESCE(first_reply_at, NOW())
                 WHERE id = $2`,
                [previewMsg, id]
            );

            req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
                conversationId: id, is_chatbot_active: false, status: 'open'
            });

            return res.json(waSendNewMessage);
        } else {
            return res.status(400).json({ error: "Conversation invalid: No session linked" });
        }

        const waMessageId = providerMessageId || `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        const msgRes = await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, wa_message_id, status, sender_id)
             VALUES ($1, $2, true, $3, $4, $5, $6, 'sent', $7)
             ON CONFLICT (wa_message_id) DO NOTHING
             RETURNING *`,
            [id, organization_id, type || 'text', content || '', media_url || null, waMessageId, userId]
        );

        let newMessage = msgRes.rows.length > 0 ? msgRes.rows[0] : null;

        if (!newMessage && providerMessageId) {
            const existingRes = await pool.query('SELECT * FROM messages WHERE wa_message_id = $1', [providerMessageId]);
            newMessage = existingRes.rows[0];
        }

        if (newMessage) {
            const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
            newMessage.sender_name = userRes.rows[0]?.name;
        }

        const previewMsg = type === 'text' ? content : `[${type.toUpperCase()}]`;
        await pool.query(
            `UPDATE conversations
             SET last_message = $1, last_message_at = NOW(), is_chatbot_active = false, status = 'open', unread_count = 0,
                 first_reply_at = COALESCE(first_reply_at, NOW())
             WHERE id = $2`,
            [previewMsg, id]
        );

        req.io?.to(`org_${organization_id}`).emit('new_message', {
            conversationId: id,
            message: newMessage
        });

        if (web_visitor_id) {
            req.io?.to(`visitor_${web_visitor_id}`).emit('new_message', {
                message: newMessage
            });
        }

        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            is_chatbot_active: false,
            status: 'open'
        });

        res.json(newMessage);
    } catch (err) {
        console.error("Send Message Error:", err);
        const errMsg = (err.message || '').toLowerCase();

        if (errMsg.includes('session closed') || errMsg.includes('connection closed') || errMsg.includes('stream ended') || errMsg.includes('qr code') || errMsg.includes('socket closed')) {
            return res.status(503).json({ error: 'DEVICE_DISCONNECTED', message: "Device Disconnected: Please scan QR code again." });
        }
        if (errMsg.includes('invalid_jabber_id') || errMsg.includes('not a registered user') || errMsg.includes('number does not exist')) {
            return res.status(400).json({ error: 'INVALID_NUMBER', message: "Invalid Phone Number: This contact is not on WhatsApp." });
        }
        if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
            return res.status(504).json({ error: 'TIMEOUT', message: "Request Timed Out: Please try again." });
        }
        if (errMsg.includes('eval failure')) {
            return res.status(500).json({ error: 'EVAL_FAIL', message: "System Busy: Please try again momentarily." });
        }
        if (errMsg.includes('server overloaded')) {
            return res.status(503).json({ error: 'OVERLOAD', message: "WhatsApp Server Busy: Please wait a moment." });
        }
        if (errMsg.includes('status code 404') || errMsg.includes('not found')) {
            return res.status(503).json({ error: 'GATEWAY_NOT_FOUND', message: "WA Gateway tidak ditemukan. Pastikan konfigurasi WA_GATEWAY_URL dan WA_GATEWAY_API_KEY sudah benar." });
        }
        if (errMsg.includes('status code 401') || errMsg.includes('unauthorized') || errMsg.includes('invalid api key')) {
            return res.status(503).json({ error: 'Gateway_AUTH_FAILED', message: "Autentikasi WA Gateway gagal. Periksa WA_GATEWAY_API_KEY di konfigurasi server." });
        }
        if (errMsg.includes('econnrefused') || errMsg.includes('enotfound') || errMsg.includes('connect error')) {
            return res.status(503).json({ error: 'GATEWAY_UNREACHABLE', message: "WA Gateway tidak dapat dihubungi. Pastikan server gateway sedang berjalan." });
        }

        res.status(500).json({ error: 'SEND_FAILED', message: `Failed to send: ${err.message}` });
    }
};

export const sendStructuredMessage = async (req, res) => {
    const { conversationId, type, data } = req.body;
    const { organization_id, id: userId } = req.user;

    if (!conversationId) {
        return res.status(400).json({ error: 'conversationId diperlukan' });
    }

    if (!type || !['contact', 'location', 'poll', 'event'].includes(type)) {
        return res.status(400).json({ error: 'type tidak valid' });
    }

    try {
        const convRes = await pool.query(
            `SELECT c.*, ws.session_id as wa_uuid, ws.type as device_type, ct.phone_number
             FROM conversations c
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             LEFT JOIN contacts ct ON c.contact_id = ct.id
             WHERE c.id = $1 AND c.organization_id = $2`,
            [conversationId, organization_id]
        );

        if (convRes.rows.length === 0) {
            return res.status(404).json({ error: 'Percakapan tidak ditemukan' });
        }

        const conv = convRes.rows[0];

        if (!conv.wa_uuid) {
            return res.status(400).json({ error: 'Fitur ini hanya didukung untuk WhatsApp' });
        }

        const phone = conv.phone_number;
        if (!phone) {
            return res.status(400).json({ error: 'Nomor telepon tidak ditemukan' });
        }

        let previewText = '';
        let mediaUrl = JSON.stringify(data);

        if (type === 'contact') {
            previewText = `[Contact] ${data.name || 'Shared contact'}`;
        } else if (type === 'location') {
            previewText = '[Location] Shared location';
        } else if (type === 'poll') {
            previewText = `[Poll] ${data.title}`;
        } else if (type === 'event') {
            previewText = `[Event] ${data.name}`;
        }

        const responseMessage = previewText;
        const pendingMsgId = `struct-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const msgRes = await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, sender_id)
             VALUES ($1, $2, true, $3, $4, $5, 'pending', $6, $7)
             RETURNING *`,
            [conversationId, organization_id, type, responseMessage, mediaUrl, pendingMsgId, userId]
        );

        const newMessage = msgRes.rows[0];
        if (newMessage) {
            const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
            newMessage.sender_name = userRes.rows[0]?.name;
            req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId, message: newMessage });
        }

        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = 0 WHERE id = $2`,
            [previewText, conversationId]
        );

        res.json({ success: true, message: newMessage });
    } catch (err) {
        console.error('[StructuredMessage] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const sendRichMedia = async (req, res) => {
    const { id } = req.params;
    const { products } = req.body;
    const { organization_id, id: userId } = req.user;

    try {
        const convRes = await pool.query(
            `SELECT c.contact_id, c.whatsapp_session_id, c.channel,
              c.assigned_to_agent_id, c.status,
              ct.phone_number,
              ws.session_id as wa_uuid
       FROM conversations c 
       JOIN contacts ct ON c.contact_id = ct.id
       LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
       WHERE c.id = $1 AND c.organization_id = $2`,
            [id, organization_id]
        );

        if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        const sessionData = convRes.rows[0];

        if (!sessionData.assigned_to_agent_id || sessionData.status === 'needs_agent') {
            await pool.query("UPDATE conversations SET assigned_to_agent_id = $1, status = 'open' WHERE id = $2", [userId, id]);
        }

        const appBaseUrl = (process.env.APP_URL || process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

        for (const p of products) {
            const caption = `*${p.name}*\n${p.description || ''}\n\nHarga: ${p.currency === 'IDR' ? 'Rp ' : ''}${parseInt(p.price || 0).toLocaleString()}`.trim();
            const fullMediaUrl = p.image_url ? (p.image_url.startsWith('http') ? p.image_url : `${appBaseUrl}${p.image_url}`) : null;

            if (sessionData.channel === 'whatsapp' && sessionData.wa_uuid) {
                if (fullMediaUrl) {
                    await waService.sendMedia(sessionData.wa_uuid, sessionData.phone_number, fullMediaUrl, caption);
                } else {
                    await waService.sendText(sessionData.wa_uuid, sessionData.phone_number, caption);
                }
            } else if (sessionData.channel === 'telegram') {
                const tgToken = convRes.rows[0].tg_token;
                if (fullMediaUrl) await TelegramService.sendPhoto(tgToken, sessionData.phone_number, fullMediaUrl, caption);
                else await TelegramService.sendMessage(tgToken, sessionData.phone_number, caption);
            } else if (sessionData.channel === 'instagram') {
                const igToken = convRes.rows[0].ig_access_token;
                await InstagramService.sendMessage(igToken, sessionData.phone_number, caption, fullMediaUrl, fullMediaUrl ? 'image' : 'text');
            } else if (sessionData.channel === 'messenger') {
                const pageToken = convRes.rows[0].page_access_token;
                await MessengerService.sendMessage(pageToken, sessionData.phone_number, caption, fullMediaUrl, fullMediaUrl ? 'image' : 'text');
            }

            const dbContent = sessionData.channel === 'webchat' && fullMediaUrl ? `${caption}\n[Image: ${fullMediaUrl}]` : caption;
            
            await pool.query(
                `INSERT INTO messages (conversation_id, organization_id, sender_id, from_me, content, media_url, type, status)
                 VALUES ($1, $2, $3, true, $4, $5, $6, 'sent')`,
                [id, organization_id, userId, dbContent, fullMediaUrl, fullMediaUrl ? 'image' : 'text']
            );
            
            await new Promise(r => setTimeout(r, 1000));
        }

        req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId: id });
        return res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const sendInteractive = async (req, res) => {
    const { id } = req.params;
    const { ctas } = req.body;
    const { organization_id, id: userId } = req.user;

    try {
        const convRes = await pool.query(
            `SELECT c.contact_id, c.whatsapp_session_id, c.channel,
              c.assigned_to_agent_id, c.status,
              ct.phone_number,
              ws.session_id as wa_uuid
       FROM conversations c 
       JOIN contacts ct ON c.contact_id = ct.id
       LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
       WHERE c.id = $1 AND c.organization_id = $2`,
            [id, organization_id]
        );

        if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        const sessionData = convRes.rows[0];

        if (!sessionData.assigned_to_agent_id || sessionData.status === 'needs_agent') {
            await pool.query("UPDATE conversations SET assigned_to_agent_id = $1, status = 'open' WHERE id = $2", [userId, id]);
        }

        const buttons = ctas.map(c => ({ id: c.id, text: c.label, url: c.url, phone: c.phone, type: c.type }));
        let textContent = `Silakan pilih salah satu opsi berikut:`;
        
        let dbContent = `[Interactive CTA]\n${buttons.map(b => {
            let line = '- ' + b.text;
            if (b.url) line += ` ( ${b.url} )`;
            else if (b.phone) line += ` ( ${b.phone} )`;
            return line;
        }).join('\n')}`;

        if (sessionData.channel === 'whatsapp' && sessionData.wa_uuid) {
            await waService.sendButtons(sessionData.wa_uuid, sessionData.phone_number, textContent, 'Balas dengan pilihan Anda', buttons);
        } else {
            const fallbackText = `${textContent}\n\n${buttons.map((b, i) => {
                let line = `${i + 1}. ${b.text}`;
                if (b.url) line += `\n   🔗 ${b.url}`;
                else if (b.phone) line += `\n   📞 ${b.phone}`;
                return line;
            }).join('\n\n')}\n\n*(Balas dengan angka atau klik link di atas)*`;
            dbContent = fallbackText;

            if (sessionData.channel === 'telegram') {
                await TelegramService.sendMessage(convRes.rows[0].tg_token, sessionData.phone_number, fallbackText);
            } else if (sessionData.channel === 'instagram') {
                await InstagramService.sendMessage(convRes.rows[0].ig_access_token, sessionData.phone_number, fallbackText);
            } else if (sessionData.channel === 'messenger') {
                await MessengerService.sendMessage(convRes.rows[0].page_access_token, sessionData.phone_number, fallbackText);
            }
        }

        await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, sender_id, from_me, content, type, status)
             VALUES ($1, $2, $3, true, $4, 'text', 'sent')`,
            [id, organization_id, userId, dbContent]
        );
        
        req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId: id });
        return res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const uploadMedia = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        url: fileUrl,
        mimetype: req.file.mimetype,
        filename: req.file.originalname,
        size: req.file.size
    });
};

export const deleteMessage = async (req, res) => {
    const { id } = req.params;
    const { action } = req.query;
    const { organization_id } = req.user;

    try {
        const msgRes = await pool.query(
            `SELECT m.id, m.wa_message_id, m.from_me, m.conversation_id, 
                    c.whatsapp_session_id, ct.phone_number, ws.session_id as wa_uuid
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             JOIN contacts ct ON c.contact_id = ct.id
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             WHERE m.id = $1 AND m.organization_id = $2`,
            [id, organization_id]
        );

        if (msgRes.rows.length === 0) {
            return res.status(404).json({ error: "Message not found" });
        }

        const msgData = msgRes.rows[0];

        if (action === 'revoke') {
            if (!msgData.wa_message_id || !msgData.from_me) {
                return res.status(400).json({ error: "Only outgoing WhatsApp messages can be revoked" });
            }

            if (!msgData.wa_uuid) {
                return res.status(400).json({ error: "WhatsApp session is not active" });
            }

            const key = {
                remoteJid: msgData.phone_number,
                fromMe: msgData.from_me,
                id: msgData.wa_message_id
            };

            try {
                await waService.revokeMessage(msgData.wa_uuid, msgData.phone_number, key);
            } catch (gwErr) {
                return res.status(500).json({ error: gwErr.message || "Failed to revoke message on WhatsApp Gateway" });
            }

            await pool.query(
                `UPDATE messages SET content = '[Pesan ini telah ditarik]', type = 'revoked' WHERE id = $1`,
                [id]
            );

            req.io?.to(`org_${organization_id}`).emit('message_revoked', {
                wa_message_id: msgData.wa_message_id,
                conversation_id: msgData.conversation_id
            });

            return res.json({ message: "Message revoked" });
        } else {
            await pool.query('DELETE FROM messages WHERE id = $1', [id]);

            req.io?.to(`org_${organization_id}`).emit('message_deleted', {
                messageId: id,
                conversationId: msgData.conversation_id
            });

            return res.json({ message: "Message deleted from CRM" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const editMessage = async (req, res) => {
    const { id: messageId } = req.params;
    const { content } = req.body;
    const { organization_id } = req.user;

    if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content cannot be empty' });
    }

    try {
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE`);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`);

        const msgRes = await pool.query(
            `SELECT m.*, c.channel, c.whatsapp_session_id, ct.phone_number, ws.session_id as wa_uuid, ws.type as device_type, ws.access_token, ws.phone_number_id 
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             JOIN contacts ct ON c.contact_id = ct.id
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             WHERE m.id = $1 AND m.organization_id = $2`,
            [messageId, organization_id]
        );

        if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

        const msg = msgRes.rows[0];

        if (!msg.from_me) return res.status(403).json({ error: 'Hanya bisa mengedit pesan yang kamu kirim' });
        if (msg.type !== 'text') return res.status(400).json({ error: 'Hanya pesan teks yang bisa diedit' });

        const ageMs = Date.now() - new Date(msg.created_at).getTime();
        if (ageMs > 15 * 60 * 1000) {
            return res.status(400).json({ error: 'Pesan hanya bisa diedit dalam 15 menit setelah dikirim' });
        }

        if (msg.channel === 'whatsapp' && msg.wa_message_id) {
            let waPhone = String(msg.phone_number).split('@')[0].replace(/[^0-9]/g, '');
            if (waPhone.startsWith('00')) waPhone = waPhone.slice(2);
            else if (waPhone.startsWith('0')) waPhone = '62' + waPhone.slice(1);
            else if (waPhone.startsWith('8') && waPhone.length <= 12) waPhone = '62' + waPhone;

            if (msg.device_type === 'unofficial' && msg.wa_uuid) {
                const key = {
                    remoteJid: waPhone + '@s.whatsapp.net',
                    id: msg.wa_message_id,
                    fromMe: true
                };
                await waService.editMessage(msg.wa_uuid, waPhone, key, content.trim());
            } else if (msg.device_type === 'official') {
                return res.status(400).json({ error: 'Official WA edit message is not supported yet' });
            }
        }

        const updated = await pool.query(
            `UPDATE messages SET content = $1, is_edited = TRUE, edited_at = NOW() WHERE id = $2 RETURNING *`,
            [content.trim(), messageId]
        );

        req.io?.to(`org_${organization_id}`).emit('message_edited', {
            messageId,
            conversationId: msg.conversation_id,
            newContent: content.trim(),
            editedAt: updated.rows[0].edited_at
        });

        res.json(updated.rows[0]);
    } catch (err) {
        console.error('[EditMessage] Error:', err);
        const errMsg = err.message || '';
        if (errMsg.includes('not found') || errMsg.includes('404')) {
             return res.status(404).json({ error: 'Endpoint WA Gateway Not Found. Pastikan versi WA Gateway mendukung fitur edit.' });
        }
        res.status(500).json({ error: err.message });
    }
};

export const toggleStarMessage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const msgRes = await pool.query(
            `UPDATE messages SET is_starred = NOT COALESCE(is_starred, FALSE)
             WHERE id = $1 AND organization_id = $2
             RETURNING id, conversation_id, is_starred`,
            [id, organization_id]
        );

        if (msgRes.rows.length === 0) {
            return res.status(404).json({ error: "Message not found" });
        }

        const { id: msgId, conversation_id, is_starred } = msgRes.rows[0];

        req.io?.to(`org_${organization_id}`).emit('message_starred', {
            messageId: msgId, conversationId: conversation_id, isStarred: is_starred
        });

        res.json({ messageId: msgId, is_starred });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const togglePinMessage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const msgRes = await pool.query(
            `UPDATE messages SET is_pinned = NOT COALESCE(is_pinned, FALSE)
             WHERE id = $1 AND organization_id = $2
             RETURNING id, conversation_id, is_pinned`,
            [id, organization_id]
        );

        if (msgRes.rows.length === 0) {
            return res.status(404).json({ error: "Message not found" });
        }

        const { id: msgId, conversation_id, is_pinned } = msgRes.rows[0];

        req.io?.to(`org_${organization_id}`).emit('message_pinned', {
            messageId: msgId, conversationId: conversation_id, isPinned: is_pinned
        });

        res.json({ messageId: msgId, is_pinned });
    } catch (err) {
        console.error('[Inbox] Error toggling pin:', err);
        res.status(500).json({ error: "Gagal menyematkan pesan" });
    }
};

export const getStarredMessages = async (req, res) => {
    const { organization_id } = req.user;
    const { conversation_id } = req.query;

    try {
        let query = `
            SELECT m.*, c.whatsapp_session_id, ct.name as contact_name, ct.phone_number,
                   u.name as sender_name
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN contacts ct ON c.contact_id = ct.id
            LEFT JOIN users u ON m.sender_id = u.id
            WHERE m.organization_id = $1 AND m.is_starred = TRUE
        `;
        const params = [organization_id];

        if (conversation_id) {
            query += ` AND m.conversation_id = $2`;
            params.push(conversation_id);
        }
        query += ` ORDER BY m.created_at DESC LIMIT 200`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const retryMessage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const MAX_RETRIES = 3;

    try {
        const msgRes = await pool.query(
            `SELECT m.*, c.whatsapp_session_id, ws.session_id as wa_uuid, ct.phone_number
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             JOIN contacts ct ON c.contact_id = ct.id
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             WHERE m.id = $1 AND m.organization_id = $2 AND m.from_me = true AND m.status IN ('pending', 'failed')`,
            [id, organization_id]
        );

        if (msgRes.rows.length === 0) {
            return res.status(404).json({ error: "Message not found or not retryable (must be pending/failed outbound message)" });
        }

        const stuck = msgRes.rows[0];
        const { conversation_id: convId, content, type, media_url: mediaUrl, wa_uuid, sender_id: senderId, sender_name } = stuck;

        const currentRetry = (stuck.retry_count || 0) + 1;
        if (currentRetry > MAX_RETRIES) {
            return res.status(400).json({ error: `Maximum retries (${MAX_RETRIES}) exceeded. Message marked as permanently failed.` });
        }

        if (!wa_uuid) {
            return res.status(400).json({ error: "Cannot retry: no WhatsApp session linked" });
        }

        const phoneRaw = String(stuck.phone_number || '').replace(/[^0-9]/g, '');
        let waPhone = phoneRaw;
        if (waPhone.startsWith('00')) waPhone = waPhone.slice(2);
        else if (waPhone.startsWith('0')) waPhone = '62' + waPhone.slice(1);
        else if (waPhone.startsWith('8') && waPhone.length <= 12) waPhone = '62' + waPhone;

        await pool.query('DELETE FROM messages WHERE id = $1', [id]);
        req.io?.to(`org_${organization_id}`).emit('message_deleted', { messageId: id, conversationId: convId });
        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', { conversationId: convId });

        const pendingMsgId = `pending-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const msgType = type || 'text';

        let finalMediaUrl = mediaUrl;
        if (mediaUrl && !mediaUrl.startsWith('http')) {
            const appBaseUrl = (process.env.APP_URL || process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
            finalMediaUrl = `${appBaseUrl}${mediaUrl}`;
        }

        const insertRes = await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, wa_message_id, status, sender_id, retry_count)
             VALUES ($1, $2, true, $3, $4, $5, $6, 'pending', $7, $8)
             RETURNING *`,
            [convId, organization_id, msgType, content || '', finalMediaUrl || null, pendingMsgId, senderId, currentRetry]
        );
        const newMsg = insertRes.rows[0];
        if (newMsg) {
            newMsg.sender_name = sender_name;
        }

        req.io?.to(`org_${organization_id}`).emit('new_message', { conversationId: convId, message: newMsg });

        const sendPromise = mediaUrl
            ? waService.sendMedia(wa_uuid, waPhone, finalMediaUrl, content || '')
            : waService.sendText(wa_uuid, waPhone, content || '');

        sendPromise.then(result => {
            if (result?.details?.key?.id || result?.data?.id) {
                const realId = result.details?.key?.id || result.data?.id;
                pool.query(
                    `UPDATE messages SET status = 'sent', wa_message_id = $1 WHERE id = $2`,
                    [realId, newMsg?.id]
                ).catch(() => {});
                req.io?.to(`org_${organization_id}`).emit('message_status_update', {
                    messageId: pendingMsgId, waMessageId: realId, status: 'sent', conversationId: convId
                });
            }
        }).catch((err) => {
            console.error('[retryMessage] Send failed:', err.message);
            if (newMsg?.id) {
                pool.query(`UPDATE messages SET status = 'failed' WHERE id = $1`, [newMsg.id]).catch(() => {});
                req.io?.to(`org_${organization_id}`).emit('message_status_update', {
                    messageId: pendingMsgId, status: 'failed', conversationId: convId
                });
            }
        });

        res.json({
            message: currentRetry > 1 ? `Retry #${currentRetry} initiated` : 'Retry initiated',
            messageId: newMsg?.id || pendingMsgId,
            conversationId: convId,
            retryCount: currentRetry,
            maxRetries: MAX_RETRIES
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
