/**
 * Data Masking & UU PDP Compliance Utility (Frontend)
 */

export const maskSensitiveData = (text, userRole = 'agent') => {
    if (!text || typeof text !== 'string') return text;
    if (userRole === 'admin_member' || userRole === 'superadmin') return text;

    let masked = text;

    // 1. Mask 16-digit NIK / Credit Cards
    masked = masked.replace(/\b(\d{4})\d{8}(\d{4})\b/g, '$1********$2');

    // 2. Mask Credit Card formatted
    masked = masked.replace(/\b(\d{4})[- ]?\d{4}[- ]?\d{4}[- ]?(\d{4})\b/g, '$1-****-****-$2');

    return masked;
};
