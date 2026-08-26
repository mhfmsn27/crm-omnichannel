import pool from '../config/db.js';

// --- SEQUENCES (TEMPLATES) ---

// GET /api/app/followups/sequences
export const getSequences = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM followup_sequences WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/followups/sequences
export const createSequence = async (req, res) => {
    const { organization_id } = req.user;
    const { name, steps } = req.body; // steps: [{ delay_hours: 24, message: "" }]

    if (!name || !steps || !Array.isArray(steps)) {
        return res.status(400).json({ error: "Invalid data" });
    }

    try {
        const result = await pool.query(
            'INSERT INTO followup_sequences (organization_id, name, steps) VALUES ($1, $2, $3) RETURNING *',
            [organization_id, name, JSON.stringify(steps)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/followups/sequences/:id
export const updateSequence = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, steps, is_active } = req.body;

    try {
        const result = await pool.query(
            `UPDATE followup_sequences 
             SET name = $1, steps = $2, is_active = $3, updated_at = NOW() 
             WHERE id = $4 AND organization_id = $5 RETURNING *`,
            [name, JSON.stringify(steps), is_active, id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/followups/sequences/:id
export const deleteSequence = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        await pool.query('DELETE FROM followup_sequences WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: GET /api/app/followups/sequences/:id/report
export const getSequenceReport = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        // Fetch Active Instances for this sequence
        const result = await pool.query(`
            SELECT fi.id, fi.current_step_index, fi.next_run_at, fi.created_at,
                   c.name as contact_name, c.phone_number
            FROM followup_instances fi
            JOIN contacts c ON fi.contact_id = c.id
            WHERE fi.sequence_id = $1 
              AND fi.organization_id = $2 
              AND fi.status = 'active'
            ORDER BY fi.next_run_at ASC
        `, [id, organization_id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- INSTANCES (RUNNING FOLLOW-UPS) ---

// POST /api/app/inbox/:conversationId/followup/start
export const startFollowup = async (req, res) => {
    const { conversationId } = req.params;
    const { sequence_id } = req.body;
    const { organization_id } = req.user;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Conversation Details
        const convRes = await client.query(
            `SELECT contact_id, whatsapp_session_id FROM conversations WHERE id = $1 AND organization_id = $2`,
            [conversationId, organization_id]
        );
        if (convRes.rows.length === 0) throw new Error("Conversation not found");
        const { contact_id, whatsapp_session_id } = convRes.rows[0];

        // 2. Get Sequence Details
        const seqRes = await client.query(
            'SELECT steps FROM followup_sequences WHERE id = $1 AND organization_id = $2',
            [sequence_id, organization_id]
        );
        if (seqRes.rows.length === 0) throw new Error("Sequence not found");
        const steps = seqRes.rows[0].steps;
        
        if (!steps || steps.length === 0) throw new Error("Sequence has no steps");

        // 3. Get Last Message ID (Checkpoint)
        const msgRes = await client.query(
            'SELECT id FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1',
            [conversationId]
        );
        const lastMsgId = msgRes.rows[0]?.id || 0;

        // 4. Calculate Next Run (Step 0)
        const firstDelay = parseFloat(steps[0].delay_hours);
        const nextRun = new Date();
        nextRun.setHours(nextRun.getHours() + firstDelay);

        // 5. Create Instance (Cancel existing active ones for this contact first)
        await client.query(
            `UPDATE followup_instances SET status = 'cancelled' 
             WHERE contact_id = $1 AND organization_id = $2 AND status = 'active'`,
            [contact_id, organization_id]
        );

        const insertRes = await client.query(
            `INSERT INTO followup_instances 
             (organization_id, contact_id, whatsapp_session_id, sequence_id, current_step_index, next_run_at, last_check_message_id, status)
             VALUES ($1, $2, $3, $4, 0, $5, $6, 'active') RETURNING *`,
            [organization_id, contact_id, whatsapp_session_id, sequence_id, nextRun, lastMsgId]
        );

        await client.query('COMMIT');
        res.status(201).json(insertRes.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/app/inbox/:conversationId/followup/stop
export const stopFollowup = async (req, res) => {
    const { conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        // Find contact ID from conversation
        const convRes = await pool.query('SELECT contact_id FROM conversations WHERE id = $1', [conversationId]);
        if (convRes.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });
        const contactId = convRes.rows[0].contact_id;

        await pool.query(
            `UPDATE followup_instances SET status = 'cancelled' 
             WHERE contact_id = $1 AND organization_id = $2 AND status = 'active'`,
            [contactId, organization_id]
        );
        
        res.json({ message: "Follow-up stopped" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: DELETE /api/app/followups/instances/:id (Stop specific instance from Report)
export const deleteInstance = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    
    try {
        await pool.query(
            "UPDATE followup_instances SET status = 'cancelled' WHERE id = $1 AND organization_id = $2",
            [id, organization_id]
        );
        res.json({ message: "Instance cancelled" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/inbox/:conversationId/followup/status
export const getFollowupStatus = async (req, res) => {
    const { conversationId } = req.params;
    try {
        const convRes = await pool.query('SELECT contact_id FROM conversations WHERE id = $1', [conversationId]);
        if (convRes.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });
        
        const result = await pool.query(
            `SELECT fi.*, fs.name as sequence_name, fs.steps 
             FROM followup_instances fi
             JOIN followup_sequences fs ON fi.sequence_id = fs.id
             WHERE fi.contact_id = $1 AND fi.status = 'active'
             ORDER BY fi.created_at DESC LIMIT 1`,
            [convRes.rows[0].contact_id]
        );
        
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
