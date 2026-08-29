/**
 * Tokopedia Seller Chat Open API Service
 * Manages Tokopedia / GoTo Open Platform Seller Chat & Webhook Routing
 */
import pool from '../../config/db.js';
import crypto from 'crypto';

/**
 * Get active Tokopedia channel configuration for an organization
 */
export const getTokopediaConfig = async (organizationId) => {
    const result = await pool.query(
        `SELECT * FROM channel_integrations 
         WHERE organization_id = $1 AND channel_type = 'tokopedia' AND is_active = true 
         ORDER BY updated_at DESC LIMIT 1`,
        [organizationId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

/**
 * Obtain / Refresh OAuth Token for Tokopedia API
 */
export const getTokopediaAccessToken = async (creds) => {
    if (creds.access_token && creds.token_expires_at && new Date(creds.token_expires_at) > new Date()) {
        return creds.access_token;
    }

    const { client_id, client_secret } = creds;
    if (!client_id || !client_secret) {
        throw new Error("Tokopedia Client ID or Secret is missing.");
    }

    const authHeader = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const response = await fetch('https://accounts.tokopedia.com/token?grant_type=client_credentials', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
        throw new Error(`Tokopedia Auth Error: ${data.error_description || data.error || 'Failed to authenticate'}`);
    }

    return data.access_token;
};

/**
 * Send outbound message to Tokopedia Chat Room
 */
export const sendTokopediaMessage = async ({ organizationId, msgId, text, mediaUrl = null }) => {
    const configRow = await getTokopediaConfig(organizationId);
    if (!configRow) {
        throw new Error("Tokopedia channel is not configured or inactive for this organization.");
    }

    const creds = configRow.credentials || {};
    const fsId = creds.fs_id || configRow.account_identifier;
    const accessToken = await getTokopediaAccessToken(creds);

    const endpoint = `https://fs.tokopedia.net/v1/chat/fs/${fsId}/messages`;

    const payload = {
        msg_id: msgId,
        message: text || '',
        attachment: mediaUrl ? { file_url: mediaUrl, type: 'image' } : undefined
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data.header && data.header.status !== 200)) {
        const errorMsg = data.header?.reason || data.error || 'Failed to send Tokopedia message';
        throw new Error(`Tokopedia Chat Error: ${errorMsg}`);
    }

    return data.data || { message_id: `tokopedia-${Date.now()}` };
};
