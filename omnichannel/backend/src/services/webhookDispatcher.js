import pool from '../config/db.js';
import axios from 'axios';
import crypto from 'crypto';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import defaultConnection, { redisConfig } from '../config/redis.js';

// Queue to handle dispatch async - Use Default Connection
const webhookQueue = new Queue('webhook-dispatch-queue', { connection: defaultConnection });

// Create dedicated connection for Worker
const workerConnection = new IORedis(redisConfig, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

// Worker to process dispatch jobs
const worker = new Worker('webhook-dispatch-queue', async (job) => {
    const { webhookId, url, secret, payload } = job.data;
    const start = Date.now();

    try {
        const signature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Reply-Signature': signature
            },
            timeout: 5000
        });

        // Log success for org webhooks
        if (webhookId) {
            await pool.query(
                `INSERT INTO org_webhook_logs (webhook_id, event, status, status_code, response_ms)
                 VALUES ($1, $2, 'success', $3, $4)`,
                [webhookId, payload.event, response.status, Date.now() - start]
            ).catch(() => {}); // Non-critical
        }
    } catch (err) {
        const code = err.code || (err.response ? err.response.status : 'UNKNOWN');
        const errorMsg = err.message;

        // Log failure for org webhooks
        if (webhookId) {
            await pool.query(
                `INSERT INTO org_webhook_logs (webhook_id, event, status, status_code, response_ms, error_message)
                 VALUES ($1, $2, 'failed', $3, $4, $5)`,
                [webhookId, payload.event, err.response?.status || null, Date.now() - start, errorMsg]
            ).catch(() => {});
        }

        if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || errorMsg.includes('timeout')) {
            console.warn(`[WebhookDispatch] Failed to ${url} (Network Error): ${errorMsg}`);
        } else {
            console.error(`[WebhookDispatch] Failed to ${url}: ${errorMsg}`);
        }

        throw err;
    }
}, {
    connection: workerConnection, // Use dedicated connection
    limiter: { max: 50, duration: 1000 } // Rate limit outbound webhooks
});

/**
 * Dispatch a normalized event to all org-level webhooks subscribed to this event
 * @param {number} orgId - The organization ID
 * @param {string} event - Event name (e.g. conversation.created)
 * @param {object} data - Normalized data payload
 */
export const dispatchOrgEvent = async (orgId, event, data) => {
    try {
        const webhooks = await pool.query(
            `SELECT id, url, secret FROM org_webhooks
             WHERE organization_id = $1 AND is_active = true
               AND (events = '{}' OR $2 = ANY(events))`,
            [orgId, event]
        );

        if (webhooks.rows.length === 0) return;

        const payload = {
            event,
            id: `evt_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            data
        };

        const jobs = webhooks.rows.map(row => ({
            name: 'org-dispatch',
            data: {
                webhookId: row.id,
                url: row.url,
                secret: row.secret,
                payload
            },
            opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
        }));

        await webhookQueue.addBulk(jobs);
    } catch (err) {
        console.error('[OrgWebhookDispatch] Error:', err);
    }
};

/**
 * Dispatch a normalized event to all Apps listening to this session
 * @param {string} sessionId - The unique ID of the channel/device (e.g. WA UUID, IG ID)
 * @param {string} event - Event name (e.g. message.received)
 * @param {object} data - Normalized data payload
 */
export const dispatchToApps = async (sessionId, event, data) => {
    try {
        // 1. Find Apps listening to this session
        const mappings = await pool.query(
            `SELECT da.webhook_url, da.webhook_secret 
             FROM developer_app_channels dac
             JOIN developer_apps da ON dac.developer_app_id = da.id
             WHERE dac.session_id = $1 AND da.is_active = true AND da.webhook_url IS NOT NULL`,
            [sessionId]
        );

        if (mappings.rows.length === 0) return;

        // 2. Construct Standard Payload
        const payload = {
            event: event,
            id: data.waMessageId || `evt_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            channel: data.channel || 'unknown', // injected by controller
            session_id: sessionId,
            data: data
        };

        // 3. Queue Jobs
        const jobs = mappings.rows.map(row => ({
            name: 'dispatch',
            data: {
                url: row.webhook_url,
                secret: row.webhook_secret,
                payload
            },
            opts: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 }
            }
        }));

        await webhookQueue.addBulk(jobs);

    } catch (err) {
        console.error("[WebhookDispatch] Error:", err);
    }
};
