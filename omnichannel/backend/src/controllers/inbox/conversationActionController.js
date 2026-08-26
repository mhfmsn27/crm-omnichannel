import pool from '../../config/db.js';
import * as waService from '../../services/waGatewayService.js';
import MetaService from '../../services/MetaService.js';
import MessengerService from '../../services/MessengerService.js';
import InstagramService from '../../services/InstagramService.js';
import TelegramService from '../../services/TelegramService.js';
import redisConnection from '../../config/redis.js';
import crypto from 'crypto';
import { dispatchOrgEvent } from '../../services/webhookDispatcher.js';

export const markAsRead = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        try {
            const lastMsgRes = await pool.query(
                `SELECT m.wa_message_id, c.whatsapp_session_id, co.phone_number 
                 FROM messages m 
                 JOIN conversations c ON m.conversation_id = c.id
                 JOIN contacts co ON c.contact_id = co.id
                 WHERE m.conversation_id = $1 AND m.from_me = false AND m.status != 'read' 
                 ORDER BY m.created_at DESC LIMIT 1`, [id]
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
        } catch (e) {
            console.error('[inboxController] Error syncing read to WA Mobile:', e.message);
        }

        await pool.query('UPDATE conversations SET unread_count = 0 WHERE id = $1', [id]);
        req.io?.to(`org_${organization_id}`).emit('conversation_read', { conversationId: id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const assignConversation = async (req, res) => {
    const { id } = req.params;
    const { target_agent_id } = req.body;
    const { organization_id } = req.user;

    try {
        const agentCheck = await pool.query('SELECT name FROM users WHERE id = $1 AND organization_id = $2', [target_agent_id, organization_id]);
        if (agentCheck.rows.length === 0) return res.status(404).json({ error: "Agent not found" });
        const agentName = agentCheck.rows[0].name;

        await pool.query(
            'UPDATE conversations SET assigned_to_agent_id = $1 WHERE id = $2 AND organization_id = $3',
            [target_agent_id, id, organization_id]
        );

        const convCheck = await pool.query("SELECT contact_id FROM conversations WHERE id = $1", [id]);
        if (convCheck.rows.length > 0 && convCheck.rows[0].contact_id) {
            await pool.query(
                "DELETE FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting'",
                [organization_id, convCheck.rows[0].contact_id]
            );
        }

        req.io?.to(`org_${organization_id}`).emit('conversation_assigned', {
            conversationId: id,
            assignedTo: target_agent_id,
            agentName
        });
        dispatchOrgEvent(organization_id, 'conversation.assigned', { conversationId: id, assignedTo: target_agent_id, agentName }).catch(() => {});

        res.json({ message: `Assigned to ${agentName}`, assigned_to: target_agent_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const resolveConversation = async (req, res) => {
    const { id } = req.params;
    const { organization_id, id: userId } = req.user;
    const { closing_message } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const ratingToken = crypto.randomBytes(16).toString('hex');
        const updateRes = await client.query(
            `UPDATE conversations 
             SET status = 'resolved', closed_at = NOW(), closed_by = $1, rating_token = $2 
             WHERE id = $3 AND organization_id = $4 RETURNING id`,
            [userId, ratingToken, id, organization_id]
        );

        if (updateRes.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Conversation not found or access denied" });
        }

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await client.query(
            `INSERT INTO csat_survey_links (organization_id, conversation_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
            [organization_id, id, ratingToken, expiresAt]
        );

        const convData = await client.query(
            'SELECT contact_id FROM conversations WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (convData.rows.length > 0) {
            const { contact_id } = convData.rows[0];
            const queueActiveKey = `queue_active:${organization_id}:${contact_id}`;
            await redisConnection.del(queueActiveKey);
        }

        const convRes = await client.query(
            `SELECT c.whatsapp_session_id, c.channel, c.messenger_page_id, c.instagram_account_id, c.telegram_bot_id, c.webchat_config_id,
              ct.phone_number, ct.telegram_id,
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

        if (convRes.rows.length > 0) {
            const sessionData = convRes.rows[0];
            const defaultMsg = "Percakapan ini telah diselesaikan. Terima kasih telah menghubungi kami.";
            const ratingMsg = `Silakan beri penilaian layanan kami di sini: ${process.env.APP_URL}/rating/${ratingToken}`;
            const finalMsg = `${closing_message || defaultMsg}\n\n${ratingMsg}`;

            try {
                const { wa_uuid, phone_number, channel, tg_token, page_access_token, ig_access_token, device_type } = sessionData;

                if (channel === 'whatsapp' && wa_uuid) {
                    let closingPhone = String(phone_number).split('@')[0].replace(/[^0-9]/g, '');
                    if (closingPhone.startsWith('00')) closingPhone = closingPhone.slice(2);
                    else if (closingPhone.startsWith('0')) closingPhone = '62' + closingPhone.slice(1);
                    else if (closingPhone.startsWith('8') && closingPhone.length <= 12) closingPhone = '62' + closingPhone;
                    if (device_type === 'official') await MetaService.sendMessage({ access_token: sessionData.access_token, phone_number_id: sessionData.phone_number_id, organization_id }, closingPhone, 'text', finalMsg);
                    else await waService.sendText(wa_uuid, closingPhone, finalMsg);
                } else if (channel === 'telegram' && tg_token) {
                    await TelegramService.sendMessage(tg_token, sessionData.telegram_id || phone_number, finalMsg);
                } else if (channel === 'messenger' && page_access_token) {
                    await MessengerService.sendMessage(page_access_token, phone_number, finalMsg);
                } else if (channel === 'instagram' && ig_access_token) {
                    await InstagramService.sendMessage(ig_access_token, phone_number, finalMsg);
                }
            } catch (sendErr) {
                console.error("Failed to send closing message:", sendErr.message);
            }

            const dbContent = closing_message || defaultMsg;
            const waMessageId = `sys-close-${Date.now()}`;
            await client.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id, created_at)
                 VALUES ($1, $2, true, 'system', $3, 'sent', $4, NOW())`,
                [id, organization_id, dbContent, waMessageId]
            );
        }

        await client.query('COMMIT');

        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            status: 'resolved'
        });
        dispatchOrgEvent(organization_id, 'conversation.resolved', { conversationId: id }).catch(() => {});

        res.json({ message: "Conversation resolved", rating_token: ratingToken });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const submitRating = async (req, res) => {
    const { token } = req.params;
    const { score, feedback } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const convRes = await client.query('SELECT id, rating_token FROM conversations WHERE rating_token = $1', [token]);
        let conversationId = null;
        if (convRes.rows.length > 0) {
            conversationId = convRes.rows[0].id;
        } else {
            return res.status(400).json({ error: "Rating link expired or invalid." });
        }

        const historyCheck = await client.query('SELECT id FROM conversation_ratings WHERE conversation_id = $1 AND rating_token = $2', [conversationId, token]);
        if (historyCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "You have already rated this session." });
        }

        await client.query(
            `INSERT INTO conversation_ratings (conversation_id, rating_token, score, feedback)
             VALUES ($1, $2, $3, $4)`,
            [conversationId, token, score, feedback]
        );

        await client.query(
            `UPDATE conversations 
             SET rating_score = $1, rating_feedback = $2 
             WHERE id = $3`,
            [score, feedback, conversationId]
        );

        await client.query('COMMIT');

        const orgRes = await pool.query('SELECT organization_id FROM conversations WHERE id = $1', [conversationId]);
        if (orgRes.rows.length > 0) {
            req.io?.to(`org_${orgRes.rows[0].organization_id}`).emit('conversation_status_update', {
                conversationId: conversationId,
                rating_score: score,
                rating_feedback: feedback
            });
        }

        res.json({ message: "Thank you for your feedback!" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const getRatings = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const check = await pool.query('SELECT id FROM conversations WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

        const result = await pool.query(
            `SELECT * FROM conversation_ratings 
             WHERE conversation_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleChatbot = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const { organization_id } = req.user;

    try {
        await pool.query(
            'UPDATE conversations SET is_chatbot_active = $1 WHERE id = $2 AND organization_id = $3',
            [isActive, id, organization_id]
        );
        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            is_chatbot_active: isActive
        });
        res.json({ success: true, is_chatbot_active: isActive });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateConversationStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { organization_id } = req.user;

    if (!['open', 'resolved', 'needs_agent'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const check = await pool.query('SELECT id FROM conversations WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

        await pool.query('UPDATE conversations SET status = $1 WHERE id = $2', [status, id]);

        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            status: status
        });

        res.json({ success: true, status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const reopenConversation = async (req, res) => {
    const { id } = req.params;
    const { organization_id, id: userId, name } = req.user;

    try {
        const check = await pool.query('SELECT id FROM conversations WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

        await pool.query(
            `UPDATE conversations 
             SET status = 'open', assigned_to_agent_id = $1, is_chatbot_active = false
             WHERE id = $2`,
            [userId, id]
        );

        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            status: 'open',
            assigned_to_agent_id: userId,
            agent_name: name,
            is_chatbot_active: false
        });

        res.json({ success: true, message: 'Conversation reopened and assigned to you.' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const stopActiveFlow = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const convRes = await pool.query('SELECT contact_id FROM conversations WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (convRes.rows.length === 0) return res.status(404).json({ error: "Not found" });

        const contactId = convRes.rows[0].contact_id;
        await pool.query(
            "UPDATE flow_sessions SET status = 'cancelled' WHERE contact_id = $1 AND status = 'active'",
            [contactId]
        );

        res.json({ message: "Flow stopped" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleArchive = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { isArchived } = req.body;

    try {
        await pool.query(
            'UPDATE conversations SET is_archived = $1 WHERE id = $2 AND organization_id = $3',
            [isArchived, id, organization_id]
        );
        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            is_archived: isArchived
        });
        res.json({ success: true, is_archived: isArchived });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const togglePin = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { isPinned } = req.body;

    try {
        await pool.query(
            'UPDATE conversations SET is_pinned = $1 WHERE id = $2 AND organization_id = $3',
            [isPinned, id, organization_id]
        );
        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            is_pinned: isPinned
        });
        res.json({ success: true, is_pinned: isPinned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleUnread = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { isUnread } = req.body;

    try {
        const unreadVal = isUnread ? 1 : 0;
        await pool.query(
            'UPDATE conversations SET unread_count = $1 WHERE id = $2 AND organization_id = $3',
            [unreadVal, id, organization_id]
        );

        if (!isUnread) {
            req.io?.to(`org_${organization_id}`).emit('conversation_read', { conversationId: id });
        } else {
            req.io?.to(`org_${organization_id}`).emit('conversation_unread', { conversationId: id });
        }

        res.json({ success: true, unread_count: unreadVal });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleMuteConversation = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const result = await pool.query(
            `UPDATE conversations SET is_muted = NOT COALESCE(is_muted, FALSE)
             WHERE id = $1 AND organization_id = $2
             RETURNING id, is_muted`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const { is_muted } = result.rows[0];
        req.io?.to(`org_${organization_id}`).emit('conversation_muted', {
            conversationId: id,
            isMuted: is_muted
        });

        res.json({ conversationId: id, is_muted });
    } catch (err) {
        res.status(500).json({ error: "Gagal membisukan notifikasi" });
    }
};

export const toggleBlockContact = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const result = await pool.query(
            `UPDATE contacts SET is_blocked = NOT COALESCE(is_blocked, FALSE)
             WHERE id = $1 AND organization_id = $2
             RETURNING id, is_blocked`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Contact not found" });
        }

        const { is_blocked } = result.rows[0];
        req.io?.to(`org_${organization_id}`).emit('contact_blocked', {
            contactId: id,
            isBlocked: is_blocked
        });

        res.json({ contactId: id, is_blocked });
    } catch (err) {
        res.status(500).json({ error: "Gagal memblokir kontak" });
    }
};

export const bulkActionConversations = async (req, res) => {
    const { conversationIds, action, payload } = req.body;
    const { organization_id, id: userId } = req.user;

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
        return res.status(400).json({ error: "conversationIds array is required" });
    }

    const ids = conversationIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (ids.length === 0) return res.status(400).json({ error: "Valid conversationIds required" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let affectedCount = 0;

        if (action === 'resolve') {
            const result = await client.query(
                `UPDATE conversations 
                 SET status = 'resolved', closed_at = NOW(), closed_by = $1
                 WHERE id = ANY($2::int[]) AND organization_id = $3
                 RETURNING id`,
                [userId, ids, organization_id]
            );
            affectedCount = result.rowCount;
            req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                conversationIds: ids,
                action: 'resolve',
                status: 'resolved'
            });
        }
        else if (action === 'assign') {
            const agentId = payload?.agent_id ? parseInt(payload.agent_id, 10) : null;
            const result = await client.query(
                `UPDATE conversations 
                 SET assigned_to_agent_id = $1
                 WHERE id = ANY($2::int[]) AND organization_id = $3
                 RETURNING id`,
                [agentId, ids, organization_id]
            );
            affectedCount = result.rowCount;
            req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                conversationIds: ids,
                action: 'assign',
                assigned_to_agent_id: agentId
            });
        }
        else if (action === 'archive') {
            const isArchived = payload?.is_archived !== false;
            const result = await client.query(
                `UPDATE conversations 
                 SET is_archived = $1
                 WHERE id = ANY($2::int[]) AND organization_id = $3
                 RETURNING id`,
                [isArchived, ids, organization_id]
            );
            affectedCount = result.rowCount;
            req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                conversationIds: ids,
                action: 'archive',
                is_archived: isArchived
            });
        }
        else if (action === 'mark_read') {
            const result = await client.query(
                `UPDATE conversations 
                 SET unread_count = 0
                 WHERE id = ANY($1::int[]) AND organization_id = $2
                 RETURNING id`,
                [ids, organization_id]
            );
            affectedCount = result.rowCount;
            req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                conversationIds: ids,
                action: 'mark_read',
                unread_count: 0
            });
        }
        else if (action === 'mark_unread') {
            const result = await client.query(
                `UPDATE conversations 
                 SET unread_count = 1
                 WHERE id = ANY($1::int[]) AND organization_id = $2
                 RETURNING id`,
                [ids, organization_id]
            );
            affectedCount = result.rowCount;
            req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                conversationIds: ids,
                action: 'mark_unread',
                unread_count: 1
            });
        }
        else if (action === 'delete') {
            await client.query(
                `DELETE FROM messages WHERE conversation_id = ANY($1::int[]) AND organization_id = $2`,
                [ids, organization_id]
            );
            const result = await client.query(
                `DELETE FROM conversations WHERE id = ANY($1::int[]) AND organization_id = $2 RETURNING id`,
                [ids, organization_id]
            );
            affectedCount = result.rowCount;
            req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                conversationIds: ids,
                action: 'delete'
            });
        }
        else if (action === 'add_labels') {
            const labelIds = Array.isArray(payload?.label_ids) ? payload.label_ids : [];
            if (labelIds.length > 0) {
                const convContacts = await client.query(
                    `SELECT DISTINCT contact_id FROM conversations WHERE id = ANY($1::int[]) AND organization_id = $2`,
                    [ids, organization_id]
                );
                for (const row of convContacts.rows) {
                    for (const lid of labelIds) {
                        await client.query(
                            `INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [row.contact_id, lid]
                        );
                    }
                }
                affectedCount = convContacts.rowCount;
                req.io?.to(`org_${organization_id}`).emit('conversations_bulk_updated', {
                    conversationIds: ids,
                    action: 'add_labels',
                    labelIds
                });
            }
        }
        else {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Unknown action: ${action}` });
        }

        await client.query('COMMIT');
        res.json({ success: true, action, affectedCount, conversationIds: ids });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[bulkActionConversations] Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

