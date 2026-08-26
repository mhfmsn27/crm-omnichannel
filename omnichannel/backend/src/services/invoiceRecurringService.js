/**
 * Invoice Recurring Service
 * Auto-generates invoices from recurring templates (optional per org)
 */
import pool from '../config/db.js';
import * as waService from './waGatewayService.js';
import crypto from 'crypto';

const generateToken = () => crypto.randomBytes(16).toString('hex');

/**
 * Main cron function — called once daily
 */
export const runRecurringInvoices = async () => {
    try {
        // Find orgs that have recurring enabled
        const orgsRes = await pool.query(`
            SELECT s.organization_id
            FROM invoice_settings s
            WHERE s.recurring_enabled = true
        `);

        for (const org of orgsRes.rows) {
            await processOrgRecurring(org.organization_id);
        }
    } catch (err) {
        console.error('[RecurringInvoice] Cron error:', err.message);
    }
};

/**
 * Process recurring templates for a single org
 */
async function processOrgRecurring(organizationId) {
    const client = await pool.connect();
    try {
        // Get active templates that are due today or earlier
        const templates = await client.query(`
            SELECT rt.*, c.name as contact_name, c.phone_number
            FROM invoice_recurring_templates rt
            JOIN contacts c ON rt.contact_id = c.id
            WHERE rt.organization_id = $1
            AND rt.is_active = true
            AND rt.next_issue_date <= CURRENT_DATE
        `, [organizationId]);

        if (templates.rows.length === 0) return;

        const settings = await getOrgSettings(organizationId);
        const prefix = settings.prefix || 'INV';
        const taxRate = (settings.tax_percentage || 0) / 100;

        for (const template of templates.rows) {
            await client.query('BEGIN');

            try {
                const items = template.items || [];
                let subtotal = 0;

                const processedItems = items.map(item => {
                    const amount = (item.quantity || 1) * (item.unit_price || 0);
                    subtotal += amount;
                    return { ...item, amount };
                });

                const taxAmount = subtotal * taxRate;
                const totalAmount = subtotal + taxAmount;

                const invNumber = `${prefix}/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
                const token = generateToken();

                // Calculate due date
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (settings.due_days || 7));

                // Create invoice
                const invRes = await client.query(
                    `INSERT INTO invoices 
                     (organization_id, contact_id, invoice_number, issue_date, due_date, subtotal, tax_amount, total_amount, notes, public_token, status)
                     VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, 'unpaid')
                     RETURNING id`,
                    [organizationId, template.contact_id, invNumber, dueDate, subtotal, taxAmount, totalAmount, template.notes || '', token]
                );
                const invoiceId = invRes.rows[0].id;

                // Insert items
                for (const item of processedItems) {
                    await client.query(
                        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [invoiceId, item.description, item.quantity || 1, item.unit_price || 0, item.amount]
                    );
                }

                // Calculate next issue date
                const nextDate = calculateNextDate(template.next_issue_date, template.frequency);

                await client.query(
                    `UPDATE invoice_recurring_templates SET next_issue_date = $1 WHERE id = $2`,
                    [nextDate, template.id]
                );

                await client.query('COMMIT');

                console.log(`[RecurringInvoice] Created ${invNumber} for contact ${template.contact_id}`);

                // Auto-send via WA if enabled
                if (template.auto_send_wa) {
                    await sendInvoiceWA(organizationId, template.phone_number, invNumber, totalAmount, token);
                }

            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[RecurringInvoice] Template ${template.id} error:`, err.message);
            }
        }
    } catch (err) {
        console.error(`[RecurringInvoice] Org ${organizationId} error:`, err.message);
    } finally {
        client.release();
    }
}

/**
 * Calculate next issue date based on frequency
 */
function calculateNextDate(currentDate, frequency) {
    const date = new Date(currentDate);
    switch (frequency) {
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            date.setMonth(date.getMonth() + 1);
    }
    return date;
}

/**
 * Get org invoice settings
 */
async function getOrgSettings(orgId) {
    const res = await pool.query('SELECT * FROM invoice_settings WHERE organization_id = $1', [orgId]);
    return res.rows[0] || {};
}

/**
 * Send invoice notification via WA
 */
async function sendInvoiceWA(orgId, phone, invoiceNumber, amount, token) {
    try {
        const devRes = await pool.query(
            "SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' LIMIT 1",
            [orgId]
        );
        if (devRes.rows.length === 0) return;

        let cleanPhone = String(phone).replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
        const message = `Halo, berikut adalah tagihan Anda #${invoiceNumber} sebesar Rp ${parseInt(amount).toLocaleString('id-ID')}.\n\nSilakan klik link berikut untuk detail dan pembayaran:\n${appUrl}/p/invoice/${token}`;

        await waService.sendText(devRes.rows[0].session_id, cleanPhone, message);
    } catch (err) {
        console.error('[RecurringInvoice] WA send error:', err.message);
    }
}
