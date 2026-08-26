import pool from '../config/db.js';

// Auto-migration helper
const ensureTableExists = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS upselling_campaigns (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                name TEXT NOT NULL,
                frequency VARCHAR(50) NOT NULL, -- 'daily', 'monthly', 'yearly'
                time TIME NOT NULL,
                day_of_month INT,
                month_of_year INT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                device_id INT, -- NULL means AI/Auto
                rotator_group_id INT,
                target_type VARCHAR(50), -- 'label', 'all', etc
                target_value TEXT,
                message_template TEXT,
                delay_seconds INT DEFAULT 60,
                status VARCHAR(50) DEFAULT 'active',
                last_run_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.error("Error creating upselling_campaigns table:", err);
    } finally {
        client.release();
    }
};

// Run once on import (lazy init)
ensureTableExists();

export const getUpsellings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM upselling_campaigns WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createUpselling = async (req, res) => {
    const { organization_id } = req.user;
    const {
        name, frequency, time, day_of_month, month_of_year,
        start_date, end_date, device_id, rotator_group_id,
        target_type, target_value, message_template, delay_seconds
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO upselling_campaigns (
                organization_id, name, frequency, time, day_of_month, month_of_year,
                start_date, end_date, device_id, rotator_group_id,
                target_type, target_value, message_template, delay_seconds, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active')
            RETURNING *`,
            [
                organization_id, name, frequency, time, day_of_month || null, month_of_year || null,
                start_date, end_date || null, device_id || null, rotator_group_id || null,
                target_type, target_value, message_template, delay_seconds || 60
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateUpselling = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const {
        name, frequency, time, day_of_month, month_of_year,
        start_date, end_date, device_id, rotator_group_id,
        target_type, target_value, message_template, delay_seconds, status
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE upselling_campaigns SET
                name = $1, frequency = $2, time = $3, day_of_month = $4, month_of_year = $5,
                start_date = $6, end_date = $7, device_id = $8, rotator_group_id = $9,
                target_type = $10, target_value = $11, message_template = $12, delay_seconds = $13, status = $14,
                updated_at = NOW()
            WHERE id = $15 AND organization_id = $16 RETURNING *`,
            [
                name, frequency, time, day_of_month || null, month_of_year || null,
                start_date, end_date || null, device_id || null, rotator_group_id || null,
                target_type, target_value, message_template, delay_seconds || 60, status,
                id, organization_id
            ]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteUpselling = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const result = await pool.query('DELETE FROM upselling_campaigns WHERE id = $1 AND organization_id = $2 RETURNING id', [id, organization_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
        res.json({ message: "Deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
