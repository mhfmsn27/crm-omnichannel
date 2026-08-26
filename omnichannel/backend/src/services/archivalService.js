import pool from '../config/db.js';

/**
 * Database Archival & Cold Storage Maintenance Service
 * Keeps active inbox lightning fast by archiving stale resolved conversations and purging expired temp logs.
 */

/**
 * Archives conversations that have been resolved and inactive for > daysThreshold days.
 *
 * @param {number} orgId - Organization ID (optional, if omitted runs across orgs)
 * @param {number} daysThreshold - Inactivity days (default: 180 days)
 * @returns {Promise<{ archivedCount: number }>}
 */
export const archiveOldResolvedConversations = async (orgId = null, daysThreshold = 180) => {
    try {
        const threshold = Math.max(30, Number(daysThreshold) || 180);
        let query = `
            UPDATE conversations
            SET is_archived = true, updated_at = NOW()
            WHERE status = 'resolved'
              AND is_archived = false
              AND last_message_at < NOW() - ($1 || ' days')::interval
        `;
        const params = [String(threshold)];

        if (orgId) {
            query += ` AND organization_id = $2`;
            params.push(orgId);
        }

        const res = await pool.query(query, params);
        console.log(`[ArchivalService] Successfully archived ${res.rowCount} resolved conversations.`);
        return { archivedCount: res.rowCount };
    } catch (err) {
        console.error('[ArchivalService] Error archiving conversations:', err.message);
        throw err;
    }
};

/**
 * Purges ephemeral logs older than retentionDays (Default 30 days) to keep database compact.
 *
 * @param {number} retentionDays 
 * @returns {Promise<{ purgedLogs: number }>}
 */
export const cleanExpiredTempLogs = async (retentionDays = 30) => {
    try {
        const threshold = Math.max(7, Number(retentionDays) || 30);
        
        const [webhookLogsRes, warmerLogsRes] = await Promise.all([
            pool.query(
                `DELETE FROM org_webhook_logs WHERE created_at < NOW() - ($1 || ' days')::interval`,
                [String(threshold)]
            ).catch(() => ({ rowCount: 0 })),
            pool.query(
                `DELETE FROM warmer_logs WHERE created_at < NOW() - ($1 || ' days')::interval`,
                [String(threshold)]
            ).catch(() => ({ rowCount: 0 }))
        ]);

        const totalPurged = (webhookLogsRes.rowCount || 0) + (warmerLogsRes.rowCount || 0);
        console.log(`[ArchivalService] Purged ${totalPurged} old log records.`);
        return { purgedLogs: totalPurged };
    } catch (err) {
        console.error('[ArchivalService] Error purging expired logs:', err.message);
        return { purgedLogs: 0, error: err.message };
    }
};

export default {
    archiveOldResolvedConversations,
    cleanExpiredTempLogs
};
