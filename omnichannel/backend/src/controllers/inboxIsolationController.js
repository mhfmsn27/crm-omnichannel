import pool from '../config/db.js';

// Auto-migration: Create inbox tables if not exist
const ensureInboxTables = async () => {
    try {
        // Create inboxes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inboxes (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                color VARCHAR(20) DEFAULT '#6366f1',
                icon VARCHAR(50) DEFAULT 'inbox',
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(organization_id, name)
            )
        `);

        // Create user_inbox_access table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_inbox_access (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                inbox_id INTEGER NOT NULL,
                can_manage BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, inbox_id)
            )
        `);

        // Create inbox_device_mapping table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inbox_device_mapping (
                id SERIAL PRIMARY KEY,
                inbox_id INTEGER NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
                device_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(inbox_id, device_id)
            )
        `);

        // Add inbox_id column to conversations if not exists
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'inbox_id') THEN
                    ALTER TABLE conversations ADD COLUMN inbox_id INTEGER REFERENCES inboxes(id) ON DELETE SET NULL;
                END IF;
            END $$
        `);

        // Add inbox_isolation_enabled column to organizations if not exists
        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'inbox_isolation_enabled') THEN
                    ALTER TABLE organizations ADD COLUMN inbox_isolation_enabled BOOLEAN DEFAULT false;
                END IF;
            END $$
        `);

        console.log('[Inbox Tables] Migration completed successfully');
    } catch (e) {
        console.error('[Inbox Tables] Migration error:', e.message);
    }
};

// Run migration
ensureInboxTables();

// --- GLOBAL SETTING ---

// GET /api/app/inboxes/settings - Get inbox isolation global setting
export const getInboxSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await pool.query(
            'SELECT inbox_isolation_enabled FROM organizations WHERE id = $1',
            [organization_id]
        );

        res.json({
            inbox_isolation_enabled: result.rows[0]?.inbox_isolation_enabled || false
        });
    } catch (err) {
        console.error('[Inboxes] getInboxSettings error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/inboxes/settings - Update inbox isolation global setting
export const updateInboxSettings = async (req, res) => {
    const { organization_id } = req.user;
    const { inbox_isolation_enabled } = req.body;

    try {
        await pool.query(
            'UPDATE organizations SET inbox_isolation_enabled = $1 WHERE id = $2',
            [inbox_isolation_enabled === true, organization_id]
        );

        res.json({
            success: true,
            inbox_isolation_enabled: inbox_isolation_enabled === true
        });
    } catch (err) {
        console.error('[Inboxes] updateInboxSettings error:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- INBOX CRUD ---

// GET /api/app/inboxes - List all inboxes for org
export const getInboxes = async (req, res) => {
    const { organization_id, id: userId } = req.user;

    try {
        const result = await pool.query(`
            SELECT i.*,
                   (SELECT COUNT(*) FROM conversations c WHERE c.inbox_id = i.id AND c.status != 'resolved' AND c.is_archived = false) as unread_count,
                   (SELECT COUNT(*) FROM user_inbox_access uia WHERE uia.inbox_id = i.id AND uia.user_id = $2) as has_access,
                   (SELECT can_manage FROM user_inbox_access uia WHERE uia.inbox_id = i.id AND uia.user_id = $2) as can_manage
            FROM inboxes i
            WHERE i.organization_id = $1
            ORDER BY i.is_default DESC, i.name ASC
        `, [organization_id, userId]);

        res.json(result.rows);
    } catch (err) {
        console.error('[Inboxes] getInboxes error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/inboxes/accessible - Get only inboxes user can access
export const getAccessibleInboxes = async (req, res) => {
    const { organization_id, id: userId } = req.user;

    try {
        // Check if user has any inbox_access records
        const accessCheck = await pool.query(`
            SELECT COUNT(*) as count FROM user_inbox_access WHERE user_id = $1
        `, [userId]);

        let query;
        let params;

        if (parseInt(accessCheck.rows[0].count) === 0) {
            // No specific access - user can access all inboxes (backward compatible)
            query = `
                SELECT i.*,
                       (SELECT COUNT(*) FROM conversations c WHERE c.inbox_id = i.id AND c.status != 'resolved' AND c.is_archived = false) as unread_count
                FROM inboxes i
                WHERE i.organization_id = $1
                ORDER BY i.is_default DESC, i.name ASC
            `;
            params = [organization_id];
        } else {
            // User has specific access
            query = `
                SELECT i.*,
                       uia.can_manage,
                       (SELECT COUNT(*) FROM conversations c WHERE c.inbox_id = i.id AND c.status != 'resolved' AND c.is_archived = false) as unread_count
                FROM inboxes i
                JOIN user_inbox_access uia ON i.id = uia.inbox_id
                WHERE i.organization_id = $1 AND uia.user_id = $2
                ORDER BY i.is_default DESC, i.name ASC
            `;
            params = [organization_id, userId];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('[Inboxes] getAccessibleInboxes error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/inboxes - Create inbox
export const createInbox = async (req, res) => {
    const { organization_id } = req.user;
    const { name, description, color, icon, device_ids, is_default } = req.body;

    if (!name) return res.status(400).json({ error: 'Inbox name is required' });

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // If setting as default, unset other defaults
            if (is_default) {
                await client.query('UPDATE inboxes SET is_default = false WHERE organization_id = $1', [organization_id]);
            }

            const result = await client.query(`
                INSERT INTO inboxes (organization_id, name, description, color, icon, is_default)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [organization_id, name, description || '', color || '#6366f1', icon || 'inbox', is_default || false]);

            const inbox = result.rows[0];

            // If device_ids provided, link them
            if (device_ids && Array.isArray(device_ids) && device_ids.length > 0) {
                for (const deviceId of device_ids) {
                    await client.query(`
                        INSERT INTO inbox_device_mapping (inbox_id, device_id)
                        VALUES ($1, $2)
                        ON CONFLICT DO NOTHING
                    `, [inbox.id, deviceId]);
                }
            }

            await client.query('COMMIT');
            res.status(201).json(inbox);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Inboxes] createInbox error:', err);
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Inbox with this name already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/inboxes/:id - Update inbox
export const updateInbox = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, description, color, icon, device_ids, is_default } = req.body;

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership
            const check = await client.query(
                'SELECT id FROM inboxes WHERE id = $1 AND organization_id = $2',
                [id, organization_id]
            );
            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Inbox not found' });
            }

            // If setting as default, unset other defaults
            if (is_default) {
                await client.query('UPDATE inboxes SET is_default = false WHERE organization_id = $1 AND id != $2', [organization_id, id]);
            }

            const result = await client.query(`
                UPDATE inboxes
                SET name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    color = COALESCE($3, color),
                    icon = COALESCE($4, icon),
                    is_default = COALESCE($5, is_default),
                    updated_at = NOW()
                WHERE id = $6 AND organization_id = $7
                RETURNING *
            `, [name, description, color, icon, is_default, id, organization_id]);

            // Update device mapping
            if (device_ids !== undefined) {
                await client.query('DELETE FROM inbox_device_mapping WHERE inbox_id = $1', [id]);
                if (Array.isArray(device_ids) && device_ids.length > 0) {
                    for (const deviceId of device_ids) {
                        await client.query(`
                            INSERT INTO inbox_device_mapping (inbox_id, device_id)
                            VALUES ($1, $2)
                            ON CONFLICT DO NOTHING
                        `, [id, deviceId]);
                    }
                }
            }

            await client.query('COMMIT');
            res.json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Inboxes] updateInbox error:', err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/inboxes/:id - Delete inbox
export const deleteInbox = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM inboxes WHERE id = $1 AND organization_id = $2 RETURNING id',
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inbox not found' });
        }

        res.json({ message: 'Inbox deleted' });
    } catch (err) {
        console.error('[Inboxes] deleteInbox error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/inboxes/:id/users - Assign users to inbox
export const assignUsersToInbox = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { user_ids, can_manage } = req.body;

    if (!user_ids || !Array.isArray(user_ids)) {
        return res.status(400).json({ error: 'user_ids array is required' });
    }

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verify inbox ownership
            const check = await client.query(
                'SELECT id FROM inboxes WHERE id = $1 AND organization_id = $2',
                [id, organization_id]
            );
            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Inbox not found' });
            }

            // Remove existing assignments
            await client.query('DELETE FROM user_inbox_access WHERE inbox_id = $1', [id]);

            // Add new assignments
            for (const userId of user_ids) {
                await client.query(`
                    INSERT INTO user_inbox_access (user_id, inbox_id, can_manage)
                    VALUES ($1, $2, $3)
                `, [userId, id, can_manage || false]);
            }

            await client.query('COMMIT');
            res.json({ message: 'Users assigned successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[Inboxes] assignUsersToInbox error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/inboxes/:id/users - Get users with access to inbox
export const getInboxUsers = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        // Verify inbox ownership
        const check = await pool.query(
            'SELECT id FROM inboxes WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Inbox not found' });
        }

        const result = await pool.query(`
            SELECT u.id, u.name, u.email, uia.can_manage, uia.created_at as assigned_at
            FROM users u
            JOIN user_inbox_access uia ON u.id = uia.user_id
            WHERE uia.inbox_id = $1 AND u.organization_id = $2
            ORDER BY u.name ASC
        `, [id, organization_id]);

        res.json(result.rows);
    } catch (err) {
        console.error('[Inboxes] getInboxUsers error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/inboxes/:id - Get single inbox with device mappings
export const getInboxById = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(`
            SELECT i.*
            FROM inboxes i
            WHERE i.id = $1 AND i.organization_id = $2
        `, [id, organization_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inbox not found' });
        }

        const inbox = result.rows[0];

        // Get linked devices
        const devicesRes = await pool.query(`
            SELECT idm.device_id
            FROM inbox_device_mapping idm
            WHERE idm.inbox_id = $1
        `, [id]);

        inbox.device_ids = devicesRes.rows.map(r => r.device_id);

        res.json(inbox);
    } catch (err) {
        console.error('[Inboxes] getInboxById error:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- HELPER: Get user's accessible inbox IDs ---
export const getUserAccessibleInboxIds = async (userId) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as count FROM user_inbox_access WHERE user_id = $1
        `, [userId]);

        if (parseInt(result.rows[0].count) === 0) {
            // No specific access - user can access all inboxes
            return null; // null means "all inboxes"
        }

        const inboxes = await pool.query(`
            SELECT inbox_id FROM user_inbox_access WHERE user_id = $1
        `, [userId]);

        return inboxes.rows.map(r => r.inbox_id);
    } catch (err) {
        console.error('[Inboxes] getUserAccessibleInboxIds error:', err);
        return null; // On error, allow all (fail-open)
    }
};
