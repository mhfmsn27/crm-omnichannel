import pool from '../config/db.js';
import { qualifyLead } from '../services/messageAnalysisService.js';

// PATCH /api/app/conversations/:id/urgency — manual flag/unflag
export const setUrgency = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { is_urgent } = req.body;
    try {
        const result = await pool.query(
            `UPDATE conversations
             SET is_urgent = $1, urgency_flagged_at = CASE WHEN $1 THEN NOW() ELSE NULL END
             WHERE id = $2 AND organization_id = $3 RETURNING id, is_urgent`,
            [!!is_urgent, id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/conversations/urgent — list urgent open conversations
export const getUrgentConversations = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT c.id, c.ticket_number, c.urgency_score, c.urgency_reason, c.urgency_flagged_at,
                    c.last_message, c.last_message_at, c.channel,
                    ct.name AS contact_name, ct.phone_number AS contact_phone
             FROM conversations c
             LEFT JOIN contacts ct ON ct.id = c.contact_id
             WHERE c.organization_id = $1 AND c.is_urgent = true AND c.status = 'open'
             ORDER BY c.urgency_score DESC, c.urgency_flagged_at DESC
             LIMIT 50`,
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/contacts/leads — contacts with lead scores
export const getLeads = async (req, res) => {
    const { organization_id } = req.user;
    const { status, page = 1, limit = 30 } = req.query;
    try {
        const conditions = ['organization_id = $1', "lead_status != 'unqualified'"];
        const params = [organization_id];
        let idx = 2;
        if (status) { conditions.push(`lead_status = $${idx++}`); params.push(status); }

        const where = conditions.join(' AND ');
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rows, countResult] = await Promise.all([
            pool.query(
                `SELECT id, name, phone_number, email, lead_score, lead_status, lead_qualified_at
                 FROM contacts WHERE ${where}
                 ORDER BY lead_score DESC, lead_qualified_at DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                [...params, parseInt(limit), offset]
            ),
            pool.query(`SELECT COUNT(*) FROM contacts WHERE ${where}`, params)
        ]);

        res.json({ leads: rows.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/app/contacts/:id/lead-status — manual override
export const updateLeadStatus = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { lead_status, lead_score } = req.body;
    const valid = ['unqualified', 'cold', 'warm', 'hot', 'converted'];
    if (lead_status && !valid.includes(lead_status)) return res.status(400).json({ error: 'Invalid status' });
    try {
        const fields = [];
        const params = [];
        let idx = 1;
        if (lead_status !== undefined) { fields.push(`lead_status = $${idx++}`); params.push(lead_status); }
        if (lead_score !== undefined) { fields.push(`lead_score = $${idx++}`); params.push(lead_score); }
        fields.push(`lead_qualified_at = NOW()`);
        params.push(id, organization_id);
        const result = await pool.query(
            `UPDATE contacts SET ${fields.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx} RETURNING id, lead_status, lead_score`,
            params
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/contacts/:id/qualify — trigger re-qualification
export const requalifyContact = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        const result = await qualifyLead(id, organization_id);
        if (!result) return res.status(404).json({ error: 'Contact not found or no messages' });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
