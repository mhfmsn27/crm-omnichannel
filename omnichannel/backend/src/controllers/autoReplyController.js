import pool from '../config/db.js';

// --- KEYWORD RULES ---

// GET /api/app/auto-reply/rules
export const getRules = async (req, res) => {
    const { organization_id } = req.user;
    const { parent_id } = req.query;

    try {
        const query = parent_id
            ? 'SELECT * FROM keyword_replies WHERE organization_id = $1 AND parent_id = $2 ORDER BY keyword ASC'
            : 'SELECT * FROM keyword_replies WHERE organization_id = $1 AND parent_id IS NULL ORDER BY keyword ASC';

        const params = parent_id ? [organization_id, parent_id] : [organization_id];
        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/auto-reply/rules
export const createRule = async (req, res) => {
    const { organization_id } = req.user;
    const { parent_id, keyword, match_type, response_content, media_url } = req.body;

    // VALIDATION
    if (!keyword || keyword.length > 255) return res.status(400).json({ error: "Keyword invalid / too long" });
    if (response_content && response_content.length > 2000) return res.status(400).json({ error: "Response too long (max 2000 chars)" });

    try {
        const result = await pool.query(
            `INSERT INTO keyword_replies (organization_id, parent_id, keyword, match_type, response_content, media_url, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, true)
             RETURNING *`,
            [organization_id, parent_id || null, keyword, match_type || 'exact', response_content, media_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/auto-reply/rules/:id
export const updateRule = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { keyword, match_type, response_content, media_url, is_active } = req.body;

    // VALIDATION
    if (!keyword || keyword.length > 255) return res.status(400).json({ error: "Keyword invalid / too long" });
    if (response_content && response_content.length > 2000) return res.status(400).json({ error: "Response too long (max 2000 chars)" });

    try {
        const result = await pool.query(
            `UPDATE keyword_replies 
             SET keyword = $1, match_type = $2, response_content = $3, media_url = $4, is_active = $5, updated_at = NOW()
             WHERE id = $6 AND organization_id = $7
             RETURNING *`,
            [keyword, match_type, response_content, media_url, is_active, id, organization_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Rule not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/auto-reply/rules/:id
export const deleteRule = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query('DELETE FROM keyword_replies WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "Rule deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- GENERAL CONFIG (Business Hours & Welcome) ---

// GET /api/app/auto-reply/general
export const getGeneralConfig = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // For now, we grab the first bot's config or global one
        const result = await pool.query(
            'SELECT id, auto_reply_config FROM chatbot_settings WHERE organization_id = $1 ORDER BY is_active DESC LIMIT 1',
            [organization_id]
        );

        if (result.rows.length > 0) {
            res.json({ id: result.rows[0].id, config: result.rows[0].auto_reply_config });
        } else {
            res.json({ id: null, config: {} });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/auto-reply/general
export const updateGeneralConfig = async (req, res) => {
    const { organization_id } = req.user;
    const { config } = req.body;

    try {
        // Update ALL bots for this org for simplicity in this version
        // Or create a default bot entry if none exists
        const check = await pool.query('SELECT id FROM chatbot_settings WHERE organization_id = $1', [organization_id]);

        if (check.rows.length > 0) {
            await pool.query(
                'UPDATE chatbot_settings SET auto_reply_config = $1, updated_at = NOW() WHERE organization_id = $2',
                [config, organization_id]
            );
        } else {
            await pool.query(
                `INSERT INTO chatbot_settings (organization_id, name, is_active, auto_reply_config) 
                 VALUES ($1, 'Default Bot', true, $2)`,
                [organization_id, config]
            );
        }

        res.json({ message: "Configuration saved" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};