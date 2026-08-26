import pool from '../config/db.js';

// --- Workflow Rules CRUD ---

export const getRules = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT wr.*, u.name as created_by_name,
                    (SELECT COUNT(*) FROM workflow_rule_logs WHERE rule_id = wr.id) as execution_count
             FROM workflow_rules wr
             LEFT JOIN users u ON wr.created_by = u.id
             WHERE wr.organization_id = $1
             ORDER BY wr.priority DESC, wr.created_at DESC`,
            [organization_id]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const createRule = async (req, res) => {
    const { organization_id, id: user_id } = req.user;
    const { name, description, trigger_type, trigger_conditions, actions, priority, stop_on_match, is_active } = req.body;

    if (!name || !trigger_type || !actions) {
        return res.status(400).json({ error: 'Name, trigger_type, and actions are required' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO workflow_rules (organization_id, name, description, trigger_type, trigger_conditions, actions, priority, stop_on_match, is_active, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                organization_id,
                name,
                description || null,
                trigger_type,
                JSON.stringify(trigger_conditions || {}),
                JSON.stringify(actions),
                priority || 0,
                stop_on_match || false,
                is_active !== false,
                user_id
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateRule = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, description, trigger_type, trigger_conditions, actions, priority, stop_on_match, is_active } = req.body;

    try {
        const result = await pool.query(
            `UPDATE workflow_rules SET
             name = COALESCE($1, name),
             description = COALESCE($2, description),
             trigger_type = COALESCE($3, trigger_type),
             trigger_conditions = COALESCE($4, trigger_conditions),
             actions = COALESCE($5, actions),
             priority = COALESCE($6, priority),
             stop_on_match = COALESCE($7, stop_on_match),
             is_active = COALESCE($8, is_active),
             updated_at = NOW()
             WHERE id = $9 AND organization_id = $10
             RETURNING *`,
            [
                name,
                description,
                trigger_type,
                trigger_conditions ? JSON.stringify(trigger_conditions) : null,
                actions ? JSON.stringify(actions) : null,
                priority,
                stop_on_match,
                is_active,
                id,
                organization_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteRule = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM workflow_rules WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const toggleRule = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE workflow_rules SET is_active = NOT is_active, updated_at = NOW()
             WHERE id = $1 AND organization_id = $2
             RETURNING *`,
            [id, organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getRuleLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { limit = 50 } = req.query;

    try {
        const result = await pool.query(
            `SELECT wfl.*, c.contact_name, c.phone_number
             FROM workflow_rule_logs wfl
             LEFT JOIN conversations c ON wfl.conversation_id = c.id
             WHERE wfl.rule_id = $1
             ORDER BY wfl.executed_at DESC
             LIMIT $2`,
            [id, parseInt(limit)]
        );

        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const testRule = async (req, res) => {
    const { organization_id } = req.user;
    const { rule_id, test_data } = req.body;

    try {
        const ruleRes = await pool.query(
            `SELECT * FROM workflow_rules WHERE id = $1 AND organization_id = $2`,
            [rule_id, organization_id]
        );

        if (ruleRes.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const rule = ruleRes.rows[0];

        // Evaluate conditions
        const conditions = rule.trigger_conditions || {};
        let matches = true;

        if (conditions.channel && test_data.channel !== conditions.channel) matches = false;
        if (conditions.keywords && test_data.message) {
            const msgLower = test_data.message.toLowerCase();
            matches = conditions.keywords.some(k => msgLower.includes(k.toLowerCase()));
        }

        res.json({
            rule_id,
            would_trigger: matches,
            conditions_evaluated: conditions,
            test_data
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- Execute Workflow Rules ---

export const evaluateRules = async (organizationId, triggerType, context) => {
    try {
        const rules = await pool.query(
            `SELECT * FROM workflow_rules
             WHERE organization_id = $1 AND is_active = true AND trigger_type = $2
             ORDER BY priority DESC`,
            [organizationId, triggerType]
        );

        const triggeredRules = [];

        for (const rule of rules.rows) {
            const conditions = rule.trigger_conditions || {};
            let matches = true;

            // Check channel condition
            if (conditions.channel && context.channel !== conditions.channel) {
                matches = false;
            }

            // Check keywords condition
            if (matches && conditions.keywords && context.message) {
                const msgLower = context.message.toLowerCase();
                matches = conditions.keywords.some(k =>
                    msgLower.includes(k.toLowerCase())
                );
            }

            // Check sentiment condition
            if (matches && conditions.sentiment && context.sentiment) {
                if (context.sentiment !== conditions.sentiment) {
                    matches = false;
                }
            }

            // Check priority condition
            if (matches && conditions.priority && context.priority) {
                if (context.priority !== conditions.priority) {
                    matches = false;
                }
            }

            if (matches) {
                triggeredRules.push(rule);
                await executeRule(rule, context);

                if (rule.stop_on_match) {
                    break;
                }
            }
        }

        return triggeredRules;
    } catch (e) {
        console.error('[Workflow] evaluateRules error:', e.message);
        return [];
    }
};

const executeRule = async (rule, context) => {
    const actions = rule.actions || [];
    const { conversation_id, contact_id, organization_id } = context;

    for (const action of actions) {
        try {
            switch (action.type) {
                case 'add_tag':
                    if (action.label_id && contact_id) {
                        await pool.query(
                            `INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                            [contact_id, action.label_id]
                        );
                    }
                    break;

                case 'remove_tag':
                    if (action.label_id && contact_id) {
                        await pool.query(
                            `DELETE FROM contact_labels WHERE contact_id = $1 AND label_id = $2`,
                            [contact_id, action.label_id]
                        );
                    }
                    break;

                case 'set_priority':
                    if (action.priority && conversation_id) {
                        await pool.query(
                            `UPDATE conversations SET priority = $1 WHERE id = $2`,
                            [action.priority, conversation_id]
                        );
                    }
                    break;

                case 'send_message':
                    if (action.message && conversation_id) {
                        await pool.query(
                            `INSERT INTO messages (conversation_id, content, from_me, status)
                             VALUES ($1, $2, true, 'pending') RETURNING id`,
                            [conversation_id, action.message]
                        );
                    }
                    break;

                case 'assign_agent':
                    if (action.agent_id && conversation_id) {
                        await pool.query(
                            `UPDATE conversations SET assigned_to_agent_id = $1, assigned_at = NOW() WHERE id = $2`,
                            [action.agent_id, conversation_id]
                        );
                    }
                    break;

                case 'notify':
                    console.log(`[Workflow] Notification: ${action.message} for conversation ${conversation_id}`);
                    break;
            }
        } catch (e) {
            console.error(`[Workflow] Action error:`, e.message);
        }
    }

    // Log execution
    try {
        await pool.query(
            `INSERT INTO workflow_rule_logs (rule_id, conversation_id, contact_id, trigger_type, action_executed, status)
             VALUES ($1, $2, $3, $4, $5, 'success')`,
            [rule.id, conversation_id, contact_id, rule.trigger_type, JSON.stringify(actions)]
        );
    } catch (e) {
        console.error('[Workflow] Log error:', e.message);
    }
};
