/**
 * Live Wallboard & Real-time Operations Controller
 * Provides high-speed aggregate metrics for office TV screens / wallboards
 */
import pool from '../config/db.js';

let wallboardSchemaChecked = false;

// Self-healing schema for Live Wallboard dependencies
export const ensureWallboardSchema = async () => {
    if (wallboardSchemaChecked) return;
    try {
        await pool.query(`
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status VARCHAR(20) DEFAULT 'available';
            ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
            CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (organization_id, updated_at);
            CREATE INDEX IF NOT EXISTS idx_conversations_closed_at ON conversations (organization_id, closed_at);
        `);
        wallboardSchemaChecked = true;
    } catch (e) {
        console.error('[Wallboard] ensureWallboardSchema error:', e.message);
    }
};

ensureWallboardSchema().catch(() => {});

export const getLiveWallboardMetrics = async (req, res) => {
    const { organization_id } = req.user;

    try {
        await ensureWallboardSchema();

        // 1. Live Chat Queues & Statuses
        // Use COALESCE(closed_at, updated_at, created_at) to accurately catch chats resolved today
        const chatQueueRes = await pool.query(
            `SELECT 
                COUNT(*) as total_active_chats,
                COUNT(*) FILTER (WHERE status = 'unassigned' OR assigned_to_agent_id IS NULL) as unassigned_queue,
                COUNT(*) FILTER (WHERE status = 'open' AND assigned_to_agent_id IS NOT NULL) as handling_chats,
                COUNT(*) FILTER (WHERE status = 'resolved' AND COALESCE(closed_at, updated_at, created_at) >= CURRENT_DATE) as resolved_today
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
        let salesTodayRes = { rows: [{ invoices_paid_today: 0, total_revenue_today: 0 }] };
        try {
            salesTodayRes = await pool.query(
                `SELECT 
                    COUNT(*) as invoices_paid_today,
                    COALESCE(SUM(COALESCE(paid_amount, total_amount, 0)), 0) as total_revenue_today
                 FROM invoices
                 WHERE organization_id = $1 
                   AND status = 'paid' 
                   AND COALESCE(updated_at, created_at) >= CURRENT_DATE`,
                [organization_id]
            );
        } catch (salesErr) {
            console.warn('[Wallboard] Sales metric warning:', salesErr.message);
        }

        // 4. CSAT Score Today
        let csatTodayRes = { rows: [{ responses_today: 0, avg_rating_today: 5.0, csat_percent_today: 100 }] };
        try {
            csatTodayRes = await pool.query(
                `SELECT 
                    COUNT(*) as responses_today,
                    ROUND(COALESCE(AVG(rating), 5.0), 2) as avg_rating_today,
                    ROUND((COUNT(*) FILTER (WHERE rating >= 4)::decimal / NULLIF(COUNT(*), 0)) * 100, 1) as csat_percent_today
                 FROM csat_surveys
                 WHERE organization_id = $1 
                   AND status = 'completed'
                   AND responded_at >= CURRENT_DATE`,
                [organization_id]
            );
        } catch (csatErr) {
            console.warn('[Wallboard] CSAT metric warning:', csatErr.message);
        }

        // 5. Leaderboard (Top Agents Handling Today)
        let agentLeaderboardRes = { rows: [] };
        try {
            agentLeaderboardRes = await pool.query(
                `SELECT u.id, u.name, COALESCE(u.profile_pic_url, '') as avatar_url, COALESCE(u.agent_status, 'available') as status,
                        COUNT(c.id) FILTER (WHERE c.status = 'resolved' AND COALESCE(c.closed_at, c.updated_at, c.created_at) >= CURRENT_DATE) as resolved_today,
                        COUNT(c.id) FILTER (WHERE c.status = 'open') as current_active_chats
                 FROM users u
                 LEFT JOIN conversations c ON c.assigned_to_agent_id = u.id AND c.organization_id = u.organization_id
                 WHERE u.organization_id = $1 AND u.role IN ('agent', 'admin_member')
                 GROUP BY u.id, u.name, u.profile_pic_url, u.agent_status
                 ORDER BY resolved_today DESC, current_active_chats DESC
                 LIMIT 8`,
                [organization_id]
            );
        } catch (lbErr) {
            console.warn('[Wallboard] Leaderboard metric warning:', lbErr.message);
        }

        res.json({
            queue: chatQueueRes.rows[0] || { total_active_chats: 0, unassigned_queue: 0, handling_chats: 0, resolved_today: 0 },
            agents: agentStatusRes.rows[0] || { total_agents: 0, available_agents: 0, busy_agents: 0, away_agents: 0, offline_agents: 0 },
            sales: salesTodayRes.rows[0] || { invoices_paid_today: 0, total_revenue_today: 0 },
            csat: csatTodayRes.rows[0] || { responses_today: 0, avg_rating_today: 5.0, csat_percent_today: 100 },
            leaderboard: agentLeaderboardRes.rows || [],
            server_time: new Date().toISOString()
        });

    } catch (err) {
        console.error('[LiveWallboard Error]:', err.message);
        res.json({
            queue: { total_active_chats: 0, unassigned_queue: 0, handling_chats: 0, resolved_today: 0 },
            agents: { total_agents: 0, available_agents: 0, busy_agents: 0, away_agents: 0, offline_agents: 0 },
            sales: { invoices_paid_today: 0, total_revenue_today: 0 },
            csat: { responses_today: 0, avg_rating_today: 5.0, csat_percent_today: 100 },
            leaderboard: [],
            server_time: new Date().toISOString()
        });
    }
};
