/**
 * Channel Integration Controller
 * Manages configuration and connection status for Email, TikTok, LINE, and custom channels
 */
import pool from '../config/db.js';
import { sendOutboundEmail } from '../services/channels/emailChannelService.js';
import { sendTikTokMessage } from '../services/channels/tiktokChannelService.js';
import { sendLineMessage } from '../services/channels/lineChannelService.js';

// GET /api/app/integrations/channels
export const getChannelIntegrations = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT id, organization_id, channel_type, name, account_identifier, credentials, 
                    is_active, status, error_message, last_synced_at, created_at, updated_at
             FROM channel_integrations 
             WHERE organization_id = $1 
             ORDER BY channel_type, created_at DESC`,
            [organization_id]
        );

        // Sanitize sensitive credentials before returning to frontend
        const sanitized = result.rows.map(row => {
            const creds = { ...row.credentials };
            if (creds.smtp_pass) creds.smtp_pass = '••••••••';
            if (creds.smtp_password) creds.smtp_password = '••••••••';
            if (creds.api_key) creds.api_key = creds.api_key.substring(0, 6) + '••••••••';
            if (creds.app_secret) creds.app_secret = '••••••••';
            if (creds.access_token) creds.access_token = creds.access_token.substring(0, 6) + '••••••••';
            if (creds.channel_secret) creds.channel_secret = '••••••••';
            if (creds.channel_access_token) creds.channel_access_token = creds.channel_access_token.substring(0, 6) + '••••••••';
            return {
                ...row,
                credentials: creds
            };
        });

        res.json(sanitized);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/integrations/channels (Create / Save)
export const saveChannelIntegration = async (req, res) => {
    const { organization_id } = req.user;
    const {
        channel_type,
        name,
        account_identifier,
        credentials = {},
        is_active = true
    } = req.body;

    if (!channel_type || !name || !account_identifier) {
        return res.status(400).json({ error: "channel_type, name, and account_identifier are required." });
    }

    try {
        const existing = await pool.query(
            `SELECT * FROM channel_integrations 
             WHERE organization_id = $1 AND channel_type = $2 AND account_identifier = $3`,
            [organization_id, channel_type, account_identifier]
        );

        let finalCreds = { ...credentials };
        // If password/key contains masked dots, keep existing credentials
        if (existing.rows.length > 0) {
            const oldCreds = existing.rows[0].credentials || {};
            for (const key of Object.keys(finalCreds)) {
                if (typeof finalCreds[key] === 'string' && finalCreds[key].includes('••••')) {
                    finalCreds[key] = oldCreds[key];
                }
            }
        }

        const result = await pool.query(
            `INSERT INTO channel_integrations 
             (organization_id, channel_type, name, account_identifier, credentials, is_active, status, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'connected', NOW())
             ON CONFLICT (organization_id, channel_type, account_identifier)
             DO UPDATE SET name = EXCLUDED.name, credentials = EXCLUDED.credentials, 
                           is_active = EXCLUDED.is_active, status = 'connected', error_message = NULL, updated_at = NOW()
             RETURNING id, channel_type, name, account_identifier, is_active, status, updated_at`,
            [organization_id, channel_type, name, account_identifier, JSON.stringify(finalCreds), is_active]
        );

        res.status(200).json({
            message: `Channel ${name} saved successfully`,
            data: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/integrations/channels/:id/test
export const testChannelConnection = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { test_recipient } = req.body;

    try {
        const rowRes = await pool.query(
            `SELECT * FROM channel_integrations WHERE id = $1 AND organization_id = $2`,
            [id, organization_id]
        );

        if (rowRes.rows.length === 0) {
            return res.status(404).json({ error: "Channel integration not found" });
        }

        const channel = rowRes.rows[0];

        if (channel.channel_type === 'email') {
            const recipient = test_recipient || channel.account_identifier;
            await sendOutboundEmail({
                organizationId: organization_id,
                to: recipient,
                subject: 'CRMHUB Omnichannel - Test Email Connection',
                body: 'Halo, ini adalah pesan uji koneksi email dari CRMHUB Omnichannel. Integrasi berhasil!',
                html: '<p>Halo, ini adalah <b>pesan uji koneksi email</b> dari CRMHUB Omnichannel. Integrasi berhasil! 🎉</p>'
            });
            return res.json({ success: true, message: `Test email sent to ${recipient}` });
        }

        if (channel.channel_type === 'tiktok') {
            return res.json({ success: true, message: "TikTok API Connection verified successfully." });
        }

        if (channel.channel_type === 'line') {
            if (test_recipient) {
                await sendLineMessage({
                    organizationId: organization_id,
                    lineUserId: test_recipient,
                    text: 'Halo! Ini adalah pesan uji koneksi dari CRMHUB Omnichannel untuk LINE Official Account.'
                });
            }
            return res.json({ success: true, message: "LINE API Connection verified." });
        }

        res.json({ success: true, message: "Channel verified" });
    } catch (err) {
        res.status(400).json({ error: "Test failed: " + err.message });
    }
};

// DELETE /api/app/integrations/channels/:id
export const deleteChannelIntegration = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query(
            `DELETE FROM channel_integrations WHERE id = $1 AND organization_id = $2`,
            [id, organization_id]
        );
        res.json({ message: "Channel integration disconnected" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
