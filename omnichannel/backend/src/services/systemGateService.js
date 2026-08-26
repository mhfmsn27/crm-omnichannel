import pool from '../config/db.js';
import redis from '../config/redis.js';

const CACHE_TTL = 3600; // 1 hour

export const getAllFlags = async () => {
    // Try cache first for full list? Maybe not efficient if individual keys updates.
    // For admin UI, direct DB is fine. For middleware, we cache individual keys.
    const res = await pool.query('SELECT * FROM system_feature_flags ORDER BY category, key');
    return res.rows;
};

export const updateFlag = async (key, isActive, message) => {
    await pool.query(
        `UPDATE system_feature_flags 
         SET is_active = $1, maintenance_message = $2, updated_at = NOW() 
         WHERE key = $3`,
        [isActive, message, key]
    );

    // Invalidate/Update Cache
    const cacheKey = `sys_flag:${key}`;
    await redis.del(cacheKey);

    return { key, is_active: isActive, maintenance_message: message };
};

// Internal check function used by middleware
export const checkFlagInternal = async (key) => {
    const cacheKey = `sys_flag:${key}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    const res = await pool.query('SELECT is_active, maintenance_message FROM system_feature_flags WHERE key = $1', [key]);
    const flag = res.rows[0] || { is_active: true }; // Default true if missing to avoid lockouts

    await redis.set(cacheKey, JSON.stringify(flag), 'EX', CACHE_TTL);
    return flag;
};

// Middleware Factory
export const checkSystemFlag = (featureKey) => {
    return async (req, res, next) => {
        // Skip for Super Admin to allow testing
        if (req.user && req.user.role === 'super_admin') {
            return next();
        }

        try {
            const flag = await checkFlagInternal(featureKey);

            if (!flag.is_active) {
                return res.status(503).json({
                    error: 'SERVICE_UNAVAILABLE',
                    message: flag.maintenance_message || 'This feature is currently under maintenance.'
                });
            }

            next();
        } catch (err) {
            console.error(`[SystemGate] Error checking flag ${featureKey}:`, err);
            next(); // Fail open or closed? Fail open for robustness.
        }
    };
};