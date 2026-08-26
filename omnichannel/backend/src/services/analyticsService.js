/**
 * Advanced Analytics Service
 * Comprehensive analytics and reporting for CRM
 */

import pool from '../config/db.js';

/**
 * Get dashboard overview metrics
 */
export const getDashboardOverview = async (organizationId, options = {}) => {
    const { startDate, endDate, agentId } = options;

    try {
        // Get daily metrics for the period
        let dateFilter = '';
        const params = [organizationId];
        let paramIdx = 2;

        if (startDate) {
            dateFilter += ` AND metric_date >= $${paramIdx}`;
            params.push(startDate);
            paramIdx++;
        }
        if (endDate) {
            dateFilter += ` AND metric_date <= $${paramIdx}`;
            params.push(endDate);
            paramIdx++;
        }

        const dailyRes = await pool.query(
            `SELECT * FROM analytics_daily_metrics
             WHERE organization_id = $1 ${dateFilter}
             ORDER BY metric_date DESC
             LIMIT 30`,
            params
        );

        // Get today's metrics
        const todayRes = await pool.query(
            `SELECT * FROM analytics_daily_metrics
             WHERE organization_id = $1 AND metric_date = CURRENT_DATE`,
            [organizationId]
        );

        // Get conversation stats from source
        const convStatsRes = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status != 'resolved') as active_conversations,
                COUNT(*) FILTER (WHERE status = 'resolved' AND closed_at >= CURRENT_DATE) as resolved_today,
                COUNT(*) FILTER (WHERE unread_count > 0) as unread_conversations,
                COUNT(*) FILTER (WHERE assigned_to_agent_id IS NULL AND status != 'resolved') as unassigned_conversations
            FROM conversations
            WHERE organization_id = $1
        `, [organizationId]);

        // Get agent stats
        const agentStatsRes = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE assigned_to_agent_id = $2) as assigned_to_agent,
                COUNT(*) FILTER (WHERE assigned_to_agent_id = $2 AND status = 'resolved' AND closed_at >= CURRENT_DATE) as resolved_by_agent
            FROM conversations
            WHERE organization_id = $1
        `, [organizationId, agentId || null]);

        return {
            dailyMetrics: dailyRes.rows,
            today: todayRes.rows[0] || getEmptyDayMetrics(),
            realtime: convStatsRes.rows[0],
            agentStats: agentId ? agentStatsRes.rows[0] : null
        };
    } catch (error) {
        console.error('[Analytics] Error getting dashboard overview:', error);
        return {
            dailyMetrics: [],
            today: getEmptyDayMetrics(),
            realtime: { active_conversations: 0, resolved_today: 0, unread_conversations: 0, unassigned_conversations: 0 },
            agentStats: null
        };
    }
};

/**
 * Get conversation analytics
 */
export const getConversationAnalytics = async (organizationId, options = {}) => {
    const { startDate, endDate, channel, agentId } = options;

    try {
        let filters = 'WHERE organization_id = $1';
        const params = [organizationId];
        let paramIdx = 2;

        if (startDate) {
            filters += ` AND created_at >= $${paramIdx}`;
            params.push(startDate);
            paramIdx++;
        }
        if (endDate) {
            filters += ` AND created_at <= $${paramIdx}`;
            params.push(endDate);
            paramIdx++;
        }
        if (channel) {
            filters += ` AND channel = $${paramIdx}`;
            params.push(channel);
            paramIdx++;
        }
        if (agentId) {
            filters += ` AND assigned_to_agent_id = $${paramIdx}`;
            params.push(agentId);
            paramIdx++;
        }

        // Volume by day
        const volumeByDay = await pool.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE unread_count > 0) as with_unread
            FROM conversations
            ${filters}
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        // Volume by channel
        const volumeByChannel = await pool.query(`
            SELECT
                COALESCE(channel, 'unknown') as channel,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                AVG(rating_score) FILTER (WHERE rating_score IS NOT NULL) as avg_rating
            FROM conversations
            ${filters}
            GROUP BY channel
            ORDER BY total DESC
        `, params);

        // Resolution rate
        const resolutionRate = await pool.query(`
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
                COUNT(*) FILTER (WHERE status = 'resolved' AND rating_score >= 4) as positive_rated,
                AVG(rating_score) FILTER (WHERE rating_score IS NOT NULL) as avg_rating
            FROM conversations
            ${filters}
        `, params);

        return {
            volumeByDay: volumeByDay.rows,
            volumeByChannel: volumeByChannel.rows,
            resolutionRate: resolutionRate.rows[0]
        };
    } catch (error) {
        console.error('[Analytics] Error getting conversation analytics:', error);
        return {
            volumeByDay: [],
            volumeByChannel: [],
            resolutionRate: { total: 0, resolved: 0, positive_rated: 0, avg_rating: null }
        };
    }
};

/**
 * Get response time analytics
 */
export const getResponseTimeAnalytics = async (organizationId, options = {}) => {
    const { startDate, endDate } = options;

    try {
        let dateFilter = '';
        const params = [organizationId];
        let paramIdx = 2;

        if (startDate) {
            dateFilter += ` AND m.created_at >= $${paramIdx}`;
            params.push(startDate);
            paramIdx++;
        }
        if (endDate) {
            dateFilter += ` AND m.created_at <= $${paramIdx}`;
            params.push(endDate);
            paramIdx++;
        }

        // Average first response time (inbound message to first agent reply)
        const firstResponse = await pool.query(`
            SELECT
                AVG(EXTRACT(EPOCH FROM (m.created_at - prev_msg.created_at))) as avg_seconds,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (m.created_at - prev_msg.created_at))) as median_seconds,
                PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (m.created_at - prev_msg.created_at))) as p90_seconds,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (m.created_at - prev_msg.created_at))) as p95_seconds
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN messages prev_msg ON c.id = prev_msg.conversation_id
            WHERE c.organization_id = $1
            AND m.from_me = true
            AND prev_msg.from_me = false
            AND prev_msg.id = (
                SELECT id FROM messages
                WHERE conversation_id = c.id AND from_me = false AND created_at < m.created_at
                ORDER BY created_at DESC LIMIT 1
            )
            ${dateFilter}
        `, params);

        // Response time by hour
        const responseByHour = await pool.query(`
            SELECT
                EXTRACT(HOUR FROM m.created_at) as hour,
                AVG(EXTRACT(EPOCH FROM (m.created_at - prev_msg.created_at))) as avg_seconds
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN messages prev_msg ON c.id = prev_msg.conversation_id
            WHERE c.organization_id = $1
            AND m.from_me = true
            AND prev_msg.from_me = false
            AND prev_msg.id = (
                SELECT id FROM messages
                WHERE conversation_id = c.id AND from_me = false AND created_at < m.created_at
                ORDER BY created_at DESC LIMIT 1
            )
            ${dateFilter}
            GROUP BY EXTRACT(HOUR FROM m.created_at)
            ORDER BY hour
        `, params);

        return {
            firstResponse: firstResponse.rows[0] || { avg_seconds: 0, median_seconds: 0, p90_seconds: 0, p95_seconds: 0 },
            responseByHour: responseByHour.rows
        };
    } catch (error) {
        console.error('[Analytics] Error getting response time analytics:', error);
        return {
            firstResponse: { avg_seconds: 0, median_seconds: 0, p90_seconds: 0, p95_seconds: 0 },
            responseByHour: []
        };
    }
};

/**
 * Get CSAT/NPS analytics
 */
export const getCsatAnalytics = async (organizationId, options = {}) => {
    const { startDate, endDate } = options;

    try {
        let dateFilter = '';
        const params = [organizationId];

        if (startDate) {
            dateFilter += ` AND created_at >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ` AND created_at <= $${params.length + 1}`;
            params.push(endDate);
        }

        // Overall CSAT
        const overallCsat = await pool.query(`
            SELECT
                COUNT(*) as total_ratings,
                AVG(rating_score) as avg_rating,
                COUNT(*) FILTER (WHERE rating_score = 5) as five_star,
                COUNT(*) FILTER (WHERE rating_score = 4) as four_star,
                COUNT(*) FILTER (WHERE rating_score = 3) as three_star,
                COUNT(*) FILTER (WHERE rating_score = 2) as two_star,
                COUNT(*) FILTER (WHERE rating_score = 1) as one_star,
                COUNT(*) FILTER (WHERE rating_score >= 4) * 100.0 / NULLIF(COUNT(*), 0) as satisfaction_rate
            FROM conversations
            WHERE organization_id = $1 AND rating_score IS NOT NULL ${dateFilter}
        `, params);

        // CSAT trend by day
        const csatTrend = await pool.query(`
            SELECT
                DATE(closed_at) as date,
                COUNT(*) as ratings,
                AVG(rating_score) as avg_rating,
                COUNT(*) FILTER (WHERE rating_score >= 4) * 100.0 / NULLIF(COUNT(*), 0) as satisfaction_rate
            FROM conversations
            WHERE organization_id = $1 AND rating_score IS NOT NULL ${dateFilter}
            GROUP BY DATE(closed_at)
            ORDER BY date DESC
            LIMIT 30
        `, params);

        return {
            overallCsat: overallCsat.rows[0] || getEmptyCsat(),
            csatTrend: csatTrend.rows
        };
    } catch (error) {
        console.error('[Analytics] Error getting CSAT analytics:', error);
        return {
            overallCsat: getEmptyCsat(),
            csatTrend: []
        };
    }
};

/**
 * Get channel performance comparison
 */
export const getChannelPerformance = async (organizationId, options = {}) => {
    const { startDate, endDate } = options;

    try {
        let dateFilter = '';
        const params = [organizationId];

        if (startDate) {
            dateFilter += ` AND c.created_at >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            dateFilter += ` AND c.created_at <= $${params.length + 1}`;
            params.push(endDate);
        }

        const channels = await pool.query(`
            SELECT
                c.channel,
                COUNT(*) as total_conversations,
                COUNT(*) FILTER (WHERE c.status = 'resolved') as resolved,
                AVG(EXTRACT(EPOCH FROM (c.closed_at - c.created_at))) FILTER (WHERE c.closed_at IS NOT NULL) as avg_resolution_seconds,
                AVG(c.rating_score) FILTER (WHERE c.rating_score IS NOT NULL) as avg_rating
            FROM conversations c
            WHERE c.organization_id = $1 ${dateFilter}
            GROUP BY c.channel
            ORDER BY total_conversations DESC
        `, params);

        return { channels: channels.rows };
    } catch (error) {
        console.error('[Analytics] Error getting channel performance:', error);
        return { channels: [] };
    }
};

/**
 * Get peak hours analysis
 */
export const getPeakHoursAnalysis = async (organizationId) => {
    try {
        const hourlyVolume = await pool.query(`
            SELECT
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as conversations,
                COUNT(DISTINCT assigned_to_agent_id) as active_agents
            FROM conversations
            WHERE organization_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
        `, [organizationId]);

        const messageVolume = await pool.query(`
            SELECT
                EXTRACT(HOUR FROM m.created_at) as hour,
                COUNT(*) FILTER (WHERE m.from_me = false) as inbound,
                COUNT(*) FILTER (WHERE m.from_me = true) as outbound
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.organization_id = $1 AND m.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM m.created_at)
            ORDER BY hour
        `, [organizationId]);

        return {
            conversationVolume: hourlyVolume.rows,
            messageVolume: messageVolume.rows
        };
    } catch (error) {
        console.error('[Analytics] Error getting peak hours:', error);
        return { conversationVolume: [], messageVolume: [] };
    }
};

/**
 * Get real-time queue and agent metrics (for live dashboard)
 */
export const getRealtimeQueueMetrics = async (organizationId) => {
    try {
        // Current queue state
        const queueRes = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status != 'resolved') as total_open,
                COUNT(*) FILTER (WHERE status != 'resolved' AND assigned_to_agent_id IS NULL) as unassigned,
                COUNT(*) FILTER (WHERE status != 'resolved' AND unread_count > 0) as with_unread,
                COUNT(*) FILTER (WHERE
                    status != 'resolved'
                    AND created_at <= NOW() - INTERVAL '30 minutes'
                    AND NOT EXISTS (
                        SELECT 1 FROM messages m
                        WHERE m.conversation_id = conversations.id
                        AND m.from_me = true
                        AND m.created_at >= NOW() - INTERVAL '30 minutes'
                    )
                ) as waiting_long,
                COUNT(*) FILTER (WHERE status = 'resolved' AND closed_at >= CURRENT_DATE) as resolved_today,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_today
            FROM conversations
            WHERE organization_id = $1
        `, [organizationId]);

        // Queue by channel
        const byChannelRes = await pool.query(`
            SELECT
                COALESCE(channel, 'unknown') as channel,
                COUNT(*) as open_count,
                COUNT(*) FILTER (WHERE assigned_to_agent_id IS NULL) as unassigned
            FROM conversations
            WHERE organization_id = $1 AND status != 'resolved'
            GROUP BY channel
            ORDER BY open_count DESC
        `, [organizationId]);

        // Agent live status
        const agentsRes = await pool.query(`
            SELECT
                u.id,
                u.name,
                u.is_online,
                u.avatar_url,
                COUNT(c.id) FILTER (WHERE c.status != 'resolved') as open_count,
                COUNT(c.id) FILTER (WHERE c.status = 'resolved' AND c.closed_at >= CURRENT_DATE) as resolved_today
            FROM users u
            LEFT JOIN conversations c ON c.assigned_to_agent_id = u.id AND c.organization_id = $1
            WHERE u.organization_id = $1
            AND u.role NOT IN ('super_admin')
            GROUP BY u.id, u.name, u.is_online, u.avatar_url
            ORDER BY u.is_online DESC NULLS LAST, open_count DESC
        `, [organizationId]);

        // Today's CSAT
        const csatTodayRes = await pool.query(`
            SELECT
                AVG(rating_score) as avg_rating,
                COUNT(*) as total_ratings
            FROM conversations
            WHERE organization_id = $1
            AND rating_score IS NOT NULL
            AND closed_at >= CURRENT_DATE
        `, [organizationId]);

        const q = queueRes.rows[0];
        return {
            queue: {
                total_open: parseInt(q.total_open || 0),
                unassigned: parseInt(q.unassigned || 0),
                with_unread: parseInt(q.with_unread || 0),
                waiting_long: parseInt(q.waiting_long || 0),
                resolved_today: parseInt(q.resolved_today || 0),
                new_today: parseInt(q.new_today || 0),
                by_channel: byChannelRes.rows.map(r => ({
                    channel: r.channel,
                    open_count: parseInt(r.open_count || 0),
                    unassigned: parseInt(r.unassigned || 0)
                }))
            },
            agents: agentsRes.rows.map(r => ({
                id: r.id,
                name: r.name,
                is_online: r.is_online || false,
                avatar_url: r.avatar_url,
                open_count: parseInt(r.open_count || 0),
                resolved_today: parseInt(r.resolved_today || 0)
            })),
            csat_today: {
                avg_rating: parseFloat(csatTodayRes.rows[0]?.avg_rating || 0).toFixed(1),
                total_ratings: parseInt(csatTodayRes.rows[0]?.total_ratings || 0)
            }
        };
    } catch (error) {
        console.error('[Analytics] Error getting realtime metrics:', error);
        return {
            queue: { total_open: 0, unassigned: 0, with_unread: 0, waiting_long: 0, resolved_today: 0, new_today: 0, by_channel: [] },
            agents: [],
            csat_today: { avg_rating: '0.0', total_ratings: 0 }
        };
    }
};

// Helper functions
const getEmptyDayMetrics = () => ({
    total_conversations: 0,
    new_conversations: 0,
    resolved_conversations: 0,
    avg_first_response_time_seconds: 0,
    avg_response_time_seconds: 0,
    total_ratings: 0,
    avg_rating: 0,
    csat_score: 0,
    total_messages: 0
});

const getEmptyCsat = () => ({
    total_ratings: 0,
    avg_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
    satisfaction_rate: 0
});