
import pool from '../../config/db.js';
import bcrypt from 'bcrypt';

// GET /api/public/settings (No Auth required)
export const getPublicSettings = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT key, value FROM system_settings WHERE group_name = 'general'"
        );

        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });

        // Append Feature Flags
        const flagsRes = await pool.query("SELECT key, is_active, maintenance_message FROM system_feature_flags");
        const flags = {};
        flagsRes.rows.forEach(r => {
            flags[r.key] = { is_active: r.is_active, message: r.maintenance_message };
        });
        settings.feature_flags = flags;

        // Append Public Meta Config (App IDs only)
        const metaRes = await pool.query("SELECT key, value FROM system_settings WHERE group_name = 'meta_config'");
        const metaConfig = {};
        const publicKeys = [
            'facebook_app_id',
            'wa_app_id',
            'wa_config_id_byok',
            'wa_config_id_coex',
            'messenger_app_id',
            'instagram_app_id'
        ];

        metaRes.rows.forEach(r => {
            if (publicKeys.includes(r.key)) {
                metaConfig[r.key] = r.value;
            }
        });
        
        // Fallback to .env if missing in DB
        if (!metaConfig.facebook_app_id && process.env.FACEBOOK_APP_ID) metaConfig.facebook_app_id = process.env.FACEBOOK_APP_ID;
        if (!metaConfig.wa_app_id && process.env.WA_APP_ID) metaConfig.wa_app_id = process.env.WA_APP_ID;
        if (!metaConfig.messenger_app_id && process.env.MESSENGER_APP_ID) metaConfig.messenger_app_id = process.env.MESSENGER_APP_ID;
        if (!metaConfig.instagram_app_id && process.env.INSTAGRAM_APP_ID) metaConfig.instagram_app_id = process.env.INSTAGRAM_APP_ID;

        settings.meta = metaConfig;

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/sa/settings (Super Admin only)
export const getAllSettings = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM system_settings ORDER BY group_name, key");

        const settings = {
            general: [],
            smtp: [],
            tripay: []
        };

        result.rows.forEach(row => {
            if (settings[row.group_name]) {
                settings[row.group_name].push(row);
            } else {
                settings[row.group_name] = [row];
            }
        });

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/settings (Batch Update)
export const updateSettings = async (req, res) => {
    const updates = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const item of updates) {
            const groupName = item.group || 'general';
            const type = item.type || 'text';

            await client.query(
                `INSERT INTO system_settings (key, value, group_name, type)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (key) 
                 DO UPDATE SET value = EXCLUDED.value, group_name = EXCLUDED.group_name, updated_at = NOW()`,
                [item.key, item.value, groupName, type]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/sa/settings/upload
export const uploadAsset = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { key } = req.body;
    const filePath = `/uploads/system/${req.file.filename}`;

    try {
        await pool.query(
            `INSERT INTO system_settings (key, value, group_name, type)
             VALUES ($1, $2, 'general', 'file')
             ON CONFLICT (key) 
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            [key, filePath]
        );
        res.json({ message: 'File uploaded', url: filePath, key });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/settings/test-smtp
export const testSmtp = async (req, res) => {
    // 1. Get credentials from Request Body (Priority) or Fallback to DB
    let { host, port, user, pass, email, from_name, from_email } = req.body;

    try {
        // If credentials are not provided in body, try to fetch from DB
        if (!host || !user) {
            const configRes = await pool.query("SELECT key, value FROM system_settings WHERE group_name = 'smtp'");
            const config = {};
            configRes.rows.forEach(r => config[r.key] = r.value);

            host = host || config.smtp_host;
            port = port || config.smtp_port;
            user = user || config.smtp_user;
            pass = pass || config.smtp_pass;
            from_name = from_name || config.smtp_from_name;
            from_email = from_email || config.smtp_from_email;
        }

        if (!host || !port || !user || !pass) {
            return res.status(400).json({ error: "Missing SMTP Credentials (Host, Port, User, Pass)" });
        }
        if (!email) {
            return res.status(400).json({ error: "Missing Target Email" });
        }

        const senderName = from_name || process.env.APP_NAME || 'CRMHub System';
        const senderEmail = from_email || user;

        import('nodemailer').then(async (nodemailer) => {
            const transporter = nodemailer.default.createTransport({
                host: host,
                port: parseInt(port),
                secure: parseInt(port) === 465, // True for 465, false for other ports
                auth: {
                    user: user,
                    pass: pass
                }
            });

            // Verify connection
            await transporter.verify();

            // Send Test Email
            await transporter.sendMail({
                from: `"${senderName}" <${senderEmail}>`,
                to: email,
                subject: "SMTP Configuration Test",
                text: "Congratulations! Your SMTP configuration is valid and working correctly.",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #4F46E5;">SMTP Test Successful</h2>
                        <p>This email was sent to verify your SMTP settings in CRMHub.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #666;">
                            <strong>Host:</strong> ${host}<br>
                            <strong>Port:</strong> ${port}<br>
                            <strong>User:</strong> ${user}
                        </p>
                    </div>
                `
            });

            res.json({ message: `Test email sent successfully to ${email}` });
        }).catch(err => {
            console.error("Nodemailer Error:", err);
            res.status(500).json({ error: "SMTP Error: " + err.message });
        });

    } catch (err) {
        console.error("Test SMTP Error:", err);
        res.status(500).json({ error: err.message });
    }
};
