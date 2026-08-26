
import pool from '../config/db.js';

// Enqueue a user
export const enqueue = async (orgId, contactId, division, messageResult) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check if user is already in waiting queue (with lock)
        const existingRes = await client.query(
            "SELECT queue_number FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting' FOR UPDATE",
            [orgId, contactId]
        );
        if (existingRes.rows.length > 0) {
            await client.query('COMMIT');
            return parseInt(existingRes.rows[0].queue_number);
        }

        // 2. Get next queue number with lock on the division's queue count
        const countRes = await client.query(
            "SELECT COUNT(*) FROM queues WHERE organization_id = $1 AND division = $2 AND status = 'waiting'",
            [orgId, division]
        );
        const position = parseInt(countRes.rows[0].count) + 1;

        // 3. Insert into queue
        await client.query(
            `INSERT INTO queues (organization_id, contact_id, division, queue_number, status)
             VALUES ($1, $2, $3, $4, 'waiting')`,
            [orgId, contactId, division, position]
        );

        await client.query('COMMIT');
        return position;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Queue Enqueue Failed:", err);
        throw err;
    } finally {
        client.release();
    }
};

// Check Position in Queue
export const getPosition = async (orgId, contactId) => {
    try {
        // 1. Get user's queue record
        const myQ = await pool.query(
            "SELECT division, created_at FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting'",
            [orgId, contactId]
        );

        if (myQ.rows.length === 0) return null; // Not in waiting queue

        const { division, created_at } = myQ.rows[0];

        // 2. Count how many are ahead (or same time) in same division
        const countRes = await pool.query(
            "SELECT COUNT(*) FROM queues WHERE organization_id = $1 AND division = $2 AND status = 'waiting' AND created_at <= $3",
            [orgId, division, created_at]
        );

        let count = parseInt(countRes.rows[0].count);
        if (count < 1) count = 1; // Safeguard: If I am in queue, count must be at least 1 (myself)

        return count;
    } catch (err) {
        console.error("Queue Position Check Failed:", err);
        return null;
    }
};

// Check if there are online agents in a division
export const hasOnlineAgents = async (orgId, division) => {
    try {
        const res = await pool.query(
            `SELECT COUNT(*) FROM users
             WHERE organization_id = $1 AND division = $2 AND is_online = true`,
            [orgId, division]
        );
        return parseInt(res.rows[0].count) > 0;
    } catch (err) {
        console.error("Agent Check Failed:", err);
        return false;
    }
};

// Assign waiting user to agent - FIXED with proper transaction
export const processQueue = async (orgId, division) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find oldest waiting user with lock
        const qRes = await client.query(
            `SELECT * FROM queues
             WHERE organization_id = $1 AND division = $2 AND status = 'waiting'
             ORDER BY created_at ASC LIMIT 1
             FOR UPDATE`,
            [orgId, division]
        );

        if (qRes.rows.length === 0) {
            await client.query('COMMIT');
            return null; // Queue empty
        }

        const queueItem = qRes.rows[0];

        // 2. Find available agent (simplest logic: random online agent in division)
        // Future: Round Robin or Load Balanced
        const agentRes = await client.query(
            `SELECT u.id, COUNT(c.id) as active_count
             FROM users u
             LEFT JOIN conversations c ON u.id = c.assigned_to_agent_id AND c.status = 'open'
             WHERE u.organization_id = $1
               AND u.division = $2
               AND u.is_online = true
               AND u.role_level >= 10
             GROUP BY u.id
             HAVING COUNT(c.id) < 1
             ORDER BY active_count ASC, RANDOM()
             LIMIT 1
             FOR UPDATE`, // Lock the agent record
            [orgId, division]
        );

        if (agentRes.rows.length === 0) {
            await client.query('COMMIT');
            return null; // No agents online
        }

        const agentId = agentRes.rows[0].id;

        // 3. Dequeue and Update Status atomically
        // First, clear any old 'assigned' records for this contact to prevent duplicate key error
        await client.query(
            "DELETE FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'assigned'",
            [orgId, queueItem.contact_id]
        );

        await client.query(
            `UPDATE queues SET status = 'assigned', assigned_at = NOW() WHERE id = $1`,
            [queueItem.id]
        );

        await client.query('COMMIT');

        return {
            contactId: queueItem.contact_id,
            agentId: agentId,
            queueId: queueItem.id
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Queue Process Failed:", err);
        throw err;
    } finally {
        client.release();
    }
};

// Manual Pickup: Find oldest waiting user for agent's division - FIXED with proper transaction
export const pickupNext = async (orgId, division, agentId) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find oldest waiting user (Handle Wildcard Division)
        let query = `SELECT * FROM queues WHERE organization_id = $1 AND status = 'waiting'`;
        const params = [orgId];

        if (division) {
            query += ` AND division = $2`;
            params.push(division);
        }

        query += ` ORDER BY created_at ASC LIMIT 1 FOR UPDATE`;

        const qRes = await client.query(query, params);

        if (qRes.rows.length === 0) {
            await client.query('COMMIT');
            return null; // No one in queue
        }

        const queueItem = qRes.rows[0];

        // 2. Ensure Conversation Exists & Assign
        // Check if conversation exists for this contact
        let conversationId = null;
        const convRes = await client.query(
            "SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2",
            [orgId, queueItem.contact_id]
        );

        if (convRes.rows.length > 0) {
            conversationId = convRes.rows[0].id;
            // Update existing conversation
            await client.query(
                "UPDATE conversations SET assigned_to_agent_id = $1, status = 'open', is_chatbot_active = false WHERE id = $2",
                [agentId, conversationId]
            );
        } else {
            // Create new conversation (Edge case: Queue entry exists but conversation doesn't?)
            // Usually AutoReply creates conversation first or we should handles it.
            // If not exists, create it.
            const newConv = await client.query(
                `INSERT INTO conversations (organization_id, contact_id, status, assigned_to_agent_id, unread_count, created_at)
                 VALUES ($1, $2, 'open', $3, 0, NOW())
                 RETURNING id`,
                [orgId, queueItem.contact_id, agentId]
            );
            conversationId = newConv.rows[0].id;
        }

        // 3. Dequeue
        await client.query(
            "DELETE FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'assigned'",
            [orgId, queueItem.contact_id]
        );

        await client.query(
            `UPDATE queues SET status = 'assigned', assigned_at = NOW() WHERE id = $1`,
            [queueItem.id]
        );

        await client.query('COMMIT');

        return {
            conversationId,
            contactId: queueItem.contact_id,
            queueId: queueItem.id
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Queue Pickup Failed:", err);
        throw err;
    } finally {
        client.release();
    }
};
