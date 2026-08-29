/**
 * Tokopedia Inbound Webhook Controller
 * Receives buyer chat messages & seller notifications from Tokopedia Open API
 */
import pool from '../../config/db.js';

export const handleTokopediaWebhook = async (req, res) => {
    const payload = req.body;

    try {
        const { fs_id, msg_id, sender_name, message, file_url, user_id } = payload;

        const fsIdentifier = String(fs_id || payload.fulfillment_service_id || '');

        // Find organization matching Tokopedia fs_id
        const channelRes = await pool.query(
            `SELECT * FROM channel_integrations 
             WHERE channel_type = 'tokopedia' AND is_active = true 
             AND (account_identifier = $1 OR credentials->>'fs_id' = $1)
             LIMIT 1`,
            [fsIdentifier]
        );

        if (channelRes.rows.length === 0) {
            return res.json({ message: "Tokopedia account not registered, skipped" });
        }

        const channelRow = channelRes.rows[0];
        const orgId = channelRow.organization_id;

        const senderId = String(user_id || payload.sender_id || 'tokopedia_buyer');
        const buyerName = sender_name || `Tokopedia Buyer (${senderId})`;
        const textContent = message || 'Pesan dari Tokopedia';
        const mediaUrl = file_url || null;
        const messageId = `tokopedia-${msg_id || Date.now()}`;

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
                 VALUES ($1, $2, $3, 'tokopedia')
                 RETURNING id`,
                [orgId, buyerName, senderId]
            );
            contactId = newContact.rows[0].id;
        }

        // 2. Get or Create Conversation
        let conversationId;
        const convRes = await pool.query(
            `SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND channel = 'tokopedia'`,
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
                 VALUES ($1, $2, 'tokopedia', $3, NOW(), 'open')
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

        res.json({ message: "Tokopedia Webhook processed successfully" });
    } catch (err) {
        console.error('[Tokopedia Webhook Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};
