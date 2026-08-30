/**
 * Enterprise Cryptographic License Configuration (RSA-2048)
 * CRMHUB Omnichannel Platform
 */

// Official Author RSA-2048 Public Key (PEM format)
export const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA49E30UxfkQqf8VP3LND5
u5xCeP57G6oPRTQdC9y4G6v3PDS/jvgEtTAUiImFaAXYnbQhNxM5BoxlReLCbN9H
walJlbhv0aZLhhiGUhMfvg3hMcsT2jnIceKqldLDNhJVwOLodTsKhCVsR4wmJsnX
HjQRx0W9s/wrsHckGsNHWg9WIHJTIua53wycPJ9nNOO9jPC5LVnsZJ+4e1GB/EYH
x6O/KU6q7953ogQNTNKclq1Kh21ZV5T6h7VxcWRs6k3L5ZHekZ0UUpFSvOKoqE5Y
eerVcW5O4e5Vry7rkCcmbkiB+IhzONnaS8KLp104dp1zIDLNwmTS18x2ggoiZm9M
dwIDAQAB
-----END PUBLIC KEY-----`;

export const LICENSE_CONFIG = {
    // Google Sheets ID
    SHEET_ID: process.env.LICENSE_SHEET_ID || '',

    // Allow all license in development mode or explicit flag
    ALLOW_ALL: process.env.ALLOW_ALL_LICENSE === 'true' || process.env.NODE_ENV === 'development',

    // Cache TTL in milliseconds (default: 60 seconds for fast real-time revocation)
    CACHE_TTL_MS: (parseInt(process.env.LICENSE_CACHE_TTL, 10) || 60) * 1000,

    // Offline Grace Period in milliseconds (default: 7 days = 604800 seconds)
    OFFLINE_GRACE_PERIOD_MS: (parseInt(process.env.LICENSE_OFFLINE_GRACE_PERIOD, 10) || 604800) * 1000,

    // Localhost & dev domain patterns (100% unrestricted dev mode)
    LOCALHOST_PATTERNS: [
        'localhost',
        '127.0.0.1',
        '::1',
        '0.0.0.0',
        '.test',
        '.local',
        '.internal'
    ]
};

export default {
    RSA_PUBLIC_KEY,
    LICENSE_CONFIG
};
