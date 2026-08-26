import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import MetaService from '../services/MetaService.js';
import MessengerService from '../services/MessengerService.js';
import InstagramService from '../services/InstagramService.js';
import TelegramService from '../services/TelegramService.js';

// --- Scheduled Messages CRUD ---

export const getScheduledMessages = async (req, res) => {
    const { organization_id } = req.user;
    const { status = 'pending' } = req.query;

    try {
        let query = `
            SELECT sm.*, c.contact_name, c.phone_number, u.name as scheduled_by_name
            FROM scheduled_messages sm
            LEFT JOIN conversations c ON sm.conversation_id = c.id
            LEFT JOIN users u ON sm.scheduled_by = u.id
            WHERE sm.organization_id = $1
        `;
        const params = [organization_id];

        if (status !== 'all') {
            query += ` AND sm.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY sm.scheduled_at ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createScheduledMessage = async (req, res) => {
    const { organization_id, id: user_id } = req.user;
    const { conversation_id, contact_id, content, scheduled_at } = req.body;

    if (!content || !scheduled_at) {
        return res.status(400).json({ error: 'Content and scheduled_at are required' });
    }

    try {
        let finalContactId = contact_id;
        if (!finalContactId && conversation_id) {
            const conv = await pool.query('SELECT contact_id FROM conversations WHERE id = $1', [conversation_id]);
            if (conv.rows.length > 0) finalContactId = conv.rows[0].contact_id;
        }

        const result = await pool.query(
            `INSERT INTO scheduled_messages (organization_id, conversation_id, contact_id, content, scheduled_at, scheduled_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [organization_id, conversation_id || null, finalContactId || null, content, scheduled_at, user_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateScheduledMessage = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { content, scheduled_at, status } = req.body;

    try {
        let updateFields = [];
        let params = [];
        let idx = 1;

        if (content !== undefined) {
            updateFields.push(`content = $${idx++}`);
            params.push(content);
        }
        if (scheduled_at !== undefined) {
            updateFields.push(`scheduled_at = $${idx++}`);
            params.push(scheduled_at);
        }
        if (status !== undefined) {
            updateFields.push(`status = $${idx++}`);
            params.push(status);
            if (status === 'cancelled') {
                updateFields.push(`cancelled_at = NOW()`);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id, organization_id);

        const result = await pool.query(
            `UPDATE scheduled_messages SET ${updateFields.join(', ')}
             WHERE id = $${idx++} AND organization_id = $${idx}
             RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scheduled message not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteScheduledMessage = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM scheduled_messages WHERE id = $1 AND organization_id = $2 AND status = 'pending' RETURNING id`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Scheduled message not found or already sent' });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getConversationScheduledMessages = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT sm.*, u.name as scheduled_by_name
             FROM scheduled_messages sm
             LEFT JOIN users u ON sm.scheduled_by = u.id
             WHERE sm.conversation_id = $1 AND sm.organization_id = $2
             ORDER BY sm.scheduled_at DESC`,
            [id, organization_id]
        );

        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- Cron Job Handler for Sending Scheduled Messages ---
export const processScheduledMessages = async (io) => {
    try {
        const now = new Date();

        // Get messages that are due
        const dueMessages = await pool.query(
            `SELECT sm.*, 
              c.whatsapp_session_id, c.channel, c.messenger_page_id, c.instagram_account_id, c.telegram_bot_id,
              ct.phone_number, ct.telegram_id,
              ws.session_id as wa_uuid, ws.type as device_type, ws.access_token, ws.phone_number_id,
              mp.access_token as page_access_token,
              ia.access_token as ig_access_token,
              tb.bot_token as tg_token
             FROM scheduled_messages sm
             LEFT JOIN conversations c ON sm.conversation_id = c.id
             LEFT JOIN contacts ct ON c.contact_id = ct.id
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             LEFT JOIN messenger_pages mp ON c.messenger_page_id = mp.id
             LEFT JOIN instagram_accounts ia ON c.instagram_account_id = ia.id
             LEFT JOIN telegram_bots tb ON c.telegram_bot_id = tb.id
             WHERE sm.status = 'pending' AND sm.scheduled_at <= $1`,
            [now]
        );

        for (const msg of dueMessages.rows) {
            try {
                // Actually Send the Message
                const { channel, wa_uuid, phone_number, tg_token, page_access_token, ig_access_token, device_type, organization_id } = msg;

                if (channel === 'whatsapp' && wa_uuid) {
                    let toPhone = String(phone_number).split('@')[0].replace(/[^0-9]/g, '');
                    if (toPhone.startsWith('00')) toPhone = toPhone.slice(2);
                    else if (toPhone.startsWith('0')) toPhone = '62' + toPhone.slice(1);
                    else if (toPhone.startsWith('8') && toPhone.length <= 12) toPhone = '62' + toPhone;

                    if (device_type === 'official') {
                        await MetaService.sendMessage({ access_token: msg.access_token, phone_number_id: msg.phone_number_id, organization_id }, toPhone, 'text', msg.content);
                    } else {
                        await waService.sendText(wa_uuid, toPhone, msg.content);
                    }
                } else if (channel === 'telegram' && tg_token) {
                    await TelegramService.sendMessage(tg_token, msg.telegram_id || phone_number, msg.content);
                } else if (channel === 'messenger' && page_access_token) {
                    await MessengerService.sendMessage(page_access_token, phone_number, msg.content);
                } else if (channel === 'instagram' && ig_access_token) {
                    await InstagramService.sendMessage(ig_access_token, phone_number, msg.content);
                }

                const waMessageId = `sys-sched-${Date.now()}`;
                const msgInsertRes = await pool.query(
                    `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id, created_at)
                     VALUES ($1, $2, true, 'text', $3, 'sent', $4, NOW()) RETURNING *`,
                    [msg.conversation_id, msg.organization_id, msg.content, waMessageId]
                );

                // Mark as sent
                await pool.query(
                    `UPDATE scheduled_messages SET status = 'sent', sent_at = NOW() WHERE id = $1`,
                    [msg.id]
                );

                // Emit event for frontend to handle new message in UI
                if (io) {
                    io.to(`org_${msg.organization_id}`).emit('new_message', {
                        conversationId: msg.conversation_id,
                        message: msgInsertRes.rows[0]
                    });
                }
            } catch (e) {
                console.error(`[ScheduledMsg] Error processing message ${msg.id}:`, e.message);
                await pool.query(
                    `UPDATE scheduled_messages SET status = 'failed' WHERE id = $1`,
                    [msg.id]
                );
            }
        }
    } catch (e) {
        console.error('[ScheduledMsg] processScheduledMessages error:', e.message);
    }
};

