/**
 * Inbound LINE Webhook Controller
 * Receives messages and events from LINE Messaging API
 */
import pool from '../../config/db.js';
import { handleInboundLineEvent, verifyLineSignature } from '../../services/channels/lineChannelService.js';

export const handleLineWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-line-signature'];
        const events = req.body.events || [];
        const { org_id } = req.query;

        let organizationId = parseInt(org_id, 10);
        if (!organizationId) {
            // Find active LINE channel
            const lineConfig = await pool.query(
                `SELECT organization_id, credentials FROM channel_integrations 
                 WHERE channel_type = 'line' AND is_active = true LIMIT 1`
            );
            if (lineConfig.rows.length > 0) {
                organizationId = lineConfig.rows[0].organization_id;
                const secret = lineConfig.rows[0].credentials?.channel_secret;
                if (secret && signature) {
                    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                    const isValid = verifyLineSignature(rawBody, signature, secret);
                    if (!isValid) {
                        return res.status(403).json({ error: "Invalid LINE signature" });
                    }
                }
            } else {
                const fallbackOrg = await pool.query('SELECT id FROM organizations ORDER BY id ASC LIMIT 1');
                organizationId = fallbackOrg.rows[0]?.id || 1;
            }
        }

        // Process each event
        for (const event of events) {
            const result = await handleInboundLineEvent({ organizationId, event });
            if (result.conversation_id && req.io) {
                req.io.to(`org_${organizationId}`).emit('new_message', {
                    conversationId: result.conversation_id,
                    message: {
                        id: result.message_id,
                        conversation_id: result.conversation_id,
                        sender_type: 'contact',
                        message_type: event.message?.type || 'text',
                        content: event.message?.text || '',
                        created_at: new Date().toISOString()
                    }
                });
            }
        }

        res.status(200).send('OK');
    } catch (err) {
        console.error("[LINE Webhook Error]:", err.message);
        res.status(500).json({ error: err.message });
    }
};
