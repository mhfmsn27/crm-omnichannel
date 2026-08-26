/**
 * Organization Settings Utility
 * Helper functions for managing organization-specific settings
 */

import pool from '../config/db.js';

const SETTING_KEYS = {
    HIDE_DEVICE_DATA_ON_DELETE: 'hide_device_data_on_delete'
};

/**
 * Get organization setting value
 * @param {number} organizationId - Organization ID
 * @param {string} settingKey - Setting key
 * @param {any} defaultValue - Default value if not found
 * @returns {Promise<any>}
 */
export const getOrgSetting = async (organizationId, settingKey, defaultValue = null) => {
    try {
        const result = await pool.query(
            'SELECT setting_value FROM organization_settings WHERE organization_id = $1 AND setting_key = $2',
            [organizationId, settingKey]
        );
        return result.rows.length > 0 ? result.rows[0].setting_value : defaultValue;
    } catch (err) {
        console.error('[getOrgSetting] Error:', err.message);
        return defaultValue;
    }
};

/**
 * Set organization setting value
 * @param {number} organizationId - Organization ID
 * @param {string} settingKey - Setting key
 * @param {any} settingValue - Setting value
 * @returns {Promise<boolean>}
 */
export const setOrgSetting = async (organizationId, settingKey, settingValue) => {
    try {
        await pool.query(`
            INSERT INTO organization_settings (organization_id, setting_key, setting_value, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (organization_id, setting_key)
            DO UPDATE SET setting_value = $3, updated_at = NOW()
        `, [organizationId, settingKey, settingValue]);
        return true;
    } catch (err) {
        console.error('[setOrgSetting] Error:', err.message);
        return false;
    }
};

/**
 * Check if hide device data feature is enabled for organization
 * @param {number} organizationId - Organization ID
 * @returns {Promise<boolean>}
 */
export const isHideDeviceDataEnabled = async (organizationId) => {
    const value = await getOrgSetting(organizationId, SETTING_KEYS.HIDE_DEVICE_DATA_ON_DELETE, false);
    return value === true;
};

/**
 * Get SQL filter to exclude deleted devices
 * @param {string} tableAlias - Alias for whatsapp_sessions table (default: 'ws')
 * @returns {string} SQL condition
 */
export const getActiveDeviceFilter = (tableAlias = 'ws') => {
    return `${tableAlias}.device_status = 'active'`;
};

/**
 * Get SQL condition to filter conversations by active devices
 * @param {string} deviceIdField - Field name for device ID (default: 'whatsapp_session_id')
 * @returns {string} SQL condition
 */
export const getActiveDeviceJoinCondition = (deviceIdField = 'ws.id') => {
    return `
        EXISTS (
            SELECT 1 FROM whatsapp_sessions ws
            WHERE ${deviceIdField} = ws.id
            AND ws.device_status = 'active'
        )
    `;
};

export { SETTING_KEYS };
export default {
    getOrgSetting,
    setOrgSetting,
    isHideDeviceDataEnabled,
    getActiveDeviceFilter,
    getActiveDeviceJoinCondition,
    SETTING_KEYS
};
