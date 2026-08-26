/**
 * License Service - Domain-Locked License Validation (Fixed)
 * One-time purchase: no plan, no expiry
 * Active = domain exists in Google Sheet
 * Inactive = domain removed from Google Sheet
 */

import crypto from 'crypto';

// ==========================================
// CONFIGURATION
// ==========================================

const CONFIG = {
    // Google Sheets Configuration
    SHEET_ID: process.env.LICENSE_SHEET_ID || '',
    SHEET_NAME: 'licenses',

    // Cache Settings (in milliseconds)
    CACHE_VALIDITY_MS: 6 * 60 * 60 * 1000, // 6 hours cache - NOT 24 hours anymore!
};

// ==========================================
// LICENSE CACHE
// ==========================================

let licenseCache = {
    domain: null,
    valid: false,
    licenseKey: null,
    lastCheck: null,
    message: null,
    forceRefresh: false  // Flag for force refresh
};

// ==========================================
// CORE FUNCTIONS
// ==========================================

export const getDomainFromRequest = (req) => {
    // Try multiple sources for domain
    let host = req?.headers?.host || req?.hostname || req?.headers?.x-forwarded-host || '';

    // Handle IPv6
    if (host.includes(':') && !host.includes('.')) {
        host = '';
    }

    const domain = host.split(':')[0];
    const cleanDomain = domain.replace(/^www\./, '').toLowerCase().trim();

    console.log('[License] Domain from request:', cleanDomain, '| Raw host:', host);
    return cleanDomain;
};

export const hashDomain = (domain) => {
    return crypto.createHash('sha256').update(domain.toLowerCase()).digest('hex');
};

export const validateLicense = async (domain) => {
    if (!domain || domain.length === 0) {
        console.error('[License] ERROR: Empty domain received');
        return {
            valid: false,
            reason: 'EMPTY_DOMAIN',
            message: 'Domain tidak dapat dibaca'
        };
    }

    const now = Date.now();

    console.log('[License] Validating domain:', domain);
    console.log('[License] Cache state:', {
        cachedDomain: licenseCache.domain,
        lastCheck: licenseCache.lastCheck,
        age: licenseCache.lastCheck ? (now - licenseCache.lastCheck) : null,
        cacheValid: licenseCache.domain === domain &&
            licenseCache.lastCheck &&
            (now - licenseCache.lastCheck) < CONFIG.CACHE_VALIDITY_MS,
        forceRefresh: licenseCache.forceRefresh
    });

    // Check if cache is valid (not expired and same domain)
    const isCacheValid =
        licenseCache.domain === domain &&
        licenseCache.lastCheck &&
        (now - licenseCache.lastCheck) < CONFIG.CACHE_VALIDITY_MS &&
        !licenseCache.forceRefresh;

    if (isCacheValid) {
        console.log('[License] Using cached result for:', domain);
        return {
            valid: licenseCache.valid,
            domain: licenseCache.domain,
            licenseKey: licenseCache.licenseKey,
            cached: true,
            message: licenseCache.message
        };
    }

    // Cache expired or force refresh - fetch from Google Sheets
    console.log('[License] Fetching from Google Sheets...');

    try {
        const licenseData = await fetchFromGoogleSheets(domain);

        // Update cache
        licenseCache = {
            domain: domain,
            valid: licenseData !== null,
            licenseKey: licenseData?.licenseKey || null,
            lastCheck: now,
            message: licenseData !== null ? 'License valid' : 'Domain tidak terdaftar',
            forceRefresh: false  // Reset force refresh flag
        };

        console.log('[License] Result:', licenseData !== null ? 'VALID' : 'INVALID', '| Key:', licenseData?.licenseKey);

        return {
            valid: licenseData !== null,
            domain: domain,
            licenseKey: licenseData?.licenseKey || null,
            cached: false,
            message: licenseData !== null ? 'License valid' : 'Domain tidak terdaftar'
        };

    } catch (error) {
        console.error('[License] Validation error:', error);

        // Fallback to cache if available
        if (licenseCache.domain === domain && licenseCache.lastCheck) {
            console.log('[License] Using fallback cache');
            return {
                valid: licenseCache.valid,
                domain: licenseCache.domain,
                licenseKey: licenseCache.licenseKey,
                cached: true,
                warning: 'Using cached data',
                message: licenseCache.message
            };
        }

        return {
            valid: false,
            reason: 'VALIDATION_ERROR',
            message: 'Tidak dapat memvalidasi license: ' + error.message
        };
    }
};

// ==========================================
// GOOGLE SHEETS FETCHING
// ==========================================

const fetchFromGoogleSheets = async (domain) => {
    if (!CONFIG.SHEET_ID) {
        console.log('[License] No SHEET_ID configured');
        // In development or no license configured, allow all
        if (process.env.NODE_ENV === 'development' || process.env.ALLOW_ALL_LICENSE === 'true') {
            console.log('[License] ALLOW_ALL_LICENSE mode - allowing all domains');
            return { licenseKey: 'dev-license' };
        }
        return null;
    }

    console.log('[License] Fetching from Google Sheets ID:', CONFIG.SHEET_ID);
    return await fetchViaCSV(domain);
};

const fetchViaCSV = async (domain) => {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/export?format=csv&gid=0`;
        console.log('[License] CSV URL:', csvUrl);

        const response = await fetch(csvUrl, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            console.error('[License] CSV fetch failed:', response.status, response.statusText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log('[License] CSV received, length:', csvText.length);

        // Debug: Show first 500 chars of CSV
        console.log('[License] CSV preview:', csvText.substring(0, 500));

        return parseCSVForDomain(csvText, domain);
    } catch (error) {
        console.error('[License] CSV fetch error:', error);
        throw error;
    }
};

const parseCSVForDomain = (csvText, domain) => {
    const lines = csvText.trim().split('\n');
    console.log('[License] CSV lines:', lines.length);

    if (lines.length < 2) {
        console.log('[License] No data rows in CSV');
        return null;
    }

    const normalizedDomain = domain.toLowerCase().trim();

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const rowDomain = values[0]?.trim().replace(/"/g, '').toLowerCase();

        console.log(`[License] Checking row ${i}: "${rowDomain}" vs "${normalizedDomain}"`);

        if (rowDomain && rowDomain === normalizedDomain) {
            console.log('[License] MATCH FOUND!');
            return {
                licenseKey: values[1]?.trim() || ''
            };
        }
    }

    console.log('[License] No match found for:', domain);
    return null;
};

const parseCSVLine = (line) => {
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
// LICENSE MANAGEMENT
// ==========================================

export const clearLicenseCache = (domain = null) => {
    console.log('[License] Clearing cache', domain ? `for domain: ${domain}` : '(all)');
    licenseCache = {
        domain: null,
        valid: false,
        licenseKey: null,
        lastCheck: null,
        message: null,
        forceRefresh: false
    };
};

export const refreshLicense = async (domain) => {
    console.log('[License] Force refresh requested for:', domain);
    // Clear cache and force refresh
    licenseCache.forceRefresh = true;
    clearLicenseCache();
    // Validate again (will skip cache)
    return await validateLicense(domain);
};

export const getLicenseStatus = () => {
    const now = Date.now();
    return {
        valid: licenseCache.valid,
        domain: licenseCache.domain,
        licenseKey: licenseCache.licenseKey,
        cached: licenseCache.lastCheck !== null,
        lastCheck: licenseCache.lastCheck,
        cacheAge: licenseCache.lastCheck ? Math.round((now - licenseCache.lastCheck) / 1000 / 60) + ' minutes ago' : null
    };
};

export const generateLicenseKey = (domain) => {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CRMHUB-${timestamp}-${random}`;
};

export const getSheetsSetupInstructions = () => {
    return {
        instructions: [
            '1. Buat Google Spreadsheet baru',
            '2. Rename sheet pertama menjadi "licenses"',
            '3. Tambahkan header di baris 1: Domain | License Key',
            '4. Di baris 2, tambahkan domain Anda, contoh:',
            '   Domain: vps.lamankita.web.id',
            '   License Key: (biarkan kosong)',
            '5. Klik Share → Anyone with the link can VIEW',
            '6. Copy spreadsheet ID dari URL:',
            '   https://docs.google.com/spreadsheets/d/[INI_ADALAH_ID]/edit',
            '7. Set LICENSE_SHEET_ID di environment variables',
            '8. Restart PM2: pm2 restart omni-backend'
        ],
        sheetUrl: `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID || 'YOUR_SHEET_ID'}/edit`,
        currentSheetId: CONFIG.SHEET_ID || '(not set)'
    };
};

export default {
    validateLicense,
    clearLicenseCache,
    refreshLicense,
    getLicenseStatus,
    generateLicenseKey,
    getSheetsSetupInstructions,
    getDomainFromRequest,
    hashDomain
};