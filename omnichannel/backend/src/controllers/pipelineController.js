import pool from '../config/db.js';

// --- AUTO MIGRATION FOR PIPELINE ---
export const ensurePipelineSchema = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pipelines (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                icon VARCHAR(50),
                color VARCHAR(20),
                is_default BOOLEAN DEFAULT false,
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS pipeline_stages (
                id SERIAL PRIMARY KEY,
                pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                color VARCHAR(20),
                position INTEGER NOT NULL,
                is_closed_stage BOOLEAN DEFAULT false,
                automation_actions JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Indexes for quick optimization
            CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(organization_id);
            CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON pipeline_stages(pipeline_id);

            -- Modify Conversations Table
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pipeline_id INTEGER REFERENCES pipelines(id) ON DELETE SET NULL;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pipeline_stage_id INTEGER REFERENCES pipeline_stages(id) ON DELETE SET NULL;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS value DECIMAL(12, 2) DEFAULT 0;
            
            CREATE INDEX IF NOT EXISTS idx_conversations_pipeline ON conversations(pipeline_id, pipeline_stage_id);

            CREATE TABLE IF NOT EXISTS pipeline_stage_history (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
                from_stage_id INTEGER REFERENCES pipeline_stages(id) ON DELETE SET NULL,
                to_stage_id INTEGER NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
                changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                duration_seconds INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_pipeline_history_conversation ON pipeline_stage_history(conversation_id);
        `);
        console.log("[Pipeline] Schema matched.");
    } catch (e) {
        console.warn("[Pipeline] Schema warning:", e.message);
    }
};

// Run schema check immediately
ensurePipelineSchema();

// --- CONTROLLER FUNCTIONS ---

// Get all pipelines for org
export const getPipelines = async (req, res) => {
    const orgId = req.user.organization_id;
    try {
        // Fetch pipelines with their stages
        const pipelinesRes = await pool.query(
            "SELECT * FROM pipelines WHERE organization_id = $1 ORDER BY created_at DESC",
            [orgId]
        );
        const pipelines = pipelinesRes.rows;

        // Fetch stages for these pipelines
        const pipelineIds = pipelines.map(p => p.id);
        let stagesMap = {};

        if (pipelineIds.length > 0) {
            const stagesRes = await pool.query(
                "SELECT * FROM pipeline_stages WHERE pipeline_id = ANY($1) ORDER BY position ASC",
                [pipelineIds]
            );
            stagesRes.rows.forEach(stage => {
                if (!stagesMap[stage.pipeline_id]) stagesMap[stage.pipeline_id] = [];
                stagesMap[stage.pipeline_id].push(stage);
            });
        }

        const result = pipelines.map(p => ({
            ...p,
            stages: stagesMap[p.id] || []
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create new pipeline
export const createPipeline = async (req, res) => {
    const orgId = req.user.organization_id;
    const userId = req.user.id;
    const { name, icon, color, stages } = req.body; // stages is array of {name, color}

    try {
        await pool.query('BEGIN');

        // Create Pipeline
        const pipeRes = await pool.query(
            "INSERT INTO pipelines (organization_id, name, icon, color, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [orgId, name, icon, color, userId]
        );
        const pipeline = pipeRes.rows[0];

        // Create Stages
        if (stages && stages.length > 0) {
            for (let i = 0; i < stages.length; i++) {
                const s = stages[i];
                await pool.query(
                    "INSERT INTO pipeline_stages (pipeline_id, name, color, position) VALUES ($1, $2, $3, $4)",
                    [pipeline.id, s.name, s.color, i] // Use index as position
                );
            }
        }

        await pool.query('COMMIT');
        res.status(201).json(pipeline);
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
};

// Get Single Pipeline Details (with board data if needed)
export const getPipelineDetail = async (req, res) => {
    const { id } = req.params;
    const orgId = req.user.organization_id;
    try {
        const pipeRes = await pool.query("SELECT * FROM pipelines WHERE id = $1 AND organization_id = $2", [id, orgId]);
        if (pipeRes.rows.length === 0) return res.status(404).json({ error: "Pipeline not found" });

        const stagesRes = await pool.query("SELECT * FROM pipeline_stages WHERE pipeline_id = $1 ORDER BY position ASC", [id]);

        res.json({
            ...pipeRes.rows[0],
            stages: stagesRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Pipeline Metadata
export const updatePipeline = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, icon, color, is_active } = req.body;
    try {
        const result = await pool.query(
            "UPDATE pipelines SET name = COALESCE($1, name), icon = COALESCE($2, icon), color = COALESCE($3, color), is_active = COALESCE($4, is_active), updated_at = NOW() WHERE id = $5 AND organization_id = $6 RETURNING *",
            [name, icon, color, is_active, id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Pipeline not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deletePipeline = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const result = await pool.query("DELETE FROM pipelines WHERE id = $1 AND organization_id = $2 RETURNING id", [id, organization_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Pipeline not found" });
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- STAGE MANAGEMENT ---

export const addStage = async (req, res) => {
    const { pipelineId } = req.params;
    const { name, color, position } = req.body;
    try {
        const result = await pool.query(
            "INSERT INTO pipeline_stages (pipeline_id, name, color, position) VALUES ($1, $2, $3, $4) RETURNING *",
            [pipelineId, name, color, position || 999]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateStage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, color } = req.body;
    try {
        const result = await pool.query(
            "UPDATE pipeline_stages SET name = COALESCE($1, name), color = COALESCE($2, color), updated_at = NOW() WHERE id = $3 AND pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = $4) RETURNING *",
            [name, color, id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Stage not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteStage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        // SECURITY CHECK: Ensure stage belongs to user's organization
        const check = await pool.query(
            `SELECT ps.id FROM pipeline_stages ps 
             JOIN pipelines p ON ps.pipeline_id = p.id 
             WHERE ps.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: "Stage not found or access denied" });

        // Option: Move leads to another stage? For now just cascade delete or set null (DB handles CASCADE)
        await pool.query("DELETE FROM pipeline_stages WHERE id = $1", [id]);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const reorderStages = async (req, res) => {
    const { stages } = req.body; // Array of {id, position}
    const { organization_id } = req.user;
    try {
        await pool.query('BEGIN');
        for (const s of stages) {
            await pool.query(
                "UPDATE pipeline_stages SET position = $1 WHERE id = $2 AND pipeline_id IN (SELECT id FROM pipelines WHERE organization_id = $3)",
                [s.position, s.id, organization_id]
            );
        }
        await pool.query('COMMIT');
        res.json({ message: "Reordered" });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
};

// --- CONVERSATION & BOARD LOGIC ---

// Assign or Move Conversation
export const setConversationStage = async (req, res) => {
    const { conversationId } = req.params;
    const { pipelineId, stageId } = req.body;
    const userId = req.user.id;

    try {
        const currentRes = await pool.query("SELECT pipeline_stage_id FROM conversations WHERE id = $1", [conversationId]);
        const fromStageId = currentRes.rows[0]?.pipeline_stage_id;

        await pool.query(
            "UPDATE conversations SET pipeline_id = $1, pipeline_stage_id = $2, stage_changed_at = NOW() WHERE id = $3",
            [pipelineId, stageId, conversationId]
        );

        // Record History
        if (pipelineId && stageId) {
            await pool.query(
                "INSERT INTO pipeline_stage_history (conversation_id, pipeline_id, from_stage_id, to_stage_id, changed_by) VALUES ($1, $2, $3, $4, $5)",
                [conversationId, pipelineId, fromStageId, stageId, userId]
            );
        }

        // Emit Socket Event (Optional for later)
        if (req.io) {
            req.io.to(`org_${req.user.organization_id}`).emit('pipeline_update', { conversationId, pipelineId, stageId });
        }

        res.json({ message: "Updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Kanban Board Data
export const getBoardData = async (req, res) => {
    const { pipelineId } = req.params;
    const orgId = req.user.organization_id;

    try {
        // 1. Get Stages
        const stagesRes = await pool.query(
            "SELECT * FROM pipeline_stages WHERE pipeline_id = $1 ORDER BY position ASC",
            [pipelineId]
        );
        const stages = stagesRes.rows;

        // 2. Get Conversations for this pipeline
        // Limit to recent or active? For now fetch all in pipeline.
        // Also join with contacts to get name, pic.
        const convsRes = await pool.query(`
            SELECT c.id, c.contact_id, c.pipeline_stage_id, c.unread_count, c.last_message, c.last_message_at,
                   c.value, c.deal_probability, c.deal_close_date, c.deal_note,
                   ct.name as contact_name, ct.phone_number as phone, ct.profile_pic_url,
                   u.name as agent_name
            FROM conversations c
            JOIN contacts ct ON c.contact_id = ct.id
            LEFT JOIN users u ON c.assigned_to_agent_id = u.id
            WHERE c.pipeline_id = $1 AND c.organization_id = $2
            ORDER BY c.last_message_at DESC
        `, [pipelineId, orgId]);

        const conversations = convsRes.rows;

        // Group by stage
        const boardData = stages.map(stage => ({
            ...stage,
            items: conversations.filter(c => c.pipeline_stage_id === stage.id)
        }));

        res.json(boardData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update Deal Details (probability, close date, note, value)
export const updateDealDetails = async (req, res) => {
    const { conversationId } = req.params;
    const { organization_id } = req.user;
    const { deal_probability, deal_close_date, deal_note, value } = req.body;

    const sets = [];
    const params = [conversationId, organization_id];
    let i = 3;

    if (deal_probability !== undefined) { sets.push(`deal_probability = $${i++}`); params.push(deal_probability === '' ? null : Number(deal_probability)); }
    if (deal_close_date !== undefined) { sets.push(`deal_close_date = $${i++}`); params.push(deal_close_date || null); }
    if (deal_note !== undefined) { sets.push(`deal_note = $${i++}`); params.push(deal_note); }
    if (value !== undefined) { sets.push(`value = $${i++}`); params.push(value === '' ? null : Number(value)); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    try {
        const result = await pool.query(
            `UPDATE conversations SET ${sets.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING id, deal_probability, deal_close_date, deal_note, value`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// Export Pipeline Data (CSV)
export const exportPipelineData = async (req, res) => {
    const { id } = req.params; // Pipeline ID
    const orgId = req.user.organization_id;

    try {
        // Fetch all conversations in this pipeline
        const query = `
            SELECT 
                ct.name as contact_name, 
                ct.phone_number, 
                ps.name as stage_name, 
                c.value, 
                u.name as agent_name, 
                c.last_message_at
            FROM conversations c
            JOIN contacts ct ON c.contact_id = ct.id
            JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
            LEFT JOIN users u ON c.assigned_to_agent_id = u.id
            WHERE c.pipeline_id = $1 AND c.organization_id = $2
            ORDER BY ps.position ASC, c.last_message_at DESC
        `;

        const result = await pool.query(query, [id, orgId]);
        const rows = result.rows;

        // Convert to CSV
        const header = ["Contact Name", "Phone Number", "Stage", "Value", "Assigned Agent", "Last Updated"];
        const csvRows = [header.join(",")];

        for (const row of rows) {
            const line = [
                `"${(row.contact_name || "").replace(/"/g, '""')}"`, // Escape quotes
                `"${(row.phone_number || "")}"`,
                `"${(row.stage_name || "")}"`,
                `"${(row.value || 0)}"`,
                `"${(row.agent_name || "Unassigned")}"`,
                `"${(row.last_message_at ? new Date(row.last_message_at).toISOString() : "")}"`
            ];
            csvRows.push(line.join(","));
        }

        const csvString = csvRows.join("\n");

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="pipeline_export_${id}.csv"`);
        res.send(csvString);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to export CSV" });
    }
};

// GET /api/app/crm/deals?contact_id=... — Deals for Customer 360 Drawer
export const getContactDeals = async (req, res) => {
    const { organization_id } = req.user;
    const { contact_id } = req.query;

    try {
        if (!contact_id) return res.json({ data: [] });

        const result = await pool.query(`
            SELECT c.id, c.pipeline_id, c.pipeline_stage_id, c.value, c.stage_changed_at,
                   p.name as pipeline_name, ps.name as stage_name, ps.color as stage_color
            FROM conversations c
            JOIN pipelines p ON c.pipeline_id = p.id
            JOIN pipeline_stages ps ON c.pipeline_stage_id = ps.id
            WHERE c.organization_id = $1 AND c.contact_id = $2
            ORDER BY c.stage_changed_at DESC NULLS LAST
        `, [organization_id, contact_id]);

        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
