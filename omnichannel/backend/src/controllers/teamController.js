import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { invalidateUserTokens } from '../services/tokenService.js';

// Self-healing schema for shift and role columns in users table
export const ensureUserTeamColumns = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS custom_roles (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                color VARCHAR(50) DEFAULT '#6366f1',
                permissions JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_start TIME;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS shift_end TIME;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS handled_channels JSONB DEFAULT '[]';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS division VARCHAR(100);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_role_id INT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_devices JSONB DEFAULT '[]';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level VARCHAR(50) DEFAULT 'agent';
        `);
    } catch (e) {
        console.error('[TeamController] ensureUserTeamColumns error:', e.message);
    }
};
ensureUserTeamColumns().catch(() => {});

// NEW: GET /api/app/team/stats
export const getTeamStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_agent_limit');
        res.json({
            allowed: access.allowed,
            limit: access.limit,
            used: access.used,
            message: access.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/team
export const getTeam = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureUserTeamColumns();
        try {
            const result = await pool.query(
                `SELECT u.id, u.name, u.email, u.role, u.role_level, u.permissions, u.assigned_devices, u.handled_channels,
                        u.profile_pic_url, u.division, u.custom_role_id, u.shift_start, u.shift_end, u.created_at,
                        cr.name AS custom_role_name, cr.color AS custom_role_color
                 FROM users u
                 LEFT JOIN custom_roles cr ON cr.id = u.custom_role_id
                 WHERE u.organization_id = $1
                 ORDER BY u.created_at ASC`,
                [organization_id]
            );
            return res.json(result.rows);
        } catch (queryErr) {
            // Attempt to ensure tables again
            await ensureUserTeamColumns();
            // Fallback to basic user query without custom columns if DB is in transition
            const basicResult = await pool.query(
                `SELECT u.id, u.name, u.email, u.role, u.permissions, u.created_at
                 FROM users u
                 WHERE u.organization_id = $1
                 ORDER BY u.created_at ASC`,
                [organization_id]
            );
            const enriched = basicResult.rows.map(r => ({
                ...r,
                role_level: r.role || 'agent',
                assigned_devices: [],
                handled_channels: [],
                division: null,
                custom_role_id: null,
                shift_start: null,
                shift_end: null,
                custom_role_name: null,
                custom_role_color: null
            }));
            return res.json(enriched);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/team
export const addMember = async (req, res) => {
    const { organization_id } = req.user;
    const { name, email, password, role, permissions, role_level, assigned_devices, division, custom_role_id, shift_start, shift_end, handled_channels } = req.body;

    // Resolve role/level/permissions from custom_role if provided
    let resolvedRole = role;
    let resolvedLevel = role_level;
    let resolvedPermissions = permissions;

    if (custom_role_id) {
        const crRes = await pool.query('SELECT * FROM custom_roles WHERE id = $1 AND organization_id = $2', [custom_role_id, organization_id]);
        if (crRes.rows.length === 0) return res.status(400).json({ error: 'Custom role not found' });
        const cr = crRes.rows[0];
        resolvedRole = cr.role_type;
        resolvedLevel = cr.role_level;
        resolvedPermissions = cr.permissions;
    }

    // Validation
    if (!['admin_member', 'agent'].includes(resolvedRole)) {
        return res.status(400).json({ error: "Invalid role" });
    }

    // 1. CHECK LIMIT (Gate)
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_agent_limit');
        if (!access.allowed) {
            return res.status(403).json({
                error: access.message,
                code: 'LIMIT_REACHED',
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Limit check failed" });
    }

    // 2. VALIDATE DIVISION / SUPERVISOR CONSTRAINT
    if (resolvedRole === 'agent') {
        const level = resolvedLevel || 1;

        if (!division || division.trim() === '') {
            return res.status(400).json({ error: "Division is required for this role." });
        }

        // If trying to be a STAFF (level < 10), must have a Supervisor in that division
        if (level < 10) {
            const supervisorCheck = await pool.query(
                `SELECT id FROM users 
                 WHERE organization_id = $1 
                 AND role_level >= 10 
                 AND division = $2
                 LIMIT 1`,
                [organization_id, division]
            );

            if (supervisorCheck.rows.length === 0) {
                return res.status(400).json({
                    error: `Invalid Division: No Supervisor found for '${division}'. Please create a Supervisor for this division first.`
                });
            }
        }
    }

    // Determine level (if not provided, default based on role)
    let level = resolvedLevel;
    if (!level) {
        level = resolvedRole === 'admin_member' ? 100 : 1;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check Duplicate
        const check = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const hashedPwd = await bcrypt.hash(password, 10);

        // Insert with assigned_devices and custom_role_id
        const defaultChannels = ["whatsapp", "messenger", "instagram", "webchat", "telegram", "tiktok"];
        const resolvedChannels = Array.isArray(handled_channels) && handled_channels.length > 0 ? handled_channels : defaultChannels;

        const result = await client.query(
            `INSERT INTO users (organization_id, name, email, password_hash, role, role_level, permissions, assigned_devices, division, custom_role_id, shift_start, shift_end, handled_channels)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, name, email, role, role_level, permissions, assigned_devices, division, custom_role_id, shift_start, shift_end, handled_channels`,
            [organization_id, name, email, hashedPwd, resolvedRole, level, JSON.stringify(resolvedPermissions || []), JSON.stringify(assigned_devices || []), division || null, custom_role_id || null, shift_start || null, shift_end || null, JSON.stringify(resolvedChannels)]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// PUT /api/app/team/:id
export const updateMember = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, email, password, role, permissions, role_level, assigned_devices, division, custom_role_id, shift_start, shift_end, handled_channels } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const check = await client.query('SELECT id, role, role_level FROM users WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) {
            throw new Error("User not found");
        }

        // Resolve role/level/permissions from custom_role if provided
        let resolvedRole = role;
        let resolvedLevel = role_level;
        let resolvedPermissions = permissions;

        if (custom_role_id) {
            const crRes = await client.query('SELECT * FROM custom_roles WHERE id = $1 AND organization_id = $2', [custom_role_id, organization_id]);
            if (crRes.rows.length === 0) throw new Error('Custom role not found');
            const cr = crRes.rows[0];
            resolvedRole = cr.role_type;
            resolvedLevel = cr.role_level;
            resolvedPermissions = cr.permissions;
        }

        // --- SECURITY PATCH START ---

        // 1. Prevent "super_admin" escalation
        if (resolvedRole === 'super_admin') {
            throw new Error("Illegal role assignment detected.");
        }

        // 2. Validate Allowed Roles
        if (!['admin_member', 'agent'].includes(resolvedRole)) {
            throw new Error("Invalid role specified.");
        }

        // 3. Prevent Self-Privilege Escalation
        if (parseInt(id) === parseInt(req.user.id)) {
            const currentUser = check.rows[0];
            if (resolvedRole !== currentUser.role || (resolvedLevel !== undefined && parseInt(resolvedLevel) !== parseInt(currentUser.role_level))) {
                throw new Error("You cannot change your own role or level. Please ask another admin.");
            }
        }
        // --- SECURITY PATCH END ---

        let level = resolvedLevel;
        if (!level) {
            level = resolvedRole === 'admin_member' ? 100 : 1;
        }

        // VALIDATE DIVISION for AGENT updates
        if (resolvedRole === 'agent' && level < 10) {
            if (!division || division.trim() === '') {
                throw new Error("Division is required for Staff agents.");
            }

            const supervisorCheck = await pool.query(
                `SELECT id FROM users
                 WHERE organization_id = $1
                 AND role_level >= 10
                 AND division = $2
                 AND id != $3
                 LIMIT 1`,
                [organization_id, division, id]
            );

            if (supervisorCheck.rows.length === 0) {
                throw new Error(`Invalid Division: No Supervisor found for '${division}'. Cannot downgrade - staff would be orphaned.`);
            }
        }

        // CRITICAL: Prevent orphaning staff when supervisor is downgraded or changes division
        // Check if current user being edited is a supervisor and is being downgraded/changing division
        const currentUser = check.rows[0];
        const isCurrentlySupervisor = currentUser.role_level >= 10;
        const isBeingDowngraded = level < 10;
        const divisionChanging = division && division.trim() !== '' && division.trim() !== currentUser.division;

        if (isCurrentlySupervisor && (isBeingDowngraded || divisionChanging)) {
            const oldDivision = currentUser.division || division;

            // Check if there are staff members in this division who would be orphaned
            const orphanCheck = await pool.query(
                `SELECT COUNT(*) as count FROM users
                 WHERE organization_id = $1
                 AND role_level < 10
                 AND division = $2
                 AND id != $3`,
                [organization_id, oldDivision, id]
            );

            const orphanCount = parseInt(orphanCheck.rows[0].count);

            // If there are orphans and no other supervisor will remain in this division
            if (orphanCount > 0) {
                const remainingSupervisorCheck = await pool.query(
                    `SELECT COUNT(*) as count FROM users
                     WHERE organization_id = $1
                     AND role_level >= 10
                     AND division = $2
                     AND id != $3`,
                    [organization_id, oldDivision, id]
                );

                const remainingSupervisorCount = parseInt(remainingSupervisorCheck.rows[0].count);

                if (remainingSupervisorCount === 0) {
                    throw new Error(`Cannot downgrade: There are ${orphanCount} staff member(s) in '${oldDivision}' division who would be orphaned. Please reassign them first or promote another user to Supervisor.`);
                }
            }
        }

        const defaultChannels = ["whatsapp", "messenger", "instagram", "webchat", "telegram", "tiktok"];
        const resolvedChannels = Array.isArray(handled_channels) && handled_channels.length > 0 ? handled_channels : defaultChannels;

        let query = 'UPDATE users SET name = $1, email = $2, role = $3, role_level = $4, permissions = $5, assigned_devices = $6, division = $7, custom_role_id = $8, shift_start = $9, shift_end = $10, handled_channels = $11, updated_at = NOW()';
        let params = [name, email, resolvedRole, level, JSON.stringify(resolvedPermissions || []), JSON.stringify(assigned_devices || []), division || null, custom_role_id || null, shift_start || null, shift_end || null, JSON.stringify(resolvedChannels)];
        let idx = 12;

        if (password && password.trim() !== "") {
            const hashedPwd = await bcrypt.hash(password, 10);
            query += `, password_hash = $${idx}`;
            params.push(hashedPwd);
            idx++;
        }

        query += ` WHERE id = $${idx} RETURNING id, name, email, role, role_level, permissions, assigned_devices, division, custom_role_id, shift_start, shift_end, handled_channels`;
        params.push(id);

        const result = await client.query(query, params);

        await client.query('COMMIT');

        // Invalidate user's token so they get fresh permissions on next request
        await invalidateUserTokens(id, 'team_member_updated');

        res.json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// DELETE (Unchanged)
export const removeMember = async (req, res) => {
    const { id } = req.params;
    const { organization_id, id: actorId } = req.user;

    if (parseInt(id) === parseInt(actorId)) {
        return res.status(400).json({ error: "Cannot remove yourself" });
    }

    try {
        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 AND organization_id = $2 RETURNING id',
            [id, organization_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

        res.json({ message: "User removed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};