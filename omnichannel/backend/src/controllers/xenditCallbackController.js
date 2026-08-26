import pool from '../config/db.js';
import { validateCallback } from '../services/xenditService.js';
import MetaService from '../services/MetaService.js';
import * as waService from '../services/waGatewayService.js';
import TelegramService from '../services/TelegramService.js';
import MessengerService from '../services/MessengerService.js';
import InstagramService from '../services/InstagramService.js';
import crypto from 'crypto';

// POST /webhook/xendit/payment (public — no auth middleware)
export const handleXenditCallback = async (req, res) => {
    try {
        const { isValid } = await validateCallback(req);
        if (!isValid) return res.status(401).json({ error: 'Invalid callback token' });

        // Acknowledge immediately — Xendit expects fast response
        res.sendStatus(200);

        const { external_id, status, amount, description } = req.body;
        if (!external_id) return;

        const isPaid = status === 'PAID' || status === 'SETTLED';
        const isExpired = status === 'EXPIRED';

        if (!isPaid && !isExpired) return;

        // Parse conversationId from external_id format: "chat-{id}-{hex}"
        const parts = external_id.split('-');
        if (parts[0] !== 'chat' || !parts[1]) return;
        const conversationId = parseInt(parts[1]);
        if (isNaN(conversationId)) return;

        // Update payment_links status
        if (isPaid) {
            await pool.query(
                `UPDATE payment_links SET status = 'paid', paid_at = NOW() WHERE external_id = $1`,
                [external_id]
            );
        } else if (isExpired) {
            await pool.query(
                `UPDATE payment_links SET status = 'expired' WHERE external_id = $1 AND status = 'pending'`,
                [external_id]
            );
            return; // No confirmation message for expired links
        }

        // Fetch conversation + all session data needed to send message
        const convRes = await pool.query(
            `SELECT c.id, c.organization_id, c.channel, c.whatsapp_session_id,
                    c.messenger_page_id, c.instagram_account_id, c.telegram_bot_id,
                    ct.phone_number, ct.telegram_id,
                    ws.session_id as wa_uuid, ws.type as device_type,
                    ws.access_token, ws.phone_number_id,
                    mp.access_token as page_access_token,
                    ia.access_token as ig_access_token,
                    tb.bot_token as tg_token
             FROM conversations c
             JOIN contacts ct ON c.contact_id = ct.id
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             LEFT JOIN messenger_pages mp ON c.messenger_page_id = mp.id
             LEFT JOIN instagram_accounts ia ON c.instagram_account_id = ia.id
             LEFT JOIN telegram_bots tb ON c.telegram_bot_id = tb.id
             WHERE c.id = $1`,
            [conversationId]
        );

        if (convRes.rows.length === 0) return;
        const conv = convRes.rows[0];
        const { organization_id } = conv;

        const parsedAmount = parseInt(amount) || 0;
        const confirmText = `✅ *Pembayaran Diterima!*\n\n📋 ${description || 'Pembayaran'}\n💰 Rp ${parsedAmount.toLocaleString('id-ID')} telah terbayar.\n\nTerima kasih! 🙏`;

        // Normalize phone number for unofficial WA
        const normalizePhone = (phone) => {
            let p = String(phone || '').split('@')[0].replace(/[^0-9]/g, '');
            if (p.startsWith('0')) p = '62' + p.slice(1);
            else if (p.startsWith('8')) p = '62' + p;
            return p;
        };

        // Send confirmation via appropriate channel (best-effort)
        try {
            if (conv.channel === 'telegram' && conv.tg_token) {
                const chatId = conv.telegram_id || conv.phone_number;
                await TelegramService.sendMessage(conv.tg_token, chatId, confirmText);
            } else if (conv.channel === 'messenger' && conv.page_access_token) {
                await MessengerService.sendMessage(conv.page_access_token, conv.phone_number, confirmText, null, 'text');
            } else if (conv.channel === 'instagram' && conv.ig_access_token) {
                await InstagramService.sendMessage(conv.ig_access_token, conv.phone_number, confirmText, null, 'text');
            } else if (conv.device_type === 'official' && conv.access_token && conv.phone_number_id) {
                await MetaService.sendMessage(
                    { access_token: conv.access_token, phone_number_id: conv.phone_number_id, organization_id },
                    conv.phone_number,
                    'text',
                    confirmText
                );
            } else if (conv.wa_uuid) {
                await waService.sendText(conv.wa_uuid, normalizePhone(conv.phone_number), confirmText);
            }
        } catch (sendErr) {
            console.error('[XenditCallback] Failed to send confirmation message:', sendErr.message);
        }

        // Save message to DB so it appears in conversation history
        const waMessageId = `xendit.paid.${crypto.randomUUID()}`;
        const msgRes = await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id)
             VALUES ($1, $2, true, 'text', $3, 'sent', $4)
             ON CONFLICT (wa_message_id) DO NOTHING
             RETURNING *`,
            [conversationId, organization_id, confirmText, waMessageId]
        );

        // Update conversation last_message
        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
            ['✅ Pembayaran diterima', conversationId]
        );

        // Emit via Socket.IO so agents see it in real-time
        const io = req.io;
        if (io) {
            if (msgRes.rows.length > 0) {
                io.to(`org_${organization_id}`).emit('new_message', {
                    conversationId,
                    message: msgRes.rows[0]
                });
            }
            io.to(`org_${organization_id}`).emit('payment_link_paid', {
                conversationId,
                external_id,
                amount: parsedAmount,
                description,
            });
        }

    } catch (err) {
        console.error('[XenditCallback] Unhandled error:', err.message);
        // Ensure Xendit always gets a response; only send if headers not yet sent
        if (!res.headersSent) res.sendStatus(500);
    }
};
