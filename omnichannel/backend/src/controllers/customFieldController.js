import pool from '../config/db.js';

let schemaEnsured = false;
export const ensureCustomFieldsSchema = async () => {
    if (schemaEnsured) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_custom_fields (
                id BIGSERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                field_key VARCHAR(100) NOT NULL,
                field_label VARCHAR(255) NOT NULL,
                field_type VARCHAR(50) NOT NULL DEFAULT 'text',
                field_options JSONB DEFAULT NULL,
                is_required BOOLEAN NOT NULL DEFAULT FALSE,
                position INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(organization_id, field_key)
            );

            CREATE TABLE IF NOT EXISTS contact_field_values (
                id BIGSERIAL PRIMARY KEY,
                contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                field_key VARCHAR(100) NOT NULL,
                value TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(contact_id, field_key)
            );

            CREATE INDEX IF NOT EXISTS idx_contact_custom_fields_org ON contact_custom_fields(organization_id);
            CREATE INDEX IF NOT EXISTS idx_contact_custom_fields_pos ON contact_custom_fields(organization_id, position);
            CREATE INDEX IF NOT EXISTS idx_contact_field_values_contact ON contact_field_values(contact_id);
            CREATE INDEX IF NOT EXISTS idx_contact_field_values_org_key ON contact_field_values(organization_id, field_key);
        `);
        schemaEnsured = true;
    } catch (err) {
        console.error('[CustomFields] Error ensuring schema:', err.message);
    }
};

// --- Field Definitions CRUD ---

export const getFields = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureCustomFieldsSchema();
        const result = await pool.query(
            `SELECT * FROM contact_custom_fields WHERE organization_id = $1 ORDER BY position ASC, id ASC`,
            [organization_id]
        );
        res.json(result.rows || []);
    } catch (e) {
        console.error('[CustomFields] getFields error:', e.message);
        res.json([]);
    }
};

export const createField = async (req, res) => {
    const { organization_id } = req.user;
    const { field_key, field_label, field_type = 'text', field_options, is_required = false, position = 0 } = req.body;

    if (!field_key || !field_label) {
        return res.status(400).json({ error: 'field_key and field_label are required' });
    }

    // Sanitize field_key: lowercase, alphanumeric + underscore only
    const key = field_key.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    try {
        await ensureCustomFieldsSchema();
        // Check uniqueness within org
        const dup = await pool.query(
            `SELECT id FROM contact_custom_fields WHERE organization_id = $1 AND field_key = $2`,
            [organization_id, key]
        );
        if (dup.rows.length > 0) {
            return res.status(409).json({ error: 'A field with this key already exists' });
        }

        const result = await pool.query(
            `INSERT INTO contact_custom_fields (organization_id, field_key, field_label, field_type, field_options, is_required, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [organization_id, key, field_label, field_type, field_options ? JSON.stringify(field_options) : null, is_required, position]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateField = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { field_label, field_type, field_options, is_required, position } = req.body;

    const sets = [];
    const params = [id, organization_id];
    let i = 3;

    if (field_label !== undefined) { sets.push(`field_label = $${i++}`); params.push(field_label); }
    if (field_type !== undefined) { sets.push(`field_type = $${i++}`); params.push(field_type); }
    if (field_options !== undefined) { sets.push(`field_options = $${i++}`); params.push(field_options ? JSON.stringify(field_options) : null); }
    if (is_required !== undefined) { sets.push(`is_required = $${i++}`); params.push(is_required); }
    if (position !== undefined) { sets.push(`position = $${i++}`); params.push(position); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    try {
        await ensureCustomFieldsSchema();
        const result = await pool.query(
            `UPDATE contact_custom_fields SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Field not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteField = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await ensureCustomFieldsSchema();
        // Get the field key to also delete values
        const fieldRes = await pool.query(
            `SELECT field_key FROM contact_custom_fields WHERE id = $1 AND organization_id = $2`,
            [id, organization_id]
        );
        if (fieldRes.rows.length === 0) return res.status(404).json({ error: 'Field not found' });

        const { field_key } = fieldRes.rows[0];
        await pool.query(`DELETE FROM contact_field_values WHERE organization_id = $1 AND field_key = $2`, [organization_id, field_key]);
        await pool.query(`DELETE FROM contact_custom_fields WHERE id = $1 AND organization_id = $2`, [id, organization_id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const reorderFields = async (req, res) => {
    const { organization_id } = req.user;
    const { order } = req.body; // array of { id, position }
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });

    try {
        await ensureCustomFieldsSchema();
        await Promise.all(order.map(({ id, position }) =>
            pool.query(
                `UPDATE contact_custom_fields SET position = $1 WHERE id = $2 AND organization_id = $3`,
                [position, id, organization_id]
            )
        ));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- Field Values per Contact ---

export const getContactFieldValues = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;
    try {
        await ensureCustomFieldsSchema();
        // Return all field definitions with their current values merged
        const fields = await pool.query(
            `SELECT * FROM contact_custom_fields WHERE organization_id = $1 ORDER BY position ASC, id ASC`,
            [organization_id]
        );
        const values = await pool.query(
            `SELECT field_key, value FROM contact_field_values WHERE contact_id = $1 AND organization_id = $2`,
            [contactId, organization_id]
        );

        const valueMap = {};
        values.rows.forEach(v => { valueMap[v.field_key] = v.value; });

        const result = fields.rows.map(f => ({
            ...f,
            value: valueMap[f.field_key] ?? null
        }));

        res.json(result);
    } catch (e) {
        console.error('[CustomFields] getContactFieldValues error:', e.message);
        res.json([]);
    }
};

export const saveContactFieldValues = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;
    const { values } = req.body; // { field_key: value, ... }

    if (!values || typeof values !== 'object') {
        return res.status(400).json({ error: 'values must be an object' });
    }

    try {
        await ensureCustomFieldsSchema();
        const entries = Object.entries(values);
        await Promise.all(entries.map(([field_key, value]) => {
            if (value === null || value === '') {
                // Delete if empty
                return pool.query(
                    `DELETE FROM contact_field_values WHERE contact_id = $1 AND organization_id = $2 AND field_key = $3`,
                    [contactId, organization_id, field_key]
                );
            }
            return pool.query(
                `INSERT INTO contact_field_values (contact_id, organization_id, field_key, value, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (contact_id, field_key)
                 DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                [contactId, organization_id, field_key, String(value)]
            );
        }));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
