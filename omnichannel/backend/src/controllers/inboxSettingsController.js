import pool from '../config/db.js';

// ============================================================
// AUTO-ASSIGN / ROUND-ROBIN SETTINGS
// ============================================================

// GET /api/app/inbox/settings/assignment
export const getAssignmentSettings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT assignment_mode FROM organizations WHERE id = $1',
            [organization_id]
        );
        res.json({ assignment_mode: result.rows[0]?.assignment_mode || 'manual' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/inbox/settings/assignment
export const updateAssignmentSettings = async (req, res) => {
    const { organization_id } = req.user;
    const { assignment_mode } = req.body;

    const valid = ['manual', 'round_robin', 'least_active'];
    if (!valid.includes(assignment_mode)) {
        return res.status(400).json({ error: 'Invalid assignment_mode. Use: manual, round_robin, least_active' });
    }

    try {
        await pool.query(
            'UPDATE organizations SET assignment_mode = $1 WHERE id = $2',
            [assignment_mode, organization_id]
        );
        res.json({ success: true, assignment_mode });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INBOX ISOLATION HELPERS
// ============================================================

// Get inbox_id for a device (from inbox_device_mapping)
export const getInboxIdForDevice = async (deviceId, deviceType = 'whatsapp') => {
    try {
        const result = await pool.query(`
            SELECT inbox_id FROM inbox_device_mapping
            WHERE device_id = $1
        `, [deviceId]);
        return result.rows[0]?.inbox_id || null;
    } catch (err) {
        console.error('[InboxIsolation] getInboxIdForDevice error:', err);
        return null;
    }
};

// Check if inbox isolation is enabled for organization
export const isInboxIsolationEnabled = async (orgId) => {
    try {
        const result = await pool.query(`
            SELECT inbox_isolation_enabled FROM organizations WHERE id = $1
        `, [orgId]);
        return result.rows[0]?.inbox_isolation_enabled === true;
    } catch (err) {
        return false;
    }
};

// Get agents who have access to a specific inbox
export const getAgentsWithInboxAccess = async (inboxId) => {
    try {
        const result = await pool.query(`
            SELECT user_id FROM user_inbox_access WHERE inbox_id = $1
        `, [inboxId]);
        return result.rows.map(r => r.user_id);
    } catch (err) {
        return [];
    }
};

// ============================================================
// INTERNAL HELPER: Auto-assign a conversation to an agent
// Called when a new conversation comes in and assignment_mode != 'manual'
// ============================================================
export const autoAssignConversation = async (orgId, conversationId, io, division = 'CS', channel = null, inboxId = null) => {
    try {
        const orgRes = await pool.query(
            'SELECT assignment_mode, rr_last_user_id FROM organizations WHERE id = $1',
            [orgId]
        );
        const { assignment_mode, rr_last_user_id } = orgRes.rows[0] || {};

        if (!assignment_mode || assignment_mode === 'manual') return null;

        let agentId = null;

        const shiftCheck = `AND (
            u.shift_start IS NULL OR u.shift_end IS NULL
            OR (u.shift_start <= u.shift_end AND CURRENT_TIME AT TIME ZONE 'Asia/Jakarta' >= u.shift_start AND CURRENT_TIME AT TIME ZONE 'Asia/Jakarta' <= u.shift_end)
            OR (u.shift_start > u.shift_end AND (CURRENT_TIME AT TIME ZONE 'Asia/Jakarta' >= u.shift_start OR CURRENT_TIME AT TIME ZONE 'Asia/Jakarta' <= u.shift_end))
        )`;

        const channelCheck = channel ? `AND (u.handled_channels IS NULL OR u.handled_channels @> '["${channel}"]'::jsonb)` : "";

        // Check if inbox isolation is enabled and get allowed agents
        let allowedAgents = [];
        let inboxIsolationEnabled = false;
        let inboxAccessCondition = '';
        let inboxAccessParams = [];

        const enabled = await isInboxIsolationEnabled(orgId);
        if (enabled && inboxId) {
            inboxIsolationEnabled = true;
            allowedAgents = await getAgentsWithInboxAccess(inboxId);
            if (allowedAgents.length > 0) {
                inboxAccessParams = [orgId, allowedAgents];
                inboxAccessCondition = `AND u.id = ANY($2::int[])`;
            }
        }

        if (assignment_mode === 'round_robin') {
            let agentsRes;

            // Priority 1: Check for agents with explicit receive_new_leads permission (via user or custom role)
            if (inboxAccessCondition && inboxAccessParams.length > 0) {
                agentsRes = await pool.query(
                    `SELECT u.id FROM users u
                     LEFT JOIN custom_roles cr ON u.custom_role_id = cr.id
                     WHERE u.organization_id = $1 AND u.is_online = true
                       AND u.role IN ('agent','admin_member')
                       ${inboxAccessCondition}
                       AND (
                           u.permissions::text LIKE '%"receive_new_leads"%'
                           OR cr.permissions::text LIKE '%"receive_new_leads"%'
                       )
                       ${shiftCheck}
                       ${channelCheck}
                     ORDER BY u.id ASC`,
                    inboxAccessParams
                );
            }

            if (!agentsRes || agentsRes.rows.length === 0) {
                // Priority 2: Try division-filtered pool
                if (inboxAccessCondition && inboxAccessParams.length > 0) {
                    agentsRes = await pool.query(
                        `SELECT u.id FROM users u
                         WHERE u.organization_id = $1 AND u.is_online = true
                           AND u.role IN ('agent','admin_member')
                           ${inboxAccessCondition}
                           AND (u.division = $2 OR u.division IS NULL)
                           ${shiftCheck}
                           ${channelCheck}
                         ORDER BY u.id ASC`,
                        inboxAccessParams
                    );
                } else {
                    agentsRes = await pool.query(
                        `SELECT id FROM users u
                         WHERE u.organization_id = $1 AND u.is_online = true
                           AND u.role IN ('agent','admin_member')
                           AND (u.division = $2 OR u.division IS NULL)
                           ${shiftCheck}
                           ${channelCheck}
                         ORDER BY u.id ASC`,
                        [orgId, division]
                    );
                }
            }

            // Priority 3: Fallback - if inbox isolation enabled but no agents found, don't assign
            if (!agentsRes || agentsRes.rows.length === 0) {
                if (inboxAccessCondition && inboxAccessParams.length > 0) {
                    // Inbox isolation enabled but no agents with access - don't auto-assign
                    return null;
                }
                agentsRes = await pool.query(
                    `SELECT u.id FROM users u WHERE u.organization_id = $1 AND u.is_online = true AND u.role IN ('agent','admin_member') ${shiftCheck} ${channelCheck} ORDER BY u.id ASC`,
                    [orgId]
                );
            }

            const agents = agentsRes.rows;
            if (agents.length === 0) return null;

            // Find the next agent after rr_last_user_id
            const lastIdx = agents.findIndex(a => a.id === rr_last_user_id);
            const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % agents.length;
            agentId = agents[nextIdx].id;

            await pool.query(
                'UPDATE organizations SET rr_last_user_id = $1 WHERE id = $2',
                [agentId, orgId]
            );

        } else if (assignment_mode === 'least_active') {
            let agentRes;

            // Priority 1: Assign to online agent with explicit receive_new_leads permission
            if (inboxAccessCondition && inboxAccessParams.length > 0) {
                agentRes = await pool.query(
                    `SELECT u.id, COUNT(c.id) AS active_count
                     FROM users u
                     LEFT JOIN custom_roles cr ON u.custom_role_id = cr.id
                     LEFT JOIN conversations c ON u.id = c.assigned_to_agent_id AND c.status = 'open'
                     WHERE u.organization_id = $1 AND u.is_online = true
                       AND u.role IN ('agent','admin_member')
                       ${inboxAccessCondition}
                       AND (
                           u.permissions::text LIKE '%"receive_new_leads"%'
                           OR cr.permissions::text LIKE '%"receive_new_leads"%'
                       )
                       ${shiftCheck}
                       ${channelCheck}
                     GROUP BY u.id
                     ORDER BY active_count ASC, RANDOM()
                     LIMIT 1`,
                    inboxAccessParams
                );
            }

            // Priority 2: Try division-filtered pool
            if (!agentRes || agentRes.rows.length === 0) {
                if (inboxAccessCondition && inboxAccessParams.length > 0) {
                    agentRes = await pool.query(
                        `SELECT u.id, COUNT(c.id) AS active_count
                         FROM users u
                         LEFT JOIN conversations c ON u.id = c.assigned_to_agent_id AND c.status = 'open'
                         WHERE u.organization_id = $1 AND u.is_online = true
                           AND u.role IN ('agent','admin_member')
                           ${inboxAccessCondition}
                           AND (u.division = $2 OR u.division IS NULL)
                           ${shiftCheck}
                           ${channelCheck}
                         GROUP BY u.id
                         ORDER BY active_count ASC, RANDOM()
                         LIMIT 1`,
                        inboxAccessParams
                    );
                } else {
                    agentRes = await pool.query(
                        `SELECT u.id, COUNT(c.id) AS active_count
                         FROM users u
                         LEFT JOIN conversations c ON u.id = c.assigned_to_agent_id AND c.status = 'open'
                         WHERE u.organization_id = $1 AND u.is_online = true
                           AND u.role IN ('agent','admin_member')
                           AND (u.division = $2 OR u.division IS NULL)
                           ${shiftCheck}
                           ${channelCheck}
                         GROUP BY u.id
                         ORDER BY active_count ASC, RANDOM()
                         LIMIT 1`,
                        [orgId, division]
                    );
                }
            }

            // Priority 3: Fallback - if inbox isolation enabled but no agents found, don't assign
            if (!agentRes || agentRes.rows.length === 0) {
                if (inboxAccessCondition && inboxAccessParams.length > 0) {
                    // Inbox isolation enabled but no agents with access - don't auto-assign
                    return null;
                }
                agentRes = await pool.query(
                    `SELECT u.id, COUNT(c.id) AS active_count FROM users u LEFT JOIN conversations c ON u.id = c.assigned_to_agent_id AND c.status = 'open' WHERE u.organization_id = $1 AND u.is_online = true AND u.role IN ('agent','admin_member') ${shiftCheck} ${channelCheck} GROUP BY u.id ORDER BY active_count ASC, RANDOM() LIMIT 1`,
                    [orgId]
                );
            }

            if (agentRes.rows.length === 0) return null;
            agentId = agentRes.rows[0].id;
        }

        if (!agentId) return null;

        // Assign conversation
        await pool.query(
            `UPDATE conversations SET assigned_to_agent_id = $1, is_chatbot_active = false
             WHERE id = $2 AND (assigned_to_agent_id IS NULL OR assigned_to_agent_id = $1)`,
            [agentId, conversationId]
        );

        // Emit socket notification
        if (io) {
            io.to(`org_${orgId}`).emit('conversation_assigned', {
                conversationId,
                assignedTo: agentId
            });
        }

        return agentId;
    } catch (err) {
        console.error('[AutoAssign] Error:', err.message);
        return null;
    }
};
