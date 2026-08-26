import pool from '../config/db.js';

export const getAnalytics = async (req, res) => {
    try {
        const { bot_config_id } = req.query;
        let baseQuery = 'WHERE organization_id = $1';
        let params = [req.user.organization_id];

        if (bot_config_id) {
            baseQuery += ' AND bot_config_id = $2';
            params.push(bot_config_id);
        }

        // Get total messages and fallbacks
        const statsRes = await pool.query(`
            SELECT 
                COUNT(*) as total_messages,
                SUM(CASE WHEN is_fallback = true THEN 1 ELSE 0 END) as total_fallbacks
            FROM ai_chat_logs
            ${baseQuery}
        `, params);

        const stats = statsRes.rows[0];
        const total = parseInt(stats.total_messages) || 0;
        const fallbacks = parseInt(stats.total_fallbacks) || 0;
        const fallbackRate = total > 0 ? ((fallbacks / total) * 100).toFixed(2) : 0;

        // Get recent fallback messages
        const logsRes = await pool.query(`
            SELECT id, user_message, ai_response, created_at
            FROM ai_chat_logs
            ${baseQuery} AND is_fallback = true
            ORDER BY created_at DESC
            LIMIT 50
        `, params);

        res.json({
            metrics: {
                total_messages: total,
                total_fallbacks: fallbacks,
                fallback_rate: fallbackRate
            },
            recent_fallbacks: logsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
