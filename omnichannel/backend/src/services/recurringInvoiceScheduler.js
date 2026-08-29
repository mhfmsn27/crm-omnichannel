/**
 * Recurring Invoices Scheduler
 * Automatically generates invoices for active recurring subscriptions on their next_run_date
 */
import cron from 'node-cron';
import pool from '../config/db.js';
import crypto from 'crypto';
import * as waService from './waGatewayService.js';

const generateToken = () => crypto.randomBytes(16).toString('hex');

export const processRecurringInvoices = async () => {
    console.log('[Recurring Invoices] Running recurring invoice generator...');
    try {
        const dueRecurring = await pool.query(
            `SELECT r.*, c.name as contact_name, c.phone_number as contact_phone, ws.session_id as wa_uuid
             FROM recurring_invoices r
             LEFT JOIN contacts c ON r.contact_id = c.id
             LEFT JOIN whatsapp_sessions ws ON ws.organization_id = r.organization_id AND ws.status = 'connected'
             WHERE r.status = 'active' AND r.next_run_date <= CURRENT_DATE`
        );

        if (dueRecurring.rows.length === 0) {
            console.log('[Recurring Invoices] No recurring subscriptions due for generation.');
            return;
        }

        console.log(`[Recurring Invoices] Processing ${dueRecurring.rows.length} due subscriptions...`);

        for (const rec of dueRecurring.rows) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                const prefix = 'INV';
                const invNumber = `${prefix}/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
                const token = generateToken();
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 7);

                // 1. Insert Invoice
                const invRes = await client.query(
                    `INSERT INTO invoices 
                     (organization_id, contact_id, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, notes, public_token, status, document_type, created_by, is_recurring, recurring_frequency, paid_amount, balance_due)
                     VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, 'unpaid', 'invoice', $10, true, $11, 0, $7)
                     RETURNING id`,
                    [rec.organization_id, rec.contact_id, invNumber, dueDate, rec.subtotal, rec.tax_amount, rec.total_amount, rec.notes, token, rec.created_by, rec.frequency]
                );
                const invoiceId = invRes.rows[0].id;

                // 2. Insert items
                const items = typeof rec.items === 'string' ? JSON.parse(rec.items) : (rec.items || []);
                for (const it of items) {
                    await client.query(
                        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [invoiceId, it.description || 'Subscription Item', it.quantity || 1, it.unit_price || 0, (it.quantity || 1) * (it.unit_price || 0)]
                    );
                }

                // 3. Compute next run date
                const nextDate = new Date();
                if (rec.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (rec.frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                else if (rec.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                else nextDate.setMonth(nextDate.getMonth() + 1); // default monthly

                // Check end date
                let newStatus = 'active';
                if (rec.end_date && nextDate > new Date(rec.end_date)) {
                    newStatus = 'completed';
                }

                await client.query(
                    `UPDATE recurring_invoices 
                     SET next_run_date = $1, last_generated_at = NOW(), generated_count = COALESCE(generated_count, 0) + 1, status = $2, updated_at = NOW() 
                     WHERE id = $3`,
                    [nextDate, newStatus, rec.id]
                );

                await client.query('COMMIT');

                // 4. Send WhatsApp Notification if enabled
                if (rec.auto_send_whatsapp && rec.contact_phone && rec.wa_uuid) {
                    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
                    const payUrl = `${appUrl}/p/invoice/${token}`;
                    const formattedTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(rec.total_amount);
                    const msg = `Halo kak *${rec.contact_name || 'Pelanggan'}*, tagihan langganan periode baru *${invNumber}* (${rec.title}) sebesar *${formattedTotal}* telah terbit.\n\nSilakan selesaikan pembayaran via link berikut:\n👉 ${payUrl}\n\nTerima kasih! 🙏`;

                    let phone = String(rec.contact_phone).replace(/[^0-9]/g, '');
                    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
                    await waService.sendText(rec.wa_uuid, phone, msg).catch(err => {
                        console.warn("[Recurring WA Dispatch Error]:", err.message);
                    });
                }

                console.log(`[Recurring Invoices] Generated invoice ${invNumber} for subscription "${rec.title}" (ID: ${rec.id})`);

            } catch (itemErr) {
                await client.query('ROLLBACK');
                console.error(`[Recurring Invoices] Failed generating for ID ${rec.id}:`, itemErr.message);
            } finally {
                client.release();
            }
        }

    } catch (err) {
        console.error('[Recurring Invoices] Cron failed:', err.message);
    }
};

export const initRecurringInvoiceScheduler = () => {
    // Run daily at 00:30 WIB
    cron.schedule('30 0 * * *', async () => {
        await processRecurringInvoices();
    }, {
        scheduled: true,
        timezone: 'Asia/Jakarta'
    });
    console.log('[Recurring Invoices] Scheduler initialized (runs at 00:30 WIB)');
};
