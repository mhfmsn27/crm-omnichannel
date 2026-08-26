import pool from '../config/db.js';

export const publicApiAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.split(' ')[1]; // Bearer <KEY>

    if (!apiKey) {
        return res.status(401).json({ error: "Unauthorized: API Key required" });
    }

    try {
        // 1. Find App
        const appRes = await pool.query(
            `SELECT * FROM developer_apps WHERE api_key = $1 AND is_active = true`,
            [apiKey]
        );

        if (appRes.rows.length === 0) {
            return res.status(403).json({ error: "Forbidden: Invalid or inactive API Key" });
        }

        const app = appRes.rows[0];
        req.devApp = app;
        next();
    } catch (err) {
        console.error("[PublicApiAuth] Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const validateChannelAccess = async (req, res, next) => {
    const { channel, session_id } = req.body;
    const appId = req.devApp.id;

    // If no specific session requested, controller will pick default if available
    if (!session_id) return next(); 

    try {
        const check = await pool.query(
            `SELECT id FROM developer_app_channels 
             WHERE developer_app_id = $1 AND session_id = $2`,
            [appId, session_id]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ 
                error: `Forbidden: This API Key is not authorized for the requested session_id (${session_id}).` 
            });
        }
        next();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};