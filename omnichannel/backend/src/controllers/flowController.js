
import pool from '../config/db.js';

// GET /api/app/flows
export const getFlows = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT id, name, trigger_keyword, trigger_type, is_active, created_at FROM chat_flows WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/flows/:id
export const getFlowById = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const result = await pool.query('SELECT * FROM chat_flows WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Flow not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/flows
export const createFlow = async (req, res) => {
    const { organization_id } = req.user;
    const { name, trigger_keyword, trigger_type, nodes, edges } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO chat_flows (organization_id, name, trigger_keyword, trigger_type, nodes, edges, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
            [organization_id, name, trigger_keyword ? trigger_keyword.toUpperCase() : null, trigger_type || 'exact', JSON.stringify(nodes), JSON.stringify(edges)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Trigger keyword already exists" });
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/flows/:id
export const updateFlow = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, trigger_keyword, trigger_type, nodes, edges, is_active } = req.body;

    try {
        // Use COALESCE to allow partial updates (e.g. just toggling is_active)
        const result = await pool.query(
            `UPDATE chat_flows SET 
                name = COALESCE($1, name), 
                trigger_keyword = COALESCE($2, trigger_keyword), 
                trigger_type = COALESCE($3, trigger_type),
                nodes = COALESCE($4, nodes), 
                edges = COALESCE($5, edges), 
                is_active = COALESCE($6, is_active), 
                updated_at = NOW()
             WHERE id = $7 AND organization_id = $8 RETURNING *`,
            [
                name || null,
                trigger_keyword ? trigger_keyword.toUpperCase() : null,
                trigger_type || null,
                nodes ? JSON.stringify(nodes) : null,
                edges ? JSON.stringify(edges) : null,
                is_active !== undefined ? is_active : null,
                id,
                organization_id
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Flow not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/flows/:id
export const deleteFlow = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        await pool.query('DELETE FROM chat_flows WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "Flow deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

