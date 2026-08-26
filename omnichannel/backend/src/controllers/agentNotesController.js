/**
 * Agent Notes Controller
 * Manage internal notes on conversations
 */

import pool from '../config/db.js';

export const getNotes = async (req, res) => {
    const { organization_id } = req.user;
    const { conversationId } = req.params;

    try {
        const result = await pool.query(
            `SELECT an.*, u.name as created_by_name
             FROM agent_notes an
             LEFT JOIN users u ON an.created_by = u.id
             WHERE an.conversation_id = $1 AND an.organization_id = $2
             ORDER BY an.created_at DESC`,
            [conversationId, organization_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('[AgentNotes] Get error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const addNote = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO agent_notes (organization_id, conversation_id, created_by, note)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [organization_id, conversationId, userId, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[AgentNotes] Add error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateNote = async (req, res) => {
    const { organization_id } = req.user;
    const { noteId } = req.params;
    const { content } = req.body;

    try {
        const result = await pool.query(
            `UPDATE agent_notes
             SET note = $1, updated_at = NOW()
             WHERE id = $2 AND organization_id = $3
             RETURNING *`,
            [content, noteId, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[AgentNotes] Update error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const resolveNote = async (req, res) => {
    const { organization_id } = req.user;
    const { noteId } = req.params;

    try {
        const result = await pool.query(
            `UPDATE agent_notes
             SET is_resolved = true, resolved_at = NOW()
             WHERE id = $1 AND organization_id = $2
             RETURNING *`,
            [noteId, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[AgentNotes] Resolve error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteNote = async (req, res) => {
    const { organization_id } = req.user;
    const { noteId } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM agent_notes WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [noteId, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({ message: 'Note deleted' });
    } catch (error) {
        console.error('[AgentNotes] Delete error:', error);
        res.status(500).json({ error: error.message });
    }
};
