import pool from '../config/db.js';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// GET /api/app/settings/working-hours
export const getWorkingHours = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const [schedRes, cfgRes] = await Promise.all([
            pool.query(
                'SELECT * FROM working_hours WHERE organization_id = $1 ORDER BY day_of_week ASC',
                [organization_id]
            ),
            pool.query(
                'SELECT * FROM working_hours_config WHERE organization_id = $1',
                [organization_id]
            )
        ]);

        // Build default schedule (all 7 days) if none exists
        const existing = schedRes.rows;
        const schedule = Array.from({ length: 7 }, (_, i) => {
            const found = existing.find(r => r.day_of_week === i);
            return found || {
                day_of_week: i,
                day_name: DAYS[i],
                start_time: '09:00',
                end_time: '17:00',
                is_active: i >= 1 && i <= 5 // Mon-Fri default active
            };
        }).map(r => ({ ...r, day_name: DAYS[r.day_of_week] }));

        const config = cfgRes.rows[0] || {
            timezone: 'Asia/Jakarta',
            outside_mode: 'message',
            offline_message: 'Terima kasih telah menghubungi kami. Saat ini kami sedang tidak beroperasi. Kami akan segera membalas pesan Anda pada jam operasional berikutnya.'
        };

        res.json({ schedule, config });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/settings/working-hours
export const updateWorkingHours = async (req, res) => {
    const { organization_id } = req.user;
    const { schedule, config } = req.body;

    if (!Array.isArray(schedule) || schedule.length !== 7) {
        return res.status(400).json({ error: 'schedule must be array of 7 days' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const day of schedule) {
            const { day_of_week, start_time, end_time, is_active } = day;
            await client.query(
                `INSERT INTO working_hours (organization_id, day_of_week, start_time, end_time, is_active)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (organization_id, day_of_week)
                 DO UPDATE SET start_time=$3, end_time=$4, is_active=$5`,
                [organization_id, day_of_week, start_time, end_time, is_active]
            );
        }

        if (config) {
            await client.query(
                `INSERT INTO working_hours_config (organization_id, timezone, outside_mode, offline_message)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (organization_id)
                 DO UPDATE SET timezone=$2, outside_mode=$3, offline_message=$4`,
                [organization_id, config.timezone || 'Asia/Jakarta', config.outside_mode || 'message', config.offline_message || '']
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// ============================================================
// INTERNAL HELPER: Check if org is within working hours right now
// ============================================================
export const isWithinWorkingHours = async (orgId) => {
    try {
        const cfgRes = await pool.query(
            'SELECT timezone, outside_mode FROM working_hours_config WHERE organization_id = $1',
            [orgId]
        );
        const cfg = cfgRes.rows[0];
        if (!cfg) return { withinHours: true, outsideMode: 'none', offlineMessage: '' };

        const tz = cfg.timezone || 'Asia/Jakarta';

        // Get current time in org timezone
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const dayName = parts.find(p => p.type === 'weekday')?.value; // 'Sun', 'Mon', ...
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');

        const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const dayOfWeek = dayMap[dayName] ?? new Date().getDay();

        const schedRes = await pool.query(
            'SELECT * FROM working_hours WHERE organization_id = $1 AND day_of_week = $2',
            [orgId, dayOfWeek]
        );

        if (schedRes.rows.length === 0 || !schedRes.rows[0].is_active) {
            const offRes = await pool.query(
                'SELECT offline_message FROM working_hours_config WHERE organization_id = $1',
                [orgId]
            );
            return {
                withinHours: false,
                outsideMode: cfg.outside_mode,
                offlineMessage: offRes.rows[0]?.offline_message || ''
            };
        }

        const row = schedRes.rows[0];
        const [startH, startM] = row.start_time.split(':').map(Number);
        const [endH, endM] = row.end_time.split(':').map(Number);

        const currentMinutes = hour * 60 + minute;
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const withinHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;

        if (!withinHours) {
            const offRes = await pool.query(
                'SELECT offline_message FROM working_hours_config WHERE organization_id = $1',
                [orgId]
            );
            return {
                withinHours: false,
                outsideMode: cfg.outside_mode,
                offlineMessage: offRes.rows[0]?.offline_message || ''
            };
        }

        return { withinHours: true, outsideMode: cfg.outside_mode, offlineMessage: '' };
    } catch (err) {
        console.error('[WorkingHours] Check failed:', err.message);
        return { withinHours: true, outsideMode: 'none', offlineMessage: '' };
    }
};
