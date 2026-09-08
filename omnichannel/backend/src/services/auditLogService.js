/**
 * Audit Log Service & Controller
 * Records sensitive system operations for corporate compliance and security
 */
import pool from '../config/db.js';
import XLSX from 'xlsx';

let auditSchemaChecked = false;

export const ensureAuditLogSchema = async () => {
    if (auditSchemaChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id BIGSERIAL PRIMARY KEY,
                organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
                user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                module VARCHAR(50) NOT NULL,
                details JSONB DEFAULT '{}',
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_org_module ON audit_logs(organization_id, module, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        `);
        auditSchemaChecked = true;
    } catch (e) {
        console.error('[AuditLog] ensureAuditLogSchema error:', e.message);
    }
};

ensureAuditLogSchema().catch(() => {});

export const logActivity = async ({ organizationId, userId, action, module, details = {}, req = null }) => {
    try {
        await ensureAuditLogSchema();
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
    const { module, action, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    try {
        await ensureAuditLogSchema();
        let where = 'WHERE a.organization_id = $1';
        const params = [organization_id];
        let idx = 2;

        if (module && module !== 'all') {
            where += ` AND a.module = $${idx++}`;
            params.push(module);
        }

        if (action) {
            where += ` AND a.action = $${idx++}`;
            params.push(action);
        }

        if (startDate) {
            where += ` AND a.created_at >= $${idx++}`;
            params.push(startDate);
        }

        if (endDate) {
            where += ` AND a.created_at <= $${idx++}`;
            params.push(endDate + ' 23:59:59');
        }

        if (search) {
            where += ` AND (a.action ILIKE $${idx} OR a.module ILIKE $${idx} OR u.name ILIKE $${idx} OR a.ip_address ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countQuery = `
            SELECT COUNT(*) as total
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ${where}
        `;
        const countRes = await pool.query(countQuery, params);
        const total = parseInt(countRes.rows[0]?.total || 0);

        const query = `
            SELECT a.*, u.name as user_name, u.email as user_email
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ${where}
            ORDER BY a.created_at DESC
            LIMIT $${idx++} OFFSET $${idx++}
        `;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        res.json({
            logs: result.rows,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / parseInt(limit))
        });

    } catch (err) {
        console.error('[getAuditLogs] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export const exportAuditLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { module, action, search, startDate, endDate } = req.query;

    try {
        await ensureAuditLogSchema();
        let where = 'WHERE a.organization_id = $1';
        const params = [organization_id];
        let idx = 2;

        if (module && module !== 'all') {
            where += ` AND a.module = $${idx++}`;
            params.push(module);
        }
        if (action) {
            where += ` AND a.action = $${idx++}`;
            params.push(action);
        }
        if (startDate) {
            where += ` AND a.created_at >= $${idx++}`;
            params.push(startDate);
        }
        if (endDate) {
            where += ` AND a.created_at <= $${idx++}`;
            params.push(endDate + ' 23:59:59');
        }
        if (search) {
            where += ` AND (a.action ILIKE $${idx} OR a.module ILIKE $${idx} OR u.name ILIKE $${idx} OR a.ip_address ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        const query = `
            SELECT 
                a.id as "Log ID",
                a.created_at as "Timestamp (UTC)",
                COALESCE(u.name, 'System') as "User",
                COALESCE(u.email, '-') as "Email",
                a.module as "Module",
                a.action as "Action",
                a.ip_address as "IP Address",
                a.user_agent as "User Agent",
                a.details as "Details"
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ${where}
            ORDER BY a.created_at DESC
            LIMIT 5000
        `;

        const result = await pool.query(query, params);
        const rows = result.rows.map(r => ({
            ...r,
            Details: typeof r.Details === 'object' ? JSON.stringify(r.Details) : r.Details
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${Date.now()}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);

    } catch (err) {
        console.error('[exportAuditLogs] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export default {
    logActivity,
    getAuditLogs,
    exportAuditLogs,
    ensureAuditLogSchema
};
