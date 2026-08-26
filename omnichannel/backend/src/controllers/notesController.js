/**
 * Notes Controller - Agent Notes for conversations
 */
import pool from '../config/db.js';
import { checkPlanFeature } from '../services/featureGateService.js';

/**
 * Get notes for conversation
 */
export const getNotes = async (req, res) => {
    const { organization_id } = req.user;
    const { conversationId } = req.params;

    try {
        const result = await pool.query(`
            SELECT n.*, u.name as created_by_name
            FROM agent_notes n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.conversation_id = $1 AND n.organization_id = $2
            ORDER BY n.created_at DESC
        `, [conversationId, organization_id]);

        res.json(result.rows);
    } catch (err) {
        console.error('[Notes] Get error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Add note to conversation
 */
export const addNote = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { conversationId } = req.params;
    const { note, note_type, is_internal } = req.body;

    if (!note?.trim()) {
        return res.status(400).json({ error: 'Note text required' });
    }

    try {
        // Get contact_id from conversation if not provided
        let contactId = req.body.contact_id;
        if (!contactId) {
            const conv = await pool.query('SELECT contact_id FROM conversations WHERE id = $1', [conversationId]);
            contactId = conv.rows[0]?.contact_id;
        }

        const result = await pool.query(`
            INSERT INTO agent_notes
            (organization_id, conversation_id, contact_id, note, note_type, created_by, is_internal)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [organization_id, conversationId, contactId, note, note_type || 'general', userId, is_internal !== false]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('[Notes] Add error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete note
 */
export const deleteNote = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { noteId } = req.params;

    try {
        await pool.query(
            'DELETE FROM agent_notes WHERE id = $1 AND organization_id = $2',
            [noteId, organization_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get notes for contact (all conversations)
 */
export const getContactNotes = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;

    try {
        const result = await pool.query(`
            SELECT n.*, u.name as created_by_name
            FROM agent_notes n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.contact_id = $1
            ORDER BY n.created_at DESC
        `, [contactId]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
