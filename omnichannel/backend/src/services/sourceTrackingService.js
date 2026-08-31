/**
 * Source Tracking Service
 * Handles UTM parameters, short links, and visitor attribution
 */

import pool from '../config/db.js';
import crypto from 'crypto';

// --- SELF-HEALING TRACKING & ATTRIBUTION SCHEMA ---
export const ensureTrackingTables = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS short_links (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                target_url TEXT NOT NULL,
                utm_source VARCHAR(100),
                utm_medium VARCHAR(100),
                utm_campaign VARCHAR(100),
                utm_content VARCHAR(100),
                utm_term VARCHAR(100),
                rotator_group_id INT,
                click_count INT DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                expires_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS short_link_clicks (
                id SERIAL PRIMARY KEY,
                short_link_id INT REFERENCES short_links(id) ON DELETE CASCADE,
                organization_id INT NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                referrer TEXT,
                visitor_id VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS visitor_sessions (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                visitor_id VARCHAR(255) NOT NULL,
                first_touch_source VARCHAR(100),
                first_touch_medium VARCHAR(100),
                first_touch_campaign VARCHAR(100),
                first_touch_content VARCHAR(100),
                first_touch_term VARCHAR(100),
                last_touch_source VARCHAR(100),
                last_touch_medium VARCHAR(100),
                last_touch_campaign VARCHAR(100),
                contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    } catch (e) {
        console.error('[SourceTracking] ensureTrackingTables error:', e.message);
    }
};
ensureTrackingTables().catch(() => {});

/**
 * Generate unique slug for short link
 */
export const generateSlug = async (desiredSlug = null) => {
    if (desiredSlug) {
        // Check if slug exists
        const check = await pool.query('SELECT id FROM short_links WHERE slug = $1', [desiredSlug]);
        if (check.rows.length === 0) {
            return desiredSlug;
        }
    }

    // Generate random slug
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug;
    let attempts = 0;

    while (attempts < 10) {
        slug = '';
        for (let i = 0; i < 6; i++) {
            slug += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const check = await pool.query('SELECT id FROM short_links WHERE slug = $1', [slug]);
        if (check.rows.length === 0) {
            return slug;
        }
        attempts++;
    }

    // Fallback to timestamp-based slug
    return `${Date.now().toString(36)}`;
};

/**
 * Create a short link with UTM parameters
 */
export const createShortLink = async (orgId, userId, data) => {
    const {
        slug,
        target_url,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        rotator_group_id,
        expires_at
    } = data;

    try {
        const uniqueSlug = await generateSlug(slug);

        const result = await pool.query(
            `INSERT INTO short_links
             (organization_id, slug, target_url, utm_source, utm_medium, utm_campaign,
              utm_content, utm_term, rotator_group_id, created_by, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [orgId, uniqueSlug, target_url, utm_source, utm_medium, utm_campaign,
                utm_content, utm_term, rotator_group_id, userId, expires_at]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[SourceTracking] Error creating short link:', error);
        throw error;
    }
};

/**
 * Get short link by slug
 */
export const getShortLink = async (slug) => {
    try {
        const result = await pool.query(
            'SELECT * FROM short_links WHERE slug = $1 AND is_active = true',
            [slug]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('[SourceTracking] Error getting short link:', error);
        return null;
    }
};

/**
 * Build full URL with UTM parameters
 */
export const buildUtmUrl = (baseUrl, utmParams) => {
    if (!utmParams) return baseUrl;

    const url = new URL(baseUrl);
    if (utmParams.utm_source) url.searchParams.set('utm_source', utmParams.utm_source);
    if (utmParams.utm_medium) url.searchParams.set('utm_medium', utmParams.utm_medium);
    if (utmParams.utm_campaign) url.searchParams.set('utm_campaign', utmParams.utm_campaign);
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content);
    if (utmParams.utm_term) url.searchParams.set('utm_term', utmParams.utm_term);

    return url.toString();
};

/**
 * Parse UTM parameters from URL
 */
export const parseUtmParams = (url) => {
    try {
        const urlObj = new URL(url);
        return {
            utm_source: urlObj.searchParams.get('utm_source'),
            utm_medium: urlObj.searchParams.get('utm_medium'),
            utm_campaign: urlObj.searchParams.get('utm_campaign'),
            utm_content: urlObj.searchParams.get('utm_content'),
            utm_term: urlObj.searchParams.get('utm_term')
        };
    } catch {
        return {};
    }
};

/**
 * Record a click on short link
 */
export const recordClick = async (shortLink, visitorId, req = {}) => {
    try {
        const ipAddress = req.ip || req.connection?.remoteAddress || null;
        const userAgent = req.headers?.['user-agent'] || null;

        // Parse UTM from referring URL if present
        const utmParams = parseUtmParams(req.headers?.referer || '');

        // Determine source
        const source = utmParams.utm_source || shortLink.utm_source || 'direct';
        const medium = utmParams.utm_medium || shortLink.utm_medium || 'link';
        const campaign = utmParams.utm_campaign || shortLink.utm_campaign;
        const content = utmParams.utm_content || shortLink.utm_content;
        const term = utmParams.utm_term || shortLink.utm_term;

        // Update click count
        await pool.query(
            'UPDATE short_links SET click_count = click_count + 1 WHERE id = $1',
            [shortLink.id]
        );

        // Log the click
        const clickLog = await pool.query(
            `INSERT INTO short_link_clicks
             (short_link_id, organization_id, visitor_id, ip_address, user_agent,
              source, medium, campaign, content, term)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [shortLink.id, shortLink.organization_id, visitorId, ipAddress, userAgent,
                source, medium, campaign, content, term]
        );

        return clickLog.rows[0];
    } catch (error) {
        console.error('[SourceTracking] Error recording click:', error);
        return null;
    }
};

/**
 * Get or create visitor session
 */
export const getOrCreateVisitorSession = async (orgId, visitorId, attributionData = {}) => {
    try {
        // Check existing session
        const existing = await pool.query(
            'SELECT * FROM visitor_sessions WHERE organization_id = $1 AND visitor_id = $2',
            [orgId, visitorId]
        );

        if (existing.rows.length > 0) {
            // Update last touch attribution
            await pool.query(
                `UPDATE visitor_sessions SET
                 last_source = $3, last_medium = $4, last_campaign = $5,
                 last_touch_click_at = NOW(), updated_at = NOW()
                 WHERE organization_id = $1 AND visitor_id = $2`,
                [orgId, visitorId, attributionData.source || 'direct',
                    attributionData.medium || 'unknown', attributionData.campaign]
            );

            return existing.rows[0];
        }

        // Create new session with first touch attribution
        const result = await pool.query(
            `INSERT INTO visitor_sessions
             (organization_id, visitor_id, first_source, first_medium, first_campaign,
              first_content, first_term, first_click_at, last_source, last_medium, last_campaign, last_touch_click_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $3, $4, $5, NOW())
             RETURNING *`,
            [orgId, visitorId,
                attributionData.source || 'direct',
                attributionData.medium || 'unknown',
                attributionData.campaign,
                attributionData.content,
                attributionData.term]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[SourceTracking] Error creating visitor session:', error);
        return null;
    }
};

/**
 * Link visitor session to contact when phone number is captured
 */
export const linkSessionToContact = async (orgId, visitorId, phoneNumber, contactId, conversationId) => {
    try {
        await pool.query(
            `UPDATE visitor_sessions SET
             phone_number = $3,
             contact_id = $4,
             conversation_id = $5,
             updated_at = NOW()
             WHERE organization_id = $1 AND visitor_id = $2`,
            [orgId, visitorId, phoneNumber, contactId, conversationId]
        );

        // Also update contact with first/last touch data
        const sessionRes = await pool.query(
            'SELECT * FROM visitor_sessions WHERE organization_id = $1 AND visitor_id = $2',
            [orgId, visitorId]
        );

        if (sessionRes.rows.length > 0) {
            const session = sessionRes.rows[0];
            await pool.query(
                `UPDATE contacts SET
                 first_touch_source = COALESCE(first_touch_source, $3),
                 first_touch_medium = COALESCE(first_touch_medium, $4),
                 first_touch_campaign = COALESCE(first_touch_campaign, $5),
                 first_touch_click_at = COALESCE(first_touch_click_at, $6),
                 last_touch_source = $3,
                 last_touch_medium = $4,
                 last_touch_campaign = $5,
                 last_touch_click_at = NOW()
                 WHERE id = $1 AND organization_id = $2`,
                [contactId, orgId,
                    session.first_source,
                    session.first_medium,
                    session.first_campaign,
                    session.first_click_at]
            );
        }

        // Update click logs as converted
        await pool.query(
            `UPDATE short_link_clicks SET
             converted_to_contact = true,
             contact_id = $3,
             converted_at = NOW()
             WHERE organization_id = $1 AND visitor_id = $2 AND converted_to_contact = false`,
            [orgId, visitorId, contactId]
        );

        // Update short link conversion count
        await pool.query(
            `UPDATE short_links SET conversions = (
                SELECT COUNT(*) FROM short_link_clicks
                WHERE short_link_id = short_links.id AND converted_to_contact = true
            )`,
            []
        );

        return true;
    } catch (error) {
        console.error('[SourceTracking] Error linking session to contact:', error);
        return false;
    }
};

/**
 * Get source attribution stats
 */
export const getAttributionStats = async (orgId, options = {}) => {
    const { startDate, endDate, groupBy = 'source' } = options;

    try {
        let dateFilter = '';
        const params = [orgId];

        if (startDate) {
            dateFilter += ` AND created_at >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ` AND created_at <= $${params.length + 1}`;
            params.push(endDate);
        }

        // Clicks by source
        const clicksQuery = `
            SELECT
                source,
                medium,
                campaign,
                COUNT(*) as clicks,
                COUNT(DISTINCT visitor_id) as unique_visitors,
                COUNT(*) FILTER (WHERE converted_to_contact = true) as conversions
            FROM short_link_clicks
            WHERE organization_id = $1 ${dateFilter}
            GROUP BY source, medium, campaign
            ORDER BY clicks DESC
        `;

        const clicksRes = await pool.query(clicksQuery, params);

        // Summary stats
        const summaryRes = await pool.query(
            `SELECT
                COUNT(*) as total_clicks,
                COUNT(DISTINCT visitor_id) as unique_visitors,
                COUNT(*) FILTER (WHERE converted_to_contact = true) as total_conversions
             FROM short_link_clicks
             WHERE organization_id = $1 ${dateFilter}`,
            params
        );

        // Top performing links
        const topLinksRes = await pool.query(
            `SELECT sl.slug, sl.target_url, sl.utm_source, sl.utm_medium,
                    sl.click_count, sl.conversions,
                    CASE WHEN sl.click_count > 0
                         THEN ROUND((sl.conversions::numeric / sl.click_count) * 100, 2)
                         ELSE 0 END as conversion_rate
             FROM short_links sl
             WHERE sl.organization_id = $1 AND sl.click_count > 0
             ORDER BY sl.conversions DESC
             LIMIT 10`,
            [orgId]
        );

        return {
            summary: summaryRes.rows[0],
            bySource: clicksRes.rows,
            topLinks: topLinksRes.rows
        };
    } catch (error) {
        console.error('[SourceTracking] Error getting attribution stats:', error);
        return {
            summary: { total_clicks: 0, unique_visitors: 0, total_conversions: 0 },
            bySource: [],
            topLinks: []
        };
    }
};

/**
 * Get available sources for dropdown
 */
export const getAvailableSources = () => {
    return [
        { id: 'whatsapp', name: 'WhatsApp', color: '#25D366' },
        { id: 'instagram', name: 'Instagram', color: '#E4405F' },
        { id: 'facebook', name: 'Facebook', color: '#1877F2' },
        { id: 'tiktok', name: 'TikTok', color: '#000000' },
        { id: 'shopee', name: 'Shopee', color: '#EE4D2D' },
        { id: 'tokopedia', name: 'Tokopedia', color: '#03AC0E' },
        { id: 'lazada', name: 'Lazada', color: '#0D1588' },
        { id: 'google', name: 'Google Ads', color: '#4285F4' },
        { id: 'twitter', name: 'Twitter/X', color: '#1DA1F2' },
        { id: 'youtube', name: 'YouTube', color: '#FF0000' },
        { id: 'website', name: 'Website', color: '#6366F1' },
        { id: 'referral', name: 'Referral', color: '#10B981' },
        { id: 'direct', name: 'Direct', color: '#6B7280' }
    ];
};

/**
 * Get available mediums for dropdown
 */
export const getAvailableMediums = () => {
    return [
        { id: 'cpc', name: 'CPC (Cost Per Click)', icon: '💰' },
        { id: 'cpm', name: 'CPM (Cost Per Mille)', icon: '📊' },
        { id: 'organic', name: 'Organic', icon: '🌱' },
        { id: 'social', name: 'Social Media', icon: '📱' },
        { id: 'email', name: 'Email', icon: '📧' },
        { id: 'referral', name: 'Referral', icon: '🔗' },
        { id: 'affiliate', name: 'Affiliate', icon: '🤝' },
        { id: 'qr', name: 'QR Code', icon: '📱' },
        { id: 'link', name: 'Short Link', icon: '🔗' },
        { id: 'other', name: 'Other', icon: '❓' }
    ];
};