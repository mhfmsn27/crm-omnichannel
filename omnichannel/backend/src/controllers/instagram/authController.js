
import pool from '../../config/db.js';
import InstagramService from '../../services/InstagramService.js';
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

// GET /api/app/instagram/stats
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        let featureAccess = await checkFeatureAccess(organization_id, 'channel_instagram');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_instagram');

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

// GET /api/app/instagram/accounts
export const getAccounts = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM instagram_accounts WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/instagram/callback
export const handleCallback = async (req, res) => {
    const { access_token } = req.body; // Short-lived token
    const { organization_id } = req.user;

    // 1. Feature Gate Check
    try {
        let featureAccess = await checkFeatureAccess(organization_id, 'channel_instagram');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_instagram');

        // Auto-unlock
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        if (!featureAccess.allowed) {
            return res.status(403).json({ error: "Instagram integration is not included in your plan.", upsell: true });
        }

        // Pass limitAccess to later check
        req.limitAccess = limitAccess;

    } catch (err) {
        return res.status(500).json({ error: "Gate check failed" });
    }

    try {
        // 1. Exchange for Long-Lived User Token
        const longLivedUserToken = await InstagramService.exchangeToken(access_token);

        // 2. Fetch Connected IG Accounts via Pages
        const accounts = await InstagramService.getAccounts(longLivedUserToken);

        if (!accounts || accounts.length === 0) {
            console.warn("[InstagramAuth] No Business Accounts found.");
            // IMPROVED ERROR MESSAGE
            return res.status(400).json({
                error: "Tidak ada akun Instagram Bisnis ditemukan. Pastikan akun Instagram Anda berstatus 'Business Account' dan sudah terhubung ke Halaman Facebook yang Anda kelola melalui pengaturan Facebook Page."
            });
        }

        // --- NEW LIMIT CHECK LOGIC ---
        const limitAccess = req.limitAccess;
        const limit = limitAccess.limit;

        if (limit !== -1) { // If not unlimited
            const currentAccsRes = await pool.query('SELECT ig_id FROM instagram_accounts WHERE organization_id = $1', [organization_id]);
            const currentIds = new Set(currentAccsRes.rows.map(r => r.ig_id));

            // Add new accounts to the set
            accounts.forEach(a => currentIds.add(a.ig_id));

            if (currentIds.size > limit) {
                return res.status(403).json({
                    error: `Limit reached! Your plan allows ${limit} Instagram accounts, but you are trying to connect ${currentIds.size}.`,
                    upsell: true
                });
            }
        }
        // -----------------------------

        const client = await pool.connect();
        const subscribeFailures = [];
        try {
            await client.query('BEGIN');

            for (const acc of accounts) {
                await client.query(
                    `INSERT INTO instagram_accounts (organization_id, ig_id, username, profile_picture_url, fb_page_id, access_token, is_active, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
                     ON CONFLICT (ig_id)
                     DO UPDATE SET
                        organization_id = EXCLUDED.organization_id,
                        username = EXCLUDED.username,
                        profile_picture_url = EXCLUDED.profile_picture_url,
                        fb_page_id = EXCLUDED.fb_page_id,
                        access_token = EXCLUDED.access_token,
                        is_active = true,
                        updated_at = NOW()`,
                    [organization_id, acc.ig_id, acc.username, acc.profile_picture_url, acc.fb_page_id, acc.access_token]
                );

                // Subscribe Webhook (on the parent FB Page) — track failures separately
                const subResult = await InstagramService.subscribeApp(acc.fb_page_id, acc.access_token);
                if (!subResult.success) {
                    subscribeFailures.push({ account: acc.username, error: subResult.error });
                }
            }

            await client.query('COMMIT');

            const response = { message: `Berhasil menghubungkan ${accounts.length} akun Instagram.` };
            if (subscribeFailures.length > 0) {
                response.warning = `${subscribeFailures.length} akun tersimpan tetapi pendaftaran webhook gagal. Gunakan tombol Reconnect untuk mencoba lagi.`;
                response.subscribeFailures = subscribeFailures;
            }
            res.json(response);

        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("[Instagram Auth] Error:", err.response?.data || err.message);
        const msg = err.response?.data?.error?.message || err.message || "Gagal menghubungkan Instagram.";
        res.status(500).json({ error: msg });
    }
};

// DELETE /api/app/instagram/accounts/:id
export const disconnectAccount = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query('DELETE FROM instagram_accounts WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "Account disconnected" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/instagram/accounts/:id/resubscribe
export const resubscribeAccount = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const accRes = await pool.query('SELECT ig_id, username, fb_page_id, access_token FROM instagram_accounts WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (accRes.rows.length === 0) return res.status(404).json({ error: "Account not found" });
        const { username, fb_page_id, access_token } = accRes.rows[0];

        const subResult = await InstagramService.subscribeApp(fb_page_id, access_token);
        if (!subResult.success) {
            return res.status(502).json({ error: `Webhook subscription failed for "@${username}": ${subResult.error}` });
        }
        res.json({ message: `Webhook successfully reconnected for "@${username}".` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/app/instagram/accounts/:id/toggle-ai
export const toggleAi = async (req, res) => {
    const { id } = req.params;
    const { ai_active } = req.body;
    const { organization_id } = req.user;

    try {
        await pool.query('UPDATE instagram_accounts SET ai_active = $1 WHERE id = $2 AND organization_id = $3', [ai_active, id, organization_id]);
        res.json({ message: "AI settings updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
