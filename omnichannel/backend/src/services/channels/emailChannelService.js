/**
 * Email Channel Service (Two-Way Email Inbox)
 * Supports SMTP/IMAP and Inbound Webhook (Resend / SendGrid / Custom)
 */
import pool from '../../config/db.js';
import nodemailer from 'nodemailer';

/**
 * Get active email channel integration for an organization
 */
export const getEmailConfig = async (organizationId) => {
    const result = await pool.query(
        `SELECT * FROM channel_integrations 
         WHERE organization_id = $1 AND channel_type = 'email' AND is_active = true 
         ORDER BY updated_at DESC LIMIT 1`,
        [organizationId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

/**
 * Send an outbound email via SMTP or Resend API
 */
export const sendOutboundEmail = async ({ organizationId, to, subject, body, html, inReplyTo = null, references = null }) => {
    const configRow = await getEmailConfig(organizationId);
    if (!configRow) {
        throw new Error("Email channel is not configured or inactive for this organization.");
    }

    const creds = configRow.credentials || {};

    // 1. Resend API mode
    if (creds.provider === 'resend' && creds.api_key) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${creds.api_key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: creds.from_email || configRow.account_identifier || 'support@crmhub.id',
                to: [to],
                subject: subject || 'Support Message',
                text: body || '',
                html: html || `<p>${body || ''}</p>`,
                headers: inReplyTo ? { 'In-Reply-To': inReplyTo, 'References': references || inReplyTo } : {}
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Resend API Error: ${errData.message || response.statusText}`);
        }
        return await response.json();
    }

    // 2. Standard SMTP mode (Nodemailer)
    const transporter = nodemailer.createTransport({
        host: creds.smtp_host || 'smtp.gmail.com',
        port: parseInt(creds.smtp_port, 10) || 587,
        secure: creds.smtp_secure === true || creds.smtp_port === 465,
        auth: {
            user: creds.smtp_user || configRow.account_identifier,
            pass: creds.smtp_pass || creds.smtp_password
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const mailOptions = {
        from: `"${creds.sender_name || 'Customer Support'}" <${creds.from_email || configRow.account_identifier}>`,
        to,
        subject: subject || 'Support Message',
        text: body || '',
        html: html || `<p>${(body || '').replace(/\n/g, '<br/>')}</p>`,
        inReplyTo: inReplyTo || undefined,
        references: references || inReplyTo || undefined
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
};

/**
 * Handle incoming email webhook (from inbound mail provider like Resend/SendGrid/Cloudmailin)
 */
export const handleInboundEmail = async ({ organizationId, fromEmail, fromName, toEmail, subject, textBody, htmlBody, messageId, inReplyTo }) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Find or create contact with email
        let contactRes = await client.query(
            'SELECT * FROM contacts WHERE organization_id = $1 AND (email = $2 OR phone_number = $2)',
            [organizationId, fromEmail]
        );

        let contactId;
        if (contactRes.rows.length === 0) {
            const newContact = await client.query(
                `INSERT INTO contacts (organization_id, name, email, phone_number, is_subscribed) 
                 VALUES ($1, $2, $3, $4, true) RETURNING id`,
                [organizationId, fromName || fromEmail.split('@')[0], fromEmail, fromEmail]
            );
            contactId = newContact.rows[0].id;
        } else {
            contactId = contactRes.rows[0].id;
        }

        // 2. Find or create conversation with channel='email'
        let convRes = await client.query(
            `SELECT * FROM conversations 
             WHERE organization_id = $1 AND contact_id = $2 AND channel = 'email' AND status != 'closed'
             ORDER BY updated_at DESC LIMIT 1`,
            [organizationId, contactId]
        );

        let conversationId;
        if (convRes.rows.length === 0) {
            const newConv = await client.query(
                `INSERT INTO conversations (organization_id, contact_id, channel, last_message, last_message_at, unread_count, status)
                 VALUES ($1, $2, 'email', $3, NOW(), 1, 'open') RETURNING id`,
                [organizationId, contactId, textBody || subject || 'New email']
            );
            conversationId = newConv.rows[0].id;
        } else {
            conversationId = convRes.rows[0].id;
            await client.query(
                `UPDATE conversations 
                 SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, updated_at = NOW() 
                 WHERE id = $2`,
                [textBody || subject || 'New email', conversationId]
            );
        }

        // 3. Insert incoming message
        const msgRes = await client.query(
            `INSERT INTO messages (conversation_id, sender_type, message_type, content, external_id, metadata, status, created_at)
             VALUES ($1, 'contact', 'text', $2, $3, $4, 'received', NOW()) RETURNING id`,
            [
                conversationId,
                textBody || subject || '',
                messageId || `email_${Date.now()}`,
                JSON.stringify({ subject, from: fromEmail, to: toEmail, inReplyTo, html: htmlBody })
            ]
        );

        await client.query('COMMIT');

        return {
            success: true,
            conversation_id: conversationId,
            message_id: msgRes.rows[0].id
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
