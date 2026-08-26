import pool from '../config/db.js';

export const getTools = async (req, res) => {
    try {
        const { bot_config_id } = req.query;
        let query = 'SELECT * FROM chatbot_tools WHERE organization_id = $1';
        let params = [req.user.organization_id];

        if (bot_config_id) {
            query += ' AND bot_config_id = $2';
            params.push(bot_config_id);
        }

        const result = await pool.query(query + ' ORDER BY id DESC', params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createTool = async (req, res) => {
    try {
        const { bot_config_id, name, description, method, url, parameters } = req.body;
        const result = await pool.query(
            `INSERT INTO chatbot_tools (organization_id, bot_config_id, name, description, method, url, parameters)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [req.user.organization_id, bot_config_id, name, description, method, url, parameters || {}]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteTool = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM chatbot_tools WHERE id = $1 AND organization_id = $2', [id, req.user.organization_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
