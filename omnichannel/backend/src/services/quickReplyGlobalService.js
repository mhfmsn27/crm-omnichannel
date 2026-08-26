/**
 * Quick Reply Global Service
 * Manages global quick replies across all channels
 */

import pool from '../config/db.js';

export const getQuickReplies = async (organizationId, channel = null) => {
    let query = `
        SELECT * FROM quick_replies
        WHERE organization_id = $1 AND is_global = TRUE
    `;
    const params = [organizationId];

    if (channel) {
        query += ` AND (channel = $2 OR channel IS NULL)`;
        params.push(channel);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};

export const createGlobalQuickReply = async (organizationId, userId, data) => {
    const { shortcut, message, channel } = data;

    // Check if shortcut already exists
    const existingQuery = `
        SELECT id FROM quick_replies
        WHERE organization_id = $1 AND shortcut = $2 AND is_global = TRUE
    `;
    const existing = await pool.query(existingQuery, [organizationId, shortcut]);

    if (existing.rows.length > 0) {
        throw new Error('Shortcut already exists');
    }

    const query = `
        INSERT INTO quick_replies
        (organization_id, shortcut, message, channel, is_global, created_by)
        VALUES ($1, $2, $3, $4, TRUE, $5)
        RETURNING *
    `;

    const result = await pool.query(query, [
        organizationId,
        shortcut,
        message,
        channel || null,
        userId
    ]);

    return result.rows[0];
};

export const updateQuickReply = async (organizationId, userId, id, data) => {
    const { shortcut, message, channel } = data;

    // If changing shortcut, check for duplicates
    if (shortcut) {
        const existingQuery = `
            SELECT id FROM quick_replies
            WHERE organization_id = $1 AND shortcut = $2 AND is_global = TRUE AND id != $3
        `;
        const existing = await pool.query(existingQuery, [organizationId, shortcut, id]);

        if (existing.rows.length > 0) {
            throw new Error('Shortcut already exists');
        }
    }

    const updates = [];
    const values = [organizationId, id];
    let paramIndex = 3;

    if (shortcut !== undefined) {
        updates.push(`shortcut = $${paramIndex}`);
        values.push(shortcut);
        paramIndex++;
    }
    if (message !== undefined) {
        updates.push(`message = $${paramIndex}`);
        values.push(message);
        paramIndex++;
    }
    if (channel !== undefined) {
        updates.push(`channel = $${paramIndex}`);
        values.push(channel);
        paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE quick_replies
        SET ${updates.join(', ')}
        WHERE organization_id = $1 AND id = $2 AND is_global = TRUE
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const deleteQuickReply = async (organizationId, userId, id) => {
    const query = `
        DELETE FROM quick_replies
        WHERE organization_id = $1 AND id = $2 AND is_global = TRUE
    `;
    await pool.query(query, [organizationId, id]);
};

export const searchQuickReplies = async (organizationId, query) => {
    const searchQuery = `
        SELECT * FROM quick_replies
        WHERE organization_id = $1 AND is_global = TRUE
        AND (shortcut ILIKE $2 OR message ILIKE $2)
        ORDER BY shortcut ASC
        LIMIT 20
    `;

    const result = await pool.query(searchQuery, [
        organizationId,
        `%${query}%`
    ]);

    return result.rows;
};

export const getGlobalQuickReplyStats = async (organizationId) => {
    const query = `
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN channel IS NULL THEN 1 END) as all_channels,
            COUNT(CASE WHEN channel = 'whatsapp' THEN 1 END) as whatsapp,
            COUNT(CASE WHEN channel = 'telegram' THEN 1 END) as telegram,
            COUNT(CASE WHEN channel = 'messenger' THEN 1 END) as messenger,
            COUNT(CASE WHEN channel = 'instagram' THEN 1 END) as instagram
        FROM quick_replies
        WHERE organization_id = $1 AND is_global = TRUE
    `;

    const result = await pool.query(query, [organizationId]);
    return result.rows[0];
};