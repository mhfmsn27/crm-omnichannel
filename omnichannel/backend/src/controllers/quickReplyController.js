import pool from '../config/db.js';

// GET /api/app/quick-replies
export const getQuickReplies = async (req, res) => {
    const { organization_id, role, id: userId } = req.user;
    try {
        const { type } = req.query;

        // Base query with creator name
        let query = `
            SELECT qr.*, u.name as creator_name 
            FROM quick_replies qr
            LEFT JOIN users u ON qr.user_id = u.id
            WHERE qr.organization_id = $1
        `;
        const params = [organization_id];
        let paramIdx = 2;

        // All roles should see all quick replies for the organization.
        // The frontend handles edit/delete permissions based on ownership.
        
        // Type Filter
        if (type) {
            query += ` AND qr.type = $${paramIdx}`;
            params.push(type);
            paramIdx++;
        }

        query += ' ORDER BY qr.shortcut ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/quick-replies
export const createQuickReply = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { shortcut, content, media_url, type } = req.body;

    if (!shortcut || shortcut.length < 2 || !/^[a-z0-9_ \-]+$/.test(shortcut.toLowerCase())) {
        return res.status(400).json({ error: "Shortcut must be min 2 chars and contain only letters, numbers, spaces, underscores or hyphens." });
    }
    if (!content) return res.status(400).json({ error: "Content is required" });

    try {
        // Always assign creator (user_id)
        const result = await pool.query(
            `INSERT INTO quick_replies (organization_id, shortcut, content, media_url, type, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [organization_id, shortcut.toLowerCase(), content, media_url || null, type || 'quick_reply', userId]
        );

        // Fetch creator name for immediate frontend update (though usually strictly needed for list view)
        // We can just return the row, frontend knows 'who' created it (current user)
        res.status(201).json({ ...result.rows[0], creator_name: 'You' });

    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Shortcut already exists for this organization" });
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/quick-replies/:id
export const updateQuickReply = async (req, res) => {
    const { id } = req.params;
    const { organization_id, role, id: userId } = req.user;
    const { shortcut, content, media_url } = req.body;

    if (shortcut && (shortcut.length < 2 || !/^[a-z0-9_ \-]+$/.test(shortcut.toLowerCase()))) {
        return res.status(400).json({ error: "Shortcut must be min 2 chars and contain only letters, numbers, spaces, underscores or hyphens." });
    }

    try {
        // Permission Check: Agents can only update THEIR OWN
        let query = `UPDATE quick_replies SET shortcut = $1, content = $2, media_url = $3 WHERE id = $4 AND organization_id = $5`;
        const params = [shortcut.toLowerCase(), content, media_url || null, id, organization_id];
        let paramIdx = 6;

        if (['agent', 'super_agent'].includes(role)) {
            query += ` AND user_id = $${paramIdx}`;
            params.push(userId);
        }

        query += ' RETURNING *';

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ error: "Template not found or permission denied" });

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Shortcut already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/quick-replies/:id
export const deleteQuickReply = async (req, res) => {
    const { id } = req.params;
    const { organization_id, role, id: userId } = req.user;

    try {
        let query = 'DELETE FROM quick_replies WHERE id = $1 AND organization_id = $2';
        const params = [id, organization_id];
        let paramIdx = 3;

        if (['agent', 'super_agent'].includes(role)) {
            query += ` AND user_id = $${paramIdx}`;
            params.push(userId);
        }

        query += ' RETURNING id';

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(404).json({ error: "Template not found or permission denied" });

        res.json({ message: "Template deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
