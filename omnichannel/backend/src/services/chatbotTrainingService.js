/**
 * Chatbot Training Service
 * Manages chatbot training data (Q&A, keywords, categories)
 */

import pool from '../config/db.js';

export const getTrainingData = async (organizationId, filters = {}) => {
    const { type, active } = filters;

    let query = `
        SELECT * FROM chatbot_training_data
        WHERE organization_id = $1
    `;
    const params = [organizationId];
    let paramIndex = 2;

    if (type) {
        query += ` AND data_type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
    }

    if (active !== undefined) {
        query += ` AND is_active = $${paramIndex}`;
        params.push(active);
        paramIndex++;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
};

export const addTrainingData = async (organizationId, userId, data) => {
    const { data_type, question, answer, keywords, category, confidence_score } = data;

    const query = `
        INSERT INTO chatbot_training_data
        (organization_id, data_type, question, answer, keywords, category, confidence_score, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `;

    const result = await pool.query(query, [
        organizationId,
        data_type || 'faq',
        question,
        answer,
        keywords || null,
        category || null,
        confidence_score || 80,
        userId
    ]);

    return result.rows[0];
};

export const updateTrainingData = async (organizationId, id, data) => {
    const { question, answer, keywords, category, is_active, confidence_score } = data;

    const updates = [];
    const values = [organizationId, id];
    let paramIndex = 3;

    if (question !== undefined) {
        updates.push(`question = $${paramIndex}`);
        values.push(question);
        paramIndex++;
    }
    if (answer !== undefined) {
        updates.push(`answer = $${paramIndex}`);
        values.push(answer);
        paramIndex++;
    }
    if (keywords !== undefined) {
        updates.push(`keywords = $${paramIndex}`);
        values.push(keywords);
        paramIndex++;
    }
    if (category !== undefined) {
        updates.push(`category = $${paramIndex}`);
        values.push(category);
        paramIndex++;
    }
    if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex}`);
        values.push(is_active);
        paramIndex++;
    }
    if (confidence_score !== undefined) {
        updates.push(`confidence_score = $${paramIndex}`);
        values.push(confidence_score);
        paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE chatbot_training_data
        SET ${updates.join(', ')}
        WHERE organization_id = $1 AND id = $2
        RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const deleteTrainingData = async (organizationId, id) => {
    const query = `
        DELETE FROM chatbot_training_data
        WHERE organization_id = $1 AND id = $2
    `;
    await pool.query(query, [organizationId, id]);
};

export const bulkImport = async (organizationId, userId, items) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const imported = [];
        const errors = [];
        let counter = 0;

        for (const item of items) {
            counter++;
            try {
                const { data_type, question, answer, keywords, category, confidence_score } = item;

                if (!question || !answer) {
                    errors.push({ row: counter, error: 'Question or answer missing' });
                    continue;
                }

                const result = await client.query(`
                    INSERT INTO chatbot_training_data
                    (organization_id, data_type, question, answer, keywords, category, confidence_score, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    organizationId,
                    data_type || 'faq',
                    question,
                    answer,
                    keywords || null,
                    category || null,
                    confidence_score || 80,
                    userId
                ]);

                imported.push({ id: result.rows[0].id, question });
            } catch (err) {
                errors.push({ row: counter, error: err.message });
            }
        }

        await client.query('COMMIT');

        return {
            total: items.length,
            imported: imported.length,
            errors: errors.length,
            details: errors
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getTrainingStats = async (organizationId) => {
    const query = `
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN data_type = 'faq' THEN 1 END) as faq_count,
            COUNT(CASE WHEN data_type = 'keyword' THEN 1 END) as keyword_count,
            COUNT(CASE WHEN data_type = 'intent' THEN 1 END) as intent_count,
            COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count,
            COUNT(CASE WHEN is_active = FALSE THEN 1 END) as inactive_count
        FROM chatbot_training_data
        WHERE organization_id = $1
    `;

    const result = await pool.query(query, [organizationId]);
    return result.rows[0];
};

export const getTrainingContext = async (organizationId, message) => {
    // Simple keyword matching for testing
    const query = `
        SELECT * FROM chatbot_training_data
        WHERE organization_id = $1 AND is_active = TRUE
        ORDER BY confidence_score DESC
        LIMIT 5
    `;

    const result = await pool.query(query, [organizationId]);

    // Simple matching based on keywords or question content
    const matchedItems = result.rows.filter(item => {
        if (item.keywords) {
            const keywords = Array.isArray(item.keywords) ? item.keywords : [];
            return keywords.some(kw => message.toLowerCase().includes(kw.toLowerCase()));
        }
        if (item.question) {
            return message.toLowerCase().includes(item.question.toLowerCase().substring(0, 10));
        }
        return false;
    });

    return {
        context: matchedItems.length > 0 ? matchedItems[0] : null,
        matchedItems: matchedItems.length
    };
};