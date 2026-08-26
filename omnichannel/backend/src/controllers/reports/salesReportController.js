import pool from '../../config/db.js';

export const getPipelineStats = async (req, res) => {
    const { organization_id } = req.user;
    const { startDate, endDate } = req.query;
    try {
        // Count deals by pipeline stage, total value, won/lost counts
        const result = await pool.query(`
            SELECT
                ps.id as stage_id,
                ps.name as stage_name,
                ps.pipeline_id,
                p.name as pipeline_name,
                COUNT(c.id) as deal_count,
                COALESCE(SUM(c.value), 0) as total_value,
                COALESCE(SUM(c.value * COALESCE(c.deal_probability, 0) / 100.0), 0) as weighted_value,
                COUNT(*) FILTER (WHERE c.status = 'resolved') as won_count,
                COUNT(*) FILTER (WHERE c.status = 'closed') as lost_count
            FROM pipeline_stages ps
            JOIN pipelines p ON ps.pipeline_id = p.id
            LEFT JOIN conversations c ON c.pipeline_stage_id = ps.id
                AND c.pipeline_id = ps.pipeline_id
                AND c.organization_id = $1
                ${startDate ? `AND c.created_at >= $2` : ''}
                ${endDate ? `AND c.created_at <= ${startDate ? '$3' : '$2'}` : ''}
            WHERE p.organization_id = $1
            GROUP BY ps.id, ps.name, ps.pipeline_id, p.name
            ORDER BY p.id, ps.position
        `, startDate && endDate
            ? [organization_id, startDate, endDate]
            : startDate
                ? [organization_id, startDate]
                : [organization_id]
        );
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
