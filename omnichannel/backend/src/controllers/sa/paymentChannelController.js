
import pool from '../../config/db.js';

// GET /api/sa/payment-channels
export const getChannels = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payment_channels WHERE deleted_at IS NULL ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/payment-channels
export const createChannel = async (req, res) => {
    const { type, provider_name, account_number, account_holder, instructions } = req.body;
    try {
        await pool.query(
            `INSERT INTO payment_channels (type, provider_name, account_number, account_holder, instructions)
             VALUES ($1, $2, $3, $4, $5)`,
            [type, provider_name, account_number, account_holder, instructions]
        );
        res.status(201).json({ message: 'Channel created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/sa/payment-channels/:id
export const updateChannel = async (req, res) => {
    const { id } = req.params;
    const { provider_name, account_number, account_holder, instructions, is_active } = req.body;
    try {
        await pool.query(
            `UPDATE payment_channels 
             SET provider_name = $1, account_number = $2, account_holder = $3, instructions = $4, is_active = $5 
             WHERE id = $6`,
            [provider_name, account_number, account_holder, instructions, is_active, id]
        );
        res.json({ message: 'Channel updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/payment-channels/:id (Soft Delete)
export const deleteChannel = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE payment_channels SET deleted_at = NOW(), is_active = false WHERE id = $1', [id]);
        res.json({ message: 'Channel deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
