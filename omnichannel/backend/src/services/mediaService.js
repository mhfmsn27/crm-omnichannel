/**
 * Media Upload Service
 * Optimized for WhatsApp/iOS delivery
 */

import pool from '../config/db.js';
import path from 'path';
import fs from 'fs';

/**
 * Get proper media URL for WhatsApp/iOS devices
 * Ensures HTTPS and valid public URL
 */
export const getMediaUrl = (filename, organizationId) => {
    const appUrl = process.env.APP_URL || process.env.PUBLIC_URL || 'https://crm.example.com';

    // Ensure HTTPS
    const baseUrl = appUrl.replace('http://', 'https://');

    // Return full public URL
    if (filename.startsWith('http')) {
        return filename; // Already full URL
    }

    return `${baseUrl}/uploads/${filename}`;
};

/**
 * Validate media file exists and is accessible
 * Returns media metadata for debugging
 */
export const validateMediaAccessibility = async (filename) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, filename);

    // Security: Prevent path traversal
    if (!filename.match(/^[\w\-.]+$/)) {
        return { valid: false, error: 'Invalid filename characters' };
    }

    const exists = fs.existsSync(filePath);
    const stats = exists ? fs.statSync(filePath) : null;

    return {
        valid: exists,
        path: filePath,
        size: stats?.size || 0,
        url: getMediaUrl(filename),
        httpsUrl: getMediaUrl(filename).replace('http://', 'https://')
    };
};

/**
 * Get CDN URL if configured
 */
export const getCdnUrl = (filename) => {
    const cdnUrl = process.env.CDN_URL;
    if (cdnUrl) {
        return `${cdnUrl}/${filename}`;
    }
    return getMediaUrl(filename);
};
