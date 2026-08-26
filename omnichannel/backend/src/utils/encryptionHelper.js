import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Derive consistent 32-byte key from ENCRYPTION_KEY or fallback to SHA256 of JWT_SECRET / server secret
const getEncryptionKey = () => {
    const rawSecret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'crmhub_default_secure_secret_key_32';
    return crypto.createHash('sha256').update(String(rawSecret)).digest();
};

/**
 * Encrypts sensitive string using AES-256-GCM.
 * Output format: "enc_gcm:<iv_hex>:<tag_hex>:<encrypted_hex>"
 *
 * @param {string} text 
 * @returns {string}
 */
export const encrypt = (text) => {
    if (!text || typeof text !== 'string') return text;
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        return `enc_gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error('[Encryption] Encrypt error:', err.message);
        return text; // Safe fallback
    }
};

/**
 * Decrypts string with transparent backward-compatibility for legacy plaintext strings.
 *
 * @param {string} cipherText 
 * @returns {string}
 */
export const decrypt = (cipherText) => {
    if (!cipherText || typeof cipherText !== 'string') return cipherText;

    // Check if format matches our encrypted pattern
    if (!cipherText.startsWith('enc_gcm:')) {
        return cipherText; // Legacy plaintext — return as is
    }

    try {
        const parts = cipherText.split(':');
        if (parts.length !== 4) return cipherText;

        const [, ivHex, tagHex, encryptedHex] = parts;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(tagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.warn('[Encryption] Decrypt warning (returning raw):', err.message);
        return cipherText;
    }
};

/**
 * Generates HMAC-SHA256 signature for webhook payload authentication.
 *
 * @param {string|object} payload 
 * @param {string} secret 
 * @returns {string}
 */
export const generateHmacSignature = (payload, secret) => {
    const rawData = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    const key = secret || process.env.WEBHOOK_SECRET || 'crmhub_webhook_secret';
    return crypto.createHmac('sha256', key).update(rawData).digest('hex');
};

/**
 * Constant-time comparison for HMAC signature verification (Prevents Timing Attacks).
 *
 * @param {string|object} payload 
 * @param {string} signature 
 * @param {string} secret 
 * @returns {boolean}
 */
export const verifyHmacSignature = (payload, signature, secret) => {
    if (!signature) return false;
    try {
        const expected = generateHmacSignature(payload, secret);
        const sigBuf = Buffer.from(signature, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length) return false;
        return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch {
        return false;
    }
};

export default {
    encrypt,
    decrypt,
    generateHmacSignature,
    verifyHmacSignature
};
