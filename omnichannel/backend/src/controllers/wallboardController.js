/**
 * Live Wallboard & Real-time Operations Controller
 * Provides high-speed aggregate metrics for office TV screens / wallboards
 */
import pool from '../config/db.js';

export const getLiveWallboardMetrics = async (req, res) => {
    const { organization_id } = req.user;

    try {
        // 1. Live Chat Queues & Statuses
        const chatQueueRes = await pool.query(
            `SELECT 
                COUNT(*) as total_active_chats,
                COUNT(*) FILTER (WHERE status = 'unassigned' OR assigned_to_agent_id IS NULL) as unassigned_queue,
                COUNT(*) FILTER (WHERE status = 'open' AND assigned_to_agent_id IS NOT NULL) as handling_chats,
                COUNT(*) FILTER (WHERE status = 'resolved' AND updated_at >= CURRENT_DATE) as resolved_today
             FROM conversations
             WHERE organization_id = $1`,
            [organization_id]
        );

        // 2. Active Agents Status Breakdown
        const agentStatusRes = await pool.query(
            `SELECT 
                COUNT(*) as total_agents,
                COUNT(*) FILTER (WHERE COALESCE(agent_status, 'available') = 'available') as available_agents,
                COUNT(*) FILTER (WHERE agent_status = 'busy') as busy_agents,
                COUNT(*) FILTER (WHERE agent_status = 'away') as away_agents,
                COUNT(*) FILTER (WHERE agent_status = 'offline') as offline_agents
             FROM users
             WHERE organization_id = $1 AND role IN ('agent', 'admin_member')`,
            [organization_id]
        );

        // 3. Sales Deals & Invoices Closed Today
        const salesTodayRes = await pool.query(
            `SELECT 
                COUNT(*) as invoices_paid_today,
                COALESCE(SUM(paid_amount), 0) as total_revenue_today
             FROM invoices
             WHERE organization_id = $1 
               AND status = 'paid' 
               AND updated_at >= CURRENT_DATE`,
            [organization_id]
        );

        // 4. CSAT Score Today
        const csatTodayRes = await pool.query(
            `SELECT 
                COUNT(*) as responses_today,
                ROUND(AVG(rating), 2) as avg_rating_today,
                ROUND((COUNT(*) FILTER (WHERE rating >= 4)::decimal / NULLIF(COUNT(*), 0)) * 100, 1) as csat_percent_today
             FROM csat_surveys
             WHERE organization_id = $1 
               AND status = 'completed'
               AND responded_at >= CURRENT_DATE`,
            [organization_id]
        );

        // 5. Leaderboard (Top Agents Handling Today)
        const agentLeaderboardRes = await pool.query(
            `SELECT u.id, u.name, u.avatar_url, COALESCE(u.agent_status, 'available') as status,
                    COUNT(c.id) FILTER (WHERE c.status = 'resolved' AND c.updated_at >= CURRENT_DATE) as resolved_today,
                    COUNT(c.id) FILTER (WHERE c.status = 'open') as current_active_chats
             FROM users u
             LEFT JOIN conversations c ON c.assigned_to_agent_id = u.id AND c.organization_id = u.organization_id
             WHERE u.organization_id = $1 AND u.role IN ('agent', 'admin_member')
             GROUP BY u.id, u.name, u.avatar_url, u.agent_status
             ORDER BY resolved_today DESC, current_active_chats DESC
             LIMIT 8`,
            [organization_id]
        );

        res.json({
            queue: chatQueueRes.rows[0],
            agents: agentStatusRes.rows[0],
            sales: salesTodayRes.rows[0],
            csat: csatTodayRes.rows[0],
            leaderboard: agentLeaderboardRes.rows,
            server_time: new Date().toISOString()
        });

    } catch (err) {
        console.error('[LiveWallboard Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};
