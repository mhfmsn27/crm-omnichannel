import pool from '../config/db.js';
import rajaOngkir from '../services/integrations/rajaongkirClient.js';

// Get Settings
export const getSettings = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM ongkir_settings WHERE organization_id = $1",
            [req.user.organization_id]
        );
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch settings" });
    }
};

// Update Settings
export const updateSettings = async (req, res) => {
    const {
        rajaongkir_api_key,
        rajaongkir_account_type,
        default_origin_city_id,
        default_origin_city_name,
        default_origin_province,
        enabled_couriers,
        is_active
    } = req.body;

    try {
        const query = `
            INSERT INTO ongkir_settings (
                organization_id, rajaongkir_api_key, rajaongkir_account_type, 
                default_origin_city_id, default_origin_city_name, default_origin_province,
                enabled_couriers, is_active, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (organization_id) DO UPDATE SET
                rajaongkir_api_key = EXCLUDED.rajaongkir_api_key,
                rajaongkir_account_type = EXCLUDED.rajaongkir_account_type,
                default_origin_city_id = EXCLUDED.default_origin_city_id,
                default_origin_city_name = EXCLUDED.default_origin_city_name,
                default_origin_province = EXCLUDED.default_origin_province,
                enabled_couriers = EXCLUDED.enabled_couriers,
                is_active = EXCLUDED.is_active,
                updated_at = NOW()
            RETURNING *;
        `;
        const values = [
            req.user.organization_id,
            rajaongkir_api_key,
            rajaongkir_account_type,
            default_origin_city_id ? parseInt(default_origin_city_id) : null,
            default_origin_city_name,
            default_origin_province,
            enabled_couriers,
            is_active
        ];

        const result = await pool.query(query, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update settings" });
    }
};

// Get Provinces (Proxy)
export const getProvinces = async (req, res) => {
    // We need API Key, preferably from DB, but if testing new key, use from header/query?
    // User flow: User inputs Key in UI -> UI calls API to get provinces to populate dropdown.
    // So UI should pass the key if it's not saved yet, or use saved one.

    let apiKey = req.query.key;
    let accountType = req.query.type || 'starter';

    try {
        if (!apiKey) {
            const settings = await pool.query("SELECT rajaongkir_api_key FROM ongkir_settings WHERE organization_id = $1", [req.user.organization_id]);
            if (settings.rows.length > 0) apiKey = settings.rows[0].rajaongkir_api_key;
        }

        if (!apiKey) return res.status(400).json({ error: "API Key required" });

        const data = await rajaOngkir.getProvinces(apiKey, accountType);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch provinces" });
    }
};

// Get Cities (Proxy)
export const getCities = async (req, res) => {
    let apiKey = req.query.key;
    let accountType = req.query.type || 'starter';
    const provinceId = req.params.provinceId;

    try {
        if (!apiKey) {
            const settings = await pool.query("SELECT rajaongkir_api_key FROM ongkir_settings WHERE organization_id = $1", [req.user.organization_id]);
            if (settings.rows.length > 0) apiKey = settings.rows[0].rajaongkir_api_key;
        }

        if (!apiKey) return res.status(400).json({ error: "API Key required" });

        const data = await rajaOngkir.getCities(apiKey, accountType, provinceId === 'all' ? null : provinceId);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to fetch cities" });
    }
};

// Check Cost
export const checkCost = async (req, res) => {
    const { origin, destination, weight, courier } = req.body;
    // origin/destination are city IDs for starter

    try {
        // Fetch API Key from DB
        const settingsRes = await pool.query("SELECT * FROM ongkir_settings WHERE organization_id = $1", [req.user.organization_id]);
        if (settingsRes.rows.length === 0 || !settingsRes.rows[0].is_active) {
            return res.status(400).json({ error: "Ongkir integration not active" });
        }

        const settings = settingsRes.rows[0];

        // Use default origin if not provided
        const finalOrigin = origin || settings.default_origin_city_id;

        if (!finalOrigin || !destination || !weight || !courier) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await rajaOngkir.checkCost(
            settings.rajaongkir_api_key,
            settings.rajaongkir_account_type,
            {
                origin: finalOrigin,
                destination,
                weight,
                courier
            }
        );

        // Log usage
        try {
            // Calculate cheapest cost for logging summary if multiple
            const rawResults = result?.rajaongkir?.results;
            const costs = (rawResults && rawResults.length > 0) ? rawResults[0].costs : [];
            const minCost = (costs && costs.length > 0) ? costs[0].cost[0].value : 0;

            await pool.query(`
                INSERT INTO ongkir_logs (organization_id, origin, destination, weight, courier, cost, api_response)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
             `, [
                req.user.organization_id,
                finalOrigin,
                destination,
                weight,
                courier,
                minCost,
                JSON.stringify(result)
            ]);
        } catch (logErr) {
            console.error("Logging failed", logErr);
        }

        res.json(result);

    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to check cost" });
    }
};
