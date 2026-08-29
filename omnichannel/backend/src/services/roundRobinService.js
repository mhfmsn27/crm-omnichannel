/**
 * Smart Round-Robin Auto-Assignment Service
 * Distributes incoming conversations to available online agents based on capacity
 */
import pool from '../config/db.js';

export const assignNextAvailableAgent = async (organizationId, conversationId) => {
    try {
        // 1. Check if organization has auto round-robin enabled
        const orgRes = await pool.query(
            `SELECT auto_round_robin_enabled FROM organizations WHERE id = $1`,
            [organizationId]
        );
        if (orgRes.rows.length > 0 && orgRes.rows[0].auto_round_robin_enabled === false) {
            return null;
        }

        // 2. Query available agents in the organization:
        //    - Role is 'agent' or 'admin_member'
        //    - agent_status = 'available' (not busy, away, offline)
        //    - Active chat count < max_active_chats (default 15)
        const agentRes = await pool.query(
            `SELECT u.id, u.name, u.email, COALESCE(u.max_active_chats, 15) as max_chats,
                    COUNT(c.id) FILTER (WHERE c.status = 'open') as active_chats
             FROM users u
             LEFT JOIN conversations c ON c.assigned_to_agent_id = u.id AND c.organization_id = u.organization_id AND c.status = 'open'
             WHERE u.organization_id = $1 
               AND u.role IN ('agent', 'admin_member')
               AND COALESCE(u.agent_status, 'available') = 'available'
             GROUP BY u.id
             HAVING COUNT(c.id) FILTER (WHERE c.status = 'open') < COALESCE(u.max_active_chats, 15)
             ORDER BY active_chats ASC, u.id ASC
             LIMIT 1`,
            [organizationId]
        );

        if (agentRes.rows.length === 0) {
            console.log(`[RoundRobin] No available agents within capacity for org ${organizationId}`);
            return null;
        }

        const selectedAgent = agentRes.rows[0];

        // 3. Assign conversation
        await pool.query(
            `UPDATE conversations 
             SET assigned_to_agent_id = $1, status = 'open', updated_at = NOW() 
             WHERE id = $2 AND organization_id = $3`,
            [selectedAgent.id, conversationId, organizationId]
        );

        console.log(`[RoundRobin] Assigned conversation #${conversationId} to agent ${selectedAgent.name} (ID: ${selectedAgent.id})`);
        return selectedAgent;

    } catch (err) {
        console.error('[RoundRobin] Error assigning agent:', err.message);
        return null;
    }
};

export const updateAgentStatus = async (userId, organizationId, status) => {
    const validStatuses = ['available', 'busy', 'away', 'offline'];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const res = await pool.query(
        `UPDATE users SET agent_status = $1, updated_at = NOW() 
         WHERE id = $2 AND organization_id = $3 
         RETURNING id, name, agent_status`,
        [status, userId, organizationId]
    );

    return res.rows[0];
};
