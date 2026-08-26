/**
 * Agent Notes Service
 * Manages agent notes on conversations/contacts
 */

import pool from '../config/db.js';

// Note types for categorization
const NOTE_TYPES = ['general', 'action', 'info', 'warning', 'callback'];

export const getNoteTypes = () => NOTE_TYPES;

export const getConversationNotes = async (conversationId) => {
    const query = `
        SELECT
            an.*,
            u.name as created_by_name,
            u.email as created_by_email
        FROM agent_notes an
        LEFT JOIN users u ON an.created_by = u.id
        WHERE an.conversation_id = $1
        ORDER BY an.created_at DESC
    `;
    const result = await pool.query(query, [conversationId]);
    return result.rows;
};

export const getContactNotes = async (contactId) => {
    const query = `
        SELECT
            an.*,
            u.name as created_by_name,
            u.email as created_by_email
        FROM agent_notes an
        LEFT JOIN users u ON an.created_by = u.id
        WHERE an.contact_id = $1
        ORDER BY an.created_at DESC
    `;
    const result = await pool.query(query, [contactId]);
    return result.rows;
};

export const addNote = async (organizationId, data) => {
    const {
        conversation_id,
        contact_id,
        note,
        note_type,
        created_by,
        is_internal = true
    } = data;

    const query = `
        INSERT INTO agent_notes
        (organization_id, conversation_id, contact_id, note, note_type, created_by, is_internal)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `;

    const result = await pool.query(query, [
        organizationId,
        conversation_id || null,
        contact_id || null,
        note,
        note_type || 'general',
        created_by,
        is_internal
    ]);

    return result.rows[0];
};

export const updateNote = async (organizationId, noteId, data) => {
    const { note, note_type, is_internal } = data;

    const updates = [];
    const values = [organizationId, noteId];
    let paramIndex = 3;

    if (note !== undefined) {
        updates.push(`note = $${paramIndex}`);
        values.push(note);
        paramIndex++;
    }
    if (note_type !== undefined) {
        updates.push(`note_type = $${paramIndex}`);
        values.push(note_type);
        paramIndex++;
    }
    if (is_internal !== undefined) {
        updates.push(`is_internal = $${paramIndex}`);
        values.push(is_internal);
        paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE agent_notes
        SET ${updates.join(', ')}
        WHERE organization_id = $1 AND id = $2
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const resolveNote = async (organizationId, noteId, userId) => {
    const query = `
        UPDATE agent_notes
        SET is_resolved = TRUE, updated_at = NOW()
        WHERE organization_id = $1 AND id = $2
        RETURNING *
    `;
    const result = await pool.query(query, [organizationId, noteId]);
    return result.rows[0];
};

export const deleteNote = async (organizationId, noteId) => {
    const query = `
        DELETE FROM agent_notes
        WHERE organization_id = $1 AND id = $2
    `;
    await pool.query(query, [organizationId, noteId]);
};

export const getNotesByOrganization = async (organizationId, filters = {}) => {
    const { conversationId, contactId, resolved } = filters;

    let query = `
        SELECT
            an.*,
            u.name as created_by_name,
            u.email as created_by_email
        FROM agent_notes an
        LEFT JOIN users u ON an.created_by = u.id
        WHERE an.organization_id = $1
    `;
    const params = [organizationId];
    let paramIndex = 2;

    if (conversationId) {
        query += ` AND an.conversation_id = $${paramIndex}`;
        params.push(conversationId);
        paramIndex++;
    }
    if (contactId) {
        query += ` AND an.contact_id = $${paramIndex}`;
        params.push(contactId);
        paramIndex++;
    }
    if (resolved !== undefined) {
        query += ` AND an.is_resolved = $${paramIndex}`;
        params.push(resolved);
        paramIndex++;
    }

    query += ` ORDER BY an.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};