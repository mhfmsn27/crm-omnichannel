import crypto from 'crypto';

/**
 * Webhook Signature Verification Middleware
 *
 * Verifies that incoming webhook requests are from legitimate sources
 * by validating HMAC signatures.
 *
 * Usage:
 *   import { verifyWebhookSignature, verifyMetaWebhook } from './webhookSecurity.js';
 *   app.post('/webhook/your-endpoint', verifyWebhookSignature('your-secret'), handler);
 */

// Track which services have already warned about missing secrets
const warnedServices = new Set();

// Get webhook secret from environment or use a default (not recommended for production)
const getWebhookSecret = (serviceName) => {
    const envKey = `WEBHOOK_${serviceName.toUpperCase()}_SECRET`;
    const secret = process.env[envKey];
    if (!secret) {
        if (process.env.NODE_ENV === 'production' && !warnedServices.has(envKey)) {
            console.warn(`[WebhookSecurity] WARNING: ${envKey} not set! Webhook signature verification disabled.`);
            warnedServices.add(envKey);
        }
        return null;
    }
    return secret;
};

/**
 * Generate HMAC signature for a payload
 * @param {string} payload - The request body as string
 * @param {string} secret - The webhook secret
 * @returns {string} - The hex-encoded HMAC signature
 */
export const generateSignature = (payload, secret) => {
    return crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
};

/**
 * Verify HMAC signature
 * @param {string} payload - The request body as string
 * @param {string} signature - The signature to verify
 * @param {string} secret - The webhook secret
 * @returns {boolean} - Whether the signature is valid
 */
export const verifySignature = (payload, signature, secret) => {
    if (!signature || !secret) return false;

    const expectedSignature = generateSignature(payload, secret);

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (e) {
        // If signatures have different lengths, timingSafeEqual throws
        return false;
    }
};

/**
 * Generic webhook signature verification middleware factory
 * @param {string} serviceName - Name of the service (used to get env var)
 * @param {string} signatureHeader - Name of the header containing signature (default: 'x-webhook-signature')
 * @returns {Function} - Express middleware
 */
export const verifyWebhookSignature = (serviceName, signatureHeader = 'x-webhook-signature') => {
    return (req, res, next) => {
        // Skip verification if no secret configured (development mode)
        const secret = getWebhookSecret(serviceName);
        if (!secret) {
            console.log(`[WebhookSecurity] ${serviceName} webhook: Skipping verification (no secret configured)`);
            return next();
        }

        const signature = req.headers[signatureHeader.toLowerCase()];

        if (!signature) {
            console.warn(`[WebhookSecurity] ${serviceName} webhook: Missing signature header`);
            return res.status(401).json({ error: 'Missing webhook signature' });
        }

        // Get raw body - if stored by express.json verify function
        const payload = req.rawBody || JSON.stringify(req.body);

        if (!verifySignature(payload, signature, secret)) {
            console.warn(`[WebhookSecurity] ${serviceName} webhook: Invalid signature`);
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        console.log(`[WebhookSecurity] ${serviceName} webhook: Signature verified`);
        next();
    };
};

/**
 * Verify Meta (Facebook) webhook
 * Meta uses a different verification process:
 * 1. GET request with ?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=xxx
 * 2. POST request with X-Hub-Signature-256 header
 */
export const verifyMetaWebhook = {
    // Verify endpoint (GET) - check hub.verify_token
    verify: (verifyToken) => {
        return (req, res) => {
            const mode = req.query['hub.mode'];
            const token = req.query['hub.verify_token'];
            const challenge = req.query['hub.challenge'];

            if (mode === 'subscribe' && token === verifyToken) {
                console.log('[WebhookSecurity] Meta webhook verified successfully');
                return res.status(200).send(challenge);
            }

            console.warn('[WebhookSecurity] Meta webhook verification failed');
            return res.status(403).send('Forbidden');
        };
    },

    // Message handler (POST) - verify X-Hub-Signature-256
    handle: (req, res, next) => {
        const secret = getWebhookSecret('meta');
        const signature = req.headers['x-hub-signature-256']?.replace('sha256=', '');

        // Skip if no secret (development mode)
        if (!secret) {
            return next();
        }

        if (!signature) {
            console.warn('[WebhookSecurity] Meta webhook: Missing signature');
            return res.status(401).json({ error: 'Missing webhook signature' });
        }

        const payload = req.rawBody || JSON.stringify(req.body);

        if (!verifySignature(payload, signature, secret)) {
            console.warn('[WebhookSecurity] Meta webhook: Invalid signature');
            return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        next();
    }
};

/**
 * Verify Telegram webhook
 * Telegram uses a bot token in the URL path, but also supports HMAC verification
 */
export const verifyTelegramWebhook = (req, res, next) => {
    const secret = getWebhookSecret('telegram');

    // If no secret configured, rely on token-based auth (default Telegram behavior)
    if (!secret) {
        return next();
    }

    const signature = req.headers['x-telegram-bot-api-secret-token'];

    if (!signature) {
        console.warn('[WebhookSecurity] Telegram webhook: Missing secret token');
        return res.status(401).json({ error: 'Missing secret token' });
    }

    if (signature !== secret) {
        console.warn('[WebhookSecurity] Telegram webhook: Invalid secret token');
        return res.status(401).json({ error: 'Invalid secret token' });
    }

    next();
};

/**
 * Verify Xendit webhook
 * Xendit uses their own signature verification
 */
export const verifyXenditWebhook = (req, res, next) => {
    const secret = getWebhookSecret('xendit');

    if (!secret) {
        console.log('[WebhookSecurity] Xendit webhook: Skipping verification (no secret configured)');
        return next();
    }

    const signature = req.headers['x_CALLBACK_TOKEN'] || req.headers['x-callback-token'];

    if (!signature) {
        console.warn('[WebhookSecurity] Xendit webhook: Missing callback token');
        return res.status(401).json({ error: 'Missing callback token' });
    }

    if (signature !== secret) {
        console.warn('[WebhookSecurity] Xendit webhook: Invalid callback token');
        return res.status(401).json({ error: 'Invalid callback token' });
    }

    next();
};

/**
 * Verify TikTok webhook
 * TikTok uses a custom signature verification
 */
export const verifyTikTokWebhook = (req, res, next) => {
    const secret = getWebhookSecret('tiktok');

    if (!secret) {
        console.log('[WebhookSecurity] TikTok webhook: Skipping verification (no secret configured)');
        return next();
    }

    const signature = req.headers['x-tiktok-signature'];

    if (!signature) {
        console.warn('[WebhookSecurity] TikTok webhook: Missing signature');
        return res.status(401).json({ error: 'Missing signature' });
    }

    // TikTok uses HMAC SHA256
    const payload = req.rawBody || JSON.stringify(req.body);
    const expectedSignature = 'sha256=' + generateSignature(payload, secret);

    if (signature !== expectedSignature) {
        console.warn('[WebhookSecurity] TikTok webhook: Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
};

export default {
    verifyWebhookSignature,
    verifySignature,
    generateSignature,
    verifyMetaWebhook,
    verifyTelegramWebhook,
    verifyXenditWebhook,
    verifyTikTokWebhook
};
