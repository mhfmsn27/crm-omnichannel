/**
 * Broadcast Schedule Service
 * Manage scheduled broadcasts
 */

import pool from '../config/db.js';

export const getScheduledBroadcasts = async (organizationId, status = null) => {
    try {
        let query = `
            SELECT sb.*, ws.name as device_name, ws.whatsapp_number
            FROM scheduled_broadcasts sb
            LEFT JOIN whatsapp_sessions ws ON sb.device_id = ws.id
            WHERE sb.organization_id = $1
        `;
        const params = [organizationId];

        if (status) {
            query += ` AND sb.status = $2`;
            params.push(status);
        } else {
            // Default: get pending and scheduled broadcasts
            query += ` AND sb.status IN ('pending', 'scheduled')`;
        }

        query += ` ORDER BY sb.scheduled_at ASC`;

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('[BroadcastSchedule] Get error:', error);
        return [];
    }
};

export const createScheduledBroadcast = async (organizationId, userId, data) => {
    const { campaign_name, message, scheduled_at, target_type, target_ids, target_labels, device_id, channel, media_url } = data;

    try {
        const result = await pool.query(
            `INSERT INTO scheduled_broadcasts
             (organization_id, campaign_name, message, scheduled_at, target_type, target_ids, target_labels, device_id, channel, media_url, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
             RETURNING *`,
            [
                organizationId,
                campaign_name,
                message,
                scheduled_at,
                target_type || 'all',
                JSON.stringify(target_ids || []),
                JSON.stringify(target_labels || []),
                device_id,
                channel || 'whatsapp',
                media_url,
                userId
            ]
        );
        return result.rows[0];
    } catch (error) {
        console.error('[BroadcastSchedule] Create error:', error);
        throw error;
    }
};

export const updateScheduledBroadcast = async (organizationId, id, data) => {
    const { campaign_name, message, scheduled_at, status } = data;

    try {
        const result = await pool.query(
            `UPDATE scheduled_broadcasts
             SET campaign_name = COALESCE($1, campaign_name),
                 message = COALESCE($2, message),
                 scheduled_at = COALESCE($3, scheduled_at),
                 status = COALESCE($4, status),
                 updated_at = NOW()
             WHERE id = $5 AND organization_id = $6
             RETURNING *`,
            [campaign_name, message, scheduled_at, status, id, organizationId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('[BroadcastSchedule] Update error:', error);
        throw error;
    }
};

export const cancelScheduledBroadcast = async (organizationId, id) => {
    try {
        const result = await pool.query(
            `UPDATE scheduled_broadcasts
             SET status = 'cancelled', updated_at = NOW()
             WHERE id = $1 AND organization_id = $2 AND status IN ('pending', 'scheduled')
             RETURNING *`,
            [id, organizationId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('[BroadcastSchedule] Cancel error:', error);
        return null;
    }
};

export const deleteScheduledBroadcast = async (organizationId, id) => {
    try {
        await pool.query(
            `DELETE FROM scheduled_broadcasts WHERE id = $1 AND organization_id = $2`,
            [id, organizationId]
        );
        return true;
    } catch (error) {
        console.error('[BroadcastSchedule] Delete error:', error);
        return false;
    }
};

let cronTask = null;

export const startBroadcastCron = async () => {
    try {
        const cron = await import('node-cron');
        const { Queue } = await import('bullmq');
        const redisConnection = (await import('../config/redis.js')).default;
        const broadcastQueue = new Queue('broadcast-queue', { connection: redisConnection });

        console.log('[BroadcastCron] Starting recurring broadcast checker...');

        cronTask = cron.default.schedule('*/5 * * * *', async () => {
            console.log('[BroadcastCron] Checking for due recurring broadcasts and auto-recovery...');
            
            try {
                const { triggerAutoRecovery } = await import('../controllers/broadcastController.js');
                await triggerAutoRecovery();
            } catch (e) {
                console.error('[BroadcastCron] AutoRecovery failed:', e);
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                // Get all due recurring broadcasts
                const result = await client.query(`
                    SELECT * FROM broadcasts 
                    WHERE is_recurring = true 
                    AND next_run_at <= NOW() 
                    AND status NOT IN ('cancelled', 'paused')
                    FOR UPDATE SKIP LOCKED
                `);

                for (const broadcast of result.rows) {
                    console.log(`[BroadcastCron] Triggering recurring broadcast: ${broadcast.id}`);
                    
                    // 1. Calculate new next_run_at
                    const nextDate = new Date(broadcast.next_run_at || Date.now());
                    if (broadcast.recurrence_type === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                    else if (broadcast.recurrence_type === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                    else if (broadcast.recurrence_type === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                    
                    // Update original broadcast's next_run_at
                    await client.query(`UPDATE broadcasts SET next_run_at = $1 WHERE id = $2`, [nextDate.toISOString(), broadcast.id]);

                    // 2. Fetch original recipients
                    const recRes = await client.query(`SELECT * FROM broadcast_recipients WHERE broadcast_id = $1`, [broadcast.id]);
                    
                    // 3. Queue jobs again with delays
                    const jobs = [];
                    let currentDelay = 0;
                    
                    let delaySettings = {
                        msgEnabled: true, msgMin: 5, msgMax: 15,
                        batchEnabled: true, batchSize: 10, batchMin: 30, batchMax: 60
                    };
                    
                    if (broadcast.delay_settings) {
                        try {
                            const parsed = typeof broadcast.delay_settings === 'string' ? JSON.parse(broadcast.delay_settings) : broadcast.delay_settings;
                            delaySettings = { ...delaySettings, ...parsed };
                        } catch(e){}
                    }

                    for (let i = 0; i < recRes.rows.length; i++) {
                        const r = recRes.rows[i];
                        
                        // We reuse the same recipient ID for simplicity, so the worker will update its status to 'queued' then 'sent'.
                        // Wait, if we reuse the same recipient ID, the stats (sent/failed) will be overwritten.
                        // Better to create a new cloned broadcast to keep stats separated!
                        
                        // Let's create a cloned broadcast instead
                    }
                    
                    // Create cloned broadcast
                    const newName = `${broadcast.name} (Run: ${new Date().toLocaleDateString()})`;
                    const newBroadcastRes = await client.query(
                        `INSERT INTO broadcasts
                         (organization_id, name, message_template, media_url, target_type, target_value, rotator_group_id, device_id, status, delay_settings, is_recurring, recurrence_type, flow_id, assigned_agent_id, show_in_history)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processing', $9, false, 'none', $10, $11, $12)
                         RETURNING id`,
                        [
                            broadcast.organization_id,
                            newName,
                            broadcast.message_template,
                            broadcast.media_url,
                            broadcast.target_type,
                            broadcast.target_value,
                            broadcast.rotator_group_id,
                            broadcast.device_id,
                            broadcast.delay_settings,
                            broadcast.flow_id,
                            broadcast.assigned_agent_id,
                            broadcast.show_in_history || false
                        ]
                    );
                    const newBroadcastId = newBroadcastRes.rows[0].id;

                    for (let i = 0; i < recRes.rows.length; i++) {
                        const r = recRes.rows[i];

                        // Insert new recipient
                        const newRecRes = await client.query(
                            `INSERT INTO broadcast_recipients (broadcast_id, phone_number, name, status, group_name, custom_vars)
                             VALUES ($1, $2, $3, 'queued', $4, $5) RETURNING id`,
                            [
                                newBroadcastId,
                                r.phone_number,
                                r.name,
                                r.group_name,
                                r.custom_vars
                            ]
                        );

                        if (i > 0) {
                            if (delaySettings.msgEnabled) {
                                const msgDelay = Math.floor(Math.random() * (delaySettings.msgMax - delaySettings.msgMin + 1) + delaySettings.msgMin) * 1000;
                                currentDelay += msgDelay;
                            }
                            if (delaySettings.batchEnabled && (i) % delaySettings.batchSize === 0) {
                                const batchDelay = Math.floor(Math.random() * (delaySettings.batchMax - delaySettings.batchMin + 1) + delaySettings.batchMin) * 1000;
                                currentDelay += batchDelay;
                            }
                        }

                        // Fetch contactId
                        let contactId = null;
                        if (!r.group_name) {
                            const cRes = await client.query('SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2', [broadcast.organization_id, r.phone_number]);
                            if (cRes.rows.length > 0) contactId = cRes.rows[0].id;
                        }

                        jobs.push({
                            name: 'send-message',
                            data: {
                                broadcastId: newBroadcastId,
                                recipientId: newRecRes.rows[0].id,
                                contactId,
                                messageTemplate: broadcast.message_template,
                                mediaUrl: broadcast.media_url,
                                rotatorGroupId: broadcast.rotator_group_id,
                                deviceId: broadcast.device_id,
                                orgId: broadcast.organization_id,
                                isGroup: !!r.group_name,
                                customVars: r.custom_vars ? (typeof r.custom_vars === 'string' ? JSON.parse(r.custom_vars) : r.custom_vars) : null,
                                showInHistory: broadcast.show_in_history || false,
                                assignedAgentId: broadcast.assigned_agent_id || null
                            },
                            opts: {
                                delay: currentDelay,
                                removeOnComplete: true,
                                removeOnFail: false
                            }
                        });
                    }
                    
                    if (jobs.length > 0) {
                        console.log(`[BroadcastCron] Queuing ${jobs.length} jobs for cloned broadcast ${newBroadcastId}`);
                        await broadcastQueue.addBulk(jobs);
                    }
                }
                
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                console.error('[BroadcastCron] Error:', err);
            } finally {
                client.release();
            }
        });
    } catch (e) {
        console.error('[BroadcastCron] Failed to initialize cron:', e);
    }
};

export default {
    getScheduledBroadcasts,
    createScheduledBroadcast,
    updateScheduledBroadcast,
    cancelScheduledBroadcast,
    deleteScheduledBroadcast,
    startBroadcastCron
};