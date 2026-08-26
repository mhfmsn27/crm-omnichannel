import pool from '../config/db.js';

// GET /api/app/organization
export const getOrgDetails = async (req, res) => {
    const { organization_id } = req.user;
    const query = `
        SELECT o.name, o.is_active, o.subscription_status, o.webhook_url, o.logo_url,
                o.broadcast_quiet_hours_enabled, o.quiet_hours_start, o.quiet_hours_end,
                p.name as plan_name,
                s.expires_at,
                COALESCE(
                    (
                        SELECT json_agg(json_build_object('code', pf.feature_code, 'is_enabled', pf.is_enabled, 'limit_value', pf.limit_value))
                        FROM plan_features pf
                        WHERE pf.plan_id = o.plan_id
                    ), '[]'
                ) as features
            FROM organizations o
            LEFT JOIN plans p ON o.plan_id = p.id
            LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status IN ('active', 'trialing')
            WHERE o.id = $1
    `;

    try {
        try {
            const orgRes = await pool.query(query, [organization_id]);
            res.json(orgRes.rows[0]);
        } catch (queryErr) {
            // Handle missing column for robustness
            if (queryErr.code === '42703') {
                // Missing one of the broadcast settings columns - add them and retry
                if (queryErr.message.includes('broadcast_quiet') ||
                    queryErr.message.includes('quiet_hours') ||
                    queryErr.message.includes('logo_url')) {
                    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT');
                    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS broadcast_quiet_hours_enabled BOOLEAN DEFAULT TRUE');
                    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quiet_hours_start INTEGER DEFAULT 5');
                    await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quiet_hours_end INTEGER DEFAULT 22');
                    const retryRes = await pool.query(query, [organization_id]);
                    res.json(retryRes.rows[0]);
                } else {
                    throw queryErr;
                }
            } else {
                throw queryErr;
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/organization/broadcast-settings
export const updateBroadcastSettings = async (req, res) => {
    const { organization_id } = req.user;
    const { broadcast_quiet_hours_enabled, quiet_hours_start, quiet_hours_end } = req.body;

    try {
        // Validate inputs
        if (quiet_hours_start !== undefined) {
            const start = parseInt(quiet_hours_start);
            if (isNaN(start) || start < 0 || start > 23) {
                return res.status(400).json({ error: 'quiet_hours_start must be between 0 and 23' });
            }
        }

        if (quiet_hours_end !== undefined) {
            const end = parseInt(quiet_hours_end);
            if (isNaN(end) || end < 0 || end > 23) {
                return res.status(400).json({ error: 'quiet_hours_end must be between 0 and 23' });
            }
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIdx = 1;

        if (broadcast_quiet_hours_enabled !== undefined) {
            updates.push(`broadcast_quiet_hours_enabled = $${paramIdx++}`);
            values.push(broadcast_quiet_hours_enabled === true || broadcast_quiet_hours_enabled === 'true');
        }

        if (quiet_hours_start !== undefined) {
            updates.push(`quiet_hours_start = $${paramIdx++}`);
            values.push(parseInt(quiet_hours_start));
        }

        if (quiet_hours_end !== undefined) {
            updates.push(`quiet_hours_end = $${paramIdx++}`);
            values.push(parseInt(quiet_hours_end));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(organization_id);

        await pool.query(
            `UPDATE organizations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx}`,
            values
        );

        res.json({
            message: 'Broadcast settings updated',
            settings: {
                broadcast_quiet_hours_enabled: broadcast_quiet_hours_enabled,
                quiet_hours_start: quiet_hours_start !== undefined ? parseInt(quiet_hours_start) : undefined,
                quiet_hours_end: quiet_hours_end !== undefined ? parseInt(quiet_hours_end) : undefined
            }
        });
    } catch (err) {
        // Handle missing column for robustness
        if (err.code === '42703') {
            // Missing column - add all missing columns and retry
            try {
                await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT');
                await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS broadcast_quiet_hours_enabled BOOLEAN DEFAULT TRUE');
                await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quiet_hours_start INTEGER DEFAULT 5');
                await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quiet_hours_end INTEGER DEFAULT 22');
            } catch (e) {
                // Ignore if columns already exist
            }
            // Retry the update
            try {
                const updates = [];
                const values = [];
                let paramIdx = 1;

                if (broadcast_quiet_hours_enabled !== undefined) {
                    updates.push(`broadcast_quiet_hours_enabled = $${paramIdx++}`);
                    values.push(broadcast_quiet_hours_enabled === true || broadcast_quiet_hours_enabled === 'true');
                }
                if (quiet_hours_start !== undefined) {
                    updates.push(`quiet_hours_start = $${paramIdx++}`);
                    values.push(parseInt(quiet_hours_start));
                }
                if (quiet_hours_end !== undefined) {
                    updates.push(`quiet_hours_end = $${paramIdx++}`);
                    values.push(parseInt(quiet_hours_end));
                }
                values.push(organization_id);

                await pool.query(
                    `UPDATE organizations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx}`,
                    values
                );

                return res.json({
                    message: 'Broadcast settings updated',
                    settings: {
                        broadcast_quiet_hours_enabled: broadcast_quiet_hours_enabled,
                        quiet_hours_start: quiet_hours_start !== undefined ? parseInt(quiet_hours_start) : undefined,
                        quiet_hours_end: quiet_hours_end !== undefined ? parseInt(quiet_hours_end) : undefined
                    }
                });
            } catch (retryErr) {
                return res.status(500).json({ error: retryErr.message });
            }
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/organization/webhook
export const updateWebhook = async (req, res) => {
    const { organization_id } = req.user;
    const { webhook_url } = req.body;

    try {
        await pool.query(
            'UPDATE organizations SET webhook_url = $1 WHERE id = $2',
            [webhook_url, organization_id]
        );
        res.json({ message: 'Webhook updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/organization/logo
export const uploadLogo = async (req, res) => {
    const { organization_id } = req.user;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileUrl = `/uploads/${req.file.filename}`;

    try {
        // Try to update. If column doesn't exist, this might fail unless migration ran.
        await pool.query(
            'UPDATE organizations SET logo_url = $1 WHERE id = $2',
            [fileUrl, organization_id]
        );

        res.json({ url: fileUrl, message: 'Logo updated successfully' });
    } catch (err) {
        // If column missing error
        if (err.code === '42703') { // Undefined column
            try {
                await pool.query('ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT');
                await pool.query('UPDATE organizations SET logo_url = $1 WHERE id = $2', [fileUrl, organization_id]);
                return res.json({ url: fileUrl, message: 'Logo updated (Schema migrated)' });
            } catch (e) {
                return res.status(500).json({ error: "Database Schema Error: " + e.message });
            }
        }
        res.status(500).json({ error: err.message });
    }
};
