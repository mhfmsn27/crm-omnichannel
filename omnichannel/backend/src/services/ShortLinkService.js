// backend/src/services/ShortLinkService.js
import pool from '../config/db.js';
import crypto from 'crypto';

const generateSlug = (length = 7) => {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
};

// Modified to accept optional dbClient for transaction support
export const createTrackingLink = async (orgId, broadcastId, contactId, originalUrl, dbClient = null) => {
    // 5 attempts to generate unique slug
    for (let i = 0; i < 5; i++) {
        const slug = generateSlug();
        
        // Use provided client or get new one from pool
        const client = dbClient || await pool.connect();
        const shouldRelease = !dbClient; // Only release if we created the connection here

        try {
            await client.query(
                `INSERT INTO short_links (organization_id, broadcast_id, contact_id, original_url, slug, type)
                 VALUES ($1, $2, $3, $4, $5, 'tracking')`,
                [orgId, broadcastId, contactId, originalUrl, slug]
            );
            return slug;
        } catch (err) {
            if (err.code === '23505') continue; // Unique violation, retry
            throw err;
        } finally {
            if (shouldRelease) client.release();
        }
    }
    throw new Error("Failed to generate unique slug");
};

// Modified to accept optional dbClient for transaction support
export const createUnsubscribeLink = async (orgId, broadcastId, contactId, dbClient = null) => {
    const slug = generateSlug(9);
    
    // Use provided client or get new one from pool
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        await client.query(
            `INSERT INTO short_links (organization_id, broadcast_id, contact_id, original_url, slug, type)
             VALUES ($1, $2, $3, 'UNSUBSCRIBE', $4, 'unsubscribe')`,
            [orgId, broadcastId, contactId, slug]
        );
        return slug;
    } finally {
        if (shouldRelease) client.release();
    }
};

export const getLinkBySlug = async (slug) => {
    const res = await pool.query('SELECT * FROM short_links WHERE slug = $1', [slug]);
    return res.rows[0];
};

export const logClick = async (shortLinkId, ip, userAgent) => {
    await pool.query('UPDATE short_links SET click_count = click_count + 1 WHERE id = $1', [shortLinkId]);
    await pool.query(
        'INSERT INTO link_clicks (short_link_id, ip_address, user_agent) VALUES ($1, $2, $3)',
        [shortLinkId, ip, userAgent]
    );
};