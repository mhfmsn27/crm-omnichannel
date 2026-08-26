/**
 * Centralized Phone & WhatsApp JID Normalization Utility
 * CRMHUB Omnichannel
 *
 * Guarantees 100% backward-compatibility across all controllers, workers, and services.
 */

/**
 * Clean phone number to pure digits (strip domain, suffixes, spaces, special chars)
 * @param {string|number} phone 
 * @returns {string}
 */
export const cleanDigits = (phone) => {
    if (!phone) return '';
    return String(phone)
        .replace(/@s\.whatsapp\.net/gi, '')
        .replace(/@c\.us/gi, '')
        .split(':')[0]
        .replace(/[^0-9]/g, '');
};

/**
 * Normalizes phone number to standard Indonesian format (628xxx).
 * Used across contact imports, CRUD, and broadcast campaigns.
 *
 * @param {string|number} phone 
 * @returns {string|null}
 */
export const formatPhone62 = (phone) => {
    if (!phone) return null;
    let p = cleanDigits(phone);
    if (!p) return null;

    if (p.startsWith('0')) p = '62' + p.slice(1);
    else if (p.startsWith('8')) p = '62' + p;

    return p;
};

/**
 * Normalizes WhatsApp phone / JID from inbound webhooks or socket events.
 * Preserves Group JIDs (@g.us) and cleans LID JIDs (@lid).
 *
 * @param {string|number} phone 
 * @returns {string|null}
 */
export const normalizeWhatsappPhone = (phone) => {
    if (!phone) return null;
    const strPhone = String(phone).trim();

    // Preserve LID formatting (e.g. "12345:0@lid" -> "12345@lid" or "12345@lid" -> "12345@lid")
    if (strPhone.includes('@lid')) {
        const base = strPhone.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        return base ? `${base}@lid` : strPhone;
    }

    // Preserve WhatsApp Group JID
    if (strPhone.endsWith('@g.us')) {
        return strPhone;
    }

    // Strip domain and device suffix
    let p = strPhone.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    if (!p) return null;

    // Indonesian phone formatting if purely numeric
    if (/^[0-9]+$/.test(p)) {
        if (p.startsWith('0')) p = '62' + p.slice(1);
        else if (p.startsWith('8')) p = '62' + p;
    }

    return p;
};

/**
 * Normalizes destination JID for outgoing gateway requests.
 *
 * @param {string} to 
 * @returns {string|null}
 */
export const normalizeJid = (to) => {
    if (!to) return null;
    const strTo = String(to).trim();

    // Preserve Group JID
    if (strTo.endsWith('@g.us')) {
        return strTo;
    }

    // Already valid JID
    if (strTo.includes('@s.whatsapp.net')) {
        return strTo;
    }

    // LID handling
    if (strTo.includes('@lid')) {
        const clean = strTo.replace(/@lid@lid$/, '@lid').replace(/@lid$/, '');
        if (/^\d+$/.test(clean)) {
            return `${clean}@s.whatsapp.net`;
        }
        if (clean.includes('@')) {
            return clean.split('@')[0] + '@s.whatsapp.net';
        }
        return `${clean}@s.whatsapp.net`;
    }

    // Standard numeric phone
    const digits = strTo.replace(/[^0-9]/g, '');
    if (digits) {
        let p = digits;
        if (p.startsWith('0')) p = '62' + p.slice(1);
        else if (p.startsWith('8')) p = '62' + p;
        return `${p}@s.whatsapp.net`;
    }

    return strTo;
};

/**
 * Validates if string is a valid numeric phone number.
 *
 * @param {string|number} phone 
 * @param {number} minLen 
 * @param {number} maxLen 
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone, minLen = 8, maxLen = 16) => {
    if (!phone) return false;
    const digits = cleanDigits(phone);
    return digits.length >= minLen && digits.length <= maxLen;
};

// Aliases for compatibility
export const normalizePhone = formatPhone62;
export default {
    cleanDigits,
    formatPhone62,
    normalizeWhatsappPhone,
    normalizeJid,
    isValidPhoneNumber,
    normalizePhone
};
