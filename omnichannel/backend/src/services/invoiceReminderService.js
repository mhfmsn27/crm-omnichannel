/**
 * Invoice Reminder & Overdue Service
 * - Overdue detection: Always active (updates status only)
 * - Auto-reminder: Optional (toggle per org, sends WA messages)
 */
import pool from '../config/db.js';
import * as waService from './waGatewayService.js';

/**
 * Main cron function — called periodically (e.g. every hour)
 */
export const runInvoiceReminders = async () => {
    try {
        // 1. OVERDUE DETECTION (always active for all orgs)
        const overdueRes = await pool.query(`
            UPDATE invoices SET status = 'overdue', updated_at = NOW()
            WHERE status IN ('unpaid', 'sent') AND due_date < NOW()
            RETURNING id, invoice_number, organization_id
        `);
        if (overdueRes.rowCount > 0) {
            console.log(`[InvoiceReminder] Marked ${overdueRes.rowCount} invoices as overdue`);
        }

        // 2. AUTO-REMINDER (only for orgs that have it enabled)
        const orgsRes = await pool.query(`
            SELECT s.organization_id, s.reminder_days_before, s.reminder_days_after,
                   s.reminder_message_template
            FROM invoice_settings s
            WHERE s.reminder_enabled = true
        `);

        for (const org of orgsRes.rows) {
            await processOrgReminders(org);
        }

    } catch (err) {
        console.error('[InvoiceReminder] Cron error:', err.message);
    }
};

/**
 * Process reminders for a single organization
 */
async function processOrgReminders(org) {
    const { organization_id, reminder_days_before = 3, reminder_days_after = 3 } = org;

    try {
        // Get connected WA device for this org
        const devRes = await pool.query(
            "SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' LIMIT 1",
            [organization_id]
        );
        if (devRes.rows.length === 0) return; // No connected device, skip

        const sessionId = devRes.rows[0].session_id;
        const orgSettings = await getOrgSettings(organization_id);

        // A. Before due date reminders
        const beforeRes = await pool.query(`
            SELECT i.*, c.phone_number, c.name as contact_name
            FROM invoices i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.organization_id = $1
            AND i.status IN ('unpaid', 'sent')
            AND i.reminder_sent_at IS NULL
            AND i.due_date IS NOT NULL
            AND i.due_date BETWEEN NOW() AND NOW() + ($2 || ' days')::interval
        `, [organization_id, reminder_days_before]);

        for (const inv of beforeRes.rows) {
            const daysLeft = Math.ceil((new Date(inv.due_date) - new Date()) / (1000 * 60 * 60 * 24));
            const message = buildReminderMessage('before', inv, orgSettings, daysLeft);

            await sendReminderWA(sessionId, inv.phone_number, message);
            await pool.query('UPDATE invoices SET reminder_sent_at = NOW() WHERE id = $1', [inv.id]);
        }

        // B. Overdue reminders
        const afterRes = await pool.query(`
            SELECT i.*, c.phone_number, c.name as contact_name
            FROM invoices i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.organization_id = $1
            AND i.status = 'overdue'
            AND i.overdue_sent_at IS NULL
            AND i.due_date IS NOT NULL
            AND i.due_date < NOW() - ($2 || ' days')::interval
        `, [organization_id, 0]); // Send immediately when overdue

        for (const inv of afterRes.rows) {
            const daysOverdue = Math.ceil((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
            if (daysOverdue > reminder_days_after) continue; // Don't send if too many days past

            const message = buildReminderMessage('overdue', inv, orgSettings, daysOverdue);

            await sendReminderWA(sessionId, inv.phone_number, message);
            await pool.query('UPDATE invoices SET overdue_sent_at = NOW() WHERE id = $1', [inv.id]);
        }

    } catch (err) {
        console.error(`[InvoiceReminder] Org ${organization_id} error:`, err.message);
    }
}

/**
 * Build reminder message
 */
function buildReminderMessage(type, invoice, settings, days) {
    const amount = parseInt(invoice.total_amount).toLocaleString('id-ID');
    const orgName = settings?.org_name || 'Admin';
    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    const link = `${appUrl}/p/invoice/${invoice.public_token}`;

    if (type === 'before') {
        return `⏰ *Pengingat Tagihan*\n\nHalo ${invoice.contact_name},\n\nInvoice #${invoice.invoice_number} sebesar *Rp ${amount}* akan jatuh tempo dalam *${days} hari*.\n\nSilakan lakukan pembayaran sebelum tanggal ${new Date(invoice.due_date).toLocaleDateString('id-ID')}.\n\n🔗 Detail & Bayar: ${link}\n\nTerima kasih,\n${orgName}`;
    } else {
        return `⚠️ *Invoice Jatuh Tempo*\n\nHalo ${invoice.contact_name},\n\nInvoice #${invoice.invoice_number} sebesar *Rp ${amount}* telah melewati tanggal jatuh tempo *${days} hari* yang lalu.\n\nMohon segera lakukan pembayaran.\n\n🔗 Detail & Bayar: ${link}\n\nTerima kasih,\n${orgName}`;
    }
}

/**
 * Get org invoice settings
 */
async function getOrgSettings(orgId) {
    const res = await pool.query('SELECT * FROM invoice_settings WHERE organization_id = $1', [orgId]);
    return res.rows[0] || {};
}

/**
 * Send WA reminder (best-effort)
 */
async function sendReminderWA(sessionId, phone, message) {
    try {
        let cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

        await waService.sendText(sessionId, cleanPhone, message);
    } catch (err) {
        console.error('[InvoiceReminder] WA send error:', err.message);
    }
}
