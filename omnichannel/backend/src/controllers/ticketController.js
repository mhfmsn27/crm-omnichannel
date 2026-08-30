import pool from '../config/db.js';

// ============================================================
// AUTO SCHEMA SELF-HEALING FOR TICKETS, SLA, AND SCHEDULER
// ============================================================
export const ensureTicketAndSlaSchema = async () => {
    try {
        await pool.query(`
            CREATE SEQUENCE IF NOT EXISTS ticket_seq START WITH 1001;

            CREATE TABLE IF NOT EXISTS sla_policies (
                id SERIAL PRIMARY KEY,
                organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
                priority VARCHAR(50) NOT NULL,
                frt_minutes INT DEFAULT 60,
                resolution_minutes INT DEFAULT 480,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(organization_id, priority)
            );

            CREATE TABLE IF NOT EXISTS sla_breach_logs (
                id SERIAL PRIMARY KEY,
                organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
                conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                breach_type VARCHAR(50) NOT NULL,
                breached_at TIMESTAMPTZ DEFAULT NOW()
            );

            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_deadline_at TIMESTAMPTZ;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT false;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(100);
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium';
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_rating INT;
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_status VARCHAR(50);
            ALTER TABLE conversations ADD COLUMN IF NOT EXISTS csat_token VARCHAR(255);

            CREATE TABLE IF NOT EXISTS scheduled_messages (
                id SERIAL PRIMARY KEY,
                organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
                conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                scheduled_at TIMESTAMPTZ NOT NULL,
                scheduled_by INT REFERENCES users(id) ON DELETE SET NULL,
                status VARCHAR(50) DEFAULT 'pending',
                sent_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            ALTER TABLE messages ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
            ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS resume_at TIMESTAMPTZ;
            ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(255);
            ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS whatsapp_session_id INT;
        `);
        console.log('[SLA] Auto-schema self-healing verified cleanly.');
    } catch (e) {
        console.warn("[SLA] Schema auto-migration warning:", e.message);
    }
};

// Run auto-migration on load
ensureTicketAndSlaSchema();

// ============================================================
// TICKET NUMBER GENERATION
// ============================================================
export const generateTicketNumber = async () => {
    const result = await pool.query("SELECT nextval('ticket_seq') AS num");
    const num = result.rows[0].num;
    return `TKT-${String(num).padStart(5, '0')}`;
};

// ============================================================
// SLA POLICIES
// ============================================================

// GET /api/app/tickets/sla-policies
export const getSLAPolicies = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM sla_policies WHERE organization_id=$1 ORDER BY id ASC',
            [organization_id]
        );

        // Return defaults if nothing configured yet
        const defaults = [
            { priority: 'low',    frt_minutes: 240, resolution_minutes: 1440, is_active: true },
            { priority: 'medium', frt_minutes: 60,  resolution_minutes: 480,  is_active: true },
            { priority: 'high',   frt_minutes: 30,  resolution_minutes: 240,  is_active: true },
            { priority: 'urgent', frt_minutes: 10,  resolution_minutes: 60,   is_active: true },
        ];

        const policies = defaults.map(def => {
            const found = result.rows.find(r => r.priority === def.priority);
            return found || { ...def, organization_id };
        });

        res.json(policies);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/tickets/sla-policies
export const updateSLAPolicies = async (req, res) => {
    const { organization_id } = req.user;
    const { policies } = req.body;

    if (!Array.isArray(policies)) return res.status(400).json({ error: 'policies must be array' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const p of policies) {
            const { priority, frt_minutes, resolution_minutes, is_active } = p;
            await client.query(
                `INSERT INTO sla_policies (organization_id, priority, frt_minutes, resolution_minutes, is_active)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (organization_id, priority)
                 DO UPDATE SET frt_minutes=$3, resolution_minutes=$4, is_active=$5`,
                [organization_id, priority, frt_minutes, resolution_minutes, is_active]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// PATCH /api/app/tickets/conversations/:id/priority
export const updateConversationPriority = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { priority } = req.body;

    const valid = ['low', 'medium', 'high', 'urgent'];
    if (!valid.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });

    try {
        // Recalculate SLA deadline based on new priority
        const policyRes = await pool.query(
            'SELECT frt_minutes FROM sla_policies WHERE organization_id=$1 AND priority=$2 AND is_active=true',
            [organization_id, priority]
        );

        let sla_deadline_at = null;
        if (policyRes.rows.length > 0) {
            const frtMinutes = policyRes.rows[0].frt_minutes;
            sla_deadline_at = new Date(Date.now() + frtMinutes * 60 * 1000);
        }

        const result = await pool.query(
            `UPDATE conversations SET priority=$1, sla_deadline_at=$2, sla_breached=false
             WHERE id=$3 AND organization_id=$4 RETURNING priority, sla_deadline_at`,
            [priority, sla_deadline_at, id, organization_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        res.json({ success: true, ...result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// INTERNAL HELPER: Initialize ticket for a new conversation
// Called from inboxController when a conversation is created
// ============================================================
export const initTicket = async (orgId, conversationId, priority = 'medium') => {
    try {
        const ticketNumber = await generateTicketNumber();

        // Get SLA policy for this priority
        const policyRes = await pool.query(
            'SELECT frt_minutes FROM sla_policies WHERE organization_id=$1 AND priority=$2 AND is_active=true',
            [orgId, priority]
        );

        let sla_deadline_at = null;
        if (policyRes.rows.length > 0) {
            sla_deadline_at = new Date(Date.now() + policyRes.rows[0].frt_minutes * 60 * 1000);
        }

        await pool.query(
            `UPDATE conversations SET ticket_number=$1, priority=$2, sla_deadline_at=$3
             WHERE id=$4`,
            [ticketNumber, priority, sla_deadline_at, conversationId]
        );

        return ticketNumber;
    } catch (err) {
        console.error('[Ticket] initTicket error:', err.message);
        return null;
    }
};

// ============================================================
// GET /api/app/tickets — paginated ticket list
// ============================================================
export const getTickets = async (req, res) => {
    const { organization_id } = req.user;
    const { status, priority, sla_breached, page = 1, limit = 30, search } = req.query;

    try {
        const conditions = ['c.organization_id = $1'];
        const params = [organization_id];
        let idx = 2;

        if (status) { conditions.push(`c.status = $${idx++}`); params.push(status); }
        if (priority) { conditions.push(`c.priority = $${idx++}`); params.push(priority); }
        if (sla_breached === 'true') { conditions.push(`c.sla_breached = true`); }
        if (search) {
            conditions.push(`(c.ticket_number ILIKE $${idx} OR ct.name ILIKE $${idx} OR ct.phone_number ILIKE $${idx})`);
            params.push(`%${search}%`); idx++;
        }

        const where = conditions.join(' AND ');
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [rows, countResult] = await Promise.all([
            pool.query(
                `SELECT c.id, c.ticket_number, c.status, c.priority, c.channel,
                        c.sla_deadline_at, c.sla_breached, c.first_reply_at,
                        c.last_message, c.last_message_at, c.created_at,
                        ct.name AS contact_name, ct.phone_number AS contact_phone,
                        u.name AS assigned_to_name
                 FROM conversations c
                 LEFT JOIN contacts ct ON ct.id = c.contact_id
                 LEFT JOIN users u ON u.id = c.assigned_to_agent_id
                 WHERE ${where}
                 ORDER BY c.sla_breached DESC, c.last_message_at DESC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                [...params, parseInt(limit), offset]
            ),
            pool.query(`SELECT COUNT(*) FROM conversations c LEFT JOIN contacts ct ON ct.id = c.contact_id WHERE ${where}`, params)
        ]);

        res.json({
            tickets: rows.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/tickets/stats
export const getTicketStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE status = 'open') AS open,
                COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
                COUNT(*) FILTER (WHERE sla_breached = true AND status != 'resolved') AS sla_breached,
                COUNT(*) FILTER (WHERE priority = 'urgent' AND status = 'open') AS urgent_open,
                COUNT(*) FILTER (WHERE priority = 'high' AND status = 'open') AS high_open,
                COUNT(*) FILTER (WHERE status = 'open') AS total_open
             FROM conversations
             WHERE organization_id = $1`,
            [organization_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ============================================================
// BACKGROUND: Check and mark SLA breaches
// Run this via a cron/worker every few minutes
// ============================================================
export const checkSLABreaches = async () => {
    try {
        const result = await pool.query(
            `UPDATE conversations
             SET sla_breached = true
             WHERE sla_deadline_at IS NOT NULL
               AND sla_deadline_at < NOW()
               AND sla_breached = false
               AND status != 'resolved'
             RETURNING id, organization_id, ticket_number`
        );
        if (result.rows.length > 0) {
            console.log(`[SLA] Marked ${result.rows.length} conversations as breached`);
        }
        return result.rows;
    } catch (err) {
        console.error('[SLA] checkSLABreaches error:', err.message);
        return [];
    }
};
