/**
 * Enterprise Cryptographic License Controller
 * CRMHUB Omnichannel Platform
 */

import * as licenseService from '../services/licenseService.js';
import { LICENSE_CONFIG } from '../config/license.js';

// Check license validity (Public & Protected)
export const checkLicense = async (req, res) => {
    try {
        const domain = licenseService.getDomainFromRequest(req);
        const result = await licenseService.validateLicense(domain);

        if (result.valid) {
            res.json({
                status: 'valid',
                valid: true,
                domain: result.domain,
                licenseKey: result.licenseKey,
                clientName: result.clientName,
                rsaVerified: result.rsaVerified,
                cached: result.cached,
                grace_period: result.grace_period || false,
                message: result.message
            });
        } else {
            res.status(403).json({
                status: 'invalid',
                valid: false,
                domain: domain,
                reason: result.reason,
                message: result.message || 'Domain tidak terdaftar dalam lisensi resmi'
            });
        }
    } catch (error) {
        console.error('[License API] checkLicense error:', error.message);
        res.status(500).json({
            status: 'error',
            valid: false,
            message: 'Gagal memvalidasi lisensi: ' + error.message
        });
    }
};

// Force refresh license from Google Sheets
export const refreshLicense = async (req, res) => {
    try {
        const domain = licenseService.getDomainFromRequest(req);
        const result = await licenseService.refreshLicense(domain);

        res.json({
            status: result.valid ? 'valid' : 'invalid',
            valid: result.valid,
            domain: result.domain,
            licenseKey: result.licenseKey,
            clientName: result.clientName,
            rsaVerified: result.rsaVerified,
            cached: false,
            message: result.message
        });
    } catch (error) {
        console.error('[License API] refreshLicense error:', error.message);
        res.status(500).json({ status: 'error', message: 'Gagal merefresh lisensi: ' + error.message });
    }
};

// Get cached license status
export const getStatus = async (req, res) => {
    try {
        const status = licenseService.getLicenseStatus();
        res.json(status);
    } catch (error) {
        console.error('[License API] getStatus error:', error.message);
        res.status(500).json({ error: 'Gagal mengambil status lisensi' });
    }
};

// Get setup instructions for admin
export const getSetupInfo = async (req, res) => {
    try {
        res.json({
            instructions: [
                '1. Buat Google Spreadsheet baru di Google Drive Anda',
                '2. Beri nama Sheet pertama "licenses"',
                '3. Isi Header Baris 1: Domain | License_Key | RSA_Signature | Client_Name',
                '4. Di baris 2 dst, gunakan CLI author untuk generate baris berlisensi:',
                '   node scripts/generate-license.js domainanda.com --client="Nama Klien"',
                '5. Bagikan Spreadsheet: Anyone with the link can VIEW (Akses Lihat Saja)',
                '6. Salin SHEET_ID dari URL Google Sheets dan set di file .env: LICENSE_SHEET_ID=...'
            ],
            sheetUrl: `https://docs.google.com/spreadsheets/d/${LICENSE_CONFIG.SHEET_ID || 'YOUR_SHEET_ID'}/edit`,
            currentSheetId: LICENSE_CONFIG.SHEET_ID || '(belum diset)'
        });
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil info setup' });
    }
};

export default {
    checkLicense,
    refreshLicense,
    getStatus,
    getSetupInfo
};