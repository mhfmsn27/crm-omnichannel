import pool from '../config/db.js';
import { checkFlagInternal } from './systemGateService.js';

// Dependency Map (Child requires Parent)
// REMOVED: limit_* dependencies to allow implicit unlock based on quota availability
const FEATURE_DEPENDENCIES = {
    'feat_media_sending': 'feat_broadcast',
    'feat_broadcast_limit': 'feat_broadcast',
    // 'limit_wa_api': 'channel_wa_api',  <-- Removed to fix Auto-Unlock
    // 'limit_wa_coex': 'channel_wa_coex', <-- Removed to fix Auto-Unlock
    // 'limit_messenger': 'channel_messenger',
    // 'limit_instagram': 'channel_instagram',
    // 'limit_telegram': 'channel_telegram',
    // 'limit_webchat': 'channel_webchat'
};

const isPersonalVersion = true; // PERSONAL VERSION: Bypass All Limits

export const checkFeatureAccess = async (orgId, featureCode) => {
    // PERSONAL VERSION: Bypass Check
    if (isPersonalVersion) {
        return { allowed: true, limit: 9999, used: 0 };
    }

    const client = await pool.connect();
    try {
        // 0. System Feature Flag Check (Global Maintenance)
        const sysFlag = await checkFlagInternal(featureCode);
        if (sysFlag && !sysFlag.is_active) {
            return {
                allowed: false,
                maintenance: true, // Signal maintenance mode
                message: sysFlag.maintenance_message || "Fitur ini sedang dalam pemeliharaan sistem."
            };
        }

        // 1. Recursive Dependency Check
        const parentFeature = FEATURE_DEPENDENCIES[featureCode];
        if (parentFeature) {
            const parentAccess = await checkFeatureAccess(orgId, parentFeature);
            if (!parentAccess.allowed) {
                return {
                    allowed: false,
                    message: `Akses ditolak. Fitur ini membutuhkan '${parentFeature}' agar aktif terlebih dahulu.`
                };
            }
        }

        // 1. Get Base Limits from Active Subscription Plan
        // We check for 'active' OR 'trialing'. Expired plans are ignored here.
        const subRes = await client.query(
            `SELECT pf.is_enabled, pf.limit_value
             FROM subscriptions s
             JOIN plans p ON s.plan_id = p.id
             JOIN plan_features pf ON p.id = pf.plan_id
             WHERE s.organization_id = $1 
             AND s.status IN ('active', 'trialing') 
             AND (s.expires_at IS NULL OR s.expires_at > NOW())
             AND pf.feature_code = $2`,
            [orgId, featureCode]
        );

        let is_enabled = false;
        let base_limit = 0;

        if (subRes.rows.length > 0) {
            is_enabled = subRes.rows[0].is_enabled || false;
            base_limit = parseInt(subRes.rows[0].limit_value || 0);
        }

        // 2. Sum Up Active Add-ons
        // Only sum add-ons that are active and not expired
        let query = `
             SELECT a.type, SUM(sa.quantity * a.value) as extra_value
             FROM subscription_addons sa
             JOIN addons a ON sa.addon_id = a.id
             LEFT JOIN subscriptions s ON sa.subscription_id = s.id
             WHERE s.organization_id = $1 
             AND a.feature_code = $2
             AND sa.status = 'active'
             AND (sa.expires_at IS NULL OR sa.expires_at > NOW())
             GROUP BY a.type
        `;

        const addonRes = await client.query(query, [orgId, featureCode]);

        let totalLimit = base_limit;
        let isAccessGranted = is_enabled;

        if (addonRes.rows.length > 0) {
            for (const row of addonRes.rows) {
                const extra = parseInt(row.extra_value || 0);

                if (row.type === 'boolean') {
                    // If user bought an "Unlock Feature" addon, grant access regardless of plan
                    if (extra > 0) isAccessGranted = true;
                } else if (row.type === 'limit') {
                    // Add-on limit adds to base limit
                    totalLimit += extra;
                }
            }
        }

        // 3. Return Result based on Type
        // Logic: If it's a Boolean Feature (Unlock), check isAccessGranted.
        const isBooleanFeature = (
            featureCode.startsWith('feat_') ||
            featureCode.startsWith('channel_') ||
            featureCode.startsWith('tool_') ||
            featureCode.startsWith('fin_') ||
            featureCode.startsWith('api_')
        )
            && !featureCode.includes('limit')
            && featureCode !== 'feat_session_limit'
            && featureCode !== 'feat_agent_limit';

        if (isBooleanFeature) {
            if (!isAccessGranted) return { allowed: false, message: "Fitur tidak tersedia dalam paket Anda saat ini." };
            return { allowed: true, limit: 0, used: 0 };
        }

        // 4. Check Usage vs Total Limit (For Numeric Features)
        let used = 0;

        if (featureCode === 'feat_session_limit') {
            // Unofficial WhatsApp Sessions (QR)
            const countRes = await client.query("SELECT count(*) FROM whatsapp_sessions WHERE organization_id = $1 AND type != 'official'", [orgId]);
            used = parseInt(countRes.rows[0].count);
        } else if (featureCode === 'feat_agent_limit') {
            const countRes = await client.query("SELECT count(*) FROM users WHERE organization_id = $1", [orgId]);
            used = parseInt(countRes.rows[0].count);
        } else if (featureCode === 'feat_broadcast_limit') {
            const countRes = await client.query(`
                SELECT count(*) FROM broadcast_recipients br 
                JOIN broadcasts b ON br.broadcast_id = b.id 
                WHERE b.organization_id = $1 AND br.status = 'sent' 
                AND br.sent_at >= date_trunc('month', CURRENT_DATE)
             `, [orgId]);
            used = parseInt(countRes.rows[0].count);
        }
        // Channel Limits
        else if (featureCode === 'limit_wa_api') {
            // Official BYOK: type='official' AND metadata mode='byok'
            const countRes = await client.query(`
                SELECT count(*) FROM whatsapp_sessions 
                WHERE organization_id = $1 
                AND type = 'official' 
                AND (device_info->>'mode' = 'byok' OR device_info->>'mode' IS NULL)
            `, [orgId]);
            used = parseInt(countRes.rows[0].count);
        }
        else if (featureCode === 'limit_wa_coex') {
            // Official CoEx: type='official' AND metadata mode='coex'
            const countRes = await client.query(`
                SELECT count(*) FROM whatsapp_sessions 
                WHERE organization_id = $1 
                AND type = 'official' 
                AND (device_info->>'mode' = 'coex' OR device_info->>'mode' IS NULL)
            `, [orgId]);
            used = parseInt(countRes.rows[0].count);
        }
        else if (featureCode === 'limit_messenger') {
            const countRes = await client.query("SELECT count(*) FROM messenger_pages WHERE organization_id = $1 AND is_active = true", [orgId]);
            used = parseInt(countRes.rows[0].count);
        } else if (featureCode === 'limit_instagram') {
            const countRes = await client.query("SELECT count(*) FROM instagram_accounts WHERE organization_id = $1 AND is_active = true", [orgId]);
            used = parseInt(countRes.rows[0].count);
        } else if (featureCode === 'limit_telegram') {
            const countRes = await client.query("SELECT count(*) FROM telegram_bots WHERE organization_id = $1 AND is_active = true", [orgId]);
            used = parseInt(countRes.rows[0].count);
        } else if (featureCode === 'limit_webchat') {
            const countRes = await client.query("SELECT count(*) FROM webchat_configs WHERE organization_id = $1 AND is_active = true", [orgId]);
            used = parseInt(countRes.rows[0].count);
        }

        // Grant access if limit not exceeded
        if (used >= totalLimit && totalLimit !== -1) {
            return {
                allowed: false,
                limit: totalLimit,
                used,
                message: `Limit tercapai (${used}/${totalLimit}). Silakan beli Add-on untuk menambah kuota.`
            };
        }

        return { allowed: true, limit: totalLimit, used };

    } catch (err) {
        console.error("Feature Gate Error", err);
        return { allowed: false, message: "Gagal memverifikasi limit." };
    } finally {
        client.release();
    }
};