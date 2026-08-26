/**
 * Organization Settings Controller
 * API endpoints for managing organization-specific settings
 */

import pool from '../config/db.js';
import * as waGatewayService from '../services/waGatewayService.js';
import { getOrgSetting, setOrgSetting, SETTING_KEYS } from '../utils/organizationSettings.js';

/**
 * GET /api/app/settings/device-data-hide
 * Get current hide device data setting
 */
export const getHideDeviceDataSetting = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const enabled = await getOrgSetting(organization_id, SETTING_KEYS.HIDE_DEVICE_DATA_ON_DELETE, false);

        // Also get count of hidden devices
        const hiddenCountResult = await pool.query(
            'SELECT COUNT(*) as count FROM whatsapp_sessions WHERE organization_id = $1 AND device_status = $2',
            [organization_id, 'deleted']
        );

        res.json({
            enabled: enabled === true,
            hiddenDevicesCount: parseInt(hiddenCountResult.rows[0]?.count || '0'),
            description: enabled
                ? 'Device data will be hidden when device is deleted. Data can be restored by re-adding the same device.'
                : 'Device data will remain visible after device deletion (current behavior).'
        });
    } catch (err) {
        console.error('[getHideDeviceDataSetting] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * PUT /api/app/settings/device-data-hide
 * Update hide device data setting
 */
export const updateHideDeviceDataSetting = async (req, res) => {
    const { organization_id } = req.user;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid value. Must be a boolean.' });
    }

    try {
        await setOrgSetting(organization_id, SETTING_KEYS.HIDE_DEVICE_DATA_ON_DELETE, enabled);

        res.json({
            success: true,
            enabled,
            message: enabled
                ? 'Device data will now be hidden when device is deleted. Existing deleted devices will remain hidden.'
                : 'Device data will now remain visible after device deletion (current behavior).'
        });
    } catch (err) {
        console.error('[updateHideDeviceDataSetting] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/app/settings/hidden-devices
 * Get list of hidden/deleted devices
 */
export const getHiddenDevices = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await pool.query(`
            SELECT id, name, whatsapp_number, deleted_at, status
            FROM whatsapp_sessions
            WHERE organization_id = $1 AND device_status = 'deleted'
            ORDER BY deleted_at DESC
        `, [organization_id]);

        res.json({
            devices: result.rows,
            count: result.rows.length
        });
    } catch (err) {
        console.error('[getHiddenDevices] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/app/settings/restore-device/:id
 * Restore a hidden device
 */
export const restoreDevice = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        // Verify device exists and is deleted
        const check = await pool.query(
            'SELECT id, name FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2 AND device_status = $3',
            [id, organization_id, 'deleted']
        );

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Hidden device not found or not deleted' });
        }

        const deviceName = check.rows[0].name;

        // Create new session in gateway
        const sessionNameLabel = `${deviceName}-${Date.now()}`;

        let newSessionId;
        try {
            const gatewayResponse = await waGatewayService.createSession(sessionNameLabel);
            const rawData = gatewayResponse.data || gatewayResponse;
            newSessionId = rawData.id || rawData.sessionId || gatewayResponse.id;

            if (!newSessionId) throw new Error("No Session ID returned from Gateway");
        } catch (e) {
            console.error('[restoreDevice] Gateway error:', e);
            return res.status(502).json({ error: "Gateway Error: " + e.message });
        }

        // Restore device record
        await pool.query(`
            UPDATE whatsapp_sessions
            SET device_status = 'active',
                deleted_at = NULL,
                session_id = $1,
                status = 'created'
            WHERE id = $2
        `, [newSessionId, id]);

        // Start session (non-blocking)
        waGatewayService.startSession(newSessionId).catch(e => console.warn("Auto-start warning:", e.message));

        res.json({
            success: true,
            message: 'Device restored successfully',
            id: parseInt(id)
        });

    } catch (err) {
        console.error('[restoreDevice] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export default {
    getHideDeviceDataSetting,
    updateHideDeviceDataSetting,
    getHiddenDevices,
    restoreDevice
};
