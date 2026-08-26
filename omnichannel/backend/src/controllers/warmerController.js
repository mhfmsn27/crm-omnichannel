import pool from '../config/db.js';
import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';
import { getPreviewMessages } from '../utils/systemDictionary.js';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { manualResetCircle } from '../services/warmerScheduler.js';

const warmerQueue = new Queue('warmer-queue', { connection: redisConnection });

// GET /api/app/warmer
export const getWarmers = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const access = await checkFeatureAccess(organization_id, 'tool_warmer');
        const isLocked = !access.allowed;

        // Fetch Circles
        const circlesRes = await pool.query(`
            SELECT wc.*, 
                   (SELECT count(*) FROM warmer_circle_sessions wcs WHERE wcs.warmer_circle_id = wc.id) as device_count,
                   (SELECT COALESCE(SUM(messages_sent_today), 0) FROM warmer_circle_sessions wcs WHERE wcs.warmer_circle_id = wc.id) as total_sent_today
            FROM warmer_circles wc
            WHERE wc.organization_id = $1
            ORDER BY wc.created_at DESC
        `, [organization_id]);

        const devicesRes = await pool.query(
            "SELECT id, name, whatsapp_number, status, type FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' AND (type IS NULL OR (type != 'official' AND type != 'wa_coex'))",
            [organization_id]
        );

        res.json({
            circles: circlesRes.rows,
            available_devices: devicesRes.rows,
            system_preview: getPreviewMessages(),
            stats: {
                locked: isLocked,
                message: access.message
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/warmer (Create Circle)
export const createWarmer = async (req, res) => {
    const { organization_id } = req.user;
    const {
        name,
        session_ids,
        interval_min,
        interval_max,
        daily_limit_per_device,
        dictionary_mode,
        custom_dictionary
    } = req.body;

    // 1. Check Feature
    const access = await checkFeatureAccess(organization_id, 'tool_warmer');
    if (!access.allowed) {
        return res.status(403).json({ error: access.message, upsell: true });
    }

    if (!session_ids || session_ids.length < 2) {
        return res.status(400).json({ error: "Minimum 2 devices required for a circle." });
    }

    const client = await pool.connect();
    try {
        // Validate Devices (Must be Unofficial WhatsApp)
        const validSessions = await client.query(
            `SELECT id FROM whatsapp_sessions 
             WHERE id = ANY($1::int[]) 
             AND organization_id = $2 
             AND (type IS NULL OR (type != 'official' AND type != 'wa_coex'))`,
            [session_ids, organization_id]
        );

        if (validSessions.rows.length < session_ids.length) {
            client.release();
            return res.status(400).json({ error: "Some selected devices are invalid (Official/CoEx). Please select only WhatsApp Devices." });
        }

        await client.query('BEGIN');

        // 1. Create Circle Header
        const circleRes = await client.query(
            `INSERT INTO warmer_circles 
             (organization_id, name, interval_min, interval_max, daily_limit_per_device, dictionary_mode, custom_dictionary, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true) 
             RETURNING id`,
            [organization_id, name, interval_min, interval_max, daily_limit_per_device, dictionary_mode, JSON.stringify(custom_dictionary || [])]
        );
        const circleId = circleRes.rows[0].id;

        // 2. Add Members
        for (const sessionId of session_ids) {
            await client.query(
                `INSERT INTO warmer_circle_sessions (warmer_circle_id, session_id) VALUES ($1, $2)`,
                [circleId, sessionId]
            );
        }

        await client.query('COMMIT');

        // 3. Kickstart Worker
        await warmerQueue.add('warmer-multi-device', { circleId }, { delay: 0 });

        res.status(201).json({ message: 'Warmer Circle Created & Started' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// PATCH /api/app/warmer/:id/toggle
export const toggleWarmer = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        await pool.query('UPDATE warmer_circles SET is_active = $1 WHERE id = $2', [is_active, id]);

        if (is_active) {
            // Restart by queueing a job immediately
            await warmerQueue.add('warmer-multi-device', { circleId: id }, { delay: 0 });
        }
        res.json({ message: `Circle ${is_active ? 'started' : 'stopped'}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/warmer/:id
export const deleteWarmer = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM warmer_circles WHERE id = $1', [id]);
        res.json({ message: 'Circle deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/warmer/:id/reset (Manual Reset)
export const resetWarmer = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        // Verify ownership
        const circleRes = await pool.query(
            'SELECT id, name FROM warmer_circles WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (circleRes.rows.length === 0) {
            return res.status(404).json({ error: "Circle not found" });
        }

        const result = await manualResetCircle(id);

        res.json({
            message: 'Counter reset successfully',
            circle: circleRes.rows[0].name,
            devicesReset: result.devicesReset
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: GET /api/app/warmer/:id/report
export const getReport = async (req, res) => {
    const { id } = req.params; // warmer_circle_id
    const { organization_id } = req.user;

    try {
        // Verify ownership
        const circleRes = await pool.query(
            'SELECT name FROM warmer_circles WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (circleRes.rows.length === 0) return res.status(404).json({ error: "Circle not found" });
        const circleName = circleRes.rows[0].name;

        // 1. Total Sent (7 Days)
        const totalRes = await pool.query(
            `SELECT COUNT(*) as total FROM warmer_logs WHERE warmer_circle_id = $1 AND sent_at >= NOW() - INTERVAL '7 days'`,
            [id]
        );
        const totalSent = parseInt(totalRes.rows[0].total);
        const avgDaily = Math.round(totalSent / 7);

        // 2. Daily Stats for Chart (Last 7 Days)
        const chartRes = await pool.query(`
            SELECT to_char(sent_at, 'YYYY-MM-DD') as date, COUNT(*) as count
            FROM warmer_logs
            WHERE warmer_circle_id = $1 AND sent_at >= NOW() - INTERVAL '6 days'
            GROUP BY 1
            ORDER BY 1 ASC
        `, [id]);

        // Fill missing dates
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = chartRes.rows.find(r => r.date === dateStr);
            chartData.push({ date: dateStr, count: found ? parseInt(found.count) : 0 });
        }

        // 3. Recent Logs (Limit 20)
        const logsRes = await pool.query(`
            SELECT wl.sent_at, wl.message_content, ws.name as sender_name, ws.whatsapp_number as sender_phone
            FROM warmer_logs wl
            LEFT JOIN whatsapp_sessions ws ON wl.sender_session_id = ws.id
            WHERE wl.warmer_circle_id = $1
            ORDER BY wl.sent_at DESC
            LIMIT 20
        `, [id]);

        res.json({
            name: circleName,
            summary: { total_7_days: totalSent, avg_daily: avgDaily },
            chart: chartData,
            logs: logsRes.rows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};