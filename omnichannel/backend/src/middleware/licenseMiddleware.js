/**
 * Enterprise Cryptographic License Guard Middleware
 * CRMHUB Omnichannel Platform
 */

import * as licenseService from '../services/licenseService.js';

// Public endpoints exempted from license checking
const EXEMPTED_PATHS = [
    '/api/health',
    '/api/license',
    '/webhook',
    '/r/',
    '/u/',
    '/ref/',
    '/uploads'
];

export const checkLicense = async (req, res, next) => {
    try {
        const path = req.path || req.originalUrl || '';

        // Check if path is exempted (public/health/webhooks/license endpoints)
        if (EXEMPTED_PATHS.some(exempted => path.startsWith(exempted))) {
            return next();
        }

        const domain = licenseService.getDomainFromRequest(req);
        const result = await licenseService.validateLicense(domain);

        if (result.valid) {
            // Attach validated license context & cryptographic operation token
            req.license = {
                domain: result.domain,
                valid: true,
                licenseKey: result.licenseKey,
                clientName: result.clientName,
                rsaVerified: result.rsaVerified,
                operationKey: licenseService.deriveOperationKey('api_request', result.domain)
            };
            return next();
        }

        // License Invalid - Return 403 Forbidden
        return res.status(403).json({
            status: 'license_invalid',
            domain: domain,
            reason: result.reason || 'UNAUTHORIZED_DOMAIN',
            message: result.message || 'Akses ditolak: Domain ini belum terdaftar dalam sistem lisensi resmi CRMHUB atau tanda tangan RSA tidak sah.'
        });

    } catch (error) {
        console.error('[License Middleware] Error:', error.message);
        // Fail-safe: if in local dev, allow next, else 403
        if (process.env.NODE_ENV === 'development' || process.env.ALLOW_ALL_LICENSE === 'true') {
            return next();
        }
        return res.status(403).json({
            status: 'license_error',
            message: 'Validasi lisensi mengalami kendala: ' + error.message
        });
    }
};

export default checkLicense;