/**
 * Automated Invoice Dunning / Due Payment Reminder Scheduler
 * Checks unpaid / partially paid invoices and dispatches polite WhatsApp reminders
 * Runs during human active morning hours (09:00 WIB)
 */
import cron from 'node-cron';
import pool from '../config/db.js';
import * as waService from './waGatewayService.js';

export const processDunningReminders = async () => {
    console.log('[Invoice Dunning] Checking unpaid invoices for automated payment reminders...');
    try {
        // Query invoices that:
        // 1. Are unpaid or partially_paid
        // 2. Are of document_type = 'invoice'
        // 3. Due in 3 days (H-3), due today (H-0), or overdue by 3 days (H+3)
        // 4. Have not received dunning today (last_dunning_at is NULL or < CURRENT_DATE)
        const candidates = await pool.query(`
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone, 
                   ws.session_id as wa_uuid, s.reminder_enabled, s.reminder_days_before, s.reminder_days_after
            FROM invoices i
            JOIN contacts c ON i.contact_id = c.id
            JOIN invoice_settings s ON s.organization_id = i.organization_id
            LEFT JOIN whatsapp_sessions ws ON ws.organization_id = i.organization_id AND ws.status = 'connected'
            WHERE i.status IN ('unpaid', 'partially_paid', 'sent')
              AND i.document_type = 'invoice'
              AND (s.reminder_enabled IS TRUE OR s.reminder_enabled IS NULL)
              AND i.due_date IS NOT NULL
              AND (
                  i.due_date = CURRENT_DATE + INTERVAL '3 days' OR
                  i.due_date = CURRENT_DATE OR
                  i.due_date = CURRENT_DATE - INTERVAL '3 days'
              )
              AND (i.last_dunning_at IS NULL OR i.last_dunning_at < CURRENT_DATE)
            LIMIT 50
        `);

        if (candidates.rows.length === 0) {
            console.log('[Invoice Dunning] No invoices requiring automated reminder today.');
            return;
        }

        console.log(`[Invoice Dunning] Dispatching reminders for ${candidates.rows.length} invoices...`);

        const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

        for (const inv of candidates.rows) {
            if (!inv.contact_phone || !inv.wa_uuid) continue;

            const payUrl = `${appUrl}/p/invoice/${inv.public_token}`;
            const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.total_amount);
            const formattedBalance = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(inv.balance_due || inv.total_amount);

            let reminderMsg = `Halo kak *${inv.contact_name || 'Pelanggan'}*, mengingatkan tagihan faktur *${inv.invoice_number}* sebesar *${formattedBalance}* (Total: ${formattedTotal}) dengan tanggal jatuh tempo: *${new Date(inv.due_date).toLocaleDateString('id-ID')}*.\n\nSilakan selesaikan pembayaran via tautan resmi berikut:\n👉 ${payUrl}\n\nTerima kasih atas kerja samanya! 🙏`;

            let phone = String(inv.contact_phone).replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) phone = '62' + phone.slice(1);

            try {
                await waService.sendText(inv.wa_uuid, phone, reminderMsg);
                await pool.query(
                    `UPDATE invoices 
                     SET dunning_count = COALESCE(dunning_count, 0) + 1, last_dunning_at = NOW(), updated_at = NOW() 
                     WHERE id = $1`,
                    [inv.id]
                );
                console.log(`[Invoice Dunning] Sent reminder for ${inv.invoice_number} to ${phone}`);
            } catch (sendErr) {
                console.warn(`[Invoice Dunning] Failed sending for ${inv.invoice_number}:`, sendErr.message);
            }
        }

    } catch (err) {
        console.error('[Invoice Dunning] Scheduler error:', err.message);
    }
};

export const initInvoiceDunningScheduler = () => {
    // Run daily at 09:00 WIB (morning human active hours)
    cron.schedule('0 9 * * *', async () => {
        await processDunningReminders();
    }, {
        scheduled: true,
        timezone: 'Asia/Jakarta'
    });
    console.log('[Invoice Dunning] Scheduler initialized (runs at 09:00 WIB)');
};
