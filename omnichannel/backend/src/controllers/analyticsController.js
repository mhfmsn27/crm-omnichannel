import pool from '../config/db.js';
import * as XLSX from 'xlsx';

// Helper: Calculate percentage change
const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

// Helper: Get Date Range for Previous Period
const getPreviousPeriod = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays);

    return {
        prevStart: prevStart.toISOString().split('T')[0],
        prevEnd: prevEnd.toISOString().split('T')[0]
    };
};

export const getAnalytics = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate, agentId, channel } = req.query; // YYYY-MM-DD

    if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
    }

    const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate);

    // Determine grouping interval
    const start = new Date(startDate);
    const end = new Date(endDate);
    const isSingleDay = (end - start) <= (1000 * 60 * 60 * 24);
    const interval = isSingleDay ? 'hour' : 'day';
    const dateFormat = isSingleDay ? 'HH:00' : 'YYYY-MM-DD';
    // Whitelist validation — these are ternary-computed, but guard against future modifications
    if (!['hour', 'day'].includes(interval) || !['HH:00', 'YYYY-MM-DD'].includes(dateFormat)) {
        throw new Error('Invalid interval or dateFormat value');
    }

    try {
        const client = await pool.connect();
        try {
            // FILTER VALUES
            let filterParams = [organization_id, startDate, endDate];
            let paramIdx = 4;

            let extraFilter = "";
            let extraParams = [];

            if (agentId && agentId !== 'all') {
                // For general conversation metrics, if agent is selected:
                // We check if the conversation was assigned to OR closed by this agent.
                extraFilter += ` AND (c.assigned_to_agent_id = $${paramIdx} OR c.closed_by = $${paramIdx})`;
                extraParams.push(agentId);
                paramIdx++;
            }
            if (channel && channel !== 'all') {
                extraFilter += ` AND c.channel = $${paramIdx}`;
                extraParams.push(channel);
                paramIdx++;
            }

            const allParams = [...filterParams, ...extraParams];

            // 1. SUMMARY METRICS (Current Period)
            // We calculate everything in one pass using aggregations if possible.

            // CONVERSATION & MESSAGE STATS
            const metricsQuery = `
                WITH conversation_stats AS (
                    SELECT 
                        c.id,
                        c.status,
                        c.created_at,
                        c.closed_at,
                        c.rating_score,
                        c.assigned_to_agent_id,
                        (
                            SELECT MIN(m.created_at) 
                            FROM messages m 
                            WHERE m.conversation_id = c.id 
                            AND m.from_me = true
                            AND m.created_at > c.created_at
                        ) as first_reply_at
                    FROM conversations c
                    WHERE c.organization_id = $1
                    AND c.created_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                    ${extraFilter}
                ),
                message_stats AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE from_me = false) as incoming,
                        COUNT(*) FILTER (WHERE from_me = true) as outgoing
                    FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id
                    WHERE m.organization_id = $1
                    AND m.created_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                    ${extraFilter}
                )
                SELECT 
                    (SELECT COUNT(*) FROM conversation_stats) as total,
                    (SELECT COUNT(*) FROM conversation_stats WHERE status = 'resolved') as resolved,
                    (SELECT COUNT(*) FROM conversation_stats WHERE status != 'resolved' AND assigned_to_agent_id IS NULL) as unassigned,
                    (SELECT incoming FROM message_stats) as msg_incoming,
                    (SELECT outgoing FROM message_stats) as msg_outgoing,
                    
                    -- Avg Resolution Time (for resolved only)
                    (SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/60) FROM conversation_stats WHERE status = 'resolved') as avg_duration_mins,
                    -- Avg Wait Time (FRT)
                    (SELECT AVG(EXTRACT(EPOCH FROM (first_reply_at - created_at))/60) FROM conversation_stats WHERE first_reply_at IS NOT NULL) as avg_wait_mins,
                    -- SLA Compliance (FRT <= 15 mins)
                    (SELECT COUNT(*) FROM conversation_stats WHERE first_reply_at IS NOT NULL AND EXTRACT(EPOCH FROM (first_reply_at - created_at))/60 <= 15) as sla_passed,
                    (SELECT COUNT(*) FROM conversation_stats WHERE first_reply_at IS NOT NULL AND EXTRACT(EPOCH FROM (first_reply_at - created_at))/60 > 15) as sla_breached,
                    -- Rating
                    (SELECT AVG(rating_score) FROM conversation_stats WHERE rating_score IS NOT NULL) as avg_rating,
                    -- FCR: resolved same day as created
                    (SELECT COUNT(*) FROM conversation_stats cs2
                     WHERE cs2.status = 'resolved' AND cs2.closed_at IS NOT NULL
                     AND DATE(cs2.created_at) = DATE(cs2.closed_at)) as fcr_count,
                    -- Resolution SLA (8 hours)
                    (SELECT COUNT(*) FROM conversation_stats cs3
                     WHERE cs3.status = 'resolved' AND cs3.closed_at IS NOT NULL
                     AND EXTRACT(EPOCH FROM (cs3.closed_at - cs3.created_at))/3600 <= 8) as res_sla_ok,
                    (SELECT COUNT(*) FROM conversation_stats cs4
                     WHERE cs4.status = 'resolved' AND cs4.closed_at IS NOT NULL
                     AND EXTRACT(EPOCH FROM (cs4.closed_at - cs4.created_at))/3600 > 8) as res_sla_fail,
                    -- SLA breach reasons
                    (SELECT COUNT(*) FROM conversation_stats cs5
                     WHERE cs5.first_reply_at IS NOT NULL
                     AND EXTRACT(EPOCH FROM (cs5.first_reply_at - cs5.created_at))/60 > 15
                     AND cs5.assigned_to_agent_id IS NULL) as breach_unassigned,
                    (SELECT COUNT(*) FROM conversation_stats cs6
                     WHERE cs6.first_reply_at IS NOT NULL
                     AND EXTRACT(EPOCH FROM (cs6.first_reply_at - cs6.created_at))/60 > 15
                     AND cs6.assigned_to_agent_id IS NOT NULL) as breach_assigned,
                    (SELECT COUNT(*) FROM conversation_stats cs7
                     WHERE cs7.first_reply_at IS NOT NULL
                     AND EXTRACT(EPOCH FROM (cs7.first_reply_at - cs7.created_at))/60 > 15
                     AND (EXTRACT(HOUR FROM cs7.created_at) >= 17 OR EXTRACT(HOUR FROM cs7.created_at) < 8)) as breach_after_hours
            `;

            // Calculate Previous Metrics (Simplified)
            const prevMetricsQuery = `
                 WITH conversation_stats AS (
                    SELECT c.id, c.status, c.rating_score
                    FROM conversations c
                    WHERE c.organization_id = $1
                    AND c.created_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                    ${extraFilter}
                ),
                message_stats AS (
                    SELECT 
                        COUNT(*) FILTER (WHERE from_me = false) as incoming,
                        COUNT(*) FILTER (WHERE from_me = true) as outgoing
                    FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id
                    WHERE m.organization_id = $1
                    AND m.created_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                    ${extraFilter}
                )
                SELECT 
                    (SELECT COUNT(*) FROM conversation_stats) as total,
                    (SELECT COUNT(*) FROM conversation_stats WHERE status = 'resolved') as resolved,
                    (SELECT incoming FROM message_stats) as msg_incoming,
                    (SELECT outgoing FROM message_stats) as msg_outgoing,
                    (SELECT AVG(rating_score) FROM conversation_stats WHERE rating_score IS NOT NULL) as avg_rating
            `;

            const currentRes = await client.query(metricsQuery, allParams);

            // Prepare prev params: [org, prevStart, prevEnd, ...extras]
            const prevParams = [organization_id, prevStart, prevEnd, ...extraParams];

            const prevRes = await client.query(prevMetricsQuery, prevParams);

            const curr = currentRes.rows[0];
            const prev = prevRes.rows[0];

            // 2. CHART DATA (Hourly/Daily)
            const chartSql = `
                SELECT 
                    to_char(series, '${dateFormat}') as time,
                    COUNT(DISTINCT c.id) as total,
                    COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_to_agent_id IS NOT NULL) as assigned,
                    COUNT(DISTINCT c.id) FILTER (WHERE c.assigned_to_agent_id IS NULL) as unassigned,
                    COUNT(m.id) FILTER (WHERE m.from_me = false) as incoming,
                    COUNT(m.id) FILTER (WHERE m.from_me = true) as outgoing,
                    COALESCE(AVG(c.rating_score), 0) as rating
                FROM generate_series(
                    $2::timestamp, 
                    $3::timestamp + interval '1 day' - interval '1 second', 
                    '1 ${interval}'
                ) as series
                LEFT JOIN conversations c ON date_trunc('${interval}', c.created_at) = series 
                    AND c.organization_id = $1 ${extraFilter}
                LEFT JOIN messages m ON date_trunc('${interval}', m.created_at) = series
                    AND m.organization_id = $1
                    AND m.conversation_id = c.id -- Join messages belonging to these convs? 
                    -- WAIT: Chart logic is tricky. 
                    -- We want messages in that hour regardless of conversation creation time?
                    -- Usually yes.
                    -- If we join c, we restrict to convs started in that hour. That's WRONG for messages.
                -- CORRECT LOGIC: Split series joins
                LEFT JOIN messages m_direct ON date_trunc('${interval}', m_direct.created_at) = series 
                    AND m_direct.organization_id = $1
                GROUP BY 1
                ORDER BY 1 ASC
            `;

            // REFINED CHART QUERY
            // Providing mixed stats in one query is hard with simple joins. 
            // Better to use CTEs for clean separation.
            const chartSqlRefined = `
                WITH series AS (
                    SELECT generate_series(
                        $2::timestamp, 
                        $3::timestamp + interval '1 day' - interval '1 second', 
                        '1 ${interval}'
                    ) as time_slot
                ),
                conv_counts AS (
                    SELECT 
                        date_trunc('${interval}', created_at) as t,
                        COUNT(id) as total,
                        COUNT(id) FILTER (WHERE assigned_to_agent_id IS NOT NULL) as assigned,
                        COUNT(id) FILTER (WHERE assigned_to_agent_id IS NULL) as unassigned,
                        AVG(rating_score) as rating
                    FROM conversations c
                    WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3::timestamp + interval '1 day'
                    ${extraFilter}
                    GROUP BY 1
                ),
                msg_counts AS (
                    SELECT 
                        date_trunc('${interval}', m.created_at) as t,
                        COUNT(m.id) FILTER (WHERE from_me = false) as incoming,
                        COUNT(m.id) FILTER (WHERE from_me = true) as outgoing
                    FROM messages m
                    JOIN conversations c ON m.conversation_id = c.id -- Join to apply filters
                    WHERE m.organization_id = $1 AND m.created_at BETWEEN $2 AND $3::timestamp + interval '1 day'
                    ${extraFilter}
                    GROUP BY 1
                )
                SELECT 
                    to_char(s.time_slot, '${dateFormat}') as time,
                    COALESCE(cc.total, 0) as total,
                    COALESCE(cc.assigned, 0) as assigned,
                    COALESCE(cc.unassigned, 0) as unassigned,
                    COALESCE(mc.incoming, 0) as incoming,
                    COALESCE(mc.outgoing, 0) as outgoing,
                    COALESCE(cc.rating, 0) as rating
                FROM series s
                LEFT JOIN conv_counts cc ON cc.t = s.time_slot
                LEFT JOIN msg_counts mc ON mc.t = s.time_slot
                ORDER BY s.time_slot ASC
            `;

            const chartRes = await client.query(chartSqlRefined, allParams);

            // 3. AGENT PERFORMANCE & SLA BREAKDOWN
            // ... (rest same as before)

            // 3. AGENT PERFORMANCE & SLA BREAKDOWN
            // We need advanced stats per agent
            // Note: We use 'closed_by' for resolution stats, but 'assigned_to' could also be relevant.
            // Sticking to 'closed_by' for resolution counts as before, but for SLA we might need 'first responder'.
            // To simplify, we'll attribute SLA to the agent who 'owns' the ticket (assigned_to) or closed it.

            const agentStatsQuery = `
                WITH agent_convs AS (
                    SELECT
                        c.id,
                        c.closed_by as agent_id,
                        c.rating_score,
                        c.created_at,
                        c.closed_at,
                        (
                            SELECT MIN(m.created_at)
                            FROM messages m
                            WHERE m.conversation_id = c.id
                            AND m.from_me = true
                            AND m.created_at > c.created_at
                        ) as first_reply_at
                    FROM conversations c
                    WHERE c.organization_id = $1
                    AND c.closed_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                    AND c.closed_by IS NOT NULL
                    ${channel && channel !== 'all' ? `AND c.channel = $4` : ''}
                )
                SELECT
                    u.id,
                    u.name as agent_name,
                    COUNT(ac.id) as resolved_count,
                    COALESCE(AVG(ac.rating_score), 0) as avg_rating,
                    COUNT(ac.rating_score) as rated_count,
                    COUNT(ac.rating_score) FILTER (WHERE ac.rating_score = 1) as star_1,
                    COUNT(ac.rating_score) FILTER (WHERE ac.rating_score = 2) as star_2,
                    COUNT(ac.rating_score) FILTER (WHERE ac.rating_score = 3) as star_3,
                    COUNT(ac.rating_score) FILTER (WHERE ac.rating_score = 4) as star_4,
                    COUNT(ac.rating_score) FILTER (WHERE ac.rating_score = 5) as star_5,
                    -- SLA FRT (15 min)
                    COUNT(ac.id) FILTER (WHERE ac.first_reply_at IS NOT NULL AND EXTRACT(EPOCH FROM (ac.first_reply_at - ac.created_at))/60 <= 15) as sla_ok,
                    COUNT(ac.id) FILTER (WHERE ac.first_reply_at IS NOT NULL AND EXTRACT(EPOCH FROM (ac.first_reply_at - ac.created_at))/60 > 15) as sla_fail,
                    -- Avg First Response Time per agent (minutes)
                    COALESCE(AVG(EXTRACT(EPOCH FROM (ac.first_reply_at - ac.created_at))/60) FILTER (WHERE ac.first_reply_at IS NOT NULL), 0) as avg_frt_mins,
                    -- FCR: resolved same day as created
                    COUNT(ac.id) FILTER (WHERE ac.closed_at IS NOT NULL AND DATE(ac.created_at) = DATE(ac.closed_at)) as fcr_count,
                    -- Resolution Time SLA (8 hours)
                    COUNT(ac.id) FILTER (WHERE ac.closed_at IS NOT NULL AND EXTRACT(EPOCH FROM (ac.closed_at - ac.created_at))/3600 <= 8) as res_sla_ok,
                    COUNT(ac.id) FILTER (WHERE ac.closed_at IS NOT NULL AND EXTRACT(EPOCH FROM (ac.closed_at - ac.created_at))/3600 > 8) as res_sla_fail,
                    -- Avg resolution time (minutes)
                    COALESCE(AVG(EXTRACT(EPOCH FROM (ac.closed_at - ac.created_at))/60) FILTER (WHERE ac.closed_at IS NOT NULL), 0) as avg_resolution_mins,
                    -- Total assigned in period
                    (SELECT COUNT(*) FROM conversations ca
                     WHERE ca.organization_id = $1
                     AND ca.assigned_to_agent_id = u.id
                     AND ca.created_at BETWEEN $2 AND $3::timestamp + interval '1 day') as total_assigned,
                    -- Currently open conversations
                    (SELECT COUNT(*) FROM conversations co
                     WHERE co.organization_id = $1
                     AND co.assigned_to_agent_id = u.id
                     AND co.status != 'resolved') as open_count
                FROM users u
                LEFT JOIN agent_convs ac ON ac.agent_id = u.id
                WHERE u.organization_id = $1
                GROUP BY u.id, u.name
                ORDER BY resolved_count DESC
            `;

            const agentQueryParams = channel && channel !== 'all'
                ? [organization_id, startDate, endDate, channel]
                : [organization_id, startDate, endDate];
            const agentRes = await client.query(agentStatsQuery, agentQueryParams);

            // 4. Pie Chart (Already got counts in summary)

            // 5. Recent Feedback
            const feedbackSql = `
                SELECT
                    c.rating_score,
                    c.rating_feedback,
                    c.closed_at,
                    u.name as agent_name,
                    contact.name as contact_name
                FROM conversations c
                LEFT JOIN users u ON c.closed_by = u.id
                LEFT JOIN contacts contact ON c.contact_id = contact.id
                WHERE c.organization_id = $1
                AND c.rating_score IS NOT NULL
                AND c.closed_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                ${channel && channel !== 'all' ? `AND c.channel = $4` : ''}
                ORDER BY c.closed_at DESC
                LIMIT 5
            `;
            const feedbackQueryParams = channel && channel !== 'all'
                ? [organization_id, startDate, endDate, channel]
                : [organization_id, startDate, endDate];
            const feedbackRes = await client.query(feedbackSql, feedbackQueryParams);

            // Format Responses

            // Calculate SLA Rate
            const slaTotal = parseInt(curr.sla_passed || 0) + parseInt(curr.sla_breached || 0);
            const slaRate = slaTotal > 0 ? (parseInt(curr.sla_passed) / slaTotal) * 100 : 100;

            const response = {
                summary: {
                    total_conversations: {
                        value: parseInt(curr.total || 0),
                        trend: calculateTrend(parseInt(curr.total), parseInt(prev.total))
                    },
                    new_conversations: {
                        value: parseInt(curr.total || 0),
                        trend: calculateTrend(parseInt(curr.total), parseInt(prev.total))
                    },
                    incoming_messages: {
                        value: parseInt(curr.msg_incoming || 0),
                        trend: calculateTrend(parseInt(curr.msg_incoming), parseInt(prev.msg_incoming))
                    },
                    outgoing_messages: {
                        value: parseInt(curr.msg_outgoing || 0),
                        trend: calculateTrend(parseInt(curr.msg_outgoing), parseInt(prev.msg_outgoing))
                    },
                    resolved_conversations: {
                        value: parseInt(curr.resolved || 0),
                        trend: calculateTrend(parseInt(curr.resolved), parseInt(prev.resolved))
                    },
                    unresolved_conversations: {
                        value: parseInt(curr.total || 0) - parseInt(curr.resolved || 0)
                    },
                    avg_response_time: {
                        value: `${parseFloat(curr.avg_wait_mins || 0).toFixed(1)}m`,
                        trend: 0
                    },
                    avg_duration_time: {
                        value: `${parseFloat(curr.avg_duration_mins || 0).toFixed(0)}m`,
                        trend: 0
                    },
                    avg_wait_time: {
                        value: `${parseFloat(curr.avg_wait_mins || 0).toFixed(1)}m`,
                        trend: 0
                    },
                    csat_score: {
                        value: parseFloat(curr.avg_rating || 0).toFixed(1),
                        trend: calculateTrend(parseFloat(curr.avg_rating), parseFloat(prev.avg_rating))
                    },
                    counts: {
                        resolved: parseInt(curr.resolved || 0),
                        unassigned: parseInt(curr.unassigned || 0)
                    },
                    sla: {
                        rate: slaRate.toFixed(1),
                        passed: parseInt(curr.sla_passed || 0),
                        breached: parseInt(curr.sla_breached || 0),
                        breach_unassigned: parseInt(curr.breach_unassigned || 0),
                        breach_assigned: parseInt(curr.breach_assigned || 0),
                        breach_after_hours: parseInt(curr.breach_after_hours || 0)
                    },
                    fcr: {
                        count: parseInt(curr.fcr_count || 0),
                        rate: parseInt(curr.resolved || 0) > 0
                            ? Math.round((parseInt(curr.fcr_count || 0) / parseInt(curr.resolved || 0)) * 100)
                            : 0
                    },
                    resolution_sla: {
                        ok: parseInt(curr.res_sla_ok || 0),
                        fail: parseInt(curr.res_sla_fail || 0),
                        rate: (parseInt(curr.res_sla_ok || 0) + parseInt(curr.res_sla_fail || 0)) > 0
                            ? Math.round((parseInt(curr.res_sla_ok || 0) / (parseInt(curr.res_sla_ok || 0) + parseInt(curr.res_sla_fail || 0))) * 100)
                            : 100,
                        threshold_hours: 8
                    }
                },
                main_chart: chartRes.rows.map(r => ({
                    time: r.time,
                    total: parseInt(r.total || 0),
                    assigned: parseInt(r.assigned || 0),
                    unassigned: parseInt(r.unassigned || 0),
                    incoming: parseInt(r.incoming || 0),
                    outgoing: parseInt(r.outgoing || 0),
                    new: parseInt(r.total || 0), // Mapping total to new for existing frontend compatibility
                    rating: parseFloat(r.rating || 0).toFixed(1)
                })),
                agent_performance: agentRes.rows.map(r => ({
                    ...r,
                    avg_rating: parseFloat(r.avg_rating || 0).toFixed(1),
                    avg_frt_mins: r.avg_frt_mins ? parseFloat(r.avg_frt_mins).toFixed(1) : null,
                    avg_resolution_mins: r.avg_resolution_mins ? parseFloat(r.avg_resolution_mins).toFixed(0) : null,
                    fcr_count: parseInt(r.fcr_count || 0),
                    res_sla_ok: parseInt(r.res_sla_ok || 0),
                    res_sla_fail: parseInt(r.res_sla_fail || 0),
                    total_assigned: parseInt(r.total_assigned || 0),
                    open_count: parseInt(r.open_count || 0),
                    resolution_rate: parseInt(r.total_assigned || 0) > 0
                        ? Math.round((parseInt(r.resolved_count || 0) / parseInt(r.total_assigned || 0)) * 100)
                        : 0
                })),
                pie_chart: {
                    done: parseInt(curr.resolved || 0),
                    not_done: (parseInt(curr.total || 0) - parseInt(curr.resolved || 0))
                },
                recent_feedback: feedbackRes.rows
            };

            res.json(response);

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// ... existing getAnalytics ...

// EXPORT TO EXCEL
// import * as XLSX from 'xlsx'; (Removed, moved to top)

export const exportGeneralAnalytics = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: "Dates required" });

    try {
        const client = await pool.connect();
        try {
            // Re-fetch Chart Data for the export (Daily Stats)
            const sql = `
                SELECT 
                    to_char(series, 'YYYY-MM-DD') as date,
                    COUNT(m.id) FILTER (WHERE m.from_me = false) as incoming,
                    COUNT(m.id) FILTER (WHERE m.from_me = true) as outgoing,
                    COUNT(DISTINCT m.conversation_id) as active_conversations
                FROM generate_series(
                    $2::timestamp, 
                    $3::timestamp + interval '1 day' - interval '1 second', 
                    '1 day'
                ) as series
                LEFT JOIN messages m ON date_trunc('day', m.created_at) = series 
                    AND m.organization_id = $1
                GROUP BY 1
                ORDER BY 1 ASC
            `;
            const result = await client.query(sql, [organization_id, startDate, endDate]);

            // Transform for Excel
            const data = result.rows.map(r => ({
                Date: r.date,
                "Incoming Messages": parseInt(r.incoming),
                "Outgoing Messages": parseInt(r.outgoing),
                "Active Conversations": parseInt(r.active_conversations)
            }));

            // Create Workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // Add Summary Row (optional, maybe at top?)
            // For now, just raw data
            XLSX.utils.book_append_sheet(wb, ws, "General Report");

            // Write to buffer
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', `attachment; filename="General_Report_${startDate}_${endDate}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buf);

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// EXPORT: AGENT PERFORMANCE & SLA
export const exportAgentPerformance = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Dates required" });

    try {
        const client = await pool.connect();
        try {
            const sql = `
                    SELECT 
                        u.name as agent_name,
                        COUNT(c.id) as resolved_count,
                        COALESCE(AVG(c.rating_score), 0) as avg_rating,
                        COUNT(c.rating_score) as rated_count,
                        COUNT(c.rating_score) FILTER (WHERE c.rating_score = 1) as star_1,
                        COUNT(c.rating_score) FILTER (WHERE c.rating_score = 2) as star_2,
                        COUNT(c.rating_score) FILTER (WHERE c.rating_score = 3) as star_3,
                        COUNT(c.rating_score) FILTER (WHERE c.rating_score = 4) as star_4,
                        COUNT(c.rating_score) FILTER (WHERE c.rating_score = 5) as star_5
                    FROM users u
                    LEFT JOIN conversations c ON c.closed_by = u.id 
                        AND c.closed_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                        AND c.organization_id = $1
                    WHERE u.organization_id = $1
                    GROUP BY u.id, u.name
                    ORDER BY resolved_count DESC
                `;
            const result = await client.query(sql, [organization_id, startDate, endDate]);

            const data = result.rows.map(r => ({
                "Agent Name": r.agent_name,
                "Resolved Chats": parseInt(r.resolved_count),
                "Avg Rating": parseFloat(r.avg_rating).toFixed(1),
                "Total Ratings": parseInt(r.rated_count),
                "5 Star": parseInt(r.star_5),
                "4 Star": parseInt(r.star_4),
                "3 Star": parseInt(r.star_3),
                "2 Star": parseInt(r.star_2),
                "1 Star": parseInt(r.star_1)
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Agent Performance");
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', `attachment; filename="Agent_Performance_${startDate}_${endDate}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buf);
        } finally { client.release(); }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// EXPORT: RESPONDER HISTORY
export const exportResponderHistory = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate, channel } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ error: "Dates required" });

    try {
        const client = await pool.connect();
        try {
            const sql = `
                    SELECT 
                        c.rating_score, 
                        c.rating_feedback,
                        c.closed_at,
                        u.name as agent_name,
                        contact.name as contact_name
                    FROM conversations c
                    LEFT JOIN users u ON c.closed_by = u.id
                    LEFT JOIN contacts contact ON c.contact_id = contact.id
                    WHERE c.organization_id = $1
                    AND c.rating_score IS NOT NULL
                    AND c.closed_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                    ${channel && channel !== 'all' ? `AND c.channel = $4` : ''}
                    ORDER BY c.closed_at DESC
                `;
            // REMOVED LIMIT FOR EXPORT
            const exportQueryParams = channel && channel !== 'all'
                ? [organization_id, startDate, endDate, channel]
                : [organization_id, startDate, endDate];
            const result = await client.query(sql, exportQueryParams);

            const data = result.rows.map(r => ({
                "Date": r.closed_at,
                "Customer": r.contact_name,
                "Agent": r.agent_name || 'System',
                "Rating": r.rating_score,
                "Feedback": r.rating_feedback
            }));

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Responder History");
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', `attachment; filename="Responder_History_${startDate}_${endDate}.xlsx"`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buf);
        } finally { client.release(); }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const getResponderHistory = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate, channel } = req.query;

    if (!startDate || !endDate) return res.status(400).json({ error: "Dates required" });

    try {
        const client = await pool.connect();
        try {
            const sql = `
                SELECT 
                    c.rating_score, 
                    c.rating_feedback,
                    c.closed_at,
                    u.name as agent_name,
                    contact.name as contact_name
                FROM conversations c
                LEFT JOIN users u ON c.closed_by = u.id
                LEFT JOIN contacts contact ON c.contact_id = contact.id
                WHERE c.organization_id = $1 
                AND c.rating_score IS NOT NULL
                AND c.closed_at BETWEEN $2 AND $3::timestamp + interval '1 day' - interval '1 second'
                ${channel && channel !== 'all' ? `AND c.channel = '${channel}'` : ''} 
                ORDER BY c.closed_at DESC
                LIMIT 500
            `;
            const result = await client.query(sql, [organization_id, startDate, endDate]);
            res.json(result.rows);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};