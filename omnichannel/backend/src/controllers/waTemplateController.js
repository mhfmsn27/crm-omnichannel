import pool from '../config/db.js';

let schemaEnsured = false;
export const ensureWaTemplateSchema = async () => {
    if (schemaEnsured) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wa_template_library (
                id BIGSERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                content TEXT NOT NULL,
                variables JSONB DEFAULT '[]'::jsonb,
                use_count INTEGER DEFAULT 0,
                created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_wa_template_library_org ON wa_template_library(organization_id, category);
            CREATE INDEX IF NOT EXISTS idx_wa_template_library_use ON wa_template_library(organization_id, use_count DESC);
        `);
        schemaEnsured = true;
    } catch (e) {
        console.error('[WaTemplate] ensureWaTemplateSchema error:', e.message);
    }
};

// --- WhatsApp Template Library CRUD ---

export const getTemplates = async (req, res) => {
    const { organization_id } = req.user;
    const { category, search } = req.query;

    try {
        await ensureWaTemplateSchema();
        let query = `
            SELECT t.*, u.name as created_by_name
            FROM wa_template_library t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.organization_id = $1
        `;
        const params = [organization_id];
        let idx = 2;

        if (category) {
            query += ` AND t.category = $${idx}`;
            params.push(category);
            idx++;
        }

        if (search) {
            query += ` AND (t.name ILIKE $${idx} OR t.content ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY t.use_count DESC, t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (e) {
        console.error('[WaTemplate] getTemplates error:', e.message);
        res.json([]);
    }
};

export const createTemplate = async (req, res) => {
    const { organization_id, id: user_id } = req.user;
    const { name, category, content } = req.body;

    if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required' });
    }

    try {
        await ensureWaTemplateSchema();
        // Extract variables from content (e.g., {{name}}, {{order_id}})
        const variables = [];
        const varRegex = /\{\{([^}]+)\}\}/g;
        let match;
        while ((match = varRegex.exec(content)) !== null) {
            if (!variables.includes(match[1].trim())) {
                variables.push(match[1].trim());
            }
        }

        const result = await pool.query(
            `INSERT INTO wa_template_library (organization_id, name, category, content, variables, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [organization_id, name, category || null, content, JSON.stringify(variables), user_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, category, content } = req.body;

    try {
        await ensureWaTemplateSchema();
        // Extract variables from content
        const variables = [];
        if (content) {
            const varRegex = /\{\{([^}]+)\}\}/g;
            let match;
            while ((match = varRegex.exec(content)) !== null) {
                if (!variables.includes(match[1].trim())) {
                    variables.push(match[1].trim());
                }
            }
        }

        const result = await pool.query(
            `UPDATE wa_template_library
             SET name = COALESCE($1, name),
                 category = COALESCE($2, category),
                 content = COALESCE($3, content),
                 variables = COALESCE($4, variables),
                 updated_at = NOW()
             WHERE id = $5 AND organization_id = $6
             RETURNING *`,
            [name, category, content, JSON.stringify(variables), id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        await ensureWaTemplateSchema();
        const result = await pool.query(
            `DELETE FROM wa_template_library WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const useTemplate = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        await ensureWaTemplateSchema();
        const result = await pool.query(
            `UPDATE wa_template_library
             SET use_count = use_count + 1, updated_at = NOW()
             WHERE id = $1 AND organization_id = $2
             RETURNING *`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getCategories = async (req, res) => {
    const { organization_id } = req.user;

    try {
        await ensureWaTemplateSchema();
        const result = await pool.query(
            `SELECT category, COUNT(*) as count
             FROM wa_template_library
             WHERE organization_id = $1 AND category IS NOT NULL
             GROUP BY category
             ORDER BY count DESC`,
            [organization_id]
        );

        res.json(result.rows || []);
    } catch (e) {
        console.error('[WaTemplate] getCategories error:', e.message);
        res.json([]);
    }
};
