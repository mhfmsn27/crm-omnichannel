import pool from '../../config/db.js';
import * as waService from '../../services/waGatewayService.js';
import redisConnection from '../../config/redis.js';
import { dispatchToApps, dispatchOrgEvent } from '../../services/webhookDispatcher.js';
import { sendDeviceDisconnectedEmail } from '../../services/emailService.js';

export const handleQrUpdate = async (req, res, sessionId, qrCode) => {
    try {
        if (!qrCode) {
            if (res && !res.headersSent) res.sendStatus(200);
            return;
        }
        const sessionRes = await pool.query('SELECT organization_id FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
        if (sessionRes.rows.length > 0) {
            const { organization_id } = sessionRes.rows[0];
            req.io?.to(`org_${organization_id}`).emit('qr_received', { sessionId, qr: qrCode });
        }
        if (res && !res.headersSent) res.sendStatus(200);
    } catch (err) {
        console.error('[QR-UPDATE] Error:', err);
        if (res && !res.headersSent) res.sendStatus(500);
    }
};

export const handleStatusUpdate = async (req, res, sessionId, status, phone, reason, statusCode) => {
    try {
        console.log(`[StatusUpdate] session=${sessionId}, status=${status}, phone=${phone}`);
        let dbStatus = String(status).toLowerCase();
        let connectedUpdate = "";
        let isDisconnected = false;

        const isBanned = dbStatus.includes('banned') ||
            dbStatus.includes('block') ||
            dbStatus.includes('suspend') ||
            dbStatus === 'forbidden' ||
            String(reason).toLowerCase().includes('forbidden') ||
            reason === 403 ||
            statusCode === 403;

        if (isBanned) {
            dbStatus = 'terblokir';
            connectedUpdate = ", connected_at = NULL";
            isDisconnected = true;
        }
        else if (dbStatus === 'disconnected' || dbStatus === 'disconnect') {
            dbStatus = 'disconnected';
            connectedUpdate = ", connected_at = NULL";
            isDisconnected = true;
        }
        else if (dbStatus === 'connected') {
            dbStatus = 'connected';
            connectedUpdate = ", connected_at = NOW()";
        }
        else if (dbStatus.includes('fail') || dbStatus.includes('close') || dbStatus.includes('logout')) {
            dbStatus = 'disconnected';
            connectedUpdate = ", connected_at = NULL";
            isDisconnected = true;
        }
        else if (dbStatus === 'open') {
            dbStatus = 'connected';
            connectedUpdate = ", connected_at = NOW()";
        }
        else if (dbStatus.includes('qr')) dbStatus = 'created';

        let previousStatus = null;
        const currentSession = await pool.query('SELECT status, name FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
        if (currentSession.rows.length > 0) {
            previousStatus = currentSession.rows[0].status;
        }

        const result = await pool.query(
            `UPDATE whatsapp_sessions SET status = $1, whatsapp_number = COALESCE($2, whatsapp_number), updated_at = NOW() ${connectedUpdate} WHERE session_id = $3 RETURNING organization_id, name`,
            [dbStatus, phone, sessionId]
        );

        if (result.rows.length > 0) {
            const { organization_id, name: deviceName } = result.rows[0];
            req.io?.to(`org_${organization_id}`).emit('device_status_update', { sessionId, status: dbStatus, phone });

            dispatchToApps(sessionId, 'status.update', { status: dbStatus, phone });

            if (isDisconnected && previousStatus !== 'disconnected' && previousStatus !== 'terblokir') {
                try {
                    const orgUser = await pool.query('SELECT email, name FROM users WHERE organization_id = $1 ORDER BY created_at ASC LIMIT 1', [organization_id]);
                    if (orgUser.rows.length > 0) {
                        const { email, name } = orgUser.rows[0];
                        await sendDeviceDisconnectedEmail(email, name, deviceName || phone || sessionId);
                    }
                } catch (e) {
                    console.error("[WebhookController] Failed to send disconnect email:", e.message);
                }
            }
        }
        if (res && !res.headersSent) res.sendStatus(200);
    } catch (err) {
        console.error(err);
        if (res && !res.headersSent) res.sendStatus(500);
    }
};

export const BAILEYS_ACK_MAP = {
    0: 'failed',
    1: 'pending',
    2: 'sent',
    3: 'delivered',
    4: 'read',
    5: 'read'
};

export const mapBaileysAck = (ack) => {
    if (typeof ack === 'string') {
        if (['pending', 'sent', 'delivered', 'read', 'failed'].includes(ack)) return ack;
        return null;
    }
    const n = parseInt(ack, 10);
    if (isNaN(n)) return null;
    return BAILEYS_ACK_MAP[n] ?? null;
};

export const handleMessageAck = async (req, res) => {
    const body = req.body;

    let messageId = body.messageId || body.data?.key?.id;
    let rawStatus = body.status !== undefined ? body.status : body.data?.status;
    let conversationId = body.conversationId || null;

    console.log(`[MessageAck] Received: messageId=${messageId}, rawStatus=${rawStatus}, event=${body.event || body.type}`);

    if (!messageId || rawStatus == null) {
        console.log(`[MessageAck] Missing messageId or status, ignoring`);
        if (res && !res.headersSent) res.sendStatus(200);
        return;
    }

    const status = mapBaileysAck(rawStatus);
    console.log(`[MessageAck] Mapped status: ${status}`);
    if (!status) {
        console.log(`[MessageAck] Unknown status ${rawStatus}, ignoring`);
        if (res && !res.headersSent) res.sendStatus(200);
        return;
    }

    try {
        const result = await pool.query(
            `UPDATE messages SET status = $1
             WHERE wa_message_id = $2
             AND (
                 (status = 'pending' AND $1 IN ('sent', 'delivered', 'read')) OR
                 (status = 'sent' AND $1 IN ('delivered', 'read')) OR
                 (status = 'delivered' AND $1 = 'read')
             )
             RETURNING conversation_id, from_me`,
            [status, messageId]
        );

        if (result.rows.length > 0 && result.rows[0].from_me) {
            await pool.query(
                `UPDATE conversations SET last_message_status = $1 WHERE id = $2 AND last_message_from_me = true`,
                [status, result.rows[0].conversation_id]
            );
        }
        console.log(`[MessageAck] Status update: ${status}, messageId=${messageId}, rows=${result.rows.length}`);

        let orgId = null;
        let convId = conversationId;
        let fromMe = null;

        if (result.rows.length > 0) {
            const row = result.rows[0];
            convId = row.conversation_id;
            fromMe = row.from_me;
            const convLookup = await pool.query(
                'SELECT organization_id FROM conversations WHERE id = $1',
                [convId]
            );
            if (convLookup.rows.length > 0) {
                orgId = convLookup.rows[0].organization_id;
            }
        } else {
            const fetchResult = await pool.query(
                `SELECT conversation_id, from_me FROM messages WHERE wa_message_id = $1`,
                [messageId]
            );

            if (fetchResult.rows.length > 0) {
                console.log(`[MessageAck] Message ${messageId} is in DB but status update skipped (already current). Extracting IDs for socket emit.`);
                convId = fetchResult.rows[0].conversation_id;
                fromMe = fetchResult.rows[0].from_me;
                const convLookup = await pool.query(
                    'SELECT organization_id FROM conversations WHERE id = $1',
                    [convId]
                );
                if (convLookup.rows.length > 0) {
                    orgId = convLookup.rows[0].organization_id;
                }
            } else {
                console.log(`[MessageAck] Message ${messageId} not in DB yet (race condition)`);
                try {
                    const pendingStatus = await redisConnection.get(`pending_status:${messageId}`);
                    if (pendingStatus) {
                        const pending = JSON.parse(pendingStatus);
                        orgId = pending.orgId;
                        convId = pending.conversationId;
                        fromMe = pending.fromMe !== undefined ? pending.fromMe : true;
                        console.log(`[MessageAck] Found pending status for ${messageId}: org=${orgId}, conv=${convId}`);
                    }
                } catch (redisErr) {
                    console.warn(`[MessageAck] Redis lookup failed: ${redisErr.message}`);
                }
            }
        }

        if (orgId && req.io) {
            console.log(`[MessageAck] EMITTING SOCKET EVENT: messageId=${messageId}, status=${status}, convId=${convId}, orgId=${orgId}`);
            req.io.to(`org_${orgId}`).emit('message_status_update', {
                messageId,
                waMessageId: messageId,
                status,
                conversationId: convId
            });

            if (status === 'read' && convId) {
                if (fromMe === false) {
                    await pool.query('UPDATE conversations SET unread_count = 0 WHERE id = $1', [convId]);
                    req.io.to(`org_${orgId}`).emit('conversation_read', { conversationId: convId });
                }
            }

            if (convId) {
                const convLookup = await pool.query(
                    'SELECT whatsapp_session_id FROM conversations WHERE id = $1',
                    [convId]
                );
                if (convLookup.rows.length > 0 && convLookup.rows[0].whatsapp_session_id) {
                    const sessionRes = await pool.query(
                        'SELECT session_id FROM whatsapp_sessions WHERE id = $1',
                        [convLookup.rows[0].whatsapp_session_id]
                    );
                    if (sessionRes.rows.length > 0) {
                        dispatchToApps(sessionRes.rows[0].session_id, 'message.ack', { id: messageId, status });
                    }
                }
            }
        } else if (!orgId) {
            console.warn(`[MessageAck] Could not determine orgId for message ${messageId}. Saving to Redis queue.`);
            try {
                await redisConnection.setex(`queued_ack:${messageId}`, 120, status);
            } catch (rErr) {}
        }

        try {
            await pool.query(
                `UPDATE broadcast_recipients SET status = $1
                 WHERE wa_message_id = $2
                 AND (
                     (status = 'pending' AND $1 IN ('sent', 'delivered', 'read')) OR
                     (status = 'sent' AND $1 IN ('delivered', 'read')) OR
                     (status = 'delivered' AND $1 = 'read')
                 )`,
                [status, messageId]
            );
        } catch (bErr) {
            console.error('[handleMessageAck] error updating broadcast_recipients', bErr.message);
        }

        if (res && !res.headersSent) res.sendStatus(200);
    } catch (err) {
        console.error('[handleMessageAck]', err.message);
        if (res && !res.headersSent) res.sendStatus(500);
    }
};

export const checkKeywords = async (orgId, contactId, text, sessionId, from) => {
    const lowerText = text.toLowerCase().trim();

    if (lowerText === 'stop' || lowerText === 'unsubscribe') {
        await pool.query(
            'UPDATE contacts SET is_subscribed = false, unsubscribed_at = NOW() WHERE id = $1',
            [contactId]
        );

        dispatchOrgEvent(orgId, 'contact.unsubscribed', {
            contactId,
            phone: from,
            reason: 'keyword',
            keyword: lowerText
        }).catch(() => { });

        try {
            await waService.sendText(sessionId, from, "You have successfully unsubscribed. You will not receive broadcast messages from us. Reply START to subscribe again.");
        } catch (e) { }
        return true;
    }

    if (lowerText === 'start' || lowerText === 'subscribe') {
        await pool.query(
            'UPDATE contacts SET is_subscribed = true, unsubscribed_at = NULL WHERE id = $1',
            [contactId]
        );

        dispatchOrgEvent(orgId, 'contact.subscribed', {
            contactId,
            phone: from,
            reason: 'keyword',
            keyword: lowerText
        }).catch(() => { });

        try {
            await waService.sendText(sessionId, from, "You have been resubscribed to our broadcast updates. Reply STOP anytime to unsubscribe.");
        } catch (e) { }
        return true;
    }

    return false;
};
