/**
 * Payment Gateway Service
 * Factory pattern to resolve the correct gateway adapter for an organization
 */
import pool from '../config/db.js';
import XenditAdapter from './gateways/XenditAdapter.js';
import MidtransAdapter from './gateways/MidtransAdapter.js';
import TripayAdapter from './gateways/TripayAdapter.js';
import DuitkuAdapter from './gateways/DuitkuAdapter.js';

const ADAPTERS = {
    xendit: XenditAdapter,
    midtrans: MidtransAdapter,
    tripay: TripayAdapter,
    duitku: DuitkuAdapter
};

/**
 * Get the active (default) gateway adapter for an organization
 */
export const getActiveGateway = async (organizationId) => {
    const result = await pool.query(
        `SELECT * FROM invoice_payment_gateways 
         WHERE organization_id = $1 AND is_default = true AND is_active = true`,
        [organizationId]
    );

    if (result.rows.length === 0) {
        return null; // No gateway configured
    }

    const row = result.rows[0];
    const AdapterClass = ADAPTERS[row.gateway_type];
    if (!AdapterClass) {
        throw new Error(`Unknown gateway type: ${row.gateway_type}`);
    }

    return new AdapterClass(row.config);
};

/**
 * Get a specific gateway adapter by type for an organization (used for webhook validation)
 */
export const getGatewayByType = async (organizationId, gatewayType) => {
    const result = await pool.query(
        `SELECT * FROM invoice_payment_gateways 
         WHERE organization_id = $1 AND gateway_type = $2 AND is_active = true`,
        [organizationId, gatewayType]
    );

    if (result.rows.length === 0) return null;

    const AdapterClass = ADAPTERS[gatewayType];
    if (!AdapterClass) return null;

    return new AdapterClass(result.rows[0].config);
};

/**
 * Resolve gateway adapter from gateway_type string + config JSONB (for webhook where org_id is unknown)
 */
export const resolveAdapterByType = (gatewayType, config) => {
    const AdapterClass = ADAPTERS[gatewayType];
    if (!AdapterClass) throw new Error(`Unknown gateway type: ${gatewayType}`);
    return new AdapterClass(config);
};

/**
 * Get all gateway configs for an organization
 */
export const getGatewayConfigs = async (organizationId) => {
    const result = await pool.query(
        `SELECT id, gateway_type, is_active, is_default, created_at, updated_at,
                config - 'api_key' - 'server_key' - 'private_key' - 'api_secret' - 'callback_token' as safe_config
         FROM invoice_payment_gateways
         WHERE organization_id = $1
         ORDER BY is_default DESC, gateway_type ASC`,
        [organizationId]
    );
    return result.rows;
};

/**
 * Save (upsert) a gateway configuration
 */
export const saveGatewayConfig = async (organizationId, gatewayType, config, isActive, isDefault) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // If setting as default, unset other defaults first
        if (isDefault) {
            await client.query(
                `UPDATE invoice_payment_gateways SET is_default = false WHERE organization_id = $1`,
                [organizationId]
            );
        }

        await client.query(
            `INSERT INTO invoice_payment_gateways (organization_id, gateway_type, config, is_active, is_default, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (organization_id, gateway_type) 
             DO UPDATE SET config = $3, is_active = $4, is_default = $5, updated_at = NOW()`,
            [organizationId, gatewayType, JSON.stringify(config), isActive, isDefault]
        );

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Delete a gateway configuration
 */
export const deleteGatewayConfig = async (organizationId, gatewayType) => {
    await pool.query(
        `DELETE FROM invoice_payment_gateways WHERE organization_id = $1 AND gateway_type = $2`,
        [organizationId, gatewayType]
    );
    return { success: true };
};

/**
 * Test a gateway connection by attempting a minimal API call
 */
export const testGatewayConnection = async (gatewayType, config) => {
    const AdapterClass = ADAPTERS[gatewayType];
    if (!AdapterClass) throw new Error(`Unknown gateway type: ${gatewayType}`);

    const adapter = new AdapterClass(config);
    
    // Simple validation: check that required config fields exist
    const requiredFields = {
        xendit: ['api_key'],
        midtrans: ['server_key', 'client_key'],
        tripay: ['api_key', 'private_key', 'merchant_code'],
        duitku: ['merchant_code', 'api_key']
    };

    const missing = (requiredFields[gatewayType] || []).filter(f => !config[f]);
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    return { success: true, gateway: adapter.getDisplayName(), methods: adapter.getAvailableMethods() };
};

/**
 * Get list of supported gateway types with metadata
 */
export const getSupportedGateways = () => {
    return [
        { type: 'xendit', name: 'Xendit', fields: ['api_key', 'callback_token'], description: 'VA, E-Wallet, QRIS, Retail, Credit Card' },
        { type: 'midtrans', name: 'Midtrans', fields: ['server_key', 'client_key', 'is_production'], description: 'VA, E-Wallet, QRIS, Credit Card, Convenience Store' },
        { type: 'tripay', name: 'TriPay', fields: ['api_key', 'private_key', 'merchant_code', 'is_production'], description: 'VA, E-Wallet, QRIS, Retail' },
        { type: 'duitku', name: 'Duitku', fields: ['merchant_code', 'api_key', 'is_production'], description: 'VA, E-Wallet, QRIS, Retail, Credit Card' }
    ];
};
