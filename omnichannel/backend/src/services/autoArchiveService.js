/**
 * Auto Archive Service - Chat auto-archive configuration
 */
import pool from '../config/db.js';

export const getSettings = async (organizationId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM auto_archive_settings WHERE organization_id = $1',
            [organizationId]
        );

        if (result.rows.length === 0) {
            const newSettings = await pool.query(
                'INSERT INTO auto_archive_settings (organization_id) VALUES ($1) RETURNING *',
                [organizationId]
            );
            return newSettings.rows[0];
        }

        return result.rows[0];
    } catch (error) {
        console.error('[AutoArchive] Get error:', error);
        return null;
    }
};

export const updateSettings = async (organizationId, data) => {
    const { auto_archive_enabled, archive_after_days, archive_resolved_only } = data;

    try {
        const result = await pool.query(`
            UPDATE auto_archive_settings SET
                auto_archive_enabled = COALESCE($2, auto_archive_enabled),
                archive_after_days = COALESCE($3, archive_after_days),
                archive_resolved_only = COALESCE($4, archive_resolved_only),
                updated_at = NOW()
            WHERE organization_id = $1
            RETURNING *
        `, [organizationId, auto_archive_enabled, archive_after_days, archive_resolved_only]);

        return result.rows[0];
    } catch (error) {
        console.error('[AutoArchive] Update error:', error);
        throw error;
    }
};

export const getConversationsToArchive = async (options = {}) => {
    const { organizationId, limit = 50 } = options;

    try {
        const result = await pool.query(`
            SELECT c.id, c.channel, c.status, c.last_message_at, c.updated_at, c.contact_id
            FROM conversations c
            WHERE c.organization_id = $1
            AND c.status = 'resolved'
            AND c.updated_at < NOW() - INTERVAL '30 days'
            LIMIT $2
        `, [organizationId, limit]);

        return result.rows;
    } catch (error) {
        console.error('[AutoArchive] Get conversations error:', error);
        return [];
    }
};

export const archiveConversation = async (organizationId, conversationId) => {
    try {
        await pool.query(`
            INSERT INTO chat_archive_logs (organization_id, conversation_id, archived_at)
            VALUES ($1, $2, NOW())
        `, [organizationId, conversationId]);

        await pool.query(`
            UPDATE conversations
            SET status = 'archived'
            WHERE id = $1 AND organization_id = $2
        `, [conversationId, organizationId]);

        return true;
    } catch (error) {
        console.error('[AutoArchive] Archive error:', error);
        return false;
    }
};

export default {
    getSettings,
    updateSettings,
    getConversationsToArchive,
    archiveConversation
};
