import pool from '../config/db.js';

// GET /api/app/labels
export const getLabels = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const query = `
            SELECT l.*, COUNT(cl.contact_id) as contact_count
            FROM labels l
            LEFT JOIN contact_labels cl ON l.id = cl.label_id
            WHERE l.organization_id = $1
            GROUP BY l.id
            ORDER BY l.name ASC
        `;
        const result = await pool.query(query, [organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/labels
export const createLabel = async (req, res) => {
    const { organization_id } = req.user;
    const { name, color } = req.body;

    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const result = await pool.query(
            `INSERT INTO labels (organization_id, name, color) 
             VALUES ($1, $2, $3) RETURNING *`,
            [organization_id, name, color || '#6366F1']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Label name already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/labels/:id
export const updateLabel = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, color } = req.body;

    try {
        const result = await pool.query(
            `UPDATE labels SET name = $1, color = $2 
             WHERE id = $3 AND organization_id = $4 RETURNING *`,
            [name, color, id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Label not found' });
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Label name already exists' });
        }
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/labels/:id
export const deleteLabel = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const result = await pool.query(
            'DELETE FROM labels WHERE id = $1 AND organization_id = $2 RETURNING id',
            [id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Label not found' });
        res.json({ message: 'Label deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
