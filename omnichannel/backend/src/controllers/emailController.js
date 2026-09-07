import pool from '../config/db.js';
import { getOrgSmtpConfig, saveOrgSmtpConfig, testOrgSmtpConnection, sendOrgEmail } from '../services/emailService.js';

let schemaEnsured = false;
export const ensureEmailSchema = async () => {
    if (schemaEnsured) return;
    try {
        await pool.query(`
            ALTER TABLE organizations
                ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
                ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
                ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false,
                ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
                ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
                ADD COLUMN IF NOT EXISTS smtp_from_email VARCHAR(255),
                ADD COLUMN IF NOT EXISTS smtp_from_name VARCHAR(255),
                ADD COLUMN IF NOT EXISTS smtp_enabled BOOLEAN DEFAULT false;

            CREATE TABLE IF NOT EXISTS email_logs (
                id BIGSERIAL PRIMARY KEY,
                organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
                to_email VARCHAR(255) NOT NULL,
                subject VARCHAR(255),
                status VARCHAR(50) DEFAULT 'sent',
                error_message TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_email_logs_org ON email_logs(organization_id, created_at DESC);
        `);
        schemaEnsured = true;
    } catch (e) {
        console.error('[Email] ensureEmailSchema error:', e.message);
    }
};

// GET /api/app/settings/email — get SMTP config (masked)
export const getEmailSettings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureEmailSchema();
        const cfg = await getOrgSmtpConfig(organization_id);
        res.json(cfg || { smtp_enabled: false });
    } catch (e) {
        console.error('[Email] getEmailSettings error:', e.message);
        res.json({ smtp_enabled: false });
    }
};

// PUT /api/app/settings/email — save SMTP config
export const saveEmailSettings = async (req, res) => {
    const { organization_id } = req.user;
    const cfg = req.body;
    try {
        await ensureEmailSchema();
        await saveOrgSmtpConfig(organization_id, cfg);
        res.json({ success: true });
    } catch (e) {
        console.error('[Email] saveEmailSettings error:', e.message);
        res.status(500).json({ error: e.message });
    }
};

// POST /api/app/settings/email/test — test SMTP connection
export const testEmailSettings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureEmailSchema();
        await testOrgSmtpConnection(organization_id);
        res.json({ success: true, message: 'Koneksi SMTP berhasil!' });
    } catch (e) {
        console.error('[Email] testEmailSettings error:', e.message);
        res.status(400).json({ error: e.message });
    }
};

// POST /api/app/email/send — send email to a contact
export const sendEmailToContact = async (req, res) => {
    const { organization_id } = req.user;
    const { contact_id, subject, html, text } = req.body;
    if (!contact_id || !subject || !html) {
        return res.status(400).json({ error: 'contact_id, subject, and html are required' });
    }
    try {
        await ensureEmailSchema();
        const contactRes = await pool.query(
            `SELECT name, email FROM contacts WHERE id = $1 AND organization_id = $2`,
            [contact_id, organization_id]
        );
        if (contactRes.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
        const contact = contactRes.rows[0];
        if (!contact.email) return res.status(400).json({ error: 'Contact has no email address' });

        await sendOrgEmail({ organizationId: organization_id, to: contact.email, subject, html, text });
        res.json({ success: true, message: `Email terkirim ke ${contact.email}` });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

// POST /api/app/email/send-draft — send to custom email address (manual entry)
export const sendEmailCustom = async (req, res) => {
    const { organization_id } = req.user;
    const { to, subject, html, text } = req.body;
    if (!to || !subject || !html) {
        return res.status(400).json({ error: 'to, subject, and html are required' });
    }
    try {
        await ensureEmailSchema();
        await sendOrgEmail({ organizationId: organization_id, to, subject, html, text });
        res.json({ success: true, message: `Email terkirim ke ${to}` });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

// GET /api/app/email/logs — email history
export const getEmailLogs = async (req, res) => {
    const { organization_id } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    try {
        await ensureEmailSchema();
        const logsRes = await pool.query(
            `SELECT id, to_email, subject, status, error_message, created_at
             FROM email_logs WHERE organization_id = $1
             ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [organization_id, limit, offset]
        );
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM email_logs WHERE organization_id = $1`,
            [organization_id]
        );
        res.json({ logs: logsRes.rows || [], total: parseInt(countRes.rows[0]?.count || 0) });
    } catch (e) {
        console.error('[Email] getEmailLogs error:', e.message);
        res.json({ logs: [], total: 0 });
    }
};