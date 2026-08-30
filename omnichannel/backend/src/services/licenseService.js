/**
 * Enterprise Cryptographic License Service (RSA-2048 & Logic Binding)
 * CRMHUB Omnichannel Platform
 */

import crypto from 'crypto';
import { RSA_PUBLIC_KEY, LICENSE_CONFIG } from '../config/license.js';

// ==========================================
// IN-MEMORY TAMPER-PROOF CACHE
// ==========================================
let licenseCache = {
    domain: null,
    valid: false,
    licenseKey: null,
    clientName: null,
    signature: null,
    rsaVerified: false,
    lastCheck: null,
    lastValidCheck: null,
    message: null,
    hmac: null,
    forceRefresh: false
};

// Secret key for HMAC anti-tamper caching
const CACHE_SECRET = process.env.JWT_SECRET || 'crmhub_enterprise_license_salt_v2';

/**
 * Generate HMAC digest for cache anti-tampering
 */
const signCacheData = (data) => {
    const payload = `${data.domain}|${data.valid}|${data.licenseKey}|${data.clientName}|${data.signature}|${data.lastCheck}|${data.lastValidCheck}`;
    return crypto.createHmac('sha256', CACHE_SECRET).update(payload).digest('hex');
};

/**
 * Verify HMAC integrity of cache
 */
const verifyCacheIntegrity = (cache) => {
    if (!cache || !cache.hmac) return false;
    const expectedHmac = signCacheData(cache);
    try {
        return crypto.timingSafeEqual(Buffer.from(cache.hmac), Buffer.from(expectedHmac));
    } catch {
        return false;
    }
};

// ==========================================
// DOMAIN EXTRACTION & NORMALIZATION
// ==========================================

export const getDomainFromRequest = (req) => {
    if (!req) return 'localhost';
    
    // Check multiple headers (Reverse proxy Nginx / Cloudflare / Direct)
    let host = req.headers?.['x-forwarded-host'] || req.headers?.host || req.hostname || '';

    // Handle multiple forwarded hosts (comma separated)
    if (host.includes(',')) {
        host = host.split(',')[0].trim();
    }

    // Remove protocol if present
    host = host.replace(/^https?:\/\//i, '');

    // Remove port numbers (e.g., domain.com:8998 or 127.0.0.1:5173)
    const domain = host.split(':')[0];

    // Clean prefix www. and trim lowercase
    const cleanDomain = domain.replace(/^www\./i, '').toLowerCase().trim();

    return cleanDomain || 'localhost';
};

export const isLocalhost = (domain) => {
    if (!domain) return true;
    const clean = domain.toLowerCase().trim();
    return LICENSE_CONFIG.LOCALHOST_PATTERNS.some(p => clean === p || clean.endsWith(p));
};

// ==========================================
// RSA-2048 CRYPTOGRAPHIC VERIFICATION
// ==========================================

/**
 * Verify RSA-2048 Digital Signature using Embedded Public Key
 */
export const verifyRsaSignature = (domain, signature, customPublicKey = null) => {
    try {
        if (!domain || !signature) return false;
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].toLowerCase().trim();
        const publicKey = customPublicKey || RSA_PUBLIC_KEY;

        const verifier = crypto.createVerify('sha256');
        verifier.update(Buffer.from(cleanDomain));
        verifier.end();

        return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
    } catch (error) {
        console.error('[License RSA] Verification error:', error.message);
        return false;
    }
};

// ==========================================
// CORE VALIDATION LOGIC
// ==========================================

export const validateLicense = async (rawDomain) => {
    const domain = (rawDomain || 'localhost').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].toLowerCase().trim();
    const now = Date.now();

    // 1. LOCALHOST & DEV WHITELIST (100% UNRESTRICTED)
    if (isLocalhost(domain) || LICENSE_CONFIG.ALLOW_ALL) {
        return {
            valid: true,
            domain: domain,
            licenseKey: 'DEV_UNRESTRICTED_LICENSE',
            clientName: 'Local Development Environment',
            rsaVerified: true,
            cached: false,
            status: 'development',
            message: 'Akses penuh mode development / localhost aktif'
        };
    }

    // 2. CHECK TAMPER-PROOF CACHE
    const isCacheValid =
        licenseCache.domain === domain &&
        licenseCache.lastCheck &&
        (now - licenseCache.lastCheck) < LICENSE_CONFIG.CACHE_TTL_MS &&
        !licenseCache.forceRefresh &&
        verifyCacheIntegrity(licenseCache);

    if (isCacheValid) {
        return {
            valid: licenseCache.valid,
            domain: licenseCache.domain,
            licenseKey: licenseCache.licenseKey,
            clientName: licenseCache.clientName,
            rsaVerified: licenseCache.rsaVerified,
            cached: true,
            message: licenseCache.message
        };
    }

    // 3. FETCH FROM GOOGLE SHEETS
    try {
        if (!LICENSE_CONFIG.SHEET_ID) {
            console.warn('[License] LICENSE_SHEET_ID tidak dikonfigurasi pada environment produksi');
            return {
                valid: false,
                reason: 'NO_SHEET_CONFIGURED',
                message: 'LICENSE_SHEET_ID belum dikonfigurasi di server'
            };
        }

        const licenseData = await fetchFromGoogleSheets(domain);

        if (licenseData) {
            // Verify RSA Signature if present
            let rsaValid = false;
            if (licenseData.signature) {
                rsaValid = verifyRsaSignature(domain, licenseData.signature);
                if (!rsaValid && process.env.STRICT_RSA === 'true') {
                    console.error(`[License] Strict RSA Signature MISMATCH for domain: ${domain}`);
                    return {
                        valid: false,
                        reason: 'INVALID_RSA_SIGNATURE',
                        message: 'Tanda tangan kriptografis RSA-2048 lisensi tidak sah atau telah dimodifikasi'
                    };
                }
            }

            // Update in-memory tamper-proof cache
            licenseCache = {
                domain: domain,
                valid: true,
                licenseKey: licenseData.licenseKey || 'CRMHUB-PRO-ACTIVE',
                clientName: licenseData.clientName || 'Valued Client',
                signature: licenseData.signature || 'sheet_verified',
                rsaVerified: rsaValid,
                lastCheck: now,
                lastValidCheck: now,
                message: rsaValid ? 'Lisensi resmi 1-domain RSA-2048 valid' : 'Domain terverifikasi aktif di Google Sheets whitelist',
                forceRefresh: false
            };
            licenseCache.hmac = signCacheData(licenseCache);

            return {
                valid: true,
                domain: domain,
                licenseKey: licenseCache.licenseKey,
                clientName: licenseCache.clientName,
                rsaVerified: licenseCache.rsaVerified,
                cached: false,
                message: licenseCache.message
            };
        } else {
            // Domain not found in Google Sheets
            licenseCache = {
                domain: domain,
                valid: false,
                licenseKey: null,
                clientName: null,
                signature: null,
                rsaVerified: false,
                lastCheck: now,
                lastValidCheck: licenseCache.lastValidCheck,
                message: 'Domain belum terdaftar dalam sistem lisensi resmi',
                forceRefresh: false
            };
            licenseCache.hmac = signCacheData(licenseCache);

            return {
                valid: false,
                reason: 'DOMAIN_NOT_FOUND',
                message: 'Domain ini belum terdaftar dalam sistem lisensi resmi'
            };
        }

    } catch (error) {
        console.error('[License] Fetching error:', error.message);

        // 4. SMART 7-DAY OFFLINE GRACE PERIOD TOLERANCE
        if (
            licenseCache.domain === domain &&
            licenseCache.lastValidCheck &&
            (now - licenseCache.lastValidCheck) < LICENSE_CONFIG.OFFLINE_GRACE_PERIOD_MS &&
            verifyCacheIntegrity(licenseCache)
        ) {
            console.warn(`[License] Running in Offline Grace Period for domain: ${domain}`);
            return {
                valid: true,
                domain: licenseCache.domain,
                licenseKey: licenseCache.licenseKey,
                clientName: licenseCache.clientName,
                rsaVerified: licenseCache.rsaVerified,
                cached: true,
                grace_period: true,
                message: 'Aplikasi berjalan dalam mode toleransi offline resmi (Maks 7 Hari)'
            };
        }

        return {
            valid: false,
            reason: 'VALIDATION_NETWORK_ERROR',
            message: 'Tidak dapat memvalidasi lisensi ke server: ' + error.message
        };
    }
};

// ==========================================
// GOOGLE SHEETS PARSER
// ==========================================

const fetchFromGoogleSheets = async (domain) => {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${LICENSE_CONFIG.SHEET_ID}/export?format=csv&gid=0`;

    const response = await fetch(csvUrl, {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const csvText = await response.text();
    return parseCsvRowsForDomain(csvText, domain);
};

const parseCsvRowsForDomain = (csvText, domain) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;

    const targetDomain = domain.toLowerCase().trim();

    for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]);
        if (!row || row.length === 0) continue;

        const rowDomain = row[0]?.trim().replace(/"/g, '').replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split(':')[0].toLowerCase();

        if (rowDomain && rowDomain === targetDomain) {
            return {
                domain: rowDomain,
                licenseKey: row[1]?.trim().replace(/"/g, '') || '',
                signature: row[2]?.trim().replace(/"/g, '') || '',
                clientName: row[3]?.trim().replace(/"/g, '') || 'Official Client'
            };
        }
    }

    return null;
};

const parseCsvLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
};

// ==========================================
// CRYPTOGRAPHIC LOGIC BINDING
// ==========================================

/**
 * Derive secure cryptographic token required by core execution engines (WhatsApp dispatch, etc.)
 */
export const deriveOperationKey = (operation, customDomain = null) => {
    const domain = customDomain || licenseCache.domain || 'localhost';
    const salt = licenseCache.signature || (isLocalhost(domain) ? 'dev_unrestricted_root' : 'crmhub_root_key');
    return crypto.createHmac('sha256', `${domain}:${salt}`).update(operation).digest('hex');
};

/**
 * Verify operation key
 */
export const verifyOperationKey = (operation, token, customDomain = null) => {
    if (!token) return false;
    const expected = deriveOperationKey(operation, customDomain);
    try {
        return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
        return false;
    }
};

/**
 * Generate cryptographic message checksum stamp for WhatsApp outbound messages
 */
export const generateMessageChecksum = (phone, messageId, customDomain = null) => {
    const opKey = deriveOperationKey('wa_dispatch', customDomain);
    return crypto.createHmac('sha256', opKey).update(`${phone}:${messageId}`).digest('hex');
};

// ==========================================
// CACHE CONTROLS & STATUS
// ==========================================

export const clearLicenseCache = () => {
    licenseCache = {
        domain: null,
        valid: false,
        licenseKey: null,
        clientName: null,
        signature: null,
        rsaVerified: false,
        lastCheck: null,
        lastValidCheck: null,
        message: null,
        hmac: null,
        forceRefresh: false
    };
};

export const refreshLicense = async (domain) => {
    licenseCache.forceRefresh = true;
    clearLicenseCache();
    return await validateLicense(domain);
};

export const getLicenseStatus = () => {
    const now = Date.now();
    return {
        valid: licenseCache.valid,
        domain: licenseCache.domain,
        licenseKey: licenseCache.licenseKey,
        clientName: licenseCache.clientName,
        rsaVerified: licenseCache.rsaVerified,
        cached: licenseCache.lastCheck !== null,
        lastCheck: licenseCache.lastCheck,
        cacheAge: licenseCache.lastCheck ? Math.round((now - licenseCache.lastCheck) / 1000 / 60) + ' minutes ago' : null
    };
};

export default {
    validateLicense,
    getDomainFromRequest,
    isLocalhost,
    verifyRsaSignature,
    deriveOperationKey,
    verifyOperationKey,
    generateMessageChecksum,
    clearLicenseCache,
    refreshLicense,
    getLicenseStatus
};