/**
 * Click-to-Call & Telephony Logging Controller
 */
import pool from '../config/db.js';

export const recordCallLog = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const {
        conversation_id,
        contact_id,
        call_type = 'whatsapp_call',
        duration_seconds = 0,
        status = 'completed',
        notes
    } = req.body;

    if (!contact_id) {
        return res.status(400).json({ error: "Contact ID wajib disediakan." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO call_logs 
             (organization_id, conversation_id, contact_id, user_id, call_type, duration_seconds, status, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING *`,
            [organization_id, conversation_id || null, contact_id, userId, call_type, parseInt(duration_seconds) || 0, status, notes || null]
        );

        res.status(201).json({
            success: true,
            message: "Log panggilan telepon berhasil disimpan.",
            data: result.rows[0]
        });

    } catch (err) {
        console.error('[CallLog Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const getCallHistory = async (req, res) => {
    const { organization_id } = req.user;
    const { contact_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT l.*, u.name as caller_name, u.email as caller_email
             FROM call_logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.organization_id = $1 AND l.contact_id = $2
             ORDER BY l.created_at DESC LIMIT 30`,
            [organization_id, contact_id]
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
