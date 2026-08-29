/**
 * Shopee Inbound Webhook Controller
 * Receives buyer chat messages & seller notifications from Shopee Open API
 */
import pool from '../../config/db.js';
import { verifyShopeeSignature } from '../../services/channels/shopeeChannelService.js';

export const handleShopeeWebhook = async (req, res) => {
    const rawBody = req.body;
    const signature = req.headers['authorization'] || req.headers['x-shopee-signature'];

    try {
        const { code, shop_id, data } = rawBody;

        // Shopee Chat Webhook Code = 10 (Chat Message)
        if (code === 10 || data?.message_type || data?.content) {
            const shopIdentifier = String(shop_id || rawBody.shop_id || '');
            
            // Find organization matching Shopee shop_id
            const channelRes = await pool.query(
                `SELECT * FROM channel_integrations 
                 WHERE channel_type = 'shopee' AND is_active = true 
                 AND (account_identifier = $1 OR credentials->>'shop_id' = $1)
                 LIMIT 1`,
                [shopIdentifier]
            );

            if (channelRes.rows.length === 0) {
                return res.json({ message: "Shopee shop not registered in system, skipped" });
            }

            const channelRow = channelRes.rows[0];
            const orgId = channelRow.organization_id;

            const senderId = String(data?.from_id || data?.sender_id || 'shopee_buyer');
            const senderName = data?.from_name || `Shopee Buyer (${senderId})`;
            const textContent = data?.content?.text || data?.text || 'Pesan dari Shopee';
            const mediaUrl = data?.content?.image_url || null;
            const messageId = `shopee-${data?.message_id || Date.now()}`;

            // 1. Get or Create Contact
            let contactId;
            const contactRes = await pool.query(
                `SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2`,
                [orgId, senderId]
            );

            if (contactRes.rows.length > 0) {
                contactId = contactRes.rows[0].id;
            } else {
                const newContact = await pool.query(
                    `INSERT INTO contacts (organization_id, name, phone_number, source)
                     VALUES ($1, $2, $3, 'shopee')
                     RETURNING id`,
                    [orgId, senderName, senderId]
                );
                contactId = newContact.rows[0].id;
            }

            // 2. Get or Create Conversation
            let conversationId;
            const convRes = await pool.query(
                `SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND channel = 'shopee'`,
                [orgId, contactId]
            );

            if (convRes.rows.length > 0) {
                conversationId = convRes.rows[0].id;
                await pool.query(
                    `UPDATE conversations SET last_message = $1, last_message_time = NOW(), updated_at = NOW() WHERE id = $2`,
                    [textContent, conversationId]
                );
            } else {
                const newConv = await pool.query(
                    `INSERT INTO conversations (organization_id, contact_id, channel, last_message, last_message_time, status)
                     VALUES ($1, $2, 'shopee', $3, NOW(), 'open')
                     RETURNING id`,
                    [orgId, contactId, textContent]
                );
                conversationId = newConv.rows[0].id;
            }

            // 3. Save Message
            const msgRes = await pool.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, wa_message_id, status)
                 VALUES ($1, $2, false, $3, $4, $5, $6, 'delivered')
                 RETURNING *`,
                [conversationId, orgId, mediaUrl ? 'image' : 'text', textContent, mediaUrl, messageId]
            );

            // 4. Emit to Realtime Socket
            req.io?.to(`org_${orgId}`).emit('new_message', {
                conversationId,
                message: msgRes.rows[0]
            });
        }

        res.json({ message: "Shopee Webhook processed successfully" });
    } catch (err) {
        console.error('[Shopee Webhook Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};
