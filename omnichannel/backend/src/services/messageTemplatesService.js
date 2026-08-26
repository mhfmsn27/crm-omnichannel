/**
 * Message Templates Service
 * Manages reusable message templates with buttons and CTAs
 */

import pool from '../config/db.js';

// Template types
const TEMPLATE_TYPES = [
    { value: 'text', label: 'Text Only' },
    { value: 'image', label: 'Image + Text' },
    { value: 'button', label: 'With Buttons' },
    { value: 'cta', label: 'Call to Action' },
    { value: 'carousel', label: 'Carousel' }
];

export const getTemplateTypes = () => TEMPLATE_TYPES;

export const getTemplates = async (organizationId, type = null) => {
    let query = `
        SELECT
            mt.*,
            u.name as created_by_name
        FROM message_templates mt
        LEFT JOIN users u ON mt.created_by = u.id
        WHERE mt.organization_id = $1
    `;
    const params = [organizationId];

    if (type) {
        query += ` AND mt.template_type = $2`;
        params.push(type);
    }

    query += ` ORDER BY mt.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};

export const createTemplate = async (organizationId, userId, data) => {
    const {
        name,
        template_type,
        title,
        description,
        image_url,
        buttons,
        cta_url,
        cta_text
    } = data;

    const query = `
        INSERT INTO message_templates
        (organization_id, name, template_type, title, description, image_url, buttons, cta_url, cta_text, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;

    const result = await pool.query(query, [
        organizationId,
        name,
        template_type,
        title || null,
        description || null,
        image_url || null,
        JSON.stringify(buttons || []),
        cta_url || null,
        cta_text || null,
        userId
    ]);

    return result.rows[0];
};

export const updateTemplate = async (organizationId, id, data) => {
    const {
        name,
        title,
        description,
        image_url,
        buttons,
        cta_url,
        cta_text,
        is_active
    } = data;

    const updates = [];
    const values = [organizationId, id];
    let paramIndex = 3;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
    }
    if (title !== undefined) {
        updates.push(`title = $${paramIndex}`);
        values.push(title);
        paramIndex++;
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        values.push(description);
        paramIndex++;
    }
    if (image_url !== undefined) {
        updates.push(`image_url = $${paramIndex}`);
        values.push(image_url);
        paramIndex++;
    }
    if (buttons !== undefined) {
        updates.push(`buttons = $${paramIndex}`);
        values.push(JSON.stringify(buttons));
        paramIndex++;
    }
    if (cta_url !== undefined) {
        updates.push(`cta_url = $${paramIndex}`);
        values.push(cta_url);
        paramIndex++;
    }
    if (cta_text !== undefined) {
        updates.push(`cta_text = $${paramIndex}`);
        values.push(cta_text);
        paramIndex++;
    }
    if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(is_active);
        paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE message_templates
        SET ${updates.join(', ')}
        WHERE organization_id = $1 AND id = $2
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const deleteTemplate = async (organizationId, id) => {
    const query = `
        DELETE FROM message_templates
        WHERE organization_id = $1 AND id = $2
    `;
    await pool.query(query, [organizationId, id]);
};

export const getTemplateById = async (organizationId, id) => {
    const query = `
        SELECT
            mt.*,
            u.name as created_by_name
        FROM message_templates mt
        LEFT JOIN users u ON mt.created_by = u.id
        WHERE mt.organization_id = $1 AND mt.id = $2
    `;
    const result = await pool.query(query, [organizationId, id]);
    return result.rows[0];
};