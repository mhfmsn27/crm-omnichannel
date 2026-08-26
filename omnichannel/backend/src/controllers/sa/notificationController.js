import pool from '../../config/db.js';
import * as waService from '../../services/waGatewayService.js';

const ADMIN_ORG_ID = 1;

// GET /api/sa/notifications/device
export const getAdminDevices = async (req, res) => {
    try {
        // Fetch ALL devices belonging to Admin Org
        const result = await pool.query(
            "SELECT * FROM whatsapp_sessions WHERE organization_id = $1 ORDER BY created_at DESC",
            [ADMIN_ORG_ID]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/notifications/device (Create New)
export const connectAdminDevice = async (req, res) => {
    try {
        // Create a unique name
        const timestamp = Date.now();
        const sessionName = `System Notifier ${timestamp}`;
        const sessionId = `${ADMIN_ORG_ID}-${timestamp}-sys`;

        // Init Gateway Session
        const gatewaySession = await waService.createSession(sessionId); 
        const finalSessionId = gatewaySession.id || sessionId;

        // Save to DB
        const newDevice = await pool.query(
            `INSERT INTO whatsapp_sessions (organization_id, session_id, name, status) 
             VALUES ($1, $2, $3, 'created') RETURNING *`,
            [ADMIN_ORG_ID, finalSessionId, sessionName]
        );

        // Start Session to get QR
        await waService.startSession(finalSessionId);
        
        res.json(newDevice.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/notifications/device/:id
export const deleteAdminDevice = async (req, res) => {
    const { id } = req.params;
    try {
        const devRes = await pool.query("SELECT session_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2", [id, ADMIN_ORG_ID]);
        if(devRes.rows.length > 0) {
             try {
                await waService.deleteSession(devRes.rows[0].session_id);
             } catch(e) {}
        }
        await pool.query("DELETE FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2", [id, ADMIN_ORG_ID]);
        res.json({ message: "Device deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/sa/notifications/templates
export const getTemplates = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM notification_templates ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/notifications/templates
export const createTemplate = async (req, res) => {
    const { type, label, content } = req.body;
    try {
        if (!type || !label || !content) {
            return res.status(400).json({ error: "Type, Label, and Content are required" });
        }
        const result = await pool.query(
            "INSERT INTO notification_templates (type, label, content, is_active) VALUES ($1, $2, $3, true) RETURNING *",
            [type, label, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Template type (key) already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/sa/notifications/templates/:id
export const updateTemplate = async (req, res) => {
    const { id } = req.params;
    const { content, is_active, label, type } = req.body; // Allow full update
    try {
        await pool.query(
            "UPDATE notification_templates SET content = COALESCE($1, content), is_active = COALESCE($2, is_active), label = COALESCE($3, label), type = COALESCE($4, type), updated_at = NOW() WHERE id = $5",
            [content, is_active, label, type, id]
        );
        res.json({ message: 'Template updated' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: "Template type (key) already exists" });
        }
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/notifications/templates/:id
export const deleteTemplate = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM notification_templates WHERE id = $1", [id]);
        res.json({ message: "Template deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/notifications/broadcast
export const sendManualBroadcast = async (req, res) => {
    const { target_type, message, media_url, device_id } = req.body; // device_id optional
    
    try {
        // 1. Get Recipients (Only Owners/Admins, avoiding spam to agents)
        let query = `
            SELECT u.name, u.phone, o.name as org_name 
            FROM users u 
            JOIN organizations o ON u.organization_id = o.id 
            WHERE u.phone IS NOT NULL 
            AND u.role = 'admin_member' 
            AND o.id != 1
        `;
        
        if (target_type === 'free') {
            query += " AND o.subscription_status != 'active'";
        } else if (target_type === 'paid') {
            query += " AND o.subscription_status = 'active'";
        }

        const recipientsRes = await pool.query(query);
        const recipients = recipientsRes.rows;

        if (recipients.length === 0) return res.status(400).json({ error: "No recipients found" });

        // 2. Determine Sender Session
        let sessionId;
        if (device_id) {
             const devRes = await pool.query("SELECT session_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2", [device_id, ADMIN_ORG_ID]);
             if(devRes.rows.length > 0) sessionId = devRes.rows[0].session_id;
        }

        // If no specific device or invalid, pick ANY connected one
        if (!sessionId) {
            const allDevs = await pool.query("SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected'", [ADMIN_ORG_ID]);
            if (allDevs.rows.length === 0) return res.status(400).json({ error: "No Connected System WhatsApp Found" });
            // Pick random
            sessionId = allDevs.rows[Math.floor(Math.random() * allDevs.rows.length)].session_id;
        }

        // 3. Process & Send (Async/Fire & Forget loop for simplicity in this scope, or queue ideally)
        (async () => {
            for (const r of recipients) {
                try {
                    let formattedPhone = r.phone.replace(/[^0-9]/g, '');
                    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
                    if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

                    // Variable Replacement (Case Insensitive)
                    let text = message
                        .replace(/\{name\}/gi, r.name)
                        .replace(/\{org_name\}/gi, r.org_name);
                    
                    // Spintax
                    text = text.replace(/\{([^{}]+)\}|\[([^[\]]+)\]/g, (match, p1, p2) => {
                        const choices = (p1 || p2).split('|');
                        return choices[Math.floor(Math.random() * choices.length)];
                    });

                    if (media_url) {
                        await waService.sendMedia(sessionId, formattedPhone, media_url, text);
                    } else {
                        await waService.sendText(sessionId, formattedPhone, text);
                    }
                    
                    // Simple delay to avoid instant block if sending many
                    await new Promise(resolve => setTimeout(resolve, 2000));

                } catch (e) {
                    console.error(`Failed to send manual broadcast to ${r.phone}`, e.message);
                }
            }
        })();

        res.json({ message: `Broadcast initiated for ${recipients.length} contacts.` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
