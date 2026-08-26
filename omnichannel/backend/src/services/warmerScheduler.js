import cron from 'node-cron';
import pool from '../config/db.js';

/**
 * Warmer Daily Reset Scheduler
 * Resets messages_sent_today counter for all warmer_circle_sessions at midnight
 * Ensures each device starts fresh every day per their daily limit
 */
export const startWarmerDailyReset = () => {
    // Run every day at 00:00 (midnight)
    // Using '0 0 * * *' = second(0) minute(0) hour(0) day(*) month(*) weekday(*)
    cron.schedule('0 0 * * *', async () => {
        console.log('[Warmer] ===========================================');
        console.log('[Warmer] Starting daily counter reset...');
        const startTime = Date.now();

        try {
            // 1. Get count before reset for logging
            const beforeRes = await pool.query(
                'SELECT COUNT(*) as count, COALESCE(SUM(messages_sent_today), 0) as total FROM warmer_circle_sessions'
            );
            const beforeCount = parseInt(beforeRes.rows[0].count);
            const beforeTotal = parseInt(beforeRes.rows[0].total);

            // 2. Reset all counters and update last_reset_at timestamp
            const resetRes = await pool.query(`
                UPDATE warmer_circle_sessions
                SET messages_sent_today = 0,
                    last_reset_at = NOW()
                WHERE messages_sent_today > 0
                RETURNING id, warmer_circle_id
            `);

            // 3. Log summary per circle
            const circleStats = await pool.query(`
                SELECT wc.id, wc.name, COUNT(wcs.id) as devices_reset
                FROM warmer_circles wc
                LEFT JOIN warmer_circle_sessions wcs ON wc.id = wcs.warmer_circle_id
                    AND wcs.last_reset_at = NOW()
                WHERE wc.is_active = true
                GROUP BY wc.id, wc.name
            `);

            const duration = Date.now() - startTime;
            console.log(`[Warmer] Reset complete in ${duration}ms`);
            console.log(`[Warmer] Devices reset: ${resetRes.rowCount}`);
            console.log(`[Warmer] Total messages yesterday: ${beforeTotal}`);

            if (circleStats.rows.length > 0) {
                console.log('[Warmer] Per-circle summary:');
                circleStats.rows.forEach(c => {
                    console.log(`[Warmer]   - ${c.name}: ${c.devices_reset} devices`);
                });
            }
            // 4. Auto Cleanup: Delete logs older than 7 days
            const cleanupRes = await pool.query(`
                DELETE FROM warmer_logs
                WHERE sent_at < NOW() - INTERVAL '7 days'
            `);
            console.log(`[Warmer] Log Cleanup: Deleted ${cleanupRes.rowCount} old logs (> 7 days)`);
            // 4. Re-queue active circles to resume warming
            await pool.query(`
                INSERT INTO pg_namespace (nspname)
                SELECT 'bullmq_' || LEFT(oid::text, 10)
                FROM pg_database WHERE datname = current_database()
            `).catch(() => {}); // Ignore if already exists

            // Just log that circles are ready to resume
            const activeCircles = await pool.query(
                'SELECT id FROM warmer_circles WHERE is_active = true'
            );
            if (activeCircles.rows.length > 0) {
                console.log(`[Warmer] Active circles ready to resume: ${activeCircles.rows.length}`);
                console.log('[Warmer] Workers will automatically pick up jobs on next cycle');
            }

            console.log('[Warmer] ===========================================');

        } catch (err) {
            console.error('[Warmer] Daily reset FAILED:', err.message);
            console.error('[Warmer] Stack:', err.stack);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Jakarta' // WIB timezone
    });

    console.log('[Warmer] Daily reset scheduler initialized (runs at 00:00 WIB)');
};

/**
 * Manual reset for a specific circle (admin function)
 * @param {number} circleId - The warmer circle ID to reset
 */
export const manualResetCircle = async (circleId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const res = await client.query(`
            UPDATE warmer_circle_sessions
            SET messages_sent_today = 0,
                last_reset_at = NOW()
            WHERE warmer_circle_id = $1
            RETURNING id
        `, [circleId]);

        await client.query('COMMIT');
        return { success: true, devicesReset: res.rowCount };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Check if a device needs reset (for worker to verify before sending)
 * Returns true if last_reset was yesterday or earlier
 * @param {number} sessionId - The warmer_circle_sessions ID
 */
export const needsReset = async (sessionId) => {
    const res = await pool.query(
        `SELECT last_reset_at, messages_sent_today,
                last_reset_at < NOW() - INTERVAL '24 hours' as needs_manual_reset
         FROM warmer_circle_sessions WHERE id = $1`,
        [sessionId]
    );

    if (res.rows.length === 0) return false;

    const row = res.rows[0];
    // If never reset OR last reset was more than 24h ago, needs reset
    return !row.last_reset_at || row.needs_manual_reset;
};