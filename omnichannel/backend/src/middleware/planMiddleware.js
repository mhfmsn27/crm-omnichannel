import pool from '../config/db.js';
import redis from '../config/redis.js';

const CACHE_TTL = 3600; // 1 hour

// PERSONAL VERSION: Always return true for feature access
const isPersonalVersion = true;


// Helper to check feature access
const checkFeatureAccess = async (organizationId, featureCode) => {
    // Try Cache
    const cacheKey = `plan_feat:${organizationId}:${featureCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) return cached === '1';

    // DB Check
    // DB Check
    // Updated to validate Subscription existence and expiry
    const query = `
        SELECT pf.is_enabled, s.status, s.expires_at
        FROM plan_features pf
        JOIN organizations o ON pf.plan_id = o.plan_id
        LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status IN ('active', 'trialing')
        WHERE o.id = $1 AND pf.feature_code = $2
    `;
    const res = await pool.query(query, [organizationId, featureCode]);

    if (res.rows.length === 0) return false;

    const { is_enabled, status, expires_at } = res.rows[0];

    // 1. Feature must be enabled in plan
    if (!is_enabled) return false;

    // 2. Subscription must be active/trialing AND not expired
    if (!status) return false; // No active subscription found

    // Check Expiry
    if (expires_at && new Date(expires_at) < new Date()) {
        return false;
    }

    // Cache It (Note: Cache TTL 1 hour is fine, but if they renew, we need to invalidate cache. 
    // Ideally update subscription controller should clear cache.)
    await redis.set(cacheKey, '1', 'EX', CACHE_TTL);

    return true;
};

// Middleware Factory
export const checkPlanFeature = (featureCode) => {
    return async (req, res, next) => {
        // PERSONAL VERSION: Bypass Check
        if (isPersonalVersion) return next();

        // Skip for Super Admin
        if (req.user && req.user.role === 'super_admin') return next();
        if (!req.user || !req.user.organization_id) return res.sendStatus(401);

        try {
            const hasAccess = await checkFeatureAccess(req.user.organization_id, featureCode);
            if (!hasAccess) {
                return res.status(403).json({
                    error: 'FEATURE_LOCKED',
                    message: `This feature (${featureCode}) is not available in your current plan.`
                });
            }
            next();
        } catch (err) {
            console.error(`[PlanMiddleware] Error checking ${featureCode}:`, err);
            // Fail safe: Allow or Block? Block is safer for paywalls.
            res.status(500).json({ error: 'Internal Server Error during permission check.' });
        }
    };
};

// Middleware: Strictly require Active Subscription (No Feature Check)
export const requireActiveSubscription = async (req, res, next) => {
    // PERSONAL VERSION: Bypass Check
    if (isPersonalVersion) return next();

    // Skip for Super Admin
    if (req.user && req.user.role === 'super_admin') return next();
    if (!req.user || !req.user.organization_id) return res.sendStatus(401);

    try {
        // Check Subscription
        const query = `
            SELECT status, expires_at 
            FROM subscriptions 
            WHERE organization_id = $1 AND status IN ('active', 'trialing')
            LIMIT 1
        `;
        const result = await pool.query(query, [req.user.organization_id]);

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: 'SUBSCRIPTION_REQUIRED',
                message: 'Active subscription required to access this feature.'
            });
        }

        const { expires_at } = result.rows[0];

        // Check Expiry
        if (expires_at && new Date(expires_at) < new Date()) {
            return res.status(403).json({
                error: 'SUBSCRIPTION_EXPIRED',
                message: 'Your subscription has expired. Please renew to continue.'
            });
        }

        next();
    } catch (err) {
        console.error("[PlanMiddleware] Error checking subscription:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
