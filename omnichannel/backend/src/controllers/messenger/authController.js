import pool from '../../config/db.js';
import MessengerService from '../../services/MessengerService.js';
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

// GET /api/app/messenger/stats
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        let featureAccess = await checkFeatureAccess(organization_id, 'channel_messenger');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_messenger');

        // Auto-unlock
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        if (!featureAccess.allowed) {
            return res.json({
                allowed: false,
                locked: true,
                maintenance: featureAccess.maintenance || false, // Pass flag
                limit: 0,
                used: limitAccess.used,
                message: featureAccess.message || "Feature not included in plan." // Use dynamic message
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

// GET /api/app/messenger/pages
export const getPages = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM messenger_pages WHERE organization_id = $1 ORDER BY created_at DESC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/messenger/callback
export const handleCallback = async (req, res) => {
    const { access_token, userID } = req.body; // Short-lived token from frontend SDK
    const { organization_id } = req.user;

    // 1. Feature Gate Check (Only check if enabled, ignore limit for now)
    try {
        let featureAccess = await checkFeatureAccess(organization_id, 'channel_messenger');
        const limitAccess = await checkFeatureAccess(organization_id, 'limit_messenger');

        // Auto-unlock
        featureAccess = resolveFeatureAccess(featureAccess, limitAccess);

        if (!featureAccess.allowed) {
            return res.status(403).json({ error: "Messenger integration is not included in your plan.", upsell: true });
        }

        // Pass limitAccess to later check
        req.limitAccess = limitAccess;

    } catch (err) {
        return res.status(500).json({ error: "Gate check failed" });
    }

    try {
        // 1. Exchange for Long-Lived User Token
        const longLivedUserToken = await MessengerService.exchangeToken(access_token);

        // 2. Get Pages with Page Access Tokens
        const pages = await MessengerService.getAccounts(longLivedUserToken);

        if (!pages || pages.length === 0) {
            console.warn("[MessengerAuth] No pages returned from Meta API. User might not have granted permission or has no pages.");
            return res.status(400).json({ error: "No pages found or permission denied. Please ensure you selected pages during login." });
        }

        // --- NEW LIMIT CHECK LOGIC ---
        const limitAccess = req.limitAccess;
        const limit = limitAccess.limit;

        if (limit !== -1) { // If not unlimited
            const currentPagesRes = await pool.query('SELECT page_id FROM messenger_pages WHERE organization_id = $1', [organization_id]);
            const currentIds = new Set(currentPagesRes.rows.map(r => r.page_id));

            // Add new pages to the set
            pages.forEach(p => currentIds.add(p.id));

            if (currentIds.size > limit) {
                return res.status(403).json({
                    error: `Limit reached! You are trying to connect ${currentIds.size} pages, but your plan limit is ${limit}. Please upgrade.`,
                    upsell: true
                });
            }
        }
        // -----------------------------

        const client = await pool.connect();
        const subscribeFailures = [];
        try {
            await client.query('BEGIN');

            for (const page of pages) {
                const pageId = page.id;
                const pageToken = page.access_token;
                const picture = page.picture?.data?.url || '';

                await client.query(
                    `INSERT INTO messenger_pages (organization_id, page_id, page_name, picture_url, access_token, is_active, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
                     ON CONFLICT (page_id)
                     DO UPDATE SET
                        organization_id = EXCLUDED.organization_id,
                        page_name = EXCLUDED.page_name,
                        picture_url = EXCLUDED.picture_url,
                        access_token = EXCLUDED.access_token,
                        is_active = true,
                        updated_at = NOW()`,
                    [organization_id, pageId, page.name, picture, pageToken]
                );

                // Subscribe App to Page Webhooks — track failures separately
                const subResult = await MessengerService.subscribeApp(pageId, pageToken);
                if (!subResult.success) {
                    subscribeFailures.push({ page: page.name, error: subResult.error });
                }
            }

            await client.query('COMMIT');

            const response = { message: `Successfully connected ${pages.length} page(s).` };
            if (subscribeFailures.length > 0) {
                response.warning = `${subscribeFailures.length} page(s) saved but webhook subscription failed. Use the Reconnect button to retry.`;
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
        console.error("[Messenger Auth] Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/messenger/pages/:id
export const disconnectPage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const pageRes = await pool.query('SELECT page_id, access_token FROM messenger_pages WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (pageRes.rows.length === 0) return res.status(404).json({ error: "Page not found" });

        const { page_id, access_token } = pageRes.rows[0];

        // Unsubscribe from Meta
        await MessengerService.unsubscribeApp(page_id, access_token);

        // Delete from DB
        await pool.query('DELETE FROM messenger_pages WHERE id = $1', [id]);
        res.json({ message: "Page disconnected" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/messenger/pages/:id/resubscribe
export const resubscribePage = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const pageRes = await pool.query('SELECT page_id, page_name, access_token FROM messenger_pages WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (pageRes.rows.length === 0) return res.status(404).json({ error: "Page not found" });
        const { page_id, page_name, access_token } = pageRes.rows[0];

        const subResult = await MessengerService.subscribeApp(page_id, access_token);
        if (!subResult.success) {
            return res.status(502).json({ error: `Webhook subscription failed for "${page_name}": ${subResult.error}` });
        }
        res.json({ message: `Webhook successfully reconnected for "${page_name}".` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/app/messenger/pages/:id/toggle-ai
export const toggleAi = async (req, res) => {
    const { id } = req.params;
    const { ai_active } = req.body;
    const { organization_id } = req.user;

    try {
        await pool.query('UPDATE messenger_pages SET ai_active = $1 WHERE id = $2 AND organization_id = $3', [ai_active, id, organization_id]);
        res.json({ message: "AI settings updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};