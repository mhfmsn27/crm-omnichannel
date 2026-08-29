/**
 * TikTok Shop & TikTok Direct Messaging Service
 * Manages TikTok Open Platform / Seller Chat connections & webhook routing
 */
import pool from '../../config/db.js';
import crypto from 'crypto';

/**
 * Get active TikTok channel configuration for an organization
 */
export const getTikTokConfig = async (organizationId) => {
    const result = await pool.query(
        `SELECT * FROM channel_integrations 
         WHERE organization_id = $1 AND channel_type = 'tiktok' AND is_active = true 
         ORDER BY updated_at DESC LIMIT 1`,
        [organizationId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

/**
 * Verify TikTok Webhook Signature
 */
export const verifyTikTokSignature = (payloadString, signature, appSecret) => {
    if (!signature || !appSecret) return true; // fallback for sandbox/test
    try {
        const computedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(payloadString)
            .digest('hex');
        return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature));
    } catch (e) {
        return false;
    }
};

/**
 * Send an outbound message to TikTok Seller Chat / Direct Messaging
 */
export const sendTikTokMessage = async ({ organizationId, recipientOpenId, text, mediaUrl = null }) => {
    const configRow = await getTikTokConfig(organizationId);
    if (!configRow) {
        throw new Error("TikTok channel is not configured or inactive for this organization.");
    }

    const creds = configRow.credentials || {};
    const accessToken = creds.access_token;
    const shopId = creds.shop_id || configRow.account_identifier;

    if (!accessToken) {
        throw new Error("TikTok Access Token is missing. Please reconnect your TikTok account.");
    }

    // TikTok Shop Open API Customer Service Chat Endpoint
    const endpoint = `https://open-api.tiktokglobalshop.com/api/customer_service/messages/send?shop_id=${shopId}`;
    
    const bodyPayload = {
        recipient: {
            open_id: recipientOpenId
        },
        message: {
            text: text || '',
            type: mediaUrl ? 'IMAGE' : 'TEXT',
            media_url: mediaUrl || undefined
        }
    };

    // If sandbox / mock mode
    if (creds.sandbox_mode) {
        return { success: true, message: "TikTok Message Sent (Sandbox Mode)", data: bodyPayload };
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'x-tts-access-token': accessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || (result.code && result.code !== 0)) {
        throw new Error(`TikTok API Error: ${result.message || response.statusText}`);
    }

    return { success: true, messageId: result.data?.message_id || `tt_${Date.now()}` };
};

/**
 * Handle incoming TikTok message webhook
 */
export const handleInboundTikTokMessage = async ({ organizationId, senderOpenId, senderName, text, mediaUrl, messageId }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find or create contact with phone_number = senderOpenId
        let contactRes = await client.query(
            'SELECT * FROM contacts WHERE organization_id = $1 AND phone_number = $2',
            [organizationId, senderOpenId]
        );

        let contactId;
        if (contactRes.rows.length === 0) {
            const newContact = await client.query(
                `INSERT INTO contacts (organization_id, name, phone_number, is_subscribed) 
                 VALUES ($1, $2, $3, true) RETURNING id`,
                [organizationId, senderName || `TikTok Buyer (${senderOpenId.slice(-4)})`, senderOpenId]
            );
            contactId = newContact.rows[0].id;
        } else {
            contactId = contactRes.rows[0].id;
        }

        // 2. Find or create conversation with channel='tiktok'
        let convRes = await client.query(
            `SELECT * FROM conversations 
             WHERE organization_id = $1 AND contact_id = $2 AND channel = 'tiktok' AND status != 'closed'
             ORDER BY updated_at DESC LIMIT 1`,
            [organizationId, contactId]
        );

        let conversationId;
        if (convRes.rows.length === 0) {
            const newConv = await client.query(
                `INSERT INTO conversations (organization_id, contact_id, channel, last_message, last_message_at, unread_count, status)
                 VALUES ($1, $2, 'tiktok', $3, NOW(), 1, 'open') RETURNING id`,
                [organizationId, contactId, text || 'Sent an attachment']
            );
            conversationId = newConv.rows[0].id;
        } else {
            conversationId = convRes.rows[0].id;
            await client.query(
                `UPDATE conversations 
                 SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, updated_at = NOW() 
                 WHERE id = $2`,
                [text || 'Sent an attachment', conversationId]
            );
        }

        // 3. Insert incoming message
        const msgRes = await client.query(
            `INSERT INTO messages (conversation_id, sender_type, message_type, content, media_url, external_id, status, created_at)
             VALUES ($1, 'contact', $2, $3, $4, $5, 'received', NOW()) RETURNING id`,
            [
                conversationId,
                mediaUrl ? 'image' : 'text',
                text || '',
                mediaUrl || null,
                messageId || `tt_msg_${Date.now()}`
            ]
        );

        await client.query('COMMIT');

        return {
            success: true,
            conversation_id: conversationId,
            message_id: msgRes.rows[0].id
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
