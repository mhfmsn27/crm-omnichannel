import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import axios from 'axios';
import { sendSystemNotification } from '../services/notificationService.js';
import { sendResetPasswordEmail, sendWelcomeEmail } from '../services/emailService.js';
import * as QueueService from '../services/QueueService.js'; // Import QueueService
import { fcmService } from '../services/fcmService.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

// --- AUTO MIGRATION FOR AUTH ---
const ensureAuthSchema = async () => {
    try {
        await pool.query(`
            ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
            ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;
            
            ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 10;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS closing_message TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_devices JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;
        `);
    } catch (e) {
        console.warn("[Auth] Schema migration warning:", e.message);
    }
};
// Run once
ensureAuthSchema();

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

        const user = result.rows[0];

        if (!user.password_hash) {
            return res.status(400).json({ error: 'Please login using Google or Facebook' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        // Resolve effective permissions from custom role if assigned
        let effectivePermissions = Array.isArray(user.permissions) ? user.permissions : [];
        let effectiveRoleLevel = user.role_level || 1;
        let customRoleName = null;

        if (user.custom_role_id) {
            const roleRes = await pool.query('SELECT * FROM custom_roles WHERE id = $1', [user.custom_role_id]);
            if (roleRes.rows.length > 0) {
                const cr = roleRes.rows[0];
                effectivePermissions = Array.isArray(cr.permissions) ? cr.permissions : [];
                effectiveRoleLevel = cr.role_level;
                customRoleName = cr.name;
            }
        }

        const token = jwt.sign(
            {
                id: user.id,
                organization_id: user.organization_id,
                role: user.role,
                role_level: effectiveRoleLevel,
                permissions: effectivePermissions,
                custom_role_id: user.custom_role_id || null
            },
            JWT_SECRET, // Use centralized JWT_SECRET from authMiddleware
            { expiresIn: '180d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                role_level: effectiveRoleLevel,
                permissions: effectivePermissions,
                custom_role_id: user.custom_role_id || null,
                custom_role_name: customRoleName,
                organization_id: user.organization_id,
                closing_message: user.closing_message,
                is_online: user.is_online
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const register = async (req, res) => {
    // PERSONAL VERSION: Disable Registration
    return res.status(403).json({
        error: "Registration Disabled",
        message: "This is a Personal Version of Cloudchat. Registration is closed."
    });
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            // Return success even if user not found to prevent enumeration
            return res.json({ message: 'If that email exists, we sent a link.' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        const expireTime = new Date(Date.now() + 3600000); // 1 hour

        await pool.query(
            'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
            [token, expireTime, email]
        );

        await sendResetPasswordEmail(email, token);
        res.json({ message: 'If that email exists, we sent a link.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const resetPassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const userRes = await pool.query(
            `SELECT id FROM users 
             WHERE reset_password_token = $1 
             AND reset_password_expires > NOW()`,
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ error: 'Token is invalid or has expired.' });
        }

        const hashedPwd = await bcrypt.hash(password, 10);
        await pool.query(
            `UPDATE users 
             SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL 
             WHERE id = $2`,
            [hashedPwd, userRes.rows[0].id]
        );

        res.json({ message: 'Password has been reset successfully.' });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- OAUTH HELPERS ---
// Legacy: Google Token Verification (Front-end sends token)
export const googleAuth = async (req, res) => {
    const { token } = req.body;
    try {
        const googleRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
        const { sub, name, email, picture } = googleRes.data;

        await handleSocialLogin(res, 'google', sub, email, name, picture);
    } catch (err) {
        res.status(401).json({ error: "Invalid Google Token" });
    }
};

// New: Google Callback (Backend exchanges code)
export const googleCallback = async (req, res) => {
    const { code, redirectUri } = req.body;
    try {
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        });

        const { access_token } = tokenRes.data;
        const googleUserRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const { id, email, name, picture } = googleUserRes.data;
        // Pass referral_code to handler
        await handleSocialLogin(res, 'google', id, email, name, picture, req.body.referral_code);

    } catch (err) {
        console.error("Google Callback Error:", err.response?.data || err.message);
        res.status(400).json({ error: "Google Login Failed" });
    }
};

// Legacy: Facebook Token Verification
export const facebookAuth = async (req, res) => {
    const { userID, accessToken } = req.body;
    try {
        const fbRes = await axios.get(`https://graph.facebook.com/v18.0/${userID}?fields=id,name,email,picture&access_token=${accessToken}`);
        const { id, name, email, picture } = fbRes.data;

        await handleSocialLogin(res, 'facebook', id, email, name, picture?.data?.url);
    } catch (err) {
        res.status(401).json({ error: "Invalid Facebook Token" });
    }
};

// New: Facebook Callback (Backend exchanges code)
export const facebookCallback = async (req, res) => {
    const { code, redirectUri } = req.body;
    try {
        // Fetch Meta Config from DB
        const settingsRes = await pool.query(
            "SELECT key, value FROM system_settings WHERE group_name = 'meta_config'"
        );
        const config = {};
        settingsRes.rows.forEach(r => config[r.key] = r.value);

        const appId = config.facebook_app_id || process.env.FACEBOOK_APP_ID;
        const appSecret = config.facebook_app_secret || process.env.FACEBOOK_APP_SECRET;

        // Exchange Code
        const tokenRes = await axios.get('https://graph.facebook.com/v22.0/oauth/access_token', {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code: code
            }
        });

        const { access_token } = tokenRes.data;

        // Get User Info
        const userRes = await axios.get('https://graph.facebook.com/me', {
            params: {
                fields: 'id,name,email,picture',
                access_token: access_token
            }
        });

        const { id, name, email, picture } = userRes.data;
        // Pass referral_code to handler
        await handleSocialLogin(res, 'facebook', id, email, name, picture?.data?.url, req.body.referral_code);

    } catch (err) {
        console.error("Facebook Callback Error:", err.response?.data || err.message);
        // Important: Pass detailed error for debugging on frontend
        const msg = err.response?.data?.error?.message || "Facebook Login Failed";
        res.status(400).json({ error: msg });
    }
};

// Shared Logic for Social Login/Register
const handleSocialLogin = async (res, provider, providerId, email, name, pic, referralCode = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Try Find by Provider ID
        let userRes = await client.query(`SELECT * FROM users WHERE ${provider}_id = $1`, [providerId]);

        // 2. If not found, try Find by Email
        if (userRes.rows.length === 0 && email) {
            userRes = await client.query(`SELECT * FROM users WHERE email = $1`, [email]);

            // If found by email, link provider ID
            if (userRes.rows.length > 0) {
                await client.query(`UPDATE users SET ${provider}_id = $1 WHERE id = $2`, [providerId, userRes.rows[0].id]);
            }
        }

        let user;
        if (userRes.rows.length > 0) {
            user = userRes.rows[0];
            // Update profile pic if missing
            if (!user.profile_pic_url && pic) {
                await client.query('UPDATE users SET profile_pic_url = $1 WHERE id = $2', [pic, user.id]);
            }
        } else {
            // Register New User
            if (!email) throw new Error("Email permission required from provider");

            const orgRes = await client.query(
                'INSERT INTO organizations (name, subscription_status) VALUES ($1, $2) RETURNING id',
                [`${name}'s Org`, 'free']
            );

            // Start - Check Referrer
            let referrerId = null;
            if (referralCode) {
                const refRes = await client.query("SELECT id FROM users WHERE referral_code = $1", [referralCode]);
                if (refRes.rows.length > 0) referrerId = refRes.rows[0].id;
            }
            // End - Check Referrer

            const newUserRes = await client.query(
                `INSERT INTO users (organization_id, name, email, role, role_level, ${provider}_id, profile_pic_url, referrer_id) 
                 VALUES ($1, $2, $3, 'admin_member', 100, $4, $5, $6) RETURNING *`,
                [orgRes.rows[0].id, name, email, providerId, pic, referrerId]
            );
            user = newUserRes.rows[0];

            await client.query('INSERT INTO chatbot_settings (organization_id, is_active) VALUES ($1, false)', [user.organization_id]);

            // Send Welcome Email for Social Login too!
            sendWelcomeEmail(email, name, `${name}'s Org`).catch(e => console.error(e));
        }

        await client.query('COMMIT');

        let effectivePermissions = Array.isArray(user.permissions) ? user.permissions : [];
        let effectiveRoleLevel = user.role_level || 1;
        let customRoleName = null;

        if (user.custom_role_id) {
            const roleRes = await client.query('SELECT * FROM custom_roles WHERE id = $1', [user.custom_role_id]);
            if (roleRes.rows.length > 0) {
                const cr = roleRes.rows[0];
                effectivePermissions = Array.isArray(cr.permissions) ? cr.permissions : [];
                effectiveRoleLevel = cr.role_level;
                customRoleName = cr.name;
            }
        }

        const token = jwt.sign(
            {
                id: user.id,
                organization_id: user.organization_id,
                role: user.role,
                role_level: effectiveRoleLevel,
                permissions: effectivePermissions,
                custom_role_id: user.custom_role_id || null
            },
            JWT_SECRET, // Use centralized JWT_SECRET from authMiddleware
            { expiresIn: '180d' }
        );

        res.json({
            token, user: {
                id: user.id,
                name: user.name,
                role: user.role,
                role_level: effectiveRoleLevel,
                permissions: effectivePermissions,
                custom_role_id: user.custom_role_id || null,
                custom_role_name: customRoleName,
                organization_id: user.organization_id,
                profile_pic_url: user.profile_pic_url || pic
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Social Auth Error", err);
        res.status(500).json({ error: "Authentication Failed: " + err.message });
    } finally {
        client.release();
    }
};

export const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.phone, u.role, u.role_level, u.permissions,
                    u.organization_id, u.profile_pic_url, u.closing_message,
                    u.assigned_devices, u.is_online, u.custom_role_id,
                    cr.name AS custom_role_name, cr.color AS custom_role_color,
                    cr.permissions AS custom_role_permissions, cr.role_level AS custom_role_level
             FROM users u
             LEFT JOIN custom_roles cr ON cr.id = u.custom_role_id
             WHERE u.id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'Session invalid' });
        const row = result.rows[0];
        // Resolve effective values from custom role if assigned
        const effectivePermissions = row.custom_role_id && row.custom_role_permissions
            ? (Array.isArray(row.custom_role_permissions) ? row.custom_role_permissions : [])
            : (Array.isArray(row.permissions) ? row.permissions : []);
        const effectiveLevel = row.custom_role_id ? row.custom_role_level : row.role_level;

        // Issue a fresh JWT token so backend middlewares receive the updated permissions immediately
        const freshToken = jwt.sign(
            {
                id: row.id,
                organization_id: row.organization_id,
                role: row.role,
                role_level: effectiveLevel,
                permissions: effectivePermissions,
                custom_role_id: row.custom_role_id || null
            },
            JWT_SECRET, // Use centralized JWT_SECRET from authMiddleware
            { expiresIn: '180d' }
        );

        res.json({
            token: freshToken,
            user: {
                id: row.id, name: row.name, email: row.email, phone: row.phone,
                role: row.role, role_level: effectiveLevel, permissions: effectivePermissions,
                organization_id: row.organization_id, profile_pic_url: row.profile_pic_url,
                closing_message: row.closing_message, assigned_devices: row.assigned_devices,
                is_online: row.is_online, custom_role_id: row.custom_role_id,
                custom_role_name: row.custom_role_name, custom_role_color: row.custom_role_color
            }
        });
    } catch (err) {
        console.error("[Auth] getMe Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const updateProfile = async (req, res) => {
    const { name, email, phone, password, closing_message } = req.body;
    const { id } = req.user;

    try {
        let query = 'UPDATE users SET name = $1, email = $2, phone = $3, closing_message = $4, updated_at = NOW()';
        let params = [name, email, phone, closing_message];
        let idx = 5;

        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            query += `, password_hash = $${idx}`;
            params.push(hashed);
            idx++;
        }

        query += ` WHERE id = $${idx}`;
        params.push(id);

        await pool.query(query, params);
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const uploadProfilePic = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;

    try {
        await pool.query('UPDATE users SET profile_pic_url = $1 WHERE id = $2', [url, req.user.id]);
        res.json({ url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const toggleOnlineStatus = async (req, res) => {
    const { id, organization_id } = req.user;
    const { is_online } = req.body;

    try {
        await pool.query(
            'UPDATE users SET is_online = $1 WHERE id = $2 AND organization_id = $3',
            [is_online, id, organization_id]
        );

        req.io.to(`org_${organization_id}`).emit('agent_status_update', { userId: id, is_online });

        // Auto-assign from queue if Agent comes ONLINE
        if (is_online) {
            try {
                // Get Agent's Division
                const userRes = await pool.query('SELECT division FROM users WHERE id = $1', [id]);
                const division = userRes.rows[0]?.division;

                if (division) {
                    const assignment = await QueueService.processQueue(organization_id, division);
                    if (assignment) {
                        const convRes = await pool.query(
                            "SELECT id FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND status != 'resolved'",
                            [organization_id, assignment.contactId]
                        );

                        if (convRes.rows.length > 0) {
                            const convId = convRes.rows[0].id;
                            await pool.query('UPDATE conversations SET assigned_to_agent_id = $1, status = \'open\' WHERE id = $2', [id, convId]);
                            req.io.to(`org_${organization_id}`).emit('conversation_assigned', { conversationId: convId, assignedTo: id });
                        }
                    }
                }
            } catch (e) {
                console.error("Auto-assign failed:", e);
            }
        }

        res.json({ success: true, is_online });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateFcmToken = async (req, res) => {
    const { token, platform, deviceId } = req.body;
    const { id } = req.user;

    if (!token) return res.status(400).json({ error: "Token required" });

    try {
        await fcmService.registerToken(id, token, platform, deviceId);
        res.json({ success: true, message: "Token updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE ACCOUNT
export const deleteAccount = async (req, res) => {
    const { id } = req.user;
    const { password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = result.rows[0];

        // 1. Check Password
        if (!user.password_hash) {
            return res.status(400).json({ error: 'Account uses social login. Please set a password first to delete your account.' });
        }
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        // 2. Delete User
        await pool.query('DELETE FROM users WHERE id = $1', [id]);

        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ error: 'Failed to delete account. Please contact support if this persists.' });
    }
};