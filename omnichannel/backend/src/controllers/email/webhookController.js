/**
 * Inbound Email Webhook Controller
 * Handles webhook notifications from email providers (Resend, SendGrid, Mailgun, etc.)
 */
import pool from '../../config/db.js';
import { handleInboundEmail } from '../../services/channels/emailChannelService.js';

export const handleInboundEmailWebhook = async (req, res) => {
    try {
        const body = req.body || {};
        const { org_id } = req.query;

        // Support Resend / SendGrid / Custom payload structures
        const fromEmail = body.from || body.sender || body.from_email || body.envelope?.from;
        const fromName = body.from_name || body.name || (fromEmail ? fromEmail.split('@')[0] : 'Email User');
        const toEmail = body.to || body.recipient || body.to_email || body.envelope?.to?.[0];
        const subject = body.subject || 'No Subject';
        const textBody = body.text || body.text_body || body.plain || body.content || '';
        const htmlBody = body.html || body.html_body || '';
        const messageId = body.message_id || body.id || `em_${Date.now()}`;
        const inReplyTo = body.in_reply_to || body.headers?.['in-reply-to'] || null;

        if (!fromEmail) {
            return res.status(400).json({ error: "Missing sender email (from)" });
        }

        // Determine Organization ID
        let organizationId = parseInt(org_id, 10);
        if (!organizationId && toEmail) {
            // Find organization by account_identifier
            const orgRes = await pool.query(
                `SELECT organization_id FROM channel_integrations 
                 WHERE channel_type = 'email' AND account_identifier ILIKE $1 AND is_active = true LIMIT 1`,
                [toEmail]
            );
            if (orgRes.rows.length > 0) {
                organizationId = orgRes.rows[0].organization_id;
            }
        }

        if (!organizationId) {
            const fallbackOrg = await pool.query('SELECT id FROM organizations ORDER BY id ASC LIMIT 1');
            organizationId = fallbackOrg.rows[0]?.id || 1;
        }

        const result = await handleInboundEmail({
            organizationId,
            fromEmail,
            fromName,
            toEmail,
            subject,
            textBody,
            htmlBody,
            messageId,
            inReplyTo
        });

        // Notify real-time UI via Socket.io
        req.io?.to(`org_${organizationId}`).emit('new_message', {
            conversationId: result.conversation_id,
            message: {
                id: result.message_id,
                conversation_id: result.conversation_id,
                sender_type: 'contact',
                message_type: 'text',
                content: textBody || subject,
                created_at: new Date().toISOString()
            }
        });

        res.status(200).json({ success: true, ...result });
    } catch (err) {
        console.error("[Email Webhook Error]:", err.message);
        res.status(500).json({ error: err.message });
    }
};
