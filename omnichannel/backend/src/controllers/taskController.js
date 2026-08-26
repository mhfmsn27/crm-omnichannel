import pool from '../config/db.js';

const STATUS_ORDER = ['open', 'in_progress', 'done', 'cancelled'];

export const getTasks = async (req, res) => {
    const { organization_id, id: userId, role } = req.user;
    const { status, priority, assigned_to, contact_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let where = `t.organization_id = $1`;
        const params = [organization_id];
        let i = 2;

        // Agents only see their own tasks
        if (role === 'agent') {
            where += ` AND (t.assigned_to = $${i} OR t.created_by = $${i})`;
            params.push(userId);
            i++;
        }

        if (status) { where += ` AND t.status = $${i++}`; params.push(status); }
        if (priority) { where += ` AND t.priority = $${i++}`; params.push(priority); }
        if (assigned_to) { where += ` AND t.assigned_to = $${i++}`; params.push(assigned_to); }
        if (contact_id) { where += ` AND t.contact_id = $${i++}`; params.push(contact_id); }

        const result = await pool.query(
            `SELECT t.*,
                u_assigned.name AS assigned_name,
                u_created.name AS created_by_name,
                c.name AS contact_name, c.phone_number AS contact_phone
             FROM tasks t
             LEFT JOIN users u_assigned ON t.assigned_to = u_assigned.id
             LEFT JOIN users u_created ON t.created_by = u_created.id
             LEFT JOIN contacts c ON t.contact_id = c.id
             WHERE ${where}
             ORDER BY
               CASE t.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'done' THEN 3 ELSE 4 END,
               t.due_at ASC NULLS LAST, t.created_at DESC
             LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, offset]
        );

        const countRes = await pool.query(
            `SELECT COUNT(*) FROM tasks t WHERE ${where}`,
            params
        );

        res.json({
            tasks: result.rows,
            total: parseInt(countRes.rows[0].count),
            page: parseInt(page),
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getTaskStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'open') AS open,
                COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
                COUNT(*) FILTER (WHERE status = 'done') AS done,
                COUNT(*) FILTER (WHERE status NOT IN ('done','cancelled') AND due_at < NOW()) AS overdue
             FROM tasks WHERE organization_id = $1`,
            [organization_id]
        );
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createTask = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { title, description, priority = 'normal', due_at, assigned_to, contact_id, conversation_id } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });

    try {
        const result = await pool.query(
            `INSERT INTO tasks (organization_id, title, description, priority, due_at, assigned_to, created_by, contact_id, conversation_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [organization_id, title, description, priority, due_at || null, assigned_to || userId, userId, contact_id || null, conversation_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateTask = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { title, description, status, priority, due_at, assigned_to } = req.body;

    const sets = ['updated_at = NOW()'];
    const params = [id, organization_id];
    let i = 3;

    if (title !== undefined) { sets.push(`title = $${i++}`); params.push(title); }
    if (description !== undefined) { sets.push(`description = $${i++}`); params.push(description); }
    if (priority !== undefined) { sets.push(`priority = $${i++}`); params.push(priority); }
    if (due_at !== undefined) { sets.push(`due_at = $${i++}`); params.push(due_at || null); }
    if (assigned_to !== undefined) { sets.push(`assigned_to = $${i++}`); params.push(assigned_to || null); }
    if (status !== undefined) {
        sets.push(`status = $${i++}`);
        params.push(status);
        if (status === 'done') {
            sets.push(`completed_at = NOW()`);
        } else {
            sets.push(`completed_at = NULL`);
        }
    }

    try {
        const result = await pool.query(
            `UPDATE tasks SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteTask = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        const result = await pool.query(
            `DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
