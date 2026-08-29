/**
 * Audit Log Service & Controller
 * Records sensitive system operations for corporate compliance and security
 */
import pool from '../config/db.js';

export const logActivity = async ({ organizationId, userId, action, module, details = {}, req = null }) => {
    try {
        const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || null;
        const userAgent = req?.headers['user-agent'] || null;

        await pool.query(
            `INSERT INTO audit_logs (organization_id, user_id, action, module, details, ip_address, user_agent, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [organizationId, userId || null, action, module, JSON.stringify(details), ipAddress, userAgent]
        );
    } catch (err) {
        console.warn('[AuditLog Service Warning]:', err.message);
    }
};

export const getAuditLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { module, action, limit = 100 } = req.query;

    try {
        let query = `
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.organization_id = $1
        `;
        const params = [organization_id];
        let idx = 2;

        if (module) {
            query += ` AND a.module = $${idx}`;
            params.push(module);
            idx++;
        }

        if (action) {
            query += ` AND a.action = $${idx}`;
            params.push(action);
            idx++;
        }

        query += ` ORDER BY a.created_at DESC LIMIT $${idx}`;
        params.push(parseInt(limit) || 100);

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
