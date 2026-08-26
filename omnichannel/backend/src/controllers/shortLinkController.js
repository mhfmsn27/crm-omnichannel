/**
 * Short Link & Source Tracking API Controller
 */

import pool from '../config/db.js';
import * as sourceTrackingService from '../services/sourceTrackingService.js';

/**
 * Get all short links for organization
 */
export const getShortLinks = async (req, res) => {
    const { organization_id } = req.user;
    const { active } = req.query;

    try {
        let query = `
            SELECT sl.*, u.name as created_by_name,
                   (SELECT COUNT(*) FROM short_link_clicks WHERE short_link_id = sl.id) as total_clicks
            FROM short_links sl
            LEFT JOIN users u ON sl.created_by = u.id
            WHERE sl.organization_id = $1
        `;
        const params = [organization_id];

        if (active === 'true') {
            query += ` AND sl.is_active = true`;
        } else if (active === 'false') {
            query += ` AND sl.is_active = false`;
        }

        query += ` ORDER BY sl.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('[ShortLink Controller] Error getting short links:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create new short link
 */
export const createShortLink = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { slug, target_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, rotator_group_id, expires_at } = req.body;

    if (!target_url) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    try {
        const shortLink = await sourceTrackingService.createShortLink(organization_id, userId, {
            slug,
            target_url,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            rotator_group_id,
            expires_at
        });

        res.status(201).json(shortLink);
    } catch (error) {
        console.error('[ShortLink Controller] Error creating short link:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Slug already exists. Please choose a different slug.' });
        }
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update short link
 */
export const updateShortLink = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { target_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_active, rotator_group_id } = req.body;

    try {
        const result = await pool.query(
            `UPDATE short_links SET
             target_url = COALESCE($1, target_url),
             utm_source = COALESCE($2, utm_source),
             utm_medium = COALESCE($3, utm_medium),
             utm_campaign = COALESCE($4, utm_campaign),
             utm_content = COALESCE($5, utm_content),
             utm_term = COALESCE($6, utm_term),
             is_active = COALESCE($7, is_active),
             rotator_group_id = $8
             WHERE id = $9 AND organization_id = $10
             RETURNING *`,
            [target_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, is_active, rotator_group_id, id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Short link not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[ShortLink Controller] Error updating short link:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete short link
 */
export const deleteShortLink = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM short_links WHERE id = $1 AND organization_id = $2 RETURNING id',
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Short link not found' });
        }

        res.json({ message: 'Short link deleted' });
    } catch (error) {
        console.error('[ShortLink Controller] Error deleting short link:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get short link stats
 */
export const getShortLinkStats = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { days = 30 } = req.query;

    try {
        // Get short link details
        const linkRes = await pool.query(
            'SELECT * FROM short_links WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );

        if (linkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Short link not found' });
        }

        const link = linkRes.rows[0];

        // Get click logs
        const clicksRes = await pool.query(
            `SELECT DATE(created_at) as date, COUNT(*) as clicks,
                    COUNT(DISTINCT visitor_id) as unique_visitors,
                    COUNT(*) FILTER (WHERE converted_to_contact = true) as conversions
             FROM short_link_clicks
             WHERE short_link_id = $1 AND created_at >= NOW() - ($2 * INTERVAL '1 day')
             GROUP BY DATE(created_at)
             ORDER BY date ASC`,
            [id, parseInt(days) || 30]
        );

        // Summary
        const summaryRes = await pool.query(
            `SELECT
                COUNT(*) as total_clicks,
                COUNT(DISTINCT visitor_id) as unique_visitors,
                COUNT(*) FILTER (WHERE converted_to_contact = true) as conversions,
                COUNT(*) FILTER (WHERE destination_reached = true) as visitors_reached
             FROM short_link_clicks
             WHERE short_link_id = $1`,
            [id]
        );

        res.json({
            link,
            summary: summaryRes.rows[0],
            daily: clicksRes.rows
        });
    } catch (error) {
        console.error('[ShortLink Controller] Error getting short link stats:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get attribution stats for organization
 */
export const getAttributionStats = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate, groupBy } = req.query;

    try {
        const stats = await sourceTrackingService.getAttributionStats(organization_id, {
            startDate,
            endDate,
            groupBy
        });

        res.json(stats);
    } catch (error) {
        console.error('[ShortLink Controller] Error getting attribution stats:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get available sources and mediums for dropdowns
 */
export const getTrackingOptions = async (req, res) => {
    res.json({
        sources: sourceTrackingService.getAvailableSources(),
        mediums: sourceTrackingService.getAvailableMediums()
    });
};

/**
 * Get visitor sessions for a contact
 */
export const getContactSourceHistory = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;

    try {
        const result = await pool.query(
            `SELECT vs.*,
                    (SELECT COUNT(*) FROM short_link_clicks WHERE visitor_id = vs.visitor_id) as link_clicks
             FROM visitor_sessions vs
             WHERE vs.organization_id = $1 AND vs.contact_id = $2
             ORDER BY vs.created_at DESC`,
            [organization_id, contactId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('[ShortLink Controller] Error getting contact source history:', error);
        res.status(500).json({ error: error.message });
    }
};