import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import redisConnection from '../config/redis.js';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { resolveLidMappings } from './webhookController.js';
import { isHideDeviceDataEnabled } from '../utils/organizationSettings.js';
import { latestQrCache } from './webhook/webhookEventHandlers.js';
import { uuidRegex } from '../utils/validators.js';

// --- DEVICES ---

export const getDevices = async (req, res) => {
    try {
        const { organization_id } = req.user;
        const { exclude_status, include_deleted } = req.query;

        // SELF-HEAL: Fix legacy official devices mistakenly marked as 'unofficial' by migration
        // If it has a WABA ID or Phone ID, it IS Official.
        await pool.query(`
            UPDATE whatsapp_sessions
            SET type = 'official'
            WHERE organization_id = $1
            AND type = 'unofficial'
            AND (waba_id IS NOT NULL OR phone_number_id IS NOT NULL)
        `, [organization_id]).catch(err => console.warn("Self-heal failed:", err.message));

        // Set default device_status for legacy records if missing
        await pool.query(`
            UPDATE whatsapp_sessions
            SET device_status = 'active'
            WHERE device_status IS NULL
        `).catch(err => console.warn("Device status fix failed:", err.message));

        let query = `
            SELECT *,
                CASE WHEN device_status = 'deleted' THEN true ELSE false END as is_hidden
            FROM whatsapp_sessions
            WHERE organization_id = $1
        `;
        const params = [organization_id];
        let paramIndex = 2;

        // Default: Exclude deleted devices from main list (unless explicitly requested)
        if (include_deleted !== 'true') {
            query += ` AND device_status != 'deleted'`;
        }

        if (exclude_status) {
            query += ` AND status != $${paramIndex}`;
            params.push(exclude_status);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        // Respond immediately
        res.json(result.rows);

        // BACKGROUND: Sync Profile Pictures for Connected Devices
        // We do this async so we don't block the response
        // Fixed: Use for...of to properly await async operations
        (async () => {
            for (const device of result.rows) {
                // Sync if not official AND connected AND has phone number
                if (device.type !== 'official' && device.whatsapp_number && device.status === 'connected') {
                    try {
                        // Fetch latest profile pic from Gateway
                        const jid = device.whatsapp_number.includes('@')
                            ? device.whatsapp_number
                            : `${device.whatsapp_number}@s.whatsapp.net`;

                        // Retrieve profile picture URL
                        const latestPic = await waService.getContactProfile(device.session_id, jid);

                        // Check against DB value
                        const picUrl = (typeof latestPic === 'object' && latestPic !== null)
                            ? (latestPic.profilePicUrl || latestPic.url)
                            : latestPic;

                        if (picUrl && picUrl !== device.profile_pic_url) {
                            await pool.query(
                                'UPDATE whatsapp_sessions SET profile_pic_url = $1 WHERE id = $2',
                                [picUrl, device.id]
                            );

                            // Emit update to frontend including the new profile pic
                            if (req.io) {
                                req.io.to(`org_${organization_id}`).emit('device_status_update', {
                                    sessionId: device.session_id,
                                    status: device.status,
                                    phone: device.whatsapp_number,
                                    profile_pic_url: picUrl
                                });
                            }
                        }
                    } catch (err) {
                        console.warn('[DeviceController] Profile sync error:', err.message);
                    }
                }
            }
        })();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getDeviceStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // Check limit for WhatsApp Devices
        const access = await checkFeatureAccess(organization_id, 'feat_session_limit');
        res.json(access);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const addDevice = async (req, res) => {
    const { name, isWarmerOnly, syncFullHistory, syncContacts } = req.body;
    const { organization_id } = req.user;

    // 1. Limit Check
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_session_limit');
        if (!access.allowed) {
            return res.status(403).json({
                error: access.message,
                code: 'LIMIT_REACHED',
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Limit Check Error: " + err.message });
    }

    // 2. Cek apakah hide device data feature ENABLED
    const hideEnabled = await isHideDeviceDataEnabled(organization_id);

    let gatewaySessionId = null;

    // 3. Gateway Create
    try {
        const sessionNameLabel = `${name}-${Date.now()}`;
        const gatewayResponse = await waService.createSession(sessionNameLabel, syncFullHistory);

        const rawData = gatewayResponse.data || gatewayResponse;
        gatewaySessionId = rawData.id || rawData.sessionId || gatewayResponse.id;

        if (!gatewaySessionId) throw new Error("No Session ID returned from Gateway");
    } catch (err) {
        console.error("Gateway Create Error:", err);
        return res.status(502).json({ error: "Gateway Error: " + err.message });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let deviceResult;
        let isRestored = false;

        if (hideEnabled) {
            // ================================================
            // MODE: Check for existing 'deleted' device with same name
            // ================================================
            const existingDeleted = await client.query(`
                SELECT id FROM whatsapp_sessions
                WHERE organization_id = $1 AND name = $2 AND device_status = 'deleted'
            `, [organization_id, name]);

            if (existingDeleted.rows.length > 0) {
                // RESTORE: Aktifkan kembali device yang di-deleted
                const existingId = existingDeleted.rows[0].id;

                await client.query(`
                    UPDATE whatsapp_sessions
                    SET device_status = 'active',
                        deleted_at = NULL,
                        session_id = $1,
                        status = 'created'
                    WHERE id = $2
                `, [gatewaySessionId, existingId]);

                await client.query('COMMIT');

                // Delete gateway session yang baru (kita reuse yang lama)
                waService.deleteSession(gatewaySessionId).catch(() => { });

                // Start session (non-blocking) - tapi kita pakai session_id yang baru
                waService.startSession(gatewaySessionId).catch(e => console.warn("Auto-start warning:", e.message));

                res.status(201).json({
                    message: 'Device restored successfully',
                    id: existingId,
                    restored: true
                });
                return;
            }
        }

        // NEW DEVICE (atau jika hideEnabled = false)
        const deviceInfo = {
            ...(isWarmerOnly ? { is_warmer_only: true } : {}),
            sync_contacts: syncContacts !== undefined ? !!syncContacts : true
        };
        const dbRes = await client.query(
            `INSERT INTO whatsapp_sessions (organization_id, session_id, name, status, device_info, device_status, sync_full_history)
             VALUES ($1, $2, $3, 'created', $4, 'active', $5) RETURNING *`,
            [organization_id, gatewaySessionId, name, JSON.stringify(deviceInfo), !!syncFullHistory]
        );

        deviceResult = dbRes.rows[0];
        await client.query('COMMIT');

        // 4. Start Session (Non-blocking but listen for immediate QR)
        waService.startSession(gatewaySessionId).then((statusData) => {
            if (statusData?.qr) {
                latestQrCache.set(gatewaySessionId, statusData.qr);
                if (req.io) {
                    req.io.to(`org_${organization_id}`).emit('qr_received', {
                        sessionId: gatewaySessionId,
                        qr: statusData.qr
                    });
                }
            }
        }).catch(e => console.warn("Auto-start warning:", e.message));

        res.status(201).json(deviceResult);

    } catch (err) {
        await client.query('ROLLBACK');
        if (gatewaySessionId) waService.deleteSession(gatewaySessionId).catch(() => { });
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// GET /api/app/devices/:id/qr — Live QR Code fetcher & fallback polling
export const getDeviceQrCode = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        let session_id = id;
        if (!uuidRegex.test(id)) {
            const devRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2', [id, organization_id]);
            if (devRes.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
            session_id = devRes.rows[0].session_id;
        }

        // 1. Check in-memory cache
        let qr = latestQrCache.get(session_id);
        if (qr) {
            return res.json({ sessionId: session_id, qr, status: 'NEED_QR' });
        }

        // 2. Fetch live status directly from Gateway
        const gwStatus = await waService.getSessionStatus(session_id);
        if (gwStatus) {
            if (gwStatus.qr) {
                latestQrCache.set(session_id, gwStatus.qr);
            }
            return res.json({
                sessionId: session_id,
                qr: gwStatus.qr || null,
                status: gwStatus.status
            });
        }

        return res.json({ sessionId: session_id, qr: null, status: 'INITIALIZING' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: Update Device Name
export const updateDevice = async (req, res) => {
    const { id } = req.params;
    const { name, isWarmerOnly } = req.body;
    const { organization_id } = req.user;

    try {
        const check = await pool.query('SELECT device_info FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Device not found" });

        let deviceInfo = check.rows[0].device_info || {};
        if (typeof deviceInfo === 'string') {
            try { deviceInfo = JSON.parse(deviceInfo); } catch (e) { }
        }

        if (isWarmerOnly !== undefined) {
            deviceInfo.is_warmer_only = isWarmerOnly;
        }

        const result = await pool.query(
            'UPDATE whatsapp_sessions SET name = $1, device_info = $2, updated_at = NOW() WHERE id = $3 AND organization_id = $4 RETURNING *',
            [name, JSON.stringify(deviceInfo), id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "Device not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteDevice = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    const client = await pool.connect();

    try {
        // 1. Cek keberadaan device + validasi kepemilikan org
        const devRes = await client.query('SELECT session_id, type, waba_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (devRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: 'Device not found' });
        }

        const { session_id, type, waba_id } = devRes.rows[0];

        // 2. Hapus dari Gateway (Ignore error jika sudah tidak ada)
        // HANYA jika bukan Official API
        if (type !== 'official') {
            try {
                await waService.deleteSession(session_id);
            } catch (e) {
                console.warn(`Gateway delete warning for ${session_id}:`, e.message);
            }
        }

        await client.query('BEGIN');

        // 3. Cek apakah hide feature ENABLED
        const hideEnabled = await isHideDeviceDataEnabled(organization_id);

        if (hideEnabled) {
            // ================================================
            // MODE: SOFT DELETE (Hide data)
            // ================================================

            // UPDATE status, JANGAN DELETE
            await client.query(`
                UPDATE whatsapp_sessions
                SET device_status = 'deleted',
                    deleted_at = NOW(),
                    session_id = NULL
                WHERE id = $1
            `, [id]);

            // Clear foreign keys agar tidak ambiguous saat filtering
            await client.query('UPDATE broadcast_recipients SET used_session_id = NULL WHERE used_session_id = $1', [id]);
            await client.query('UPDATE warmer_logs SET sender_session_id = NULL WHERE sender_session_id = $1', [id]);

            console.log(`[deleteDevice] Soft delete: Device ${id} hidden for org ${organization_id}`);

        } else {
            // ================================================
            // MODE: HARD DELETE (Current behavior - default)
            // ================================================

            // 4. Jika Official API, Hapus juga template yang terkait dengan WABA ID ini
            // Agar tidak menjadi "Ghost Data" jika akun dihapus dan dihubungkan ke org lain
            if (type === 'official' && waba_id) {
                await client.query('DELETE FROM meta_templates WHERE waba_id = $1', [waba_id]);
            }

            // 5. Update Foreign Key Relations
            await client.query('UPDATE broadcast_recipients SET used_session_id = NULL WHERE used_session_id = $1', [id]);
            await client.query('UPDATE warmer_logs SET sender_session_id = NULL WHERE sender_session_id = $1', [id]);
            try {
                await client.query('UPDATE broadcasts SET device_id = NULL WHERE device_id = $1', [id]);
            } catch (e) { }

            // 6. Hapus Device
            await client.query('DELETE FROM whatsapp_sessions WHERE id = $1', [id]);

            console.log(`[deleteDevice] Hard delete: Device ${id} removed for org ${organization_id}`);
        }

        await client.query('COMMIT');

        res.json({
            message: hideEnabled
                ? 'Device hidden successfully'
                : 'Device deleted successfully',
            mode: hideEnabled ? 'soft_delete' : 'hard_delete'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete Device Failed:", err);
        res.status(500).json({ error: "Database Error: " + err.message });
    } finally {
        client.release();
    }
};

export const retryDevice = async (req, res) => {
    const { id } = req.params;
    const { syncFullHistory, syncContacts } = req.body || {};
    const { organization_id } = req.user;
    try {
        const devRes = await pool.query('SELECT session_id, name, device_info FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (devRes.rows.length === 0) return res.status(404).json({ error: 'Device not found' });

        const oldSessionId = devRes.rows[0].session_id;
        const deviceName = devRes.rows[0].name;

        // 1. DELETE old session from Gateway (Clean state)
        try {
            await waService.deleteSession(oldSessionId);
        } catch (e) {
            console.warn(`[Retry] Failed to delete old session ${oldSessionId}: ${e.message}`);
        }

        // 2. CREATE new session on Gateway
        // We append timestamp to ensure uniqueness and freshness
        const sessionNameLabel = `${deviceName}-${Date.now()}`;
        let newSessionId = null;
        try {
            const gatewayResponse = await waService.createSession(sessionNameLabel, syncFullHistory);
            const rawData = gatewayResponse.data || gatewayResponse;
            newSessionId = rawData.id || rawData.sessionId || gatewayResponse.id;
            if (!newSessionId) throw new Error("No ID returned from Gateway");
        } catch (e) {
            return res.status(502).json({ error: "Failed to create new session: " + e.message });
        }

        // 3. UPDATE DB with new Session ID
        // Also reset status to 'created' so UI reflects it's fresh
        let deviceInfo = devRes.rows[0].device_info || {};
        if (typeof deviceInfo === 'string') {
            try { deviceInfo = JSON.parse(deviceInfo); } catch (e) { deviceInfo = {}; }
        }
        if (syncContacts !== undefined) {
            deviceInfo.sync_contacts = !!syncContacts;
        }

        await pool.query(
            "UPDATE whatsapp_sessions SET session_id = $1, status = 'created', sync_full_history = COALESCE($3, sync_full_history), device_info = $4 WHERE id = $2",
            [newSessionId, id, syncFullHistory !== undefined ? !!syncFullHistory : null, JSON.stringify(deviceInfo)]
        );

        // 4. CLEAR Cache
        await redisConnection.del(`groups_full_data:${oldSessionId}`);
        await redisConnection.del(`groups_list:${oldSessionId}`);
        // Also clear new ID just in case
        await redisConnection.del(`groups_full_data:${newSessionId}`);
        await redisConnection.del(`groups_list:${newSessionId}`);

        // 5. START new session (Non-blocking but listen for immediate QR)
        waService.startSession(newSessionId).then((statusData) => {
            if (statusData?.qr) {
                latestQrCache.set(newSessionId, statusData.qr);
                if (req.io) {
                    req.io.to(`org_${organization_id}`).emit('qr_received', {
                        sessionId: newSessionId,
                        qr: statusData.qr
                    });
                }
            }
        }).catch(e => console.warn("[Retry] Auto-start warning:", e.message));

        res.json({
            message: 'Retry initiated (Session Reset)',
            newSessionId: newSessionId
        });

    } catch (err) {
        console.error("Retry Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- NEW: Device Report ---
export const getDeviceReport = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const devRes = await pool.query(
            'SELECT * FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (devRes.rows.length === 0) return res.status(404).json({ error: 'Device not found' });
        const device = devRes.rows[0];

        // 1. Message Stats (Today)
        // Uses messages table. 
        // Note: 'status' in messages table for sent messages is usually 'sent', 'delivered', 'read'
        const todayStatsRes = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE from_me = false) as received,
                COUNT(*) FILTER (WHERE from_me = true) as sent,
                COUNT(*) FILTER (WHERE from_me = true AND status = 'failed') as failed
            FROM messages
            WHERE organization_id = $1 
            AND created_at >= CURRENT_DATE
            AND conversation_id IN (
                SELECT id FROM conversations WHERE whatsapp_session_id = $2
            )
        `, [organization_id, device.id]);

        // 2. Broadcast Performance (This Month)
        const broadcastStatsRes = await pool.query(`
            SELECT 
                COUNT(DISTINCT b.id) as total_campaigns,
                COUNT(br.id) as total_messages
            FROM broadcasts b
            JOIN broadcast_recipients br ON b.id = br.broadcast_id
            WHERE b.organization_id = $1 
            AND br.used_session_id = $2
            AND br.sent_at >= date_trunc('month', CURRENT_DATE)
        `, [organization_id, device.id]);

        // 3. Agent Performance (Approximation)
        // Groups outgoing messages by sender_id (user) linked to this device's conversations
        // Requires sender_id column on messages table (added in migration)
        const agentStatsRes = await pool.query(`
            SELECT 
                u.name as agent_name,
                COUNT(m.id) as messages_handled
            FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.organization_id = $1
            AND m.from_me = true
            AND m.created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND m.conversation_id IN (
                SELECT id FROM conversations WHERE whatsapp_session_id = $2
            )
            GROUP BY u.name
            ORDER BY messages_handled DESC
            LIMIT 5
        `, [organization_id, device.id]);

        res.json({
            device_info: {
                name: device.name,
                whatsapp_number: device.whatsapp_number,
                status: device.status,
                connected_at: device.connected_at,
                session_id: device.session_id
            },
            stats_today: {
                sent: parseInt(todayStatsRes.rows[0].sent),
                received: parseInt(todayStatsRes.rows[0].received),
                failed: parseInt(todayStatsRes.rows[0].failed)
            },
            broadcast_performance: {
                total_campaigns: parseInt(broadcastStatsRes.rows[0].total_campaigns),
                total_messages: parseInt(broadcastStatsRes.rows[0].total_messages)
            },
            agent_performance: agentStatsRes.rows
        });

    } catch (err) {
        console.error("Device Report Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// --- ROTATORS ---

// NEW: Check Access for Rotators
export const getRotatorStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_rotator');
        // feat_rotator is a BOOLEAN feature, not a limit.
        // If access.allowed is false, it means feature is locked.
        res.json({
            allowed: access.allowed,
            locked: !access.allowed, // True if not allowed
            message: access.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createRotator = async (req, res) => {
    const { name, description, sessionIds } = req.body;
    const { organization_id } = req.user;

    // Ensure checkFeatureAccess is imported or defined
    const access = await checkFeatureAccess(organization_id, 'feat_rotator');
    if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

    const client = await pool.connect();
    try {
        if (!sessionIds || sessionIds.length < 2) return res.status(400).json({ error: "Min 2 devices" });

        // Verify sessions exist and are connected (Status must be 'connected')
        // AND ARE UNOFFICIAL (type != 'official')
        const sessionsRes = await client.query(
            `SELECT id FROM whatsapp_sessions
              WHERE id = ANY($1::int[])
              AND organization_id = $2
              AND type != 'official'
              AND LOWER(status) = 'connected'`,
            [sessionIds, organization_id]
        );

        if (sessionsRes.rows.length < 2) {
            return res.status(400).json({ error: "Selected devices must be CONNECTED UNOFFICIAL devices. Only " + sessionsRes.rows.length + " valid devices found." });
        }

        await client.query('BEGIN');
        const groupRes = await client.query(
            'INSERT INTO rotator_groups (organization_id, name, description) VALUES ($1, $2, $3) RETURNING id',
            [organization_id, name, description]
        );
        const groupId = groupRes.rows[0].id;

        // Use validated IDs only
        for (const row of sessionsRes.rows) {
            await client.query(
                'INSERT INTO rotator_group_sessions (rotator_group_id, whatsapp_session_id) VALUES ($1, $2)',
                [groupId, row.id]
            );
        }
        await redisConnection.set(`rotator_index:${groupId}`, 0);
        await client.query('COMMIT');
        res.status(201).json({ success: true, id: groupId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const updateRotator = async (req, res) => {
    const { id } = req.params;
    const { name, description, sessionIds } = req.body;
    const { organization_id } = req.user;

    const client = await pool.connect();
    try {
        // Check ownership
        const check = await client.query('SELECT id FROM rotator_groups WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        // Verify sessions if provided
        let validSessionIds = [];
        if (sessionIds && sessionIds.length > 0) {
            const sessionsRes = await client.query(
                `SELECT id FROM whatsapp_sessions 
                  WHERE id = ANY($1::int[]) 
                  AND organization_id = $2 
                  AND type != 'official'
                  AND (LOWER(status) = 'connected' OR whatsapp_number IS NOT NULL)`,
                [sessionIds, organization_id]
            );
            if (sessionsRes.rows.length < 2) {
                return res.status(400).json({ error: "Update failed: Must maintain at least 2 connected unofficial devices." });
            }
            validSessionIds = sessionsRes.rows.map(r => r.id);
        }

        await client.query('BEGIN');

        // Update Meta
        await client.query(
            'UPDATE rotator_groups SET name = $1, description = $2 WHERE id = $3',
            [name, description, id]
        );

        // Update Sessions if provided
        if (validSessionIds.length > 0) {
            await client.query('DELETE FROM rotator_group_sessions WHERE rotator_group_id = $1', [id]);
            for (const sessionId of validSessionIds) {
                await client.query(
                    'INSERT INTO rotator_group_sessions (rotator_group_id, whatsapp_session_id) VALUES ($1, $2)',
                    [id, sessionId]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Rotator group updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const deleteRotator = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const client = await pool.connect();

    try {
        // Check ownership
        const check = await client.query('SELECT id FROM rotator_groups WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Group not found' });

        await client.query('BEGIN');

        // Handle Foreign Key Constraint in 'broadcasts'
        // If this rotator was used in past broadcasts, set the reference to NULL instead of deleting the broadcast log
        await client.query('UPDATE broadcasts SET rotator_group_id = NULL WHERE rotator_group_id = $1', [id]);

        // Now safe to delete (cascade handles rotator_group_sessions)
        await client.query('DELETE FROM rotator_groups WHERE id = $1', [id]);

        // Clean up redis index (optional)
        await redisConnection.del(`rotator_index:${id}`);

        await client.query('COMMIT');
        res.json({ message: 'Rotator group deleted' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete Rotator Failed:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// NEW: Test Message
export const sendTestMessage = async (req, res) => {
    const { id } = req.params;
    const { to, message } = req.body;
    const { organization_id } = req.user;

    try {
        // Get Device Session
        const devRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (devRes.rows.length === 0) return res.status(404).json({ error: 'Device not found' });

        const { session_id } = devRes.rows[0];

        // Send logic
        await waService.sendText(session_id, to, message || "Test message from CRMHub");

        res.json({ success: true, message: "Test message sent!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ============================================================================
// ADMIN: Resolve All LID Contacts
// Heals old @lid contacts in the database by querying wa-server LID cache
// and updating contacts with their real WhatsApp phone numbers.
// ============================================================================
export const resolveAllLidContacts = async (req, res) => {
    const { organization_id } = req.user;

    try {
        // Get all connected sessions for this organization
        const sessionRes = await pool.query(
            `SELECT id, session_id, name FROM whatsapp_sessions
             WHERE organization_id = $1 AND status != 'disconnected'`,
            [organization_id]
        );

        if (sessionRes.rows.length === 0) {
            return res.json({ message: "No active sessions found.", sessions: [], totalResolved: 0 });
        }

        const results = [];
        let totalResolved = 0;
        let totalMerged = 0;
        let totalUpdated = 0;

        for (const session of sessionRes.rows) {
            const { id: dbSessionId, session_id: waSessionId, name: deviceName } = session;

            try {
                // Call wa-server to get all LID → PN mappings
                const waResult = await waService.resolveAllLids(waSessionId);
                const mappings = waResult?.mappings || [];

                if (mappings.length === 0) {
                    results.push({ sessionId: waSessionId, deviceName, status: 'no_mappings', resolved: 0 });
                    continue;
                }

                // Resolve each mapping in the database
                const stats = await resolveLidMappings({
                    pool,
                    dbSessionId,
                    organizationId: organization_id,
                    mappings,
                    io: req.io || null
                });

                results.push({
                    sessionId: waSessionId,
                    deviceName,
                    status: 'ok',
                    mappingsFound: mappings.length,
                    ...stats
                });

                totalResolved += stats.resolved;
                totalMerged += stats.merged;
                totalUpdated += stats.updated;
            } catch (err) {
                console.error(`[resolveAllLidContacts] Session ${waSessionId} error: ${err.message}`);
                results.push({ sessionId: waSessionId, deviceName, status: 'error', error: err.message });
            }
        }

        console.log(`[resolveAllLidContacts] Organization ${organization_id}: resolved=${totalResolved}, merged=${totalMerged}, updated=${totalUpdated}`);

        res.json({
            message: `Processed ${sessionRes.rows.length} sessions.`,
            sessions: results,
            totals: { resolved: totalResolved, merged: totalMerged, updated: totalUpdated }
        });
    } catch (err) {
        console.error('[resolveAllLidContacts]', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================================
// DEVICE HEALTH MONITORING
// ============================================================================

export const getDeviceHealth = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // Get all devices with their message stats from last 30 days
        const devicesRes = await pool.query(`
            SELECT
                ws.id,
                ws.name,
                ws.whatsapp_number,
                ws.status,
                ws.type,
                ws.connected_at,
                ws.created_at,
                ws.device_status,
                -- Get message stats from conversations and messages
                COALESCE(msg_stats.sent, 0) as messages_sent,
                COALESCE(msg_stats.delivered, 0) as messages_delivered,
                COALESCE(msg_stats.failed, 0) as messages_failed,
                -- Calculate success rate
                CASE
                    WHEN COALESCE(msg_stats.sent, 0) > 0
                    THEN (COALESCE(msg_stats.delivered, 0)::numeric / COALESCE(msg_stats.sent, 0) * 100)
                    ELSE 0
                END as message_success_rate,
                -- Days since connected
                GREATEST(0, DATE_PART('day', NOW() - COALESCE(ws.connected_at, ws.created_at))) as days_active,
                -- Daily average (approx)
                GREATEST(1, DATE_PART('day', NOW() - COALESCE(ws.connected_at, ws.created_at))) as divisor
            FROM whatsapp_sessions ws
            LEFT JOIN (
                SELECT
                    c.whatsapp_session_id,
                    COUNT(*) FILTER (WHERE m.from_me = true) as sent,
                    COUNT(*) FILTER (WHERE m.from_me = true AND m.status IN ('delivered', 'read')) as delivered,
                    COUNT(*) FILTER (WHERE m.from_me = true AND m.status = 'failed') as failed
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE m.organization_id = $1
                AND m.from_me = true
                AND m.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY c.whatsapp_session_id
            ) msg_stats ON ws.id = msg_stats.whatsapp_session_id
            WHERE ws.organization_id = $1
            AND ws.device_status != 'deleted'
            ORDER BY ws.created_at DESC
        `, [organization_id]);

        const devices = devicesRes.rows.map(d => {
            const successRate = parseFloat(d.message_success_rate) || 0;
            const dailyAvg = d.messages_sent > 0
                ? Math.round(d.messages_sent / Math.max(1, d.divisor))
                : 0;

            // Calculate risk level based on various factors
            let riskLevel = 'low';
            if (successRate < 50 || d.messages_failed > 50) {
                riskLevel = 'critical';
            } else if (successRate < 70 || dailyAvg > 100) {
                riskLevel = 'high';
            } else if (successRate < 85 || dailyAvg > 50) {
                riskLevel = 'medium';
            }

            return {
                ...d,
                daily_avg: dailyAvg,
                risk_level: riskLevel,
                message_success_rate: successRate
            };
        });

        res.json({ devices });
    } catch (err) {
        console.error('Device Health Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getDeviceHealthStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // Get aggregated stats
        const statsRes = await pool.query(`
            SELECT
                COUNT(*) as total_devices,
                COUNT(*) FILTER (WHERE LOWER(ws.status) = 'connected') as active_devices,
                SUM(COALESCE(msg_stats.sent, 0)) as total_messages,
                AVG(
                    CASE
                        WHEN COALESCE(msg_stats.sent, 0) > 0
                        THEN (COALESCE(msg_stats.delivered, 0)::numeric / COALESCE(msg_stats.sent, 0) * 100)
                        ELSE 0
                    END
                ) as avg_success_rate
            FROM whatsapp_sessions ws
            LEFT JOIN (
                SELECT
                    c.whatsapp_session_id,
                    COUNT(*) FILTER (WHERE m.from_me = true) as sent,
                    COUNT(*) FILTER (WHERE m.from_me = true AND m.status IN ('delivered', 'read')) as delivered
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE m.organization_id = $1
                AND m.from_me = true
                AND m.created_at >= NOW() - INTERVAL '30 days'
                GROUP BY c.whatsapp_session_id
            ) msg_stats ON ws.id = msg_stats.whatsapp_session_id
            WHERE ws.organization_id = $1
            AND ws.device_status != 'deleted'
        `, [organization_id]);

        // Get weekly trend (messages sent per day, last 7 days)
        const trendRes = await pool.query(`
            SELECT
                DATE(m.created_at) as day,
                COUNT(*) as message_count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
            WHERE ws.organization_id = $1
            AND m.from_me = true
            AND m.created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(m.created_at)
            ORDER BY day ASC
        `, [organization_id]);

        const row = statsRes.rows[0];
        const trend = trendRes.rows;

        // Build weekly array (7 days)
        const weeklyTrend = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const found = trend.find(t => t.day.toISOString().split('T')[0] === dateStr);
            weeklyTrend.push(parseInt(found?.message_count || 0));
        }

        // Calculate overall risk (inverse of success rate, normalized to 0-100)
        const avgSuccess = parseFloat(row.avg_success_rate) || 75;
        const overallRisk = Math.round(avgSuccess); // Lower success = higher risk perception

        res.json({
            total_devices: parseInt(row.total_devices) || 0,
            active_devices: parseInt(row.active_devices) || 0,
            avg_success_rate: avgSuccess,
            overall_risk: overallRisk,
            total_messages: parseInt(row.total_messages) || 0,
            weekly_trend: weeklyTrend
        });
    } catch (err) {
        console.error('Device Health Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const getOptimalTimes = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // Analyze message delivery success by hour
        const timesRes = await pool.query(`
            SELECT
                EXTRACT(HOUR FROM m.created_at) as hour,
                COUNT(*) as total_sent,
                COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read')) as delivered,
                CASE
                    WHEN COUNT(*) > 0
                    THEN ROUND((COUNT(*) FILTER (WHERE m.status IN ('delivered', 'read'))::numeric / COUNT(*) * 100), 1)
                    ELSE 0
                END as efficiency
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
            WHERE ws.organization_id = $1
            AND m.from_me = true
            AND m.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY EXTRACT(HOUR FROM m.created_at)
            ORDER BY efficiency DESC, total_sent DESC
            LIMIT 5
        `, [organization_id]);

        const times = timesRes.rows.map(r => {
            const hour = parseInt(r.hour);
            const nextHour = hour + 1;
            const timeStr = `${hour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`;
            return {
                time: timeStr,
                efficiency: parseFloat(r.efficiency) || 0,
                sent: parseInt(r.total_sent)
            };
        });

        res.json({ times });
    } catch (err) {
        console.error('Optimal Times Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ============================================================================
// ADMIN: Count LID Contacts (diagnostic endpoint)
// Shows how many @lid contacts exist per session (before resolution)
// ============================================================================
export const countLidContacts = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await pool.query(
            `SELECT s.session_id, s.name as device_name, COUNT(c.id) as lid_count
             FROM whatsapp_sessions s
             LEFT JOIN contacts c ON c.organization_id = s.organization_id
                 AND c.phone_number LIKE '%@lid'
             WHERE s.organization_id = $1 AND s.status != 'disconnected'
             GROUP BY s.id, s.session_id, s.name
             ORDER BY lid_count DESC`,
            [organization_id]
        );

        const total = result.rows.reduce((sum, r) => sum + parseInt(r.lid_count || '0'), 0);

        res.json({ sessions: result.rows, totalLidContacts: total });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
