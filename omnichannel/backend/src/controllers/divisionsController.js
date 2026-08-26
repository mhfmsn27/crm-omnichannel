import pool from '../config/db.js';

// ==============================================================
// DIVISION MANAGEMENT CONTROLLER
// Proper division lifecycle management with supervisor tracking
// ==============================================================

// GET /api/app/divisions - list all divisions for organization
export const getDivisions = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT d.*,
                    u_sup.name as supervisor_name,
                    u_sup.id as supervisor_id,
                    COUNT(u_staff.id) as staff_count
             FROM divisions d
             LEFT JOIN users u_sup ON u_sup.id = d.supervisor_id AND u_sup.organization_id = d.organization_id
             LEFT JOIN users u_staff ON u_staff.division = d.name AND u_staff.organization_id = d.organization_id AND u_staff.role_level < 10
             WHERE d.organization_id = $1
             GROUP BY d.id, u_sup.name, u_sup.id
             ORDER BY d.name ASC`,
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[Divisions] getDivisions error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/divisions - create a new division
export const createDivision = async (req, res) => {
    const { organization_id } = req.user;
    const { name, supervisor_id, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Division name is required' });
    }

    const divisionName = name.trim().toUpperCase();

    // Validate supervisor if provided
    if (supervisor_id) {
        const supRes = await pool.query(
            `SELECT id, role_level, division FROM users WHERE id = $1 AND organization_id = $2`,
            [supervisor_id, organization_id]
        );
        if (supRes.rows.length === 0) {
            return res.status(400).json({ error: 'Supervisor not found' });
        }
        const sup = supRes.rows[0];
        if (sup.role_level < 10) {
            return res.status(400).json({ error: 'Selected supervisor must have role_level >= 10' });
        }
        // If supervisor already assigned to another division, remove them from that division
        if (sup.division && sup.division !== divisionName) {
            // Clear old division assignment
            await pool.query(
                'UPDATE users SET division = $1 WHERE id = $2 AND organization_id = $3',
                [divisionName, supervisor_id, organization_id]
            );
        }
    }

    try {
        const result = await pool.query(
            `INSERT INTO divisions (organization_id, name, supervisor_id, description)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [organization_id, divisionName, supervisor_id || null, description || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A division with this name already exists' });
        }
        console.error('[Divisions] createDivision error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/divisions/:id - update a division
export const updateDivision = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, supervisor_id, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Division name is required' });
    }

    const divisionName = name.trim().toUpperCase();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validate supervisor if provided
        if (supervisor_id) {
            const supRes = await client.query(
                `SELECT id, role_level, division FROM users WHERE id = $1 AND organization_id = $2`,
                [supervisor_id, organization_id]
            );
            if (supRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Supervisor not found' });
            }
            const sup = supRes.rows[0];
            if (sup.role_level < 10) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Selected supervisor must have role_level >= 10' });
            }
        }

        // Get current division name
        const currentRes = await client.query(
            'SELECT name FROM divisions WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Division not found' });
        }
        const oldName = currentRes.rows[0].name;

        // Update division
        const result = await client.query(
            `UPDATE divisions
             SET name = $1, supervisor_id = $2, description = $3, updated_at = NOW()
             WHERE id = $4 AND organization_id = $5
             RETURNING *`,
            [divisionName, supervisor_id || null, description || null, id, organization_id]
        );

        // If name changed, update all staff supervisors with this division
        if (oldName !== divisionName) {
            await client.query(
                `UPDATE users SET division = $1 WHERE division = $2 AND organization_id = $3`,
                [divisionName, oldName, organization_id]
            );
        }

        // Update supervisor's division assignment
        if (supervisor_id) {
            await client.query(
                'UPDATE users SET division = $1 WHERE id = $2 AND organization_id = $3',
                [divisionName, supervisor_id, organization_id]
            );
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(400).json({ error: 'A division with this name already exists' });
        }
        console.error('[Divisions] updateDivision error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// DELETE /api/app/divisions/:id - delete a division
export const deleteDivision = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get division info
        const divRes = await client.query(
            'SELECT name FROM divisions WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (divRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Division not found' });
        }
        const divisionName = divRes.rows[0].name;

        // Check for staff without supervisor in this division
        const orphanCheck = await client.query(
            `SELECT COUNT(*) as count FROM users
             WHERE organization_id = $1
             AND division = $2
             AND role_level < 10`,
            [organization_id, divisionName]
        );
        const orphanCount = parseInt(orphanCheck.rows[0].count);

        if (orphanCount > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Cannot delete division. There are ${orphanCount} staff member(s) without another supervisor. Please reassign them first.`
            });
        }

        // Clear division from supervisor
        await client.query(
            `UPDATE users SET division = NULL WHERE division = $1 AND organization_id = $2 AND role_level >= 10`,
            [divisionName, organization_id]
        );

        // Delete division
        await client.query(
            'DELETE FROM divisions WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Division deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Divisions] deleteDivision error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// GET /api/app/divisions/:id/staff - get staff in a division
export const getDivisionStaff = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        // Verify division exists
        const divRes = await pool.query(
            'SELECT name FROM divisions WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (divRes.rows.length === 0) {
            return res.status(404).json({ error: 'Division not found' });
        }
        const divisionName = divRes.rows[0].name;

        const result = await pool.query(
            `SELECT id, name, email, role_level, permissions, assigned_devices
             FROM users
             WHERE organization_id = $1 AND division = $2 AND role_level < 10
             ORDER BY name ASC`,
            [organization_id, divisionName]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[Divisions] getDivisionStaff error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ==============================================================
// MIGRATION: Create divisions table if not exists
// ==============================================================
export const ensureDivisionsTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS divisions (
                id BIGSERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(50) NOT NULL,
                description TEXT,
                supervisor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(organization_id, name)
            );

            -- Add division column to users if not exists (should already exist)
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'division'
                ) THEN
                    ALTER TABLE users ADD COLUMN division VARCHAR(50);
                END IF;
            END $$;
        `);
        console.log('[Divisions] Table ensured');
    } catch (err) {
        console.error('[Divisions] Migration error:', err.message);
    }
};
