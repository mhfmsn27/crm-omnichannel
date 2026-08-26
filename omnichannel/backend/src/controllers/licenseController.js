/**
 * License Controller - Domain-Locked License
 * One-time purchase: no plan, no expiry
 */

import * as licenseService from '../services/licenseService.js';

// Check license validity
export const checkLicense = async (req, res) => {
    try {
        const domain = licenseService.getDomainFromRequest(req);
        console.log('[License API] checkLicense called for domain:', domain);

        if (!domain || domain.length === 0) {
            return res.status(400).json({
                status: 'invalid',
                reason: 'EMPTY_DOMAIN',
                message: 'Domain tidak dapat dibaca dari request'
            });
        }

        const result = await licenseService.validateLicense(domain);

        if (result.valid) {
            res.json({
                status: 'valid',
                domain: result.domain,
                licenseKey: result.licenseKey,
                cached: result.cached,
                message: result.message
            });
        } else {
            res.status(403).json({
                status: 'invalid',
                reason: result.reason,
                message: result.message || 'Domain tidak terdaftar'
            });
        }
    } catch (error) {
        console.error('[License API] checkLicense error:', error);
        res.status(500).json({
            status: 'error',
            message: 'License validation failed: ' + error.message
        });
    }
};

// Force refresh license from Google Sheets
export const refreshLicense = async (req, res) => {
    try {
        const domain = licenseService.getDomainFromRequest(req);
        console.log('[License API] refreshLicense called for domain:', domain);

        const result = await licenseService.refreshLicense(domain);

        res.json({
            success: result.valid,
            domain: result.domain,
            licenseKey: result.licenseKey,
            message: result.message,
            cached: false
        });
    } catch (error) {
        console.error('[License API] refreshLicense error:', error);
        res.status(500).json({ success: false, message: 'License refresh failed: ' + error.message });
    }
};

// Get cached license status
export const getStatus = async (req, res) => {
    try {
        const status = licenseService.getLicenseStatus();
        res.json(status);
    } catch (error) {
        console.error('[License API] getStatus error:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
};

// Verify feature (always returns true for one-time purchase)
export const verifyFeature = async (req, res) => {
    try {
        const { feature } = req.params;
        const status = licenseService.getLicenseStatus();

        res.json({
            feature,
            hasAccess: status.valid,
            domain: status.domain
        });
    } catch (error) {
        console.error('[License API] verifyFeature error:', error);
        res.status(500).json({ error: 'Feature verification failed' });
    }
};

// Get setup instructions
export const getSetupInfo = async (req, res) => {
    try {
        const info = licenseService.getSheetsSetupInstructions();
        res.json(info);
    } catch (error) {
        console.error('[License API] getSetupInfo error:', error);
        res.status(500).json({ error: 'Failed to get setup info' });
    }
};

// Legacy activate endpoint
export const activateLicense = async (req, res) => {
    try {
        const domain = licenseService.getDomainFromRequest(req);
        const result = await licenseService.validateLicense(domain);

        res.json({
            success: result.valid,
            domain: result.domain,
            message: result.valid ? 'License valid' : 'Domain not registered'
        });
    } catch (error) {
        console.error('[License API] activateLicense error:', error);
        res.status(500).json({ success: false, message: 'License activation failed' });
    }
};

// Legacy deactivate endpoint
export const deactivateLicense = async (req, res) => {
    try {
        licenseService.clearLicenseCache();
        res.json({ success: true, message: 'License cache cleared' });
    } catch (error) {
        console.error('[License API] deactivateLicense error:', error);
        res.status(500).json({ success: false, message: 'Failed to deactivate' });
    }
};