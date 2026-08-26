
import pool from '../config/db.js';
import * as QueueService from '../services/QueueService.js';

// POST /api/app/queue/pickup
export const pickupQueue = async (req, res) => {
    const { organization_id, id: userId, role } = req.user;

    try {
        // 1. Determine Division
        // If Admin/Owner has no division, they can pick from ANY division (Wildcard)
        const isSuper = role === 'owner' || role === 'admin';

        const userRes = await pool.query("SELECT division FROM users WHERE id = $1", [userId]);
        const division = userRes.rows[0]?.division;

        if (!division && !isSuper) {
            return res.status(400).json({ error: "You are not assigned to any division" });
        }

        // 2. Pickup Next (Pass null if super and no division)
        const assignment = await QueueService.pickupNext(organization_id, division || null, userId);

        if (!assignment) {
            return res.json({ success: false, message: "Antrian kosong untuk divisi Anda" });
        }

        // 3. Emit Socket Notif just in case
        if (req.io) {
            req.io.to(`org_${organization_id}`).emit('conversation_assigned', {
                conversationId: assignment.conversationId,
                assignedTo: userId,
                // agentName: ... (Optimization: Skip lookup)
            });
        }

        res.json({ success: true, conversationId: assignment.conversationId });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/queue/status
export const getQueueStatus = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(`
            SELECT division, COUNT(*) as waiting_count 
            FROM queues 
            WHERE organization_id = $1 AND status = 'waiting' 
            GROUP BY division
        `, [organization_id]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/queue/check/:contactId
export const checkPosition = async (req, res) => {
    const { organization_id } = req.user;
    const { contactId } = req.params;

    try {
        // Find user's active queue entry
        const qRes = await pool.query(
            `SELECT division, queue_number, created_at FROM queues 
             WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting'`,
            [organization_id, contactId]
        );

        if (qRes.rows.length === 0) return res.json({ inQueue: false });

        const { division, queue_number } = qRes.rows[0];

        // Calculate position (How many people are ahead, including self)
        // Strictly less than created_at OR same created_at but lower ID
        const posRes = await pool.query(
            `SELECT COUNT(*) as pos FROM queues 
             WHERE organization_id = $1 AND division = $2 AND status = 'waiting' 
             AND created_at <= $3`,
            [organization_id, division, qRes.rows[0].created_at]
        );

        // This is a rough position check. A better one updates queue_number dynamically or counts older entries.
        // Assuming queue_number is monotonically increasing within division might be safer but `count` is realtime.

        res.json({ inQueue: true, division, position: parseInt(posRes.rows[0].pos) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
