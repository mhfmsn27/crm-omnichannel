import pool from '../config/db.js';
import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';
import { getPreviewMessages } from '../utils/systemDictionary.js';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { manualResetCircle } from '../services/warmerScheduler.js';
import { checkWarmerActiveHours, calculateNextWarmerDelay } from '../services/warmerTimeHelper.js';

const warmerQueue = new Queue('warmer-queue', { connection: redisConnection });

// Ensure active_hours columns exist safely on startup/query
let schemaChecked = false;
const ensureWarmerActiveHoursColumns = async () => {
    if (schemaChecked) return;
    try {
        await pool.query(`
            ALTER TABLE warmer_circles 
            ADD COLUMN IF NOT EXISTS active_hours_start INTEGER DEFAULT 8,
            ADD COLUMN IF NOT EXISTS active_hours_end INTEGER DEFAULT 21,
            ADD COLUMN IF NOT EXISTS enable_active_hours BOOLEAN DEFAULT TRUE;
        `);
        schemaChecked = true;
    } catch (e) {
        // Ignore if error
    }
};

// GET /api/app/warmer
export const getWarmers = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureWarmerActiveHoursColumns();

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

        // Enrich circles with active status & human-friendly schedule description
        const enrichedCircles = circlesRes.rows.map(circle => {
            const activeStatus = checkWarmerActiveHours(circle);
            const nextSchedule = calculateNextWarmerDelay(circle, new Date(), { isDailyLimitReached: false });
            return {
                ...circle,
                active_hours_start: circle.active_hours_start ?? 8,
                active_hours_end: circle.active_hours_end ?? 21,
                enable_active_hours: circle.enable_active_hours !== false,
                is_in_active_hours: activeStatus.isActive,
                current_wib_hour: activeStatus.currentHour,
                next_schedule_desc: nextSchedule.nextRunWIB
            };
        });

        res.json({
            circles: enrichedCircles,
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
        interval_min = 60,
        interval_max = 300,
        daily_limit_per_device = 50,
        dictionary_mode = 'system',
        custom_dictionary = [],
        active_hours_start = 8,
        active_hours_end = 21,
        enable_active_hours = true
    } = req.body;

    // 1. Check Feature
    const access = await checkFeatureAccess(organization_id, 'tool_warmer');
    if (!access.allowed) {
        return res.status(403).json({ error: access.message, upsell: true });
    }

    if (!session_ids || session_ids.length < 2) {
        return res.status(400).json({ error: "Minimum 2 devices required for a circle." });
    }

    await ensureWarmerActiveHoursColumns();

    const startH = Math.max(0, Math.min(23, parseInt(active_hours_start, 10) || 8));
    const endH = Math.max(0, Math.min(23, parseInt(active_hours_end, 10) || 21));

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
             (organization_id, name, interval_min, interval_max, daily_limit_per_device, dictionary_mode, custom_dictionary, active_hours_start, active_hours_end, enable_active_hours, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) 
             RETURNING *`,
            [
                organization_id, 
                name, 
                interval_min, 
                interval_max, 
                daily_limit_per_device, 
                dictionary_mode, 
                JSON.stringify(custom_dictionary || []),
                startH,
                endH,
                enable_active_hours === true || enable_active_hours === 'true'
            ]
        );
        const circle = circleRes.rows[0];
        const circleId = circle.id;

        // 2. Add Members
        for (const sessionId of session_ids) {
            await client.query(
                `INSERT INTO warmer_circle_sessions (warmer_circle_id, session_id) VALUES ($1, $2)`,
                [circleId, sessionId]
            );
        }

        await client.query('COMMIT');

        // 3. Kickstart Worker with Active Hours validation
        const nextSchedule = calculateNextWarmerDelay(circle, new Date(), { isDailyLimitReached: false });
        await warmerQueue.add('warmer-multi-device', { circleId }, { delay: nextSchedule.delayMs });

        res.status(201).json({ 
            message: 'Warmer Circle Created & Scheduled', 
            circle,
            next_run: nextSchedule.nextRunWIB
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// PUT /api/app/warmer/:id (Update Circle Settings)
export const updateWarmer = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const {
        name,
        interval_min,
        interval_max,
        daily_limit_per_device,
        dictionary_mode,
        custom_dictionary,
        active_hours_start,
        active_hours_end,
        enable_active_hours
    } = req.body;

    try {
        await ensureWarmerActiveHoursColumns();

        const circleRes = await pool.query(
            'SELECT * FROM warmer_circles WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (circleRes.rows.length === 0) {
            return res.status(404).json({ error: "Circle not found" });
        }

        const existing = circleRes.rows[0];
        const updatedName = name || existing.name;
        const updatedIntMin = interval_min !== undefined ? parseInt(interval_min, 10) : existing.interval_min;
        const updatedIntMax = interval_max !== undefined ? parseInt(interval_max, 10) : existing.interval_max;
        const updatedDailyLimit = daily_limit_per_device !== undefined ? parseInt(daily_limit_per_device, 10) : existing.daily_limit_per_device;
        const updatedDictMode = dictionary_mode || existing.dictionary_mode;
        const updatedCustomDict = custom_dictionary !== undefined ? JSON.stringify(custom_dictionary) : existing.custom_dictionary;
        const updatedStartH = active_hours_start !== undefined ? Math.max(0, Math.min(23, parseInt(active_hours_start, 10))) : (existing.active_hours_start ?? 8);
        const updatedEndH = active_hours_end !== undefined ? Math.max(0, Math.min(23, parseInt(active_hours_end, 10))) : (existing.active_hours_end ?? 21);
        const updatedEnableActiveHours = enable_active_hours !== undefined ? (enable_active_hours === true || enable_active_hours === 'true') : (existing.enable_active_hours !== false);

        const updateResult = await pool.query(`
            UPDATE warmer_circles
            SET name = $1,
                interval_min = $2,
                interval_max = $3,
                daily_limit_per_device = $4,
                dictionary_mode = $5,
                custom_dictionary = $6,
                active_hours_start = $7,
                active_hours_end = $8,
                enable_active_hours = $9,
                updated_at = NOW()
            WHERE id = $10 AND organization_id = $11
            RETURNING *
        `, [
            updatedName,
            updatedIntMin,
            updatedIntMax,
            updatedDailyLimit,
            updatedDictMode,
            updatedCustomDict,
            updatedStartH,
            updatedEndH,
            updatedEnableActiveHours,
            id,
            organization_id
        ]);

        const updatedCircle = updateResult.rows[0];

        if (updatedCircle.is_active) {
            const nextSchedule = calculateNextWarmerDelay(updatedCircle, new Date(), { isDailyLimitReached: false });
            await warmerQueue.add('warmer-multi-device', { circleId: id }, { delay: nextSchedule.delayMs });
        }

        res.json({
            message: 'Warmer Circle updated successfully',
            circle: updatedCircle
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/app/warmer/:id/toggle
export const toggleWarmer = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        const result = await pool.query('UPDATE warmer_circles SET is_active = $1 WHERE id = $2 RETURNING *', [is_active, id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Circle not found" });

        const circle = result.rows[0];
        if (is_active) {
            // Check active hours when starting
            const nextSchedule = calculateNextWarmerDelay(circle, new Date(), { isDailyLimitReached: false });
            await warmerQueue.add('warmer-multi-device', { circleId: id }, { delay: nextSchedule.delayMs });
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