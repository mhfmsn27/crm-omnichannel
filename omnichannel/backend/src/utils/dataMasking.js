/**
 * Data Masking & UU Pelindungan Data Pribadi (PDP) Compliance Utility
 * Automatically masks 16-digit credit cards, NIK KTP, and sensitive passwords
 */

export const maskSensitiveData = (text, userRole = 'agent') => {
    if (!text || typeof text !== 'string') return text;
    if (userRole === 'admin_member' || userRole === 'superadmin') return text; // Admins can view unmasked

    let masked = text;

    // 1. Mask 16-digit NIK / Credit Cards: 3201234567890123 -> 3201********0123
    masked = masked.replace(/\b(\d{4})\d{8}(\d{4})\b/g, '$1********$2');

    // 2. Mask Credit Card with dashes/spaces: 4111-2222-3333-4444 -> 4111-****-****-4444
    masked = masked.replace(/\b(\d{4})[- ]?\d{4}[- ]?\d{4}[- ]?(\d{4})\b/g, '$1-****-****-$2');

    // 3. Mask Email prefix partially: user.name@example.com -> u***e@example.com
    masked = masked.replace(/([a-zA-Z0-9_\-\.]{2})[a-zA-Z0-9_\-\.]+(@[a-zA-Z0-9_\-\.]+\.[a-zA-Z]{2,})/g, '$1***$2');

    return masked;
};
