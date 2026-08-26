import pool from '../../config/db.js';

export const getChatbotSummary = async (req, res) => {
    try {
        const orgId = req.user.organization_id;

        // 1. Interaction Metrics
        const interactionQuery = `
            SELECT 
                COUNT(*) as total_interactions,
                COUNT(CASE WHEN is_fallback = false THEN 1 END) as handled_by_ai,
                COUNT(CASE WHEN is_fallback = true THEN 1 END) as fallback_count,
                AVG(confidence_score) as avg_confidence
            FROM chatbot_logs
            WHERE organization_id = $1
        `;
        const interactionRes = await pool.query(interactionQuery, [orgId]);
        const stats = interactionRes.rows[0];

        // 2. Escalation Rate (Assuming 'escalated' status in conversations or fallback logic)
        // For now, using fallback as proxy for potential escalation or we can query conversations

        res.json({
            total_interactions: parseInt(stats.total_interactions) || 0,
            handled_by_ai: parseInt(stats.handled_by_ai) || 0,
            fallback_count: parseInt(stats.fallback_count) || 0,
            automation_rate: stats.total_interactions > 0
                ? Math.round((stats.handled_by_ai / stats.total_interactions) * 100)
                : 0,
            avg_confidence: parseFloat(stats.avg_confidence || 0).toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

export const getKnowledgeBaseStats = async (req, res) => {
    try {
        const orgId = req.user.organization_id;

        // Most Used Rules
        const topRulesQuery = `
            SELECT k.keyword, k.response_content, k.hit_count
            FROM keyword_replies k
            WHERE k.organization_id = $1 AND k.hit_count > 0
            ORDER BY k.hit_count DESC
            LIMIT 10
        `;
        const topRules = await pool.query(topRulesQuery, [orgId]);

        // Unanswered / Fallback messages (to improve KB)
        const missedQuery = `
            SELECT message_content, COUNT(*) as count
            FROM chatbot_logs
            WHERE organization_id = $1 AND is_fallback = true
            GROUP BY message_content
            ORDER BY count DESC
            LIMIT 10
        `;
        const missed = await pool.query(missedQuery, [orgId]);

        res.json({
            top_qna: topRules.rows,
            missed_questions: missed.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

export const getTimeSeriesStats = async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        // Last 7 days daily trend
        const query = `
            SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') as date,
                COUNT(*) as total,
                COUNT(CASE WHEN is_fallback = true THEN 1 END) as fallback
            FROM chatbot_logs
            WHERE organization_id = $1 
            AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY date
            ORDER BY date ASC
        `;
        const { rows } = await pool.query(query, [orgId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};
