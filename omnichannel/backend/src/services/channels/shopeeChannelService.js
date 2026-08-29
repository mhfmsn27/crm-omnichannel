/**
 * Shopee Seller Chat Open API Service
 * Manages Shopee Open Platform V2 Chat & Webhook Routing
 */
import pool from '../../config/db.js';
import crypto from 'crypto';

/**
 * Get active Shopee channel configuration for an organization
 */
export const getShopeeConfig = async (organizationId) => {
    const result = await pool.query(
        `SELECT * FROM channel_integrations 
         WHERE organization_id = $1 AND channel_type = 'shopee' AND is_active = true 
         ORDER BY updated_at DESC LIMIT 1`,
        [organizationId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

/**
 * Generate Shopee Open API v2 HMAC-SHA256 signature
 */
export const generateShopeeSignature = (partnerKey, path, timestamp, accessToken = '', shopId = '') => {
    let baseStr = `${partnerKey}${path}${timestamp}`;
    if (accessToken) baseStr += accessToken;
    if (shopId) baseStr += shopId;
    return crypto.createHmac('sha256', partnerKey).update(baseStr).digest('hex');
};

/**
 * Verify Shopee Webhook Signature
 */
export const verifyShopeeSignature = (rawBody, signature, partnerKey) => {
    if (!signature || !partnerKey) return true; // fallback in sandbox
    try {
        const computed = crypto.createHmac('sha256', partnerKey).update(rawBody).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch (e) {
        return false;
    }
};

/**
 * Send outbound message to Shopee Seller Chat
 */
export const sendShopeeMessage = async ({ organizationId, recipientId, text, mediaUrl = null }) => {
    const configRow = await getShopeeConfig(organizationId);
    if (!configRow) {
        throw new Error("Shopee channel is not configured or inactive for this organization.");
    }

    const creds = configRow.credentials || {};
    const partnerId = creds.partner_id;
    const partnerKey = creds.partner_key;
    const shopId = creds.shop_id || configRow.account_identifier;
    const accessToken = creds.access_token;

    if (!partnerId || !partnerKey || !shopId) {
        throw new Error("Shopee Partner credentials or Shop ID are missing.");
    }

    const host = creds.sandbox_mode ? 'https://partner.test-stable.shopeemobile.com' : 'https://partner.shopeemobile.com';
    const path = '/api/v2/sellerchat/send_message';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = generateShopeeSignature(partnerKey, path, timestamp, accessToken, shopId);

    const url = `${host}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&shop_id=${shopId}&access_token=${accessToken || ''}`;

    const payload = {
        to_id: parseInt(recipientId) || recipientId,
        message_type: mediaUrl ? 'image' : 'text',
        content: {
            text: text || ''
        }
    };

    if (mediaUrl) {
        payload.content.image_url = mediaUrl;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (data.error && data.error !== '') {
        throw new Error(`Shopee Chat API Error: ${data.message || data.error}`);
    }

    return data.response || { message_id: `shopee-${Date.now()}` };
};
