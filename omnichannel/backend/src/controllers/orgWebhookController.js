import pool from '../config/db.js';
import crypto from 'crypto';
import axios from 'axios';

let schemaInitialized = false;
export const ensureSchema = async () => {
    if (schemaInitialized) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS org_webhooks (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                url TEXT NOT NULL,
                secret VARCHAR(255),
                events JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_org_webhooks_org ON org_webhooks(organization_id);

            CREATE TABLE IF NOT EXISTS org_webhook_logs (
                id SERIAL PRIMARY KEY,
                webhook_id BIGINT REFERENCES org_webhooks(id) ON DELETE CASCADE,
                event VARCHAR(100),
                status VARCHAR(50),
                status_code INTEGER,
                response_ms INTEGER,
                error_message TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_org_webhook_logs_wh ON org_webhook_logs(webhook_id, created_at DESC);
        `);
        schemaInitialized = true;
    } catch (e) {
        console.warn('[OrgWebhook] ensureSchema warning:', e.message);
    }
};

// GET /api/app/webhooks
export const getWebhooks = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureSchema();
        const result = await pool.query(
            `SELECT id, name, url, events, is_active, created_at FROM org_webhooks
             WHERE organization_id = $1 ORDER BY created_at DESC`,
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/webhooks
export const createWebhook = async (req, res) => {
    const { organization_id } = req.user;
    const { name, url, events } = req.body;

    if (!name || !url) return res.status(400).json({ error: 'name and url are required' });

    try {
        await ensureSchema();
        const secret = crypto.randomBytes(20).toString('hex');
        const result = await pool.query(
            `INSERT INTO org_webhooks (organization_id, name, url, secret, events)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [organization_id, name, url, secret, events || []]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/webhooks/:id
export const updateWebhook = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, url, events, is_active } = req.body;

    try {
        await ensureSchema();
        const result = await pool.query(
            `UPDATE org_webhooks SET name=$1, url=$2, events=$3, is_active=$4
             WHERE id=$5 AND organization_id=$6 RETURNING *`,
            [name, url, events || [], is_active, id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/webhooks/:id
export const deleteWebhook = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await ensureSchema();
        await pool.query(
            'DELETE FROM org_webhooks WHERE id=$1 AND organization_id=$2',
            [id, organization_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/webhooks/:id/test
export const testWebhook = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await ensureSchema();
        const webhookRes = await pool.query(
            'SELECT * FROM org_webhooks WHERE id=$1 AND organization_id=$2',
            [id, organization_id]
        );
        if (webhookRes.rows.length === 0) return res.status(404).json({ error: 'Webhook not found' });

        const webhook = webhookRes.rows[0];
        const payload = {
            event: 'test.ping',
            id: `test_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            data: { message: 'This is a test event from CRMHUB.' }
        };

        const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        const start = Date.now();
        try {
            const response = await axios.post(webhook.url, payload, {
                headers: { 'Content-Type': 'application/json', 'X-Reply-Signature': signature },
                timeout: 8000
            });
            const ms = Date.now() - start;
            await pool.query(
                `INSERT INTO org_webhook_logs (webhook_id, event, status, status_code, response_ms)
                 VALUES ($1,'test.ping','success',$2,$3)`,
                [id, response.status, ms]
            );
            res.json({ success: true, status_code: response.status, response_ms: ms });
        } catch (axiosErr) {
            const ms = Date.now() - start;
            const statusCode = axiosErr.response?.status || null;
            await pool.query(
                `INSERT INTO org_webhook_logs (webhook_id, event, status, status_code, response_ms, error_message)
                 VALUES ($1,'test.ping','failed',$2,$3,$4)`,
                [id, statusCode, ms, axiosErr.message]
            );
            res.status(422).json({ success: false, error: axiosErr.message, status_code: statusCode });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/webhooks/event-catalog
// Returns all available webhook events with sample payloads (for Zapier/Make setup)
export const getEventCatalog = (_req, res) => {
    const events = [
        {
            event: 'message.received',
            description: 'Dipicu saat pesan baru masuk dari pelanggan',
            channels: ['whatsapp', 'telegram', 'instagram', 'messenger', 'webchat'],
            sample: {
                event: 'message.received',
                id: 'evt_1716000000000',
                timestamp: 1716000000,
                data: {
                    conversationId: 123,
                    message: { id: 456, type: 'text', content: 'Halo, saya butuh bantuan', from_me: false },
                    contact: { id: 789, phone: '628123456789' },
                    channel: 'whatsapp',
                },
            },
        },
        {
            event: 'conversation.created',
            description: 'Dipicu saat percakapan baru dibuat',
            channels: ['semua channel'],
            sample: {
                event: 'conversation.created',
                id: 'evt_1716000000001',
                timestamp: 1716000000,
                data: { conversationId: 123, contactId: 789, channel: 'whatsapp' },
            },
        },
        {
            event: 'conversation.resolved',
            description: 'Dipicu saat percakapan diselesaikan oleh agent',
            channels: ['semua channel'],
            sample: {
                event: 'conversation.resolved',
                id: 'evt_1716000000002',
                timestamp: 1716000000,
                data: { conversationId: 123 },
            },
        },
        {
            event: 'conversation.assigned',
            description: 'Dipicu saat percakapan ditetapkan ke agent',
            channels: ['semua channel'],
            sample: {
                event: 'conversation.assigned',
                id: 'evt_1716000000003',
                timestamp: 1716000000,
                data: { conversationId: 123, assignedTo: 1, agentName: 'Budi Santoso' },
            },
        },
        {
            event: 'contact.created',
            description: 'Dipicu saat kontak baru dibuat dari pesan masuk',
            channels: ['whatsapp', 'telegram'],
            sample: {
                event: 'contact.created',
                id: 'evt_1716000000004',
                timestamp: 1716000000,
                data: { contactId: 789, name: 'Pelanggan Baru', phone: '628123456789', channel: 'whatsapp' },
            },
        },
        {
            event: 'test.ping',
            description: 'Event tes koneksi webhook',
            channels: ['semua channel'],
            sample: {
                event: 'test.ping',
                id: 'test_1716000000000',
                timestamp: 1716000000,
                data: { message: 'This is a test event from CRMHUB.' },
            },
        },
    ];
    res.json(events);
};

// GET /api/app/webhooks/:id/logs
export const getWebhookLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await ensureSchema();
        const check = await pool.query(
            'SELECT id FROM org_webhooks WHERE id=$1 AND organization_id=$2',
            [id, organization_id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const logs = await pool.query(
            `SELECT id, event, status, status_code, response_ms, error_message, created_at
             FROM org_webhook_logs WHERE webhook_id=$1
             ORDER BY created_at DESC LIMIT 50`,
            [id]
        );
        res.json(logs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
