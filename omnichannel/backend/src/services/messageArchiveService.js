/**
 * Message Archival Service
 * Archives old messages to separate table for performance
 */

import pool from '../config/db.js';

const BATCH_SIZE = 500;
const ARCHIVE_AGE_DAYS = 90; // Archive messages older than 90 days

/**
 * Archive old messages from a conversation
 */
export const archiveConversationMessages = async (conversationId, olderThan = null) => {
    if (!olderThan) {
        olderThan = new Date(Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);
    }

    try {
        // Count messages to archive
        const countRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM messages
             WHERE conversation_id = $1 AND created_at < $2
             AND archived_at IS NULL`,
            [conversationId, olderThan]
        );
        const totalToArchive = parseInt(countRes.rows[0]?.cnt) || 0;

        if (totalToArchive === 0) {
            return { archived: 0, status: 'no_messages_to_archive' };
        }

        let archived = 0;
        let batchNum = 0;

        // Archive in batches
        while (true) {
            const batchRes = await pool.query(
                `INSERT INTO messages_archive
                 SELECT * FROM messages
                 WHERE conversation_id = $1
                 AND created_at < $2
                 AND archived_at IS NULL
                 LIMIT $3
                 RETURNING id`,
                [conversationId, olderThan, BATCH_SIZE]
            );

            if (batchRes.rows.length === 0) break;

            const archivedIds = batchRes.rows.map(r => r.id);

            // Mark as archived
            await pool.query(
                `UPDATE messages SET archived_at = NOW() WHERE id = ANY($1)`,
                [archivedIds]
            );

            archived += batchRes.rows.length;
            batchNum++;

            if (batchRes.rows.length < BATCH_SIZE) break;

            // Small delay between batches to not overwhelm DB
            if (batchNum % 10 === 0) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        return { archived, batches: batchNum, status: 'archived' };
    } catch (e) {
        console.error('[Archive] Error archiving messages:', e);
        return { error: e.message, status: 'error' };
    }
};

/**
 * Restore archived messages back to main table
 */
export const restoreArchivedMessages = async (conversationId) => {
    try {
        const restoreRes = await pool.query(
            `UPDATE messages m
             SET archived_at = NULL
             FROM messages_archive ma
             WHERE m.id = ma.id
             AND ma.conversation_id = $1
             RETURNING m.id`,
            [conversationId]
        );

        // Delete from archive table
        await pool.query(
            `DELETE FROM messages_archive WHERE conversation_id = $1 AND archived_at IS NULL`,
            [conversationId]
        );

        return { restored: restoreRes.rowCount };
    } catch (e) {
        console.error('[Archive] Error restoring messages:', e);
        return { error: e.message };
    }
};

/**
 * Get archived messages
 */
export const getArchivedMessages = async (conversationId, limit = 100, offset = 0) => {
    try {
        const result = await pool.query(
            `SELECT * FROM messages_archive
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [conversationId, limit, offset]
        );

        const countRes = await pool.query(
            `SELECT COUNT(*) as total FROM messages_archive WHERE conversation_id = $1`,
            [conversationId]
        );

        return {
            messages: result.rows,
            pagination: {
                total: parseInt(countRes.rows[0]?.total) || 0,
                limit,
                offset
            }
        };
    } catch (e) {
        console.error('[Archive] Error getting archived messages:', e);
        return { error: e.message, messages: [] };
    }
};

/**
 * Auto-archive old messages (cron job)
 * Runs daily to clean up old messages
 */
export const autoArchiveOldMessages = async (orgId = null) => {
    const archiveDate = new Date(Date.now() - ARCHIVE_AGE_DAYS * 24 * 60 * 60 * 1000);

    let query = `
        SELECT DISTINCT c.organization_id, m.conversation_id
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.created_at < $1
        AND m.archived_at IS NULL
    `;
    const params = [archiveDate];

    if (orgId) {
        query += ` AND c.organization_id = $2`;
        params.push(orgId);
    }

    try {
        const convos = await pool.query(query, params);
        let archived = 0;
        let errors = 0;

        for (const row of convos.rows) {
            const result = await archiveConversationMessages(row.conversation_id, archiveDate);
            if (result.archived > 0) archived += result.archived;
            else if (result.error) errors++;
        }

        return {
            conversations_processed: convos.rows.length,
            messages_archived: archived,
            errors,
            archive_age_days: ARCHIVE_AGE_DAYS
        };
    } catch (e) {
        console.error('[Archive] Auto-archive error:', e);
        return { error: e.message };
    }
};

/**
 * Get archive statistics
 */
export const getArchiveStats = async (organizationId) => {
    try {
        // Archived messages count
        const archivedRes = await pool.query(
            `SELECT COUNT(*) as cnt FROM messages_archive ma
             JOIN conversations c ON ma.conversation_id = c.id
             WHERE c.organization_id = $1`,
            [organizationId]
        );

        // Archived conversations
        const convosRes = await pool.query(
            `SELECT COUNT(DISTINCT conversation_id) as cnt FROM messages_archive ma
             JOIN conversations c ON ma.conversation_id = c.id
             WHERE c.organization_id = $1`,
            [organizationId]
        );

        // Storage size estimate
        const sizeRes = await pool.query(
            `SELECT pg_size_pretty(pg_total_relation_size('messages_archive')) as size`
        );

        return {
            archived_messages: parseInt(archivedRes.rows[0]?.cnt) || 0,
            archived_conversations: parseInt(convosRes.rows[0]?.cnt) || 0,
            estimated_size: sizeRes.rows[0]?.size || '0 bytes'
        };
    } catch (e) {
        console.error('[Archive] Stats error:', e);
        return { error: e.message };
    }
};
