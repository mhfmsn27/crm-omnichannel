import pool from '../../config/db.js';
import TelegramService from '../../services/TelegramService.js';
import { checkFeatureAccess } from '../../services/featureGateService.js';

// Helper: Auto-unlock if limit exists
const resolveFeatureAccess = (featureAccess, limitAccess) => {
    if (featureAccess.maintenance) return featureAccess;
    if (featureAccess.allowed) return featureAccess;
    if (limitAccess.limit > 0 || limitAccess.limit === -1) {
        return { ...featureAccess, allowed: true };
    }
    return featureAccess;
};

// GET /api/app/telegram/stats
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        let featureAccess = await checkFeatureAccess(organization_id, 'channel_telegram');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_telegram');

        // Auto-unlock
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        if (!featureAccess.allowed) {
            return res.json({
                allowed: false,
                locked: true,
                maintenance: featureAccess.maintenance || false,
                limit: 0,
                used: limitAccess.used,
                message: featureAccess.message || "Feature not included in plan."
            });
        }

        res.json({
            allowed: limitAccess.allowed,
            locked: false,
            limit: limitAccess.limit,
            used: limitAccess.used
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/telegram/bots
export const getBots = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM telegram_bots WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/telegram/connect
export const connectBot = async (req, res) => {
    const { token } = req.body;
    const { organization_id } = req.user;

    // 1. Feature Gate Check
    try {
        let featureAccess = await checkFeatureAccess(organization_id, 'channel_telegram');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_telegram');

        // Auto-unlock
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        if (!featureAccess.allowed) {
            return res.status(403).json({ error: "Telegram integration is not included in your plan.", upsell: true });
        }

        if (!limitAccess.allowed) {
            return res.status(403).json({ error: limitAccess.message, upsell: true });
        }
    } catch (err) {
        return res.status(500).json({ error: "Gate check failed" });
    }

    try {
        // 2. Verify Token & Get Info
        const botInfo = await TelegramService.getMe(token);

        if (!botInfo || !botInfo.username) {
            return res.status(400).json({ error: "Invalid Bot Token" });
        }

        // 3. Set Webhook
        // IMPORTANT: Webhook URL must be HTTPS and point to our backend
        const appUrl = process.env.APP_URL;

        // Validate APP_URL
        if (!appUrl || appUrl.includes('localhost') || !appUrl.startsWith('https')) {
            console.error(`[Telegram Connect] Invalid APP_URL: ${appUrl}`);
            return res.status(400).json({ error: "System Error: APP_URL must be a public HTTPS URL for Telegram Webhook." });
        }

        const webhookUrl = `${appUrl}/webhook/telegram/${token}`;
        console.log(`[Telegram Connect] Setting webhook for @${botInfo.username} to: ${webhookUrl}`);

        await TelegramService.setWebhook(token, webhookUrl);

        // 4. Save to DB (Hard Transfer)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Delete existing mapping for this token (from any organization)
            await client.query('DELETE FROM telegram_bots WHERE bot_token = $1', [token]);

            // Insert new mapping
            await client.query(
                `INSERT INTO telegram_bots (organization_id, bot_token, bot_id, username, first_name, is_active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())`,
                [organization_id, token, botInfo.id, botInfo.username, botInfo.first_name]
            );

            await client.query('COMMIT');
            res.json({ message: "Bot connected successfully", bot: botInfo });

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("[Telegram Connect] Error:", err.message);
        // Return descriptive error if from Telegram
        if (err.message.includes('bad webhook')) {
            return res.status(400).json({ error: "Telegram rejected webhook URL. Check DNS/SSL configuration." });
        }
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/telegram/:id
export const deleteBot = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const botRes = await pool.query('SELECT bot_token FROM telegram_bots WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (botRes.rows.length === 0) return res.status(404).json({ error: "Bot not found" });

        const { bot_token } = botRes.rows[0];

        // Remove Webhook
        await TelegramService.deleteWebhook(bot_token);

        // Delete from DB
        await pool.query('DELETE FROM telegram_bots WHERE id = $1', [id]);
        res.json({ message: "Bot disconnected" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/app/telegram/:id/toggle-ai
export const toggleAi = async (req, res) => {
    const { id } = req.params;
    const { ai_active } = req.body;
    const { organization_id } = req.user;

    try {
        await pool.query('UPDATE telegram_bots SET ai_active = $1 WHERE id = $2 AND organization_id = $3', [ai_active, id, organization_id]);
        res.json({ message: "AI settings updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};