import pool from '../config/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as formService from '../services/formService.js';
import { generateResponse } from '../services/aiService.js';
import { checkFeatureAccess } from '../services/featureGateService.js';
import * as AutoReplyService from '../services/AutoReplyService.js';
import redisConnection from '../config/redis.js';
import { autoAssignConversation, getInboxIdForDevice } from './inboxSettingsController.js';
import { initTicket } from './ticketController.js';

// --- ADMIN API ---

// Helper: If a limit exists (>0 or -1), implicitly allow the feature even if the boolean toggle is off
const resolveFeatureAccess = (featureAccess, limitAccess) => {
    if (featureAccess.allowed) return featureAccess;
    if (limitAccess.limit > 0 || limitAccess.limit === -1) {
        return { ...featureAccess, allowed: true };
    }
    return featureAccess;
};

// Helper: Auto-migrate table if columns are missing
const ensureWebchatColumns = async () => {
    try {
        await pool.query(`
            ALTER TABLE webchat_configs 
            ADD COLUMN IF NOT EXISTS launcher_logo_url TEXT,
            ADD COLUMN IF NOT EXISTS launcher_width INTEGER DEFAULT 60,
            ADD COLUMN IF NOT EXISTS launcher_height INTEGER DEFAULT 60
        `);
    } catch (e) {
        console.warn("[Webchat] Auto-migration failed:", e.message);
    }
};

// GET /api/app/webchat/stats (Check Limits)
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // 1. Check if Channel is Unlocked (Boolean)
        let channelAccess = await checkFeatureAccess(organization_id, 'channel_webchat');

        // 2. Check Numeric Limit
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_webchat');

        // Auto-unlock
        channelAccess = resolveFeatureAccess(channelAccess, limitAccess);

        if (!channelAccess.allowed) {
            return res.json({
                allowed: false,
                locked: true, // Feature is not in plan
                limit: 0,
                used: limitAccess.used,
                message: "Webchat Widget is not included in your plan."
            });
        }

        res.json({
            allowed: limitAccess.allowed,
            locked: false,
            limit: limitAccess.limit,
            used: limitAccess.used,
            message: limitAccess.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/webchat (List all widgets)
export const getConfigs = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM webchat_configs WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/webchat (Create new widget)
export const createConfig = async (req, res) => {
    const { organization_id } = req.user;
    const { name, primary_color, logo_url, position, launcher_icon, launcher_logo_url, launcher_width, launcher_height, welcome_message, offline_message, require_email, require_name, require_phone, show_agent_face, is_active } = req.body;

    // 1. Check Feature Unlock (Channel)
    try {
        let channelAccess = await checkFeatureAccess(organization_id, 'channel_webchat');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_webchat');

        // Auto-unlock
        channelAccess = resolveFeatureAccess(channelAccess, limitAccess);

        if (!channelAccess.allowed) {
            return res.status(403).json({
                error: "Fitur Webchat tidak tersedia dalam paket Anda. Silakan upgrade.",
                code: 'FEATURE_LOCKED',
                upsell: true
            });
        }

        // 2. Check Limit
        if (!limitAccess.allowed) {
            return res.status(403).json({
                error: limitAccess.message,
                code: 'LIMIT_REACHED',
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Access check failed: " + err.message });
    }

    const executeCreate = async () => {
        return await pool.query(
            `INSERT INTO webchat_configs (
                organization_id, name, widget_uid,
                primary_color, logo_url, position, launcher_icon,
                launcher_logo_url, launcher_width, launcher_height,
                welcome_message, offline_message,
                require_email, require_name, require_phone, show_agent_face,
                is_active
            ) 
             VALUES ($1, $2, uuid_generate_v4(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
             RETURNING *`,
            [
                organization_id, name || 'New Webchat',
                primary_color || '#6366F1', logo_url, position || 'bottom-right', launcher_icon || 'message-circle',
                launcher_logo_url, launcher_width || 60, launcher_height || 60,
                welcome_message, offline_message,
                require_email || false, require_name || true, require_phone || false, show_agent_face !== false,
                is_active !== false
            ]
        );
    };

    try {
        const result = await executeCreate();
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // Handle Missing Column Error (42703)
        if (err.code === '42703') {
            await ensureWebchatColumns();
            try {
                const retryRes = await executeCreate();
                return res.status(201).json(retryRes.rows[0]);
            } catch (retryErr) {
                return res.status(500).json({ error: retryErr.message });
            }
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/webchat/:id
export const updateConfig = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const {
        name, primary_color, logo_url, position, launcher_icon, launcher_logo_url,
        launcher_width, launcher_height,
        welcome_message, offline_message,
        require_email, require_name, require_phone, show_agent_face, is_active
    } = req.body;

    // Define query execution as function for retry logic
    const executeUpdate = async () => {
        return await pool.query(
            `UPDATE webchat_configs SET
             name = COALESCE($1, name), 
             primary_color = COALESCE($2, primary_color), 
             logo_url = COALESCE($3, logo_url), 
             position = COALESCE($4, position), 
             launcher_icon = COALESCE($5, launcher_icon), 
             launcher_logo_url = COALESCE($6, launcher_logo_url),
             launcher_width = COALESCE($7, launcher_width), 
             launcher_height = COALESCE($8, launcher_height),
             welcome_message = COALESCE($9, welcome_message), 
             offline_message = COALESCE($10, offline_message),
             require_email = COALESCE($11, require_email), 
             require_name = COALESCE($12, require_name), 
             require_phone = COALESCE($13, require_phone), 
             show_agent_face = COALESCE($14, show_agent_face), 
             is_active = COALESCE($15, is_active),
             updated_at = NOW()
             WHERE id = $16 AND organization_id = $17
             RETURNING *`,
            [
                name, primary_color, logo_url, position, launcher_icon, launcher_logo_url,
                launcher_width, launcher_height,
                welcome_message, offline_message,
                require_email, require_name, require_phone, show_agent_face, is_active,
                id, organization_id
            ]
        );
    };

    try {
        // If activating, check limit (optional check, usually create handles limit)
        // We only check if switching from inactive to active
        if (is_active) {
            let channelAccess = await checkFeatureAccess(organization_id, 'channel_webchat');
            const limitAccess = await checkFeatureAccess(organization_id, 'limit_webchat');
            channelAccess = resolveFeatureAccess(channelAccess, limitAccess);

            if (!channelAccess.allowed) return res.status(403).json({ error: "Webchat feature locked", upsell: true });
        }

        const result = await executeUpdate();

        if (result.rows.length === 0) return res.status(404).json({ error: "Config not found" });
        res.json(result.rows[0]);

    } catch (err) {
        // Check for "Undefined Column" error (Postgres Code 42703)
        if (err.code === '42703') {
            console.log("[Webchat] Schema mismatch detected, attempting auto-migration...");
            await ensureWebchatColumns();
            try {
                const retryRes = await executeUpdate();
                if (retryRes.rows.length === 0) return res.status(404).json({ error: "Config not found" });
                return res.json(retryRes.rows[0]);
            } catch (retryErr) {
                console.error("[Webchat] Retry failed:", retryErr);
                return res.status(500).json({ error: "Database Error: " + retryErr.message });
            }
        }

        console.error("Update Config Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/webchat/:id
export const deleteConfig = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM webchat_configs WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "Widget deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/webchat/upload (Admin)
export const uploadLogo = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/webchat/${req.file.filename}`;
    res.json({ url: fileUrl });
};

// --- PUBLIC WIDGET API ---

// GET /api/public/webchat/config/:uid
export const getPublicConfig = async (req, res) => {
    const { uid } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM webchat_configs WHERE widget_uid = $1 AND is_active = true',
            [uid]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Widget not found or inactive" });

        const config = result.rows[0];
        res.json({
            id: config.id,
            organization_id: config.organization_id,
            appearance: {
                primary_color: config.primary_color,
                logo_url: config.logo_url,
                position: config.position,
                launcher_icon: config.launcher_icon,
                launcher_logo_url: config.launcher_logo_url,
                launcher_width: config.launcher_width,
                launcher_height: config.launcher_height,
                show_agent_face: config.show_agent_face
            },
            text: {
                welcome: config.welcome_message,
                offline: config.offline_message
            },
            form: {
                require_email: config.require_email,
                require_name: config.require_name,
                require_phone: config.require_phone
            }
        });
    } catch (err) {
        // Graceful degradation if columns missing in SELECT *
        if (err.code === '42703') {
            // Return minimal config if schema is old
            return res.json({
                error: "Widget configuration pending update",
                appearance: { primary_color: '#6366F1' },
                text: { welcome: 'Hello' }
            });
        }
        res.status(500).json({ error: err.message });
    }
};


// POST /api/public/webchat/session
export const startSession = async (req, res) => {
    const { widget_uid, visitor_id, name, email, phone } = req.body;

    try {
        // 1. Verify Widget and Get Config ID (Integer)
        const configRes = await pool.query('SELECT id, organization_id FROM webchat_configs WHERE widget_uid = $1', [widget_uid]);
        if (configRes.rows.length === 0) return res.status(404).json({ error: "Widget invalid" });

        const orgId = configRes.rows[0].organization_id;
        const webchatConfigId = configRes.rows[0].id; // This is the integer ID

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 2. Find or Create Contact
            let contactId;
            let finalVisitorId;

            let contactRes = null;
            if (visitor_id) {
                contactRes = await client.query(
                    'SELECT id, name, web_visitor_id FROM contacts WHERE organization_id = $1 AND web_visitor_id = $2',
                    [orgId, visitor_id]
                );
            }

            if ((!contactRes || contactRes.rows.length === 0) && (email || phone)) {
                let query = 'SELECT id, name, web_visitor_id FROM contacts WHERE organization_id = $1 AND (';
                const params = [orgId];
                const conditions = [];
                if (email) {
                    conditions.push(`email = $${params.length + 1}`);
                    params.push(email);
                }
                if (phone) {
                    conditions.push(`phone_number = $${params.length + 1}`);
                    params.push(phone);
                }
                query += conditions.join(' OR ') + ') LIMIT 1';
                contactRes = await client.query(query, params);
            }

            if (contactRes && contactRes.rows.length > 0) {
                contactId = contactRes.rows[0].id;
                finalVisitorId = contactRes.rows[0].web_visitor_id || visitor_id || crypto.randomUUID();

                if (name || email || phone || !contactRes.rows[0].web_visitor_id) {
                    await client.query(
                        `UPDATE contacts SET 
                         name = COALESCE($1, name), 
                         email = COALESCE($2, email), 
                         phone_number = COALESCE($3, phone_number),
                         web_visitor_id = $4,
                         updated_at = NOW()
                         WHERE id = $5`,
                        [name || null, email || null, phone || null, finalVisitorId, contactId]
                    );
                }
            } else {
                finalVisitorId = visitor_id || crypto.randomUUID();
                const displayName = name || `Guest ${finalVisitorId.substring(0, 6)}`;
                const displayPhone = phone || `web-${finalVisitorId.substring(0, 8)}`;

                const newContact = await client.query(
                    `INSERT INTO contacts (organization_id, name, email, phone_number, web_visitor_id, source)
                     VALUES ($1, $2, $3, $4, $5, 'webchat') RETURNING id`,
                    [orgId, displayName, email || null, displayPhone, finalVisitorId]
                );
                contactId = newContact.rows[0].id;
            }

            // 3. Find or Create Conversation
            let conversationId;
            let isNewConv = false;
            const convRes = await client.query(
                `SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2`,
                [orgId, contactId]
            );

            // AUTO MIGRATE conversations table if needed (add webchat_config_id)

            if (convRes.rows.length > 0) {
                conversationId = convRes.rows[0].id;
                // Update existing conversation
                // Handle potential missing column gracefully-ish (though startSession implies we want it to work)
                try {
                    await client.query(
                        "UPDATE conversations SET status = 'open', channel = 'webchat', webchat_config_id = $1, updated_at = NOW() WHERE id = $2",
                        [webchatConfigId, conversationId]
                    );
                } catch (e) {
                    // Fallback if column missing, just set channel
                    if (e.code === '42703') {
                        await client.query("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS webchat_config_id BIGINT");
                        await client.query(
                            "UPDATE conversations SET status = 'open', channel = 'webchat', webchat_config_id = $1, updated_at = NOW() WHERE id = $2",
                            [webchatConfigId, conversationId]
                        );
                    } else throw e;
                }
            } else {
                try {
                    // Get inbox_id based on device for inbox isolation
                    const inboxId = await getInboxIdForDevice(webchatConfigId, 'webchat');

                    const newConv = await client.query(
                        `INSERT INTO conversations (organization_id, contact_id, inbox_id, status, unread_count, channel, webchat_config_id)
                         VALUES ($1, $2, $3, 'open', 0, 'webchat', $4) RETURNING id`,
                        [orgId, contactId, inboxId, webchatConfigId]
                    );
                    conversationId = newConv.rows[0].id;
                    isNewConv = true;
                } catch (e) {
                    if (e.code === '42703') {
                        await client.query("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS webchat_config_id BIGINT");
                        // Get inbox_id based on device for inbox isolation
                        const inboxId = await getInboxIdForDevice(webchatConfigId, 'webchat');

                        const newConv = await client.query(
                            `INSERT INTO conversations (organization_id, contact_id, inbox_id, status, unread_count, channel, webchat_config_id)
                             VALUES ($1, $2, $3, 'open', 0, 'webchat', $4) RETURNING id`,
                            [orgId, contactId, inboxId, webchatConfigId]
                        );
                        conversationId = newConv.rows[0].id;
                        isNewConv = true;
                    } else throw e;
                }
            }

            await client.query('COMMIT');

            if (isNewConv) {
                autoAssignConversation(orgId, conversationId, req.io, 'CS', 'webchat', inboxId).catch(err => console.error('[Webchat] autoAssign failed:', err.message));
                initTicket(orgId, conversationId).catch(err => console.error('[Webchat] initTicket failed:', err.message));
            }

            const token = jwt.sign(
                { contactId, conversationId, orgId, role: 'guest', visitorId: finalVisitorId, widget_uid },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            res.json({ token, conversationId, contactId, visitor_id: finalVisitorId });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/public/webchat/message
export const sendPublicMessage = async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { text, media_url, mimetype, filename } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let { conversationId, orgId, contactId, visitorId, widget_uid } = decoded;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Self-healing & Channel/Link Enforcement
            const checkConv = await client.query('SELECT id FROM conversations WHERE id = $1', [conversationId]);

            // Get Config ID
            let webchatConfigId = null;
            const configRes = await client.query('SELECT id FROM webchat_configs WHERE widget_uid = $1', [widget_uid]);
            if (configRes.rows.length > 0) webchatConfigId = configRes.rows[0].id;

            if (checkConv.rows.length === 0) {
                // Resurrect - Get inbox_id for inbox isolation
                const inboxId = await getInboxIdForDevice(webchatConfigId, 'webchat');

                await client.query(
                    `INSERT INTO conversations (id, organization_id, contact_id, inbox_id, status, unread_count, channel, webchat_config_id, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, 'open', 0, 'webchat', $5, NOW(), NOW())
                     ON CONFLICT (id) DO UPDATE SET status='open', channel='webchat', webchat_config_id=$5, inbox_id=$4`,
                    [conversationId, orgId, contactId, inboxId, webchatConfigId]
                );
            } else {
                // Update link
                await client.query(
                    `UPDATE conversations SET channel = 'webchat', status = 'open', webchat_config_id = $2 WHERE id = $1`,
                    [conversationId, webchatConfigId]
                );
            }

            // Determine Message Type
            let type = 'text';
            if (media_url) {
                if (mimetype?.startsWith('image')) type = 'image';
                else if (mimetype?.startsWith('video')) type = 'video';
                else if (mimetype?.startsWith('audio')) type = 'audio';
                else type = 'document';
            }

            // Insert User Message
            const msgRes = await client.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, created_at)
                 VALUES ($1, $2, false, $3, $4, $5, 'received', NOW()) RETURNING *`,
                [conversationId, orgId, type, text || (media_url ? filename || 'Media' : ''), media_url]
            );
            const newMessage = msgRes.rows[0];

            // Get conversation settings (is_chatbot_active)
            const convRes = await client.query(
                `SELECT is_chatbot_active FROM conversations WHERE id = $1`,
                [conversationId]
            );
            const isChatbotActive = convRes.rows[0]?.is_chatbot_active;

            await client.query(
                `UPDATE conversations 
                 SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, status = 'open'
                 WHERE id = $2`,
                [text || `[${type.toUpperCase()}]`, conversationId]
            );

            // Update contact last inbound
            await client.query('UPDATE contacts SET last_inbound_at = NOW() WHERE id = $1', [contactId]);

            await client.query('COMMIT');

            if (req.io) {
                req.io.to(`org_${orgId}`).emit('new_message', {
                    conversationId,
                    message: newMessage
                });
            }

            // --- INTEGRATION: Check Chat Form ---
            let skipAutoReply = false;
            if (text) {
                try {
                    const formResult = await formService.handleIncomingMessage(
                        orgId,
                        contactId,
                        null, // dbSessionId
                        visitorId, // gatewaySessionId
                        text,
                        visitorId, // senderPhone
                        'webchat',
                        { widget_uid }
                    );

                    if (formResult && formResult.handled) {
                        skipAutoReply = true;
                        console.log(`[Webchat] Message handled by Chat Form for contact ${contactId}`);
                    }
                } catch (formErr) {
                    console.error("[Webchat] Form Handler Error:", formErr);
                }
            }

            // --- CHATBOT INTEGRATION ---
            if (isChatbotActive && !skipAutoReply && text) {
                const botLockKey = `bot_lock_web:${conversationId}`;
                const lockAcquired = await redisConnection.set(botLockKey, '1', 'NX', 'EX', 60);

                if (lockAcquired) {
                    try {
                        const access = await checkFeatureAccess(orgId, 'feat_chatbot');

                        if (access.allowed) {
                            const botRes = await pool.query(
                                'SELECT * FROM chatbot_settings WHERE session_id = $1 AND is_active = true',
                                [widget_uid]
                            );

                            if (botRes.rows.length > 0) {
                                const botConfig = botRes.rows[0];
                                const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversationId]);
                                const chatHistory = historyRes.rows.reverse();

                                // DETECT QUEUE MODE CONTEXT / AUTO REPLY
                                let extraContext = "";
                                try {
                                    const autoReplyResult = await AutoReplyService.processIncomingMessage(
                                        { organization_id: orgId, session_id: widget_uid },
                                        contactId,
                                        text,
                                        visitorId,
                                        'webchat',
                                        { conversationId: conversationId, visitorId: visitorId, io: req.io }
                                    );

                                    if (autoReplyResult && autoReplyResult.handled) {
                                        console.log(`[Webchat] Handled by AutoReply (${autoReplyResult.type})`);
                                        // Don't restart AI if AutoReply handled it (e.g. Queue Menu)
                                        // We need to release lock
                                        return;
                                    }
                                } catch (qErr) { console.error("AutoReply/Queue Error", qErr); }

                                const aiResponse = await generateResponse(orgId, text, chatHistory, botConfig, extraContext);

                                if (aiResponse === "[ESCALATE]") {
                                    await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);
                                    req.io.to(`org_${orgId}`).emit('bot_escalated', { conversationId, alert: true });
                                    const fallback = "Mohon tunggu sebentar, saya sambungkan dengan staf admin kami.";
                                    const botMsg = await pool.query(
                                        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id, created_at)
                                         VALUES ($1, $2, true, 'text', $3, 'sent', $4, NOW()) RETURNING *`,
                                        [conversationId, orgId, fallback, `bot-esc-${Date.now()}`]
                                    );
                                    req.io.to(`visitor_${visitorId}`).emit('new_message', botMsg.rows[0]);
                                    req.io.to(`org_${orgId}`).emit('new_message', { conversationId, message: botMsg.rows[0] });

                                } else if (aiResponse) {
                                    const botMsg = await pool.query(
                                        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id, created_at)
                                         VALUES ($1, $2, true, 'text', $3, 'sent', $4, NOW()) RETURNING *`,
                                        [conversationId, orgId, aiResponse, `bot-res-${Date.now()}`]
                                    );
                                    req.io.to(`visitor_${visitorId}`).emit('new_message', botMsg.rows[0]);
                                    req.io.to(`org_${orgId}`).emit('new_message', { conversationId, message: botMsg.rows[0] });
                                    await pool.query("UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2", [aiResponse, conversationId]);
                                }
                            }
                        }
                    } catch (botErr) {
                        console.error("[Webchat Bot Error]", botErr);
                    } finally {
                        await redisConnection.del(botLockKey);
                    }
                }
            }

            res.json(newMessage);

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        res.status(403).json({ error: "Invalid Token" });
    }
};

// GET /api/public/webchat/messages
export const getMessages = async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { conversationId } = decoded;

        const result = await pool.query(
            `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
            [conversationId]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(403).json({ error: "Invalid Token" });
    }
};

// NEW: POST /api/public/webchat/upload
export const uploadPublicMedia = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        jwt.verify(token, process.env.JWT_SECRET);

        const fileUrl = `/uploads/webchat/${req.file.filename}`;
        res.json({
            url: fileUrl,
            mimetype: req.file.mimetype,
            filename: req.file.originalname,
            size: req.file.size
        });
    } catch (err) {
        res.status(403).json({ error: "Invalid Token" });
    }
};