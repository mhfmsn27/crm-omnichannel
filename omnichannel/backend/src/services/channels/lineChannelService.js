/**
 * LINE Official Account (LINE Messaging API) Service
 * Handles LINE Bot Messaging, Flex Messages, and Webhooks
 */
import pool from '../../config/db.js';
import crypto from 'crypto';

/**
 * Get active LINE channel configuration for an organization
 */
export const getLineConfig = async (organizationId) => {
    const result = await pool.query(
        `SELECT * FROM channel_integrations 
         WHERE organization_id = $1 AND channel_type = 'line' AND is_active = true 
         ORDER BY updated_at DESC LIMIT 1`,
        [organizationId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

/**
 * Verify LINE Webhook Signature (X-Line-Signature)
 */
export const verifyLineSignature = (bodyString, signature, channelSecret) => {
    if (!signature || !channelSecret) return true;
    try {
        const hash = crypto
            .createHmac('sha256', channelSecret)
            .update(bodyString)
            .digest('base64');
        return hash === signature;
    } catch (e) {
        return false;
    }
};

/**
 * Send an outbound push message to a LINE user
 */
export const sendLineMessage = async ({ organizationId, lineUserId, text, flexMessage = null, mediaUrl = null }) => {
    const configRow = await getLineConfig(organizationId);
    if (!configRow) {
        throw new Error("LINE channel is not configured or inactive for this organization.");
    }

    const creds = configRow.credentials || {};
    const accessToken = creds.channel_access_token;

    if (!accessToken) {
        throw new Error("LINE Channel Access Token is missing.");
    }

    let messages = [];
    if (flexMessage) {
        messages.push({
            type: 'flex',
            altText: text || 'LINE Notification',
            contents: flexMessage
        });
    } else if (mediaUrl) {
        messages.push({
            type: 'image',
            originalContentUrl: mediaUrl,
            previewImageUrl: mediaUrl
        });
    } else {
        messages.push({
            type: 'text',
            text: text || ''
        });
    }

    // LINE Messaging API Push Message Endpoint
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            to: lineUserId,
            messages
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`LINE API Error: ${errData.message || response.statusText}`);
    }

    return { success: true, messageId: `line_${Date.now()}` };
};

/**
 * Handle incoming LINE Webhook events
 */
export const handleInboundLineEvent = async ({ organizationId, event }) => {
    if (event.type !== 'message' || !event.source?.userId) {
        return { ignored: true };
    }

    const lineUserId = event.source.userId;
    const messageType = event.message?.type || 'text';
    const textContent = event.message?.text || '';
    const messageId = event.message?.id || `line_in_${Date.now()}`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find or create contact with phone_number = lineUserId
        let contactRes = await client.query(
            'SELECT * FROM contacts WHERE organization_id = $1 AND phone_number = $2',
            [organizationId, lineUserId]
        );

        let contactId;
        if (contactRes.rows.length === 0) {
            const newContact = await client.query(
                `INSERT INTO contacts (organization_id, name, phone_number, is_subscribed) 
                 VALUES ($1, $2, $3, true) RETURNING id`,
                [organizationId, `LINE User (${lineUserId.slice(-4)})`, lineUserId]
            );
            contactId = newContact.rows[0].id;
        } else {
            contactId = contactRes.rows[0].id;
        }

        // 2. Find or create conversation with channel='line'
        let convRes = await client.query(
            `SELECT * FROM conversations 
             WHERE organization_id = $1 AND contact_id = $2 AND channel = 'line' AND status != 'closed'
             ORDER BY updated_at DESC LIMIT 1`,
            [organizationId, contactId]
        );

        let conversationId;
        if (convRes.rows.length === 0) {
            const newConv = await client.query(
                `INSERT INTO conversations (organization_id, contact_id, channel, last_message, last_message_at, unread_count, status)
                 VALUES ($1, $2, 'line', $3, NOW(), 1, 'open') RETURNING id`,
                [organizationId, contactId, textContent || `[${messageType}]`]
            );
            conversationId = newConv.rows[0].id;
        } else {
            conversationId = convRes.rows[0].id;
            await client.query(
                `UPDATE conversations 
                 SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, updated_at = NOW() 
                 WHERE id = $2`,
                [textContent || `[${messageType}]`, conversationId]
            );
        }

        // 3. Insert message
        const msgRes = await client.query(
            `INSERT INTO messages (conversation_id, sender_type, message_type, content, external_id, status, created_at)
             VALUES ($1, 'contact', $2, $3, $4, 'received', NOW()) RETURNING id`,
            [
                conversationId,
                messageType === 'image' ? 'image' : 'text',
                textContent || `Sent a ${messageType}`,
                messageId
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
