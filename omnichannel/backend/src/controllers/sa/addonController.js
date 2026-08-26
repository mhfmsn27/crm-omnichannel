
import pool from '../../config/db.js';

// GET /api/sa/addons
export const getAddons = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM addons ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/addons
export const createAddon = async (req, res) => {
    const { code, name, description, price_monthly, feature_code, type, value, prerequisite_feature_code, duration_days } = req.body;
    try {
        await pool.query(
            `INSERT INTO addons (code, name, description, price_monthly, feature_code, type, value, prerequisite_feature_code, duration_days)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [code, name, description, price_monthly, feature_code, type, value, prerequisite_feature_code || null, duration_days || 30]
        );
        res.status(201).json({ message: 'Addon created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/sa/addons/:id
export const updateAddon = async (req, res) => {
    const { id } = req.params;
    const { name, description, price_monthly, is_active, prerequisite_feature_code, duration_days } = req.body;
    try {
        await pool.query(
            `UPDATE addons SET name = $1, description = $2, price_monthly = $3, is_active = $4, prerequisite_feature_code = $5, duration_days = $6, updated_at = NOW() WHERE id = $7`,
            [name, description, price_monthly, is_active, prerequisite_feature_code || null, duration_days || 30, id]
        );
        res.json({ message: 'Addon updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/addons/:id
export const deleteAddon = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM addons WHERE id = $1', [id]);
        res.json({ message: 'Addon deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
