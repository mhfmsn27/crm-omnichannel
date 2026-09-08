/**
 * Agent Workflow Macros Controller
 * Enterprise 1-Click Multi-Action Workflow Automation for Agents
 */
import pool from '../config/db.js';
import * as auditLogService from '../services/auditLogService.js';
import * as waService from '../services/waGatewayService.js';

let macroSchemaChecked = false;

export const ensureMacroSchema = async () => {
    if (macroSchemaChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS agent_macros (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
                title VARCHAR(100) NOT NULL,
                description TEXT,
                actions JSONB NOT NULL DEFAULT '{}',
                is_active BOOLEAN DEFAULT TRUE,
                created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_agent_macros_org ON agent_macros(organization_id, is_active);
        `);
        macroSchemaChecked = true;
    } catch (e) {
        console.error('[MacroController] ensureMacroSchema error:', e.message);
    }
};

ensureMacroSchema().catch(() => {});

// GET /api/app/macros
export const getMacros = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureMacroSchema();
        const result = await pool.query(
            `SELECT m.*, m.title as name, u.name as creator_name
             FROM agent_macros m
             LEFT JOIN users u ON m.created_by = u.id
             WHERE m.organization_id = $1 AND m.is_active = TRUE
             ORDER BY m.title ASC`,
            [organization_id]
        );
        const rows = result.rows.map(row => ({
            ...row,
            name: row.title,
            actions: typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions
        }));
        res.json({
            success: true,
            macros: rows,
            data: rows
        });
    } catch (err) {
        console.error('[getMacros] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/macros
export const createMacro = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { title, name, description, actions, is_active = true } = req.body;
    const macroTitle = (title || name || '').trim();

    if (!macroTitle || !actions) {
        return res.status(400).json({ error: 'Macro title/name and actions are required' });
    }

    try {
        await ensureMacroSchema();
        const result = await pool.query(
            `INSERT INTO agent_macros (organization_id, title, description, actions, is_active, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING *`,
            [organization_id, macroTitle, description || '', JSON.stringify(actions), is_active !== false, userId]
        );

        auditLogService.logActivity({
            organizationId: organization_id,
            userId,
            action: 'CREATE_MACRO',
            module: 'automation',
            details: { macroId: result.rows[0].id, title: macroTitle },
            req
        });

        res.status(201).json({
            success: true,
            macro: { ...result.rows[0], name: result.rows[0].title },
            data: result.rows[0]
        });
    } catch (err) {
        console.error('[createMacro] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/macros/:id
export const updateMacro = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { id } = req.params;
    const { title, name, description, actions, is_active } = req.body;
    const macroTitle = (title || name || null)?.trim?.() || null;

    try {
        await ensureMacroSchema();
        const check = await pool.query('SELECT id FROM agent_macros WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Macro not found' });

        const result = await pool.query(
            `UPDATE agent_macros 
             SET title = COALESCE($1, title),
                 description = COALESCE($2, description),
                 actions = COALESCE($3, actions),
                 is_active = COALESCE($4, is_active),
                 updated_at = NOW()
             WHERE id = $5 AND organization_id = $6
             RETURNING *`,
            [
                macroTitle,
                description !== undefined ? description : null,
                actions ? JSON.stringify(actions) : null,
                is_active !== undefined ? is_active : null,
                id,
                organization_id
            ]
        );

        auditLogService.logActivity({
            organizationId: organization_id,
            userId,
            action: 'UPDATE_MACRO',
            module: 'automation',
            details: { macroId: id, title: result.rows[0].title },
            req
        });

        res.json({
            success: true,
            macro: { ...result.rows[0], name: result.rows[0].title },
            data: result.rows[0]
        });
    } catch (err) {
        console.error('[updateMacro] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/macros/:id
export const deleteMacro = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { id } = req.params;

    try {
        await ensureMacroSchema();
        const result = await pool.query('DELETE FROM agent_macros WHERE id = $1 AND organization_id = $2 RETURNING id, title', [id, organization_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Macro not found' });

        auditLogService.logActivity({
            organizationId: organization_id,
            userId,
            action: 'DELETE_MACRO',
            module: 'automation',
            details: { macroId: id, title: result.rows[0].title },
            req
        });

        res.json({ success: true, message: 'Macro deleted successfully' });
    } catch (err) {
        console.error('[deleteMacro] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/conversations/:id/execute-macro or /api/app/macros/:id/execute
export const executeMacro = async (req, res) => {
    const { organization_id, id: userId } = req.user;

    // Resolve conversationId & macroId whether route is /macros/:id/execute or /conversations/:id/execute-macro
    let conversationId = req.body.conversationId || req.params.conversationId;
    let macroId = req.body.macroId || req.params.macroId;

    if (req.params.id) {
        if (!macroId && (req.baseUrl?.includes('macro') || req.originalUrl?.includes('/macros/'))) {
            macroId = req.params.id;
        } else if (!conversationId && (req.baseUrl?.includes('conversation') || req.originalUrl?.includes('/conversations/'))) {
            conversationId = req.params.id;
        }
    }

    if (!macroId || !conversationId) {
        return res.status(400).json({ error: 'Both macroId and conversationId are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch Macro & Conversation
        const macroRes = await client.query('SELECT * FROM agent_macros WHERE id = $1 AND organization_id = $2', [macroId, organization_id]);
        if (macroRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Macro not found' });
        }
        const macro = macroRes.rows[0];

        const convRes = await client.query(
            `SELECT c.*, ct.phone_number, ct.name as contact_name, ws.session_id as wa_session_id
             FROM conversations c
             LEFT JOIN contacts ct ON c.contact_id = ct.id
             LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
             WHERE c.id = $1 AND c.organization_id = $2`,
            [conversationId, organization_id]
        );
        if (convRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Conversation not found' });
        }
        const conv = convRes.rows[0];

        // Normalize actions (support both array format and object format)
        let rawActions = macro.actions;
        if (typeof rawActions === 'string') {
            try { rawActions = JSON.parse(rawActions); } catch (e) { rawActions = {}; }
        }

        let messageToSend = null;
        let labelNameToAdd = null;
        let labelIdToAdd = null;
        let statusToSet = null;
        let pipelineStageIdToSet = null;
        let agentIdToAssign = null;

        if (Array.isArray(rawActions)) {
            for (const act of rawActions) {
                if (!act || !act.type) continue;
                if (act.type === 'send_message') {
                    messageToSend = act.payload?.message || act.payload?.text || act.message;
                } else if (act.type === 'add_label') {
                    labelNameToAdd = act.payload?.labelName || act.labelName;
                    labelIdToAdd = act.payload?.labelId || act.labelId;
                } else if (act.type === 'set_status') {
                    statusToSet = act.payload?.status || act.status;
                } else if (act.type === 'set_pipeline_stage') {
                    pipelineStageIdToSet = act.payload?.stageId || act.stageId;
                } else if (act.type === 'assign_agent') {
                    agentIdToAssign = act.payload?.agentId || act.agentId;
                }
            }
        } else if (typeof rawActions === 'object' && rawActions !== null) {
            messageToSend = rawActions.send_message;
            labelIdToAdd = rawActions.add_label_id;
            labelNameToAdd = rawActions.add_label || rawActions.add_label_name;
            statusToSet = rawActions.set_status;
            pipelineStageIdToSet = rawActions.set_pipeline_stage_id;
            agentIdToAssign = rawActions.assign_agent_id;
        }

        const executedActions = [];
        let createdMessage = null;

        // 2. Action: Send Message
        if (messageToSend && typeof messageToSend === 'string' && messageToSend.trim()) {
            let msgText = messageToSend.replace(/\{name\}/gi, conv.contact_name || 'Kak');
            
            const msgIns = await client.query(
                `INSERT INTO messages (organization_id, conversation_id, from_me, type, content, status, created_at)
                 VALUES ($1, $2, true, 'text', $3, 'sent', NOW()) RETURNING *`,
                [organization_id, conversationId, msgText]
            );
            createdMessage = msgIns.rows[0];

            await client.query(
                `UPDATE conversations SET last_message = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`,
                [msgText, conversationId]
            );

            if (conv.wa_session_id && conv.phone_number) {
                waService.sendText(conv.wa_session_id, conv.phone_number, msgText).catch(e => {
                    console.warn('[executeMacro] Gateway send error:', e.message);
                });
            }

            executedActions.push('SEND_MESSAGE');
        }

        // 3. Action: Add Label
        if (conv.contact_id) {
            let targetLabelId = labelIdToAdd ? parseInt(labelIdToAdd) : null;
            if (isNaN(targetLabelId)) targetLabelId = null;

            if (!targetLabelId && labelNameToAdd && typeof labelNameToAdd === 'string' && labelNameToAdd.trim()) {
                const cleanLabelName = labelNameToAdd.trim();
                const existingLabel = await client.query(
                    'SELECT id FROM labels WHERE organization_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
                    [organization_id, cleanLabelName]
                );
                if (existingLabel.rows.length > 0) {
                    targetLabelId = existingLabel.rows[0].id;
                } else {
                    const newLabel = await client.query(
                        'INSERT INTO labels (organization_id, name, color) VALUES ($1, $2, $3) RETURNING id',
                        [organization_id, cleanLabelName, '#8B5CF6']
                    );
                    targetLabelId = newLabel.rows[0].id;
                }
            }

            if (targetLabelId) {
                await client.query(
                    `INSERT INTO contact_labels (contact_id, label_id)
                     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [conv.contact_id, targetLabelId]
                );
                executedActions.push('ADD_LABEL');
            }
        }

        // 4. Action: Set Status
        if (statusToSet && ['open', 'resolved', 'closed', 'pending'].includes(statusToSet)) {
            const closedAtClause = (statusToSet === 'resolved' || statusToSet === 'closed') ? ', closed_at = NOW()' : '';
            await client.query(
                `UPDATE conversations SET status = $1, updated_at = NOW() ${closedAtClause} WHERE id = $2`,
                [statusToSet, conversationId]
            );
            executedActions.push(`SET_STATUS_${statusToSet.toUpperCase()}`);
        }

        // 5. Action: Move Pipeline Stage
        if (pipelineStageIdToSet) {
            const stageId = parseInt(pipelineStageIdToSet);
            if (!isNaN(stageId)) {
                await client.query(
                    `UPDATE conversations SET pipeline_stage_id = $1, updated_at = NOW() WHERE id = $2`,
                    [stageId, conversationId]
                );
                executedActions.push('MOVE_PIPELINE_STAGE');
            }
        }

        // 6. Action: Assign Agent
        if (agentIdToAssign) {
            const agentId = parseInt(agentIdToAssign);
            if (!isNaN(agentId)) {
                await client.query(
                    `UPDATE conversations SET assigned_to_agent_id = $1, updated_at = NOW() WHERE id = $2`,
                    [agentId, conversationId]
                );
                executedActions.push('ASSIGN_AGENT');
            }
        }

        await client.query('COMMIT');

        // Realtime Socket Broadcast to Inbox
        const io = req.io || (req.app?.get ? req.app.get('io') : null);
        if (io) {
            if (createdMessage) {
                io.to(`org_${organization_id}`).emit('new_message', {
                    conversationId,
                    message: createdMessage
                });
            }
            if (statusToSet) {
                io.to(`org_${organization_id}`).emit('conversation_status_update', {
                    conversationId,
                    status: statusToSet
                });
            }
        }

        // Audit Logging
        auditLogService.logActivity({
            organizationId: organization_id,
            userId,
            action: 'EXECUTE_MACRO',
            module: 'inbox',
            details: { conversationId, macroId, macroTitle: macro.title, executedActions },
            req
        });

        // Fetch refreshed conversation
        const updatedConvRes = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);

        res.json({
            success: true,
            message: `Macro "${macro.title}" berhasil dijalankan!`,
            results: executedActions,
            executedActions,
            conversation: updatedConvRes.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[executeMacro] Error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export default {
    getMacros,
    createMacro,
    updateMacro,
    deleteMacro,
    executeMacro,
    ensureMacroSchema
};
