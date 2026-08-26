
import pool from '../../config/db.js';

export const getPromoCodes = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createPromoCode = async (req, res) => {
    const { code, type, value, max_uses, expires_at } = req.body;
    try {
        // Basic validation
        if (!code || !type || !value) {
            return res.status(400).json({ error: 'Code, Type, and Value are required.' });
        }
        if (type !== 'percent' && type !== 'fixed') {
            return res.status(400).json({ error: 'Invalid type. Must be percent or fixed.' });
        }

        const result = await pool.query(
            `INSERT INTO promo_codes (code, type, value, max_uses, expires_at) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [code.toUpperCase(), type, value, max_uses || null, expires_at || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique constraint
            return res.status(400).json({ error: 'Promo code already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
};

export const deletePromoCode = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM promo_codes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Promo code not found.' });
        }
        res.json({ message: 'Promo code deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Toggle active status
export const togglePromoCode = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE promo_codes SET is_active = NOT is_active WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Promo code not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
