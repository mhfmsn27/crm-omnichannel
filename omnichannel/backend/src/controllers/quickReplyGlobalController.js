/**
 * Quick Reply Global Controller
 * Manage global quick replies accessible by all agents
 */

import pool from '../config/db.js';

export const getReplies = async (req, res) => {
    const { organization_id } = req.user;
    const { category } = req.query;

    try {
        let query = `SELECT * FROM quick_replies WHERE organization_id = $1 AND is_global = true`;
        const params = [organization_id];

        if (category) {
            query += ` AND category = $2`;
            params.push(category);
        }

        query += ` ORDER BY usage_count DESC, created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('[QuickReplyGlobal] Get error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createGlobal = async (req, res) => {
    const { organization_id } = req.user;
    const { shortcut, message, category } = req.body;

    if (!shortcut || !message) {
        return res.status(400).json({ error: 'Shortcut and message required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO quick_replies (organization_id, shortcut, message, category, is_global, usage_count)
             VALUES ($1, $2, $3, $4, true, 0) RETURNING *`,
            [organization_id, shortcut, message, category || 'general']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[QuickReplyGlobal] Create error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateReply = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { shortcut, message, category } = req.body;

    try {
        const result = await pool.query(
            `UPDATE quick_replies
             SET shortcut = COALESCE($1, shortcut),
                 message = COALESCE($2, message),
                 category = COALESCE($3, category),
                 updated_at = NOW()
             WHERE id = $4 AND organization_id = $5 AND is_global = true
             RETURNING *`,
            [shortcut, message, category, id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quick reply not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[QuickReplyGlobal] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteReply = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM quick_replies WHERE id = $1 AND organization_id = $2 AND is_global = true RETURNING id`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quick reply not found' });
        }

        res.json({ message: 'Quick reply deleted' });
    } catch (error) {
        console.error('[QuickReplyGlobal] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const searchReplies = async (req, res) => {
    const { organization_id } = req.user;
    const { q } = req.query;

    if (!q) {
        return res.json([]);
    }

    try {
        const result = await pool.query(
            `SELECT * FROM quick_replies
             WHERE organization_id = $1 AND is_global = true
             AND (shortcut ILIKE $2 OR message ILIKE $2)
             ORDER BY usage_count DESC
             LIMIT 10`,
            [organization_id, `%${q}%`]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('[QuickReplyGlobal] Search error:', error);
        res.status(500).json({ error: error.message });
    }
};
