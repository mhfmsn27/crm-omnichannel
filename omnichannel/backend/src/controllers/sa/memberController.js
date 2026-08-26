
import pool from '../../config/db.js';
import * as waService from '../../services/waGatewayService.js';
import bcrypt from 'bcrypt';

// POST /api/sa/members
export const createMember = async (req, res) => {
    const { name, email, password, organization_name } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Check if Email Exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            throw new Error('Email already exists');
        }

        // 2. Create Organization
        // Try to get "Personal Ultimate" plan or any default plan
        const planRes = await client.query("SELECT id FROM plans WHERE name ILIKE '%Personal%' ORDER BY id LIMIT 1");
        const planId = planRes.rows.length > 0 ? planRes.rows[0].id : null;

        const orgRes = await client.query(
            'INSERT INTO organizations (name, plan_id, subscription_status) VALUES ($1, $2, $3) RETURNING id',
            [organization_name, planId, 'active']
        );
        const orgId = orgRes.rows[0].id;

        // 3. Create Subscription (if plan exists, to be consistent)
        if (planId) {
            // Create a lifetime subscription roughly
            await client.query(
                `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at, created_at, updated_at) 
                 VALUES ($1, $2, 'active', NOW() + INTERVAL '100 years', NOW(), NOW())`,
                [orgId, planId]
            );
        }

        // 4. Create User
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query(
            `INSERT INTO users (organization_id, name, email, password_hash, role, role_level, is_online) 
             VALUES ($1, $2, $3, $4, 'admin_member', 100, true)`,
            [orgId, name, email, hashedPassword]
        );

        // 5. Initialize Settings
        await client.query('INSERT INTO chatbot_settings (organization_id, is_active) VALUES ($1, false)', [orgId]);

        await client.query('COMMIT');

        res.json({ message: "Member created successfully", organization_id: orgId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Member Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// GET /api/sa/members
// Query Params: search, page, limit, status, plan_id
export const getMembers = async (req, res) => {
    const { search, status, plan_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        // Base Query Condition
        let baseQuery = `
            FROM organizations o
            LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status IN ('active', 'trialing')
            LEFT JOIN plans p ON o.plan_id = p.id
            WHERE o.id != 1 -- Exclude System Admin Org
        `;

        const params = [];
        let paramIndex = 1;

        if (search) {
            baseQuery += ` AND (o.name ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM users u WHERE u.organization_id = o.id AND u.email ILIKE $${paramIndex}))`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (status) {
            baseQuery += ` AND o.subscription_status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (plan_id) {
            baseQuery += ` AND s.plan_id = $${paramIndex}`;
            params.push(plan_id);
            paramIndex++;
        }

        // Data Query
        const dataQuery = `
            SELECT 
                o.id, o.name, o.is_active, o.subscription_status, o.created_at,
                (SELECT email FROM users WHERE organization_id = o.id ORDER BY created_at ASC LIMIT 1) as owner_email,
                (SELECT name FROM users WHERE organization_id = o.id ORDER BY created_at ASC LIMIT 1) as owner_name,
                p.name as plan_name,
                s.expires_at
            ${baseQuery}
            ORDER BY o.created_at DESC 
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        // Count Query
        const countQuery = `SELECT COUNT(*) ${baseQuery}`;

        const [dataRes, countRes] = await Promise.all([
            pool.query(dataQuery, [...params, limit, offset]),
            pool.query(countQuery, params)
        ]);

        const total = parseInt(countRes.rows[0].count);

        res.json({
            data: dataRes.rows,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                last_page: Math.ceil(total / limit)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/sa/members/:id
export const getMemberById = async (req, res) => {
    const { id } = req.params;
    try {
        // Basic Info
        const memberQuery = `
            SELECT 
                o.*,
                (SELECT email FROM users WHERE organization_id = o.id ORDER BY created_at ASC LIMIT 1) as owner_email,
                (SELECT name FROM users WHERE organization_id = o.id ORDER BY created_at ASC LIMIT 1) as owner_name,
                p.id as plan_id, p.name as plan_name,
                s.expires_at, s.status as sub_status
            FROM organizations o
            LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status IN ('active', 'trialing')
            LEFT JOIN plans p ON o.plan_id = p.id
            WHERE o.id = $1
        `;

        // Stats
        const statsQuery = `
            SELECT 
                (SELECT count(*) FROM users WHERE organization_id = $1) as agent_count,
                (SELECT count(*) FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected') as device_count
        `;

        const [memberRes, statsRes] = await Promise.all([
            pool.query(memberQuery, [id]),
            pool.query(statsQuery, [id])
        ]);

        if (memberRes.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

        res.json({
            ...memberRes.rows[0],
            stats: statsRes.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/sa/members/:id/channels
export const getMemberChannels = async (req, res) => {
    const { id } = req.params;
    try {
        const [wa, msg, ig, tg] = await Promise.all([
            pool.query("SELECT id, name, whatsapp_number as info, 'whatsapp' as type, status FROM whatsapp_sessions WHERE organization_id = $1", [id]),
            pool.query("SELECT id, page_name as name, page_id as info, 'messenger' as type, CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status FROM messenger_pages WHERE organization_id = $1", [id]),
            pool.query("SELECT id, username as name, ig_id as info, 'instagram' as type, CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status FROM instagram_accounts WHERE organization_id = $1", [id]),
            pool.query("SELECT id, first_name as name, username as info, 'telegram' as type, CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status FROM telegram_bots WHERE organization_id = $1", [id])
        ]);

        const channels = [
            ...wa.rows,
            ...msg.rows,
            ...ig.rows,
            ...tg.rows
        ];

        res.json(channels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/members/:id/channels/:type/:channelId
export const forceDeleteChannel = async (req, res) => {
    const { id, type, channelId } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let table = '';
        if (type === 'whatsapp') table = 'whatsapp_sessions';
        else if (type === 'messenger') table = 'messenger_pages';
        else if (type === 'instagram') table = 'instagram_accounts';
        else if (type === 'telegram') table = 'telegram_bots';
        else throw new Error("Invalid channel type");

        // 1. Unlink dependencies (Set Foreign Keys to NULL) to prevent constraint errors
        if (type === 'whatsapp') {
            await client.query('UPDATE conversations SET whatsapp_session_id = NULL WHERE whatsapp_session_id = $1', [channelId]);
            await client.query('UPDATE broadcast_recipients SET used_session_id = NULL WHERE used_session_id = $1', [channelId]);
        } else if (type === 'messenger') {
            await client.query('UPDATE conversations SET messenger_page_id = NULL WHERE messenger_page_id = $1', [channelId]);
        } else if (type === 'instagram') {
            await client.query('UPDATE conversations SET instagram_account_id = NULL WHERE instagram_account_id = $1', [channelId]);
        } else if (type === 'telegram') {
            await client.query('UPDATE conversations SET telegram_bot_id = NULL WHERE telegram_bot_id = $1', [channelId]);
        }

        // 2. Delete the record
        const deleteRes = await client.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [channelId]);

        if (deleteRes.rowCount === 0) {
            throw new Error("Channel not found or already deleted");
        }

        await client.query('COMMIT');

        // Optional: Trigger gateway cleanup if whatsapp unofficial
        if (type === 'whatsapp' && deleteRes.rows[0].type !== 'official') {
            try {
                waService.deleteSession(deleteRes.rows[0].session_id).catch(() => { });
            } catch (e) { }
        }

        res.json({ message: "Channel force deleted successfully" });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/sa/members/:id/toggle-status
export const toggleStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        await pool.query(
            'UPDATE organizations SET is_active = $1 WHERE id = $2',
            [is_active, id]
        );

        // Audit Log
        await pool.query(
            'INSERT INTO activity_logs (actor_id, target_type, target_id, action, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'organization', id, is_active ? 'ACTIVATE' : 'SUSPEND', `Changed status to ${is_active}`]
        );

        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/members/:id/manual-override
export const manualOverride = async (req, res) => {
    const { id } = req.params; // organization_id
    const { plan_id, expires_at } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Update Organization Plan Ref & Status
        await client.query(
            'UPDATE organizations SET plan_id = $1, subscription_status = $2, has_used_trial = true WHERE id = $3',
            [plan_id, 'active', id]
        );

        // 2. Clean up ALL existing Active/Trialing subscriptions
        await client.query(
            `UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() 
             WHERE organization_id = $1 AND status IN ('active', 'trialing')`,
            [id]
        );

        // 3. Insert NEW Clean Subscription
        await client.query(
            'INSERT INTO subscriptions (organization_id, plan_id, status, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
            [id, plan_id, 'active', expires_at]
        );

        // 4. Audit Log
        await client.query(
            'INSERT INTO activity_logs (actor_id, target_type, target_id, action, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'subscription', id, 'MANUAL_OVERRIDE', `Set Plan=${plan_id}, Exp=${expires_at}`]
        );

        await client.query('COMMIT');
        res.json({ message: 'Subscription updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Manual Override Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/sa/members/:id/webhook
export const updateWebhook = async (req, res) => {
    const { id } = req.params;
    const { webhook_url } = req.body;

    try {
        await pool.query(
            'UPDATE organizations SET webhook_url = $1 WHERE id = $2',
            [webhook_url, id]
        );
        res.json({ message: 'Webhook URL updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/members/:id
export const deleteMember = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        if (parseInt(id) === 1) return res.status(403).json({ error: "Cannot delete System Admin organization" });

        await client.query('BEGIN');

        // 1. Unlink Sessions from Broadcast Recipients
        await client.query(`
            UPDATE broadcast_recipients 
            SET used_session_id = NULL 
            WHERE used_session_id IN (SELECT id FROM whatsapp_sessions WHERE organization_id = $1)
        `, [id]);

        // 2. Unlink Sessions from Warmer Logs
        await client.query(`
            UPDATE warmer_logs 
            SET sender_session_id = NULL 
            WHERE sender_session_id IN (SELECT id FROM whatsapp_sessions WHERE organization_id = $1)
        `, [id]);

        // 3. Manually delete Transactions
        await client.query('DELETE FROM transactions WHERE organization_id = $1', [id]);

        // 4. Delete Organization
        const result = await client.query('DELETE FROM organizations WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Member not found" });
        }

        await client.query('COMMIT');
        res.json({ message: "Member organization deleted successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete Member Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// GET /api/sa/members/:id/reports
export const getMemberReports = async (req, res) => {
    const { id } = req.params;

    try {
        const [contacts, broadcasts] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM contacts WHERE organization_id = $1', [id]),
            pool.query('SELECT COUNT(*) FROM broadcasts WHERE organization_id = $1', [id]),
        ]);

        const recentBroadcasts = await pool.query(
            'SELECT id, name, status, created_at, scheduled_at FROM broadcasts WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20',
            [id]
        );

        res.json({
            stats: {
                total_contacts: parseInt(contacts.rows[0].count),
                total_broadcasts: parseInt(broadcasts.rows[0].count)
            },
            recent_broadcasts: recentBroadcasts.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
