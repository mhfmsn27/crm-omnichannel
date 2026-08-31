/**
 * Auto-Label Engine Service
 * Automatically applies labels based on source channel and keyword rules
 */

import pool from '../config/db.js';

let schemaInitialized = false;
export const ensureSchema = async () => {
    if (schemaInitialized) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS auto_label_rules (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                source_channel VARCHAR(50),
                rule_type VARCHAR(50) NOT NULL DEFAULT 'source',
                keyword_pattern TEXT,
                keyword_match_type VARCHAR(50) DEFAULT 'contains',
                case_sensitive BOOLEAN DEFAULT FALSE,
                message_scope VARCHAR(50) DEFAULT 'any',
                label_id BIGINT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
                priority INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                auto_remove BOOLEAN DEFAULT FALSE,
                match_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS auto_label_logs (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                contact_id BIGINT,
                conversation_id BIGINT,
                rule_id BIGINT REFERENCES auto_label_rules(id) ON DELETE SET NULL,
                label_id BIGINT REFERENCES labels(id) ON DELETE CASCADE,
                source_channel VARCHAR(50),
                matched_text TEXT,
                action VARCHAR(50) DEFAULT 'applied',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        schemaInitialized = true;
    } catch (e) {
        console.warn('[AutoLabel] ensureSchema warning:', e.message);
    }
};

/**
 * Process incoming message and apply auto-labels
 * Called from webhook handlers when a new message arrives
 *
 * @param {number} organizationId - Organization ID
 * @param {number} contactId - Contact ID
 * @param {number} conversationId - Conversation ID
 * @param {string} sourceChannel - Channel: 'whatsapp', 'instagram', 'facebook', 'messenger', 'tiktok', 'shopee', 'telegram', 'webchat'
 * @param {string} messageText - The message text (optional, for keyword matching)
 * @param {boolean} isFirstMessage - Whether this is the first message from this contact
 * @returns {Promise<Array>} - Array of applied labels
 */
export const processAndApplyAutoLabels = async (organizationId, contactId, conversationId, sourceChannel, messageText = '', isFirstMessage = false) => {
    const appliedLabels = [];

    try {
        await ensureSchema();
        // 1. Get all active rules for this organization, ordered by priority
        const rulesRes = await pool.query(
            `SELECT * FROM auto_label_rules
             WHERE organization_id = $1 AND is_active = true
             ORDER BY priority DESC`,
            [organizationId]
        );

        if (rulesRes.rows.length === 0) {
            return appliedLabels;
        }

        // 2. Update first message tracking if this is a new contact on this channel
        if (isFirstMessage) {
            await updateFirstMessageTracking(organizationId, contactId, sourceChannel);
        }

        // 3. Process each rule
        for (const rule of rulesRes.rows) {
            let shouldApply = false;
            let matchedText = null;

            if (rule.rule_type === 'source') {
                // Source-based rule
                const result = checkSourceRule(rule, sourceChannel);
                shouldApply = result.shouldApply;
            } else if (rule.rule_type === 'keyword' && messageText) {
                // Keyword-based rule
                const result = checkKeywordRule(rule, messageText, isFirstMessage);
                shouldApply = result.shouldApply;
                matchedText = result.matchedText;
            }

            if (shouldApply) {
                const applied = await applyLabelToContact(
                    organizationId,
                    contactId,
                    conversationId,
                    rule.label_id,
                    rule.id,
                    sourceChannel,
                    matchedText
                );

                if (applied) {
                    appliedLabels.push({
                        labelId: rule.label_id,
                        labelName: null, // Will be fetched later if needed
                        ruleId: rule.id,
                        ruleName: rule.name,
                        matchedText: matchedText
                    });

                    // Update match count
                    await pool.query(
                        'UPDATE auto_label_rules SET match_count = match_count + 1, updated_at = NOW() WHERE id = $1',
                        [rule.id]
                    );
                }
            }
        }

        return appliedLabels;

    } catch (error) {
        console.error('[AutoLabelService] Error processing auto labels:', error);
        return appliedLabels;
    }
};

/**
 * Check if source rule matches the given channel
 */
const checkSourceRule = (rule, sourceChannel) => {
    // If rule has no source_channel, it matches all channels
    if (!rule.source_channel) {
        return { shouldApply: true };
    }

    // Check exact match (case insensitive)
    return {
        shouldApply: rule.source_channel.toLowerCase() === sourceChannel.toLowerCase()
    };
};

/**
 * Check if keyword rule matches the given message
 */
const checkKeywordRule = (rule, messageText, isFirstMessage) => {
    // Check message scope
    if (rule.message_scope === 'first' && !isFirstMessage) {
        return { shouldApply: false };
    }
    if (rule.message_scope === 'continued' && isFirstMessage) {
        return { shouldApply: false };
    }

    if (!rule.keyword_pattern) {
        return { shouldApply: false };
    }

    const keyword = rule.keyword_pattern;
    const text = rule.case_sensitive ? messageText : messageText.toLowerCase();
    const searchTerm = rule.case_sensitive ? keyword : keyword.toLowerCase();

    let isMatch = false;
    let matchedText = null;

    switch (rule.keyword_match_type) {
        case 'exact':
            isMatch = text === searchTerm;
            if (isMatch) matchedText = messageText;
            break;

        case 'contains':
            isMatch = text.includes(searchTerm);
            if (isMatch) matchedText = messageText;
            break;

        case 'starts_with':
            isMatch = text.startsWith(searchTerm);
            if (isMatch) matchedText = messageText;
            break;

        case 'ends_with':
            isMatch = text.endsWith(searchTerm);
            if (isMatch) matchedText = messageText;
            break;

        case 'regex':
            try {
                const flags = rule.case_sensitive ? '' : 'i';
                const regex = new RegExp(keyword, flags);
                const match = messageText.match(regex);
                isMatch = match !== null;
                if (isMatch) matchedText = match[0];
            } catch (e) {
                console.warn(`[AutoLabelService] Invalid regex pattern: ${keyword}`);
                isMatch = false;
            }
            break;

        default:
            isMatch = text.includes(searchTerm);
            if (isMatch) matchedText = messageText;
    }

    return { shouldApply: isMatch, matchedText };
};

/**
 * Apply label to contact (if not already applied)
 */
const applyLabelToContact = async (organizationId, contactId, conversationId, labelId, ruleId, sourceChannel, matchedText) => {
    try {
        // Check if label is already applied
        const existingRes = await pool.query(
            'SELECT 1 FROM contact_labels WHERE contact_id = $1 AND label_id = $2',
            [contactId, labelId]
        );

        if (existingRes.rows.length > 0) {
            // Label already applied, skip
            return false;
        }

        // Apply the label
        await pool.query(
            'INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2)',
            [contactId, labelId]
        );

        // Log the action
        await pool.query(
            `INSERT INTO auto_label_logs
             (organization_id, contact_id, conversation_id, rule_id, label_id, source_channel, matched_text, action)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'applied')`,
            [organizationId, contactId, conversationId, ruleId, labelId, sourceChannel, matchedText]
        );

        console.log(`[AutoLabelService] Applied label ${labelId} to contact ${contactId} via rule ${ruleId}`);
        return true;

    } catch (error) {
        // Ignore duplicate key error (label already applied)
        if (error.code === '23505') {
            return false;
        }
        console.error('[AutoLabelService] Error applying label:', error);
        return false;
    }
};

/**
 * Update first message tracking for contact
 */
const updateFirstMessageTracking = async (organizationId, contactId, sourceChannel) => {
    try {
        // Check if this is the first message on this specific channel
        const contactRes = await pool.query(
            'SELECT first_message_at, first_message_source FROM contacts WHERE id = $1',
            [contactId]
        );

        if (contactRes.rows.length > 0) {
            const contact = contactRes.rows[0];

            // If no first message recorded, or this is a different channel
            if (!contact.first_message_at || contact.first_message_source !== sourceChannel) {
                await pool.query(
                    `UPDATE contacts
                     SET first_message_at = NOW(), first_message_source = $2
                     WHERE id = $1`,
                    [contactId, sourceChannel]
                );
            }
        }
    } catch (error) {
        console.error('[AutoLabelService] Error updating first message tracking:', error);
    }
};

/**
 * Check if contact's first message based on message count
 */
export const isContactFirstMessage = async (organizationId, contactId) => {
    try {
        const countRes = await pool.query(
            `SELECT COUNT(*) as msg_count
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE c.organization_id = $1 AND c.contact_id = $2`,
            [organizationId, contactId]
        );

        return parseInt(countRes.rows[0].msg_count) === 0;
    } catch (error) {
        console.error('[AutoLabelService] Error checking first message:', error);
        return true; // Assume first message on error
    }
};

/**
 * Get all auto-label rules for an organization
 */
export const getRules = async (organizationId) => {
    try {
        await ensureSchema();
        const res = await pool.query(
            `SELECT alr.*, l.name as label_name, l.color as label_color,
                    (SELECT COUNT(*) FROM contact_labels cl WHERE cl.label_id = l.id) as label_usage_count
             FROM auto_label_rules alr
             JOIN labels l ON alr.label_id = l.id
             WHERE alr.organization_id = $1
             ORDER BY alr.priority DESC, alr.created_at DESC`,
            [organizationId]
        );
        return res.rows;
    } catch (error) {
        console.error('[AutoLabelService] Error getting rules:', error);
        return [];
    }
};

/**
 * Create a new auto-label rule
 */
export const createRule = async (organizationId, ruleData) => {
    const {
        name,
        description,
        source_channel,
        rule_type,
        keyword_pattern,
        keyword_match_type,
        case_sensitive,
        message_scope,
        label_id,
        priority,
        is_active,
        auto_remove
    } = ruleData;

    try {
        await ensureSchema();
        // Validate required fields
        if (!name) throw new Error('Rule name is required');
        if (!label_id) throw new Error('Label ID is required');
        if (!rule_type || !['source', 'keyword'].includes(rule_type)) {
            throw new Error('Invalid rule type');
        }

        // Validate keyword rules
        if (rule_type === 'keyword' && !keyword_pattern) {
            throw new Error('Keyword pattern is required for keyword rules');
        }

        // Validate label exists and belongs to organization
        const labelCheck = await pool.query(
            'SELECT id FROM labels WHERE id = $1 AND organization_id = $2',
            [label_id, organizationId]
        );
        if (labelCheck.rows.length === 0) {
            throw new Error('Label not found or does not belong to this organization');
        }

        const res = await pool.query(
            `INSERT INTO auto_label_rules
             (organization_id, name, description, source_channel, rule_type,
              keyword_pattern, keyword_match_type, case_sensitive, message_scope,
              label_id, priority, is_active, auto_remove)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                organizationId, name, description, source_channel, rule_type,
                keyword_pattern || null, keyword_match_type || 'contains',
                case_sensitive || false, message_scope || 'any',
                label_id, priority || 0, is_active !== false, auto_remove || false
            ]
        );

        return res.rows[0];
    } catch (error) {
        console.error('[AutoLabelService] Error creating rule:', error);
        throw error;
    }
};

/**
 * Update an existing auto-label rule
 */
export const updateRule = async (organizationId, ruleId, ruleData) => {
    const {
        name,
        description,
        source_channel,
        rule_type,
        keyword_pattern,
        keyword_match_type,
        case_sensitive,
        message_scope,
        label_id,
        priority,
        is_active,
        auto_remove
    } = ruleData;

    try {
        await ensureSchema();
        // Verify ownership
        const ruleCheck = await pool.query(
            'SELECT id FROM auto_label_rules WHERE id = $1 AND organization_id = $2',
            [ruleId, organizationId]
        );
        if (ruleCheck.rows.length === 0) {
            throw new Error('Rule not found');
        }

        // Validate label if changed
        if (label_id) {
            const labelCheck = await pool.query(
                'SELECT id FROM labels WHERE id = $1 AND organization_id = $2',
                [label_id, organizationId]
            );
            if (labelCheck.rows.length === 0) {
                throw new Error('Label not found or does not belong to this organization');
            }
        }

        const res = await pool.query(
            `UPDATE auto_label_rules SET
             name = COALESCE($3, name),
             description = COALESCE($4, description),
             source_channel = $5,
             rule_type = COALESCE($6, rule_type),
             keyword_pattern = $7,
             keyword_match_type = COALESCE($8, keyword_match_type),
             case_sensitive = COALESCE($9, case_sensitive),
             message_scope = COALESCE($10, message_scope),
             label_id = COALESCE($11, label_id),
             priority = COALESCE($12, priority),
             is_active = COALESCE($13, is_active),
             auto_remove = COALESCE($14, auto_remove),
             updated_at = NOW()
             WHERE id = $1 AND organization_id = $2
             RETURNING *`,
            [
                ruleId, organizationId, name, description, source_channel,
                rule_type, keyword_pattern, keyword_match_type,
                case_sensitive, message_scope, label_id,
                priority, is_active, auto_remove
            ]
        );

        return res.rows[0];
    } catch (error) {
        console.error('[AutoLabelService] Error updating rule:', error);
        throw error;
    }
};

/**
 * Delete an auto-label rule
 */
export const deleteRule = async (organizationId, ruleId) => {
    try {
        await ensureSchema();
        const res = await pool.query(
            'DELETE FROM auto_label_rules WHERE id = $1 AND organization_id = $2 RETURNING id',
            [ruleId, organizationId]
        );

        if (res.rows.length === 0) {
            throw new Error('Rule not found');
        }

        return true;
    } catch (error) {
        console.error('[AutoLabelService] Error deleting rule:', error);
        throw error;
    }
};

/**
 * Get auto-label logs for an organization
 */
export const getLogs = async (organizationId, options = {}) => {
    const { limit = 100, offset = 0, contact_id, action } = options;

    try {
        await ensureSchema();
        let query = `
            SELECT a.*, l.name as label_name, l.color as label_color, alr.name as rule_name
            FROM auto_label_logs a
            JOIN labels l ON a.label_id = l.id
            LEFT JOIN auto_label_rules alr ON a.rule_id = alr.id
            WHERE a.organization_id = $1
        `;
        const params = [organizationId];
        let paramIdx = 2;

        if (contact_id) {
            query += ` AND a.contact_id = $${paramIdx}`;
            params.push(contact_id);
            paramIdx++;
        }

        if (action) {
            query += ` AND a.action = $${paramIdx}`;
            params.push(action);
            paramIdx++;
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
        params.push(limit, offset);

        const res = await pool.query(query, params);
        return res.rows;
    } catch (error) {
        console.error('[AutoLabelService] Error getting logs:', error);
        return [];
    }
};

/**
 * Get statistics for auto-label rules
 */
export const getStats = async (organizationId) => {
    try {
        await ensureSchema();
        const statsRes = await pool.query(
            `SELECT
                 COUNT(*) as total_rules,
                 COUNT(*) FILTER (WHERE is_active = true) as active_rules,
                 COUNT(*) FILTER (WHERE rule_type = 'source') as source_rules,
                 COUNT(*) FILTER (WHERE rule_type = 'keyword') as keyword_rules,
                 SUM(match_count) as total_matches,
                 (SELECT COUNT(*) FROM auto_label_logs WHERE organization_id = $1 AND action = 'applied') as total_applied,
                 (SELECT COUNT(*) FROM auto_label_logs WHERE organization_id = $1 AND action = 'removed') as total_removed
             FROM auto_label_rules
             WHERE organization_id = $1`,
            [organizationId]
        );

        // Get top applied labels
        const topLabelsRes = await pool.query(
            `SELECT l.id, l.name, l.color, COUNT(*) as apply_count
             FROM auto_label_logs a
             JOIN labels l ON a.label_id = l.id
             WHERE a.organization_id = $1 AND a.action = 'applied'
             GROUP BY l.id, l.name, l.color
             ORDER BY apply_count DESC
             LIMIT 10`,
            [organizationId]
        );

        return {
            ...statsRes.rows[0],
            top_labels: topLabelsRes.rows
        };
    } catch (error) {
        console.error('[AutoLabelService] Error getting stats:', error);
        return {
            total_rules: 0,
            active_rules: 0,
            source_rules: 0,
            keyword_rules: 0,
            total_matches: 0,
            total_applied: 0,
            total_removed: 0,
            top_labels: []
        };
    }
};

/**
 * Get available channels for source-based rules
 */
export const getAvailableChannels = () => {
    return [
        { id: 'whatsapp', name: 'WhatsApp', icon: 'whatsapp' },
        { id: 'instagram', name: 'Instagram DM', icon: 'instagram' },
        { id: 'facebook', name: 'Facebook Messenger', icon: 'messenger' },
        { id: 'tiktok', name: 'TikTok DM', icon: 'tiktok' },
        { id: 'shopee', name: 'Shopee', icon: 'shopee' },
        { id: 'telegram', name: 'Telegram', icon: 'telegram' },
        { id: 'webchat', name: 'Web Chat', icon: 'webchat' }
    ];
};