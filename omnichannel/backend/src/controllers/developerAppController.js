import pool from '../config/db.js';
import crypto from 'crypto';
import axios from 'axios';
import { checkFeatureAccess } from '../services/featureGateService.js';

// Generate Secure Keys
const generateKey = (len = 32) => crypto.randomBytes(len).toString('hex');

// NEW: GET /api/app/developer/stats
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const access = await checkFeatureAccess(organization_id, 'api_public');
        res.json({
            allowed: access.allowed,
            locked: !access.allowed,
            message: access.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/developer/apps
export const getApps = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(`
            SELECT da.*, 
                   (SELECT count(*) FROM developer_app_channels dac WHERE dac.developer_app_id = da.id) as channel_count
            FROM developer_apps da
            WHERE da.organization_id = $1
            ORDER BY da.created_at DESC
        `, [organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/developer/apps/:id
export const getAppDetail = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const appRes = await pool.query(
            'SELECT * FROM developer_apps WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (appRes.rows.length === 0) return res.status(404).json({ error: "App not found" });

        const channelsRes = await pool.query(
            'SELECT * FROM developer_app_channels WHERE developer_app_id = $1',
            [id]
        );

        res.json({ ...appRes.rows[0], channels: channelsRes.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/developer/apps
export const createApp = async (req, res) => {
    const { name, webhook_url, channels } = req.body;
    const { organization_id } = req.user;

    // 1. Feature Check
    try {
        const access = await checkFeatureAccess(organization_id, 'api_public');
        if (!access.allowed) {
            return res.status(403).json({ error: access.message, code: 'FEATURE_LOCKED', upsell: true });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const apiKey = 'sk_' + generateKey(24);
        const webhookSecret = 'whsec_' + generateKey(16);

        const appRes = await client.query(
            `INSERT INTO developer_apps (organization_id, name, api_key, webhook_url, webhook_secret)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [organization_id, name, apiKey, webhook_url, webhookSecret]
        );
        const appId = appRes.rows[0].id;

        if (channels && Array.isArray(channels)) {
            for (const ch of channels) {
                await client.query(
                    `INSERT INTO developer_app_channels (developer_app_id, channel_type, session_id, label)
                     VALUES ($1, $2, $3, $4)`,
                    [appId, ch.type, ch.session_id, ch.label]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "App created", id: appId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// PUT /api/app/developer/apps/:id
export const updateApp = async (req, res) => {
    const { id } = req.params;
    const { name, webhook_url, is_active, channels } = req.body;
    const { organization_id } = req.user;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check ownership
        const check = await client.query('SELECT id FROM developer_apps WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) throw new Error("App not found");

        await client.query(
            `UPDATE developer_apps SET name = $1, webhook_url = $2, is_active = $3, updated_at = NOW() WHERE id = $4`,
            [name, webhook_url, is_active, id]
        );

        // Re-sync channels (Delete all then insert selected)
        await client.query('DELETE FROM developer_app_channels WHERE developer_app_id = $1', [id]);

        if (channels && Array.isArray(channels)) {
            for (const ch of channels) {
                // Fix: Handle both 'type' (from frontend add) and 'channel_type' (from DB load)
                const type = ch.type || ch.channel_type;
                await client.query(
                    `INSERT INTO developer_app_channels (developer_app_id, channel_type, session_id, label)
                     VALUES ($1, $2, $3, $4)`,
                    [id, type, ch.session_id, ch.label]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: "App updated" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// DELETE /api/app/developer/apps/:id
export const deleteApp = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        await pool.query('DELETE FROM developer_apps WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "App deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/developer/apps/:id/regenerate-key
export const regenerateKey = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const newKey = 'sk_' + generateKey(24);
        await pool.query('UPDATE developer_apps SET api_key = $1 WHERE id = $2 AND organization_id = $3', [newKey, id, organization_id]);
        res.json({ message: "Key regenerated", api_key: newKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/developer/verify-webhook
export const verifyWebhook = async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL Webhook tidak boleh kosong" });

    try {
        // Send a test ping
        const response = await axios.post(url, {
            event: 'verification_ping',
            timestamp: Date.now(),
            message: "This is a test event from CRMHub to verify your webhook."
        }, {
            timeout: 5000, // 5s timeout
            headers: { 'User-Agent': 'CRMHub-Webhook-Verifier/1.0' }
        });

        if (response.status >= 200 && response.status < 300) {
            res.json({ valid: true, message: "Webhook valid! Server merespon dengan sukses." });
        } else {
            res.status(400).json({
                error: `Webhook tidak valid. Server merespon dengan status code: ${response.status}`,
                detail: response.statusText
            });
        }
    } catch (err) {
        let errorMsg = "Gagal menghubungi URL Webhook.";

        if (err.code === 'ECONNABORTED') {
            errorMsg = "Koneksi timeout (lebih dari 5 detik). Pastikan server Anda merespon dengan cepat.";
        } else if (err.code === 'ENOTFOUND') {
            errorMsg = "Domain tidak ditemukan. Periksa kembali penulisan URL Anda.";
        } else if (err.code === 'ECONNREFUSED') {
            errorMsg = "Koneksi ditolak. Pastikan server Anda aktif dan port dapat diakses.";
        } else if (err.response) {
            errorMsg = `Server merespon dengan error: ${err.response.status} ${err.response.statusText}`;
        } else {
            errorMsg = `Error jaringan: ${err.message}`;
        }

        res.status(400).json({ error: errorMsg });
    }
};

// GET /api/app/developer/logs
export const getLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { page = 1, limit = 20, status, method } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT l.*, da.name as app_name 
            FROM developer_api_logs l
            JOIN developer_apps da ON l.developer_app_id = da.id
            WHERE da.organization_id = $1
        `;
        const params = [organization_id];
        let idx = 2;

        if (status) {
            if (status === 'success') {
                query += ` AND l.status_code >= 200 AND l.status_code < 300`;
            } else if (status === 'error') {
                query += ` AND l.status_code >= 400`;
            }
        }

        if (method && method !== 'all') {
            query += ` AND l.method = $${idx}`;
            params.push(method);
            idx++;
        }

        query += ` ORDER BY l.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Count total for pagination
        const countRes = await pool.query(
            `SELECT count(*) FROM developer_api_logs l 
             JOIN developer_apps da ON l.developer_app_id = da.id 
             WHERE da.organization_id = $1`,
            [organization_id]
        );

        res.json({
            data: result.rows,
            total: parseInt(countRes.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};