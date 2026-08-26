import pool from '../config/db.js';
import { generateInvoicePdf } from '../services/pdfService.js';
import * as waService from '../services/waGatewayService.js';
import crypto from 'crypto';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { analyzeAndGenerateInvoice, createFromDraft } from '../services/aiInvoiceGenerator.js';
import * as PaymentGatewayService from '../services/PaymentGatewayService.js';
import * as qrisService from '../services/qrisService.js';

const generateToken = () => crypto.randomBytes(16).toString('hex');

// --- HELPERS ---
const getSettingsInternal = async (orgId) => {
    const res = await pool.query('SELECT * FROM invoice_settings WHERE organization_id = $1', [orgId]);
    if (res.rows.length === 0) return {};
    return res.rows[0];
};

// --- ENDPOINTS ---

// NEW: Check Feature Access
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const access = await checkFeatureAccess(organization_id, 'fin_invoice');
        res.json({
            allowed: access.allowed,
            locked: !access.allowed,
            message: access.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getSettings = async (req, res) => {
    try {
        const settings = await getSettingsInternal(req.user.organization_id);
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateSettings = async (req, res) => {
    const { prefix, footer_note, tax_percentage, due_days, org_name, org_address, org_email, org_phone, theme_color,
            reminder_enabled, reminder_days_before, reminder_days_after, reminder_message_template, recurring_enabled } = req.body;
    const { organization_id } = req.user;

    // Sanitize numeric inputs
    const safeTax = parseInt(tax_percentage) || 0;
    const safeDue = parseInt(due_days) || 7;
    const safeReminderBefore = parseInt(reminder_days_before) || 3;
    const safeReminderAfter = parseInt(reminder_days_after) || 3;

    try {
        await pool.query(
            `INSERT INTO invoice_settings (organization_id, prefix, footer_note, tax_percentage, due_days, org_name, org_address, org_email, org_phone, theme_color,
                                            reminder_enabled, reminder_days_before, reminder_days_after, reminder_message_template, recurring_enabled, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
             ON CONFLICT (organization_id) 
             DO UPDATE SET prefix=EXCLUDED.prefix, footer_note=EXCLUDED.footer_note, tax_percentage=EXCLUDED.tax_percentage, due_days=EXCLUDED.due_days, 
                           org_name=EXCLUDED.org_name, org_address=EXCLUDED.org_address, org_email=EXCLUDED.org_email, org_phone=EXCLUDED.org_phone, theme_color=EXCLUDED.theme_color,
                           reminder_enabled=EXCLUDED.reminder_enabled, reminder_days_before=EXCLUDED.reminder_days_before, reminder_days_after=EXCLUDED.reminder_days_after,
                           reminder_message_template=EXCLUDED.reminder_message_template, recurring_enabled=EXCLUDED.recurring_enabled, updated_at=NOW()`,
            [organization_id, prefix, footer_note, safeTax, safeDue, org_name, org_address, org_email, org_phone, theme_color || '#4f46e5',
             reminder_enabled || false, safeReminderBefore, safeReminderAfter, reminder_message_template || null, recurring_enabled || false]
        );
        res.json({ message: 'Settings updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const uploadLogo = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });

    let folder = '';
    if (req.file.destination && req.file.destination.includes('system')) {
        folder = 'system/';
    } else if (req.file.destination && req.file.destination.includes('cms')) {
        folder = 'cms/';
    }

    const url = `/uploads/${folder}${req.file.filename}`;

    try {
        await pool.query(
            `INSERT INTO invoice_settings (organization_id, logo_url) VALUES ($1, $2)
             ON CONFLICT (organization_id) DO UPDATE SET logo_url = EXCLUDED.logo_url`,
            [req.user.organization_id, url]
        );
        res.json({ url });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getInvoices = async (req, res) => {
    const { status, search, page = 1, limit = 20, document_type } = req.query;
    const { organization_id } = req.user;
    try {
        const offset = (page - 1) * limit;
        let query = `
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone
            FROM invoices i
            LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE i.organization_id = $1
        `;
        const params = [organization_id];
        let idx = 2;

        if (document_type && document_type !== 'all') {
            query += ` AND i.document_type = $${idx}`;
            params.push(document_type);
            idx++;
        }
        if (status && status !== 'all') {
            query += ` AND i.status = $${idx}`;
            params.push(status);
            idx++;
        }
        if (search) {
            query += ` AND (i.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx})`;
            params.push(`%${search}%`);
            idx++;
        }

        query += ` ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Stats
        const statsRes = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
                COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_count,
                COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) as total_revenue
             FROM invoices WHERE organization_id = $1`,
            [organization_id]
        );

        res.json({
            data: result.rows,
            stats: statsRes.rows[0]
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getInvoiceDetail = async (req, res) => {
    const { id } = req.params;
    try {
        const invRes = await pool.query(`
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone, c.email as contact_email
            FROM invoices i
            LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = $1 AND i.organization_id = $2
        `, [id, req.user.organization_id]);

        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);

        res.json({ ...invRes.rows[0], items: itemsRes.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const createInvoice = async (req, res) => {
    const { contact_id, items, notes, issue_date, due_date, document_type = 'invoice', valid_until, shipping_cost = 0, courier, tracking_number } = req.body;
    const { organization_id, id: userId } = req.user;

    // 1. PAYWALL CHECK
    try {
        const access = await checkFeatureAccess(organization_id, 'fin_invoice');
        if (!access.allowed) {
            return res.status(403).json({
                error: "Fitur Invoicing tidak aktif. Silakan upgrade paket.",
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Access Check Failed" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get Settings
        const settings = await getSettingsInternal(organization_id);
        const prefix = document_type === 'quotation' ? 'QUO' : (settings.prefix || 'INV');
        const taxRate = (settings.tax_percentage || 0) / 100;

        // 2. Generate Number
        const invNumber = `${prefix}/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;

        // 3. Calculate Totals & COGS
        let subtotal = 0;
        let totalCogs = 0;
        const processedItems = [];

        for (const item of items) {
            const amount = item.quantity * item.unit_price;
            subtotal += amount;

            let productId = item.product_id || null;
            let prodQuery = '';
            let prodParams = [];

            if (productId) {
                prodQuery = 'SELECT id, cost_price FROM products WHERE id = $1 AND organization_id = $2 LIMIT 1';
                prodParams = [productId, organization_id];
            } else {
                prodQuery = 'SELECT id, cost_price FROM products WHERE name = $1 AND organization_id = $2 LIMIT 1';
                prodParams = [item.description, organization_id];
            }

            const prodRes = await client.query(prodQuery, prodParams);
            if (prodRes.rows.length > 0) {
                productId = prodRes.rows[0].id;
                totalCogs += parseFloat(prodRes.rows[0].cost_price || 0) * item.quantity;
            }

            processedItems.push({ ...item, amount, product_id: productId });
        }

        const taxAmount = subtotal * taxRate;
        const shippingVal = parseFloat(shipping_cost || 0);
        const totalAmount = subtotal + taxAmount + shippingVal;

        const dpAmount = parseFloat(req.body.dp_amount || 0);

        // Calculate due_date if not provided
        let finalDueDate = due_date;
        if (!finalDueDate) {
            const parsedIssueDate = issue_date ? new Date(issue_date) : new Date();
            finalDueDate = new Date(parsedIssueDate);
            finalDueDate.setDate(finalDueDate.getDate() + (settings.due_days || 7));
        }

        // 4. Insert Header
        const invRes = await client.query(
            `INSERT INTO invoices 
             (organization_id, contact_id, invoice_number, issue_date, due_date, subtotal, tax_amount, dp_amount, total_amount, notes, public_token, status, document_type, valid_until, created_by, shipping_cost, courier, tracking_number, total_cogs)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'unpaid', $12, $13, $14, $15, $16, $17, $18)
             RETURNING id`,
            [organization_id, contact_id, invNumber, issue_date || new Date(), finalDueDate, subtotal, taxAmount, dpAmount, totalAmount, notes, generateToken(), document_type, valid_until || null, userId, shippingVal, courier || null, tracking_number || null, totalCogs]
        );
        const invoiceId = invRes.rows[0].id;

        // 5. Insert Items
        for (const item of processedItems) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount, product_id) VALUES ($1, $2, $3, $4, $5, $6)`,
                [invoiceId, item.description, item.quantity, item.unit_price, item.amount, item.product_id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ id: invoiceId, invoice_number: invNumber });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const updateInvoice = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    try {
        const currentInv = await pool.query('SELECT status FROM invoices WHERE id = $1 AND organization_id = $2', [id, req.user.organization_id]);
        if (currentInv.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        
        await pool.query(
            'UPDATE invoices SET status = COALESCE($1, status), notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3 AND organization_id = $4',
            [status, notes, id, req.user.organization_id]
        );

        // Deduct stock if manually marked as paid
        if (status === 'paid' && currentInv.rows[0].status !== 'paid') {
            const items = await pool.query('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1 AND product_id IS NOT NULL', [id]);
            for (const item of items.rows) {
                await pool.query('UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock IS NOT NULL', [item.quantity, item.product_id]);
            }
        }

        res.json({ message: 'Updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteInvoice = async (req, res) => {
    try {
        await pool.query('DELETE FROM invoices WHERE id = $1 AND organization_id = $2', [req.params.id, req.user.organization_id]);
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- BULK ---
export const createBulkInvoices = async (req, res) => {
    const { batch_name, items } = req.body; // items: [{ phone, name, amount, desc, date }]
    const { organization_id } = req.user;

    // 1. PAYWALL CHECK
    try {
        const access = await checkFeatureAccess(organization_id, 'fin_invoice');
        if (!access.allowed) {
            return res.status(403).json({
                error: "Fitur Invoicing tidak aktif. Silakan upgrade paket.",
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Access Check Failed" });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const settings = await getSettingsInternal(organization_id);
        const prefix = settings.prefix || 'INV';
        const batchId = `BATCH-${Date.now()}`;

        const createdInvoices = [];

        for (const row of items) {
            let contactId;
            // 1. Resolve Contact
            let cleanPhone = String(row.phone).replace(/[^0-9]/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
            else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

            const contactCheck = await client.query('SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2', [organization_id, cleanPhone]);

            if (contactCheck.rows.length > 0) {
                contactId = contactCheck.rows[0].id;
            } else {
                const newC = await client.query(
                    `INSERT INTO contacts (organization_id, name, phone_number, source) VALUES ($1, $2, $3, 'invoice_import') RETURNING id`,
                    [organization_id, row.name || cleanPhone, cleanPhone]
                );
                contactId = newC.rows[0].id;
            }

            // 2. Create Invoice
            const amount = parseFloat(row.amount || 0);
            const desc = row.desc || 'Service Fee';
            const invNumber = `${prefix}/${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
            const token = generateToken();

            const dueDate = row.date ? new Date(row.date) : new Date();
            dueDate.setDate(dueDate.getDate() + (settings.due_days || 7));

            const invRes = await client.query(
                `INSERT INTO invoices (organization_id, contact_id, invoice_number, subtotal, total_amount, public_token, batch_id, status, issue_date, due_date)
                 VALUES ($1, $2, $3, $4, $4, $5, $6, 'unpaid', NOW(), $7) RETURNING id`,
                [organization_id, contactId, invNumber, amount, token, batchId, dueDate]
            );

            // 3. Item
            await client.query(
                `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES ($1, $2, 1, $3, $3)`,
                [invRes.rows[0].id, desc, amount]
            );

            createdInvoices.push({
                contact_id: contactId,
                invoice_link: `${process.env.APP_URL.replace(/\/$/, '')}/p/invoice/${token}`,
                amount: amount
            });
        }

        await client.query('COMMIT');

        // Return batch ID for Broadcast to pick up
        res.json({
            success: true,
            batch_id: batchId,
            count: createdInvoices.length,
            sample_link: createdInvoices[0]?.invoice_link
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// --- AI INVOICE GENERATOR ---
export const generateInvoiceDraft = async (req, res) => {
    const { conversation_id } = req.body;
    const { organization_id } = req.user;

    if (!conversation_id) {
        return res.status(400).json({ error: 'Conversation ID is required' });
    }

    try {
        const draft = await analyzeAndGenerateInvoice(conversation_id, organization_id);
        res.json(draft);
    } catch (error) {
        console.error('[AI Invoice] Generate Error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createInvoiceFromDraft = async (req, res) => {
    const { draft } = req.body;
    const { organization_id } = req.user;

    if (!draft || !draft.items || draft.items.length === 0) {
        return res.status(400).json({ error: 'Invalid draft data' });
    }

    try {
        const result = await createFromDraft(organization_id, {
            contact_id: draft.contact_id,
            items: draft.items,
            subtotal: draft.subtotal,
            tax_amount: draft.tax_amount,
            total_amount: draft.total_amount,
            notes: draft.notes,
            suggested_due_days: draft.suggested_due_days,
            conversation_id: draft.conversation_id
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('[AI Invoice] Create Error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ... (markAsPaid, sendInvoiceWA, downloadPdf, getPublicInvoice remain unchanged)
export const markAsPaid = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { amount, notes } = req.body;
    try {
        const invRes = await pool.query('SELECT total_amount FROM invoices WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const paidAmount = amount ? parseFloat(amount) : parseFloat(invRes.rows[0].total_amount);

        await pool.query(
            "UPDATE invoices SET status = 'paid', paid_at = NOW(), paid_amount = COALESCE(paid_amount, 0) + $3, updated_at = NOW() WHERE id = $1 AND organization_id = $2",
            [id, organization_id, paidAmount]
        );

        // Record in payment history
        await pool.query(
            `INSERT INTO invoice_payments (invoice_id, amount, payment_method, notes, created_by, paid_at)
             VALUES ($1, $2, 'manual', $3, $4, NOW())`,
            [id, paidAmount, notes || 'Marked as paid manually', req.user.id]
        );

        res.json({ message: 'Marked as paid' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const sendInvoiceWA = async (req, res) => {
    const { id } = req.params;
    const { device_id } = req.body; // Optional: Specific device to send from
    const { organization_id } = req.user;

    try {
        // Get Invoice Data
        const invRes = await pool.query(`
            SELECT i.*, c.phone_number 
            FROM invoices i
            JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = $1 AND i.organization_id = $2
        `, [id, organization_id]);

        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        const invoice = invRes.rows[0];

        // Determine Session ID
        let sessionId;

        if (device_id) {
            // Verify device ownership and connection
            const devRes = await pool.query(
                "SELECT session_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2 AND status = 'connected'",
                [device_id, organization_id]
            );
            if (devRes.rows.length === 0) return res.status(400).json({ error: "Selected device not connected or invalid" });
            sessionId = devRes.rows[0].session_id;
        } else {
            // Fallback: Get any connected device
            const devRes = await pool.query(
                "SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' LIMIT 1",
                [organization_id]
            );
            if (devRes.rows.length === 0) return res.status(400).json({ error: "No connected WhatsApp device" });
            sessionId = devRes.rows[0].session_id;
        }

        const message = `Halo, berikut adalah tagihan Anda #${invoice.invoice_number} sebesar Rp ${parseInt(invoice.total_amount).toLocaleString('id-ID')}.\n\nSilakan klik link berikut untuk detail dan pembayaran:\n${process.env.APP_URL.replace(/\/$/, '')}/p/invoice/${invoice.public_token}`;

        await waService.sendText(sessionId, invoice.phone_number, message);
        await pool.query("UPDATE invoices SET status = 'sent' WHERE id = $1 AND status = 'draft'", [id]);

        res.json({ message: 'Sent via WhatsApp' });
    } catch (err) {
        console.error("Send Invoice Error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const getInvoiceQris = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const invRes = await pool.query(
            `SELECT i.*, o.name as org_name, c.name as contact_name, c.phone_number
             FROM invoices i
             JOIN organizations o ON i.organization_id = o.id
             LEFT JOIN contacts c ON i.contact_id = c.id
             WHERE i.id = $1 AND i.organization_id = $2`,
            [id, organization_id]
        );
        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        const invoice = invRes.rows[0];

        const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const qrisData = await qrisService.generateInvoiceQris({
            invoice,
            appUrl
        });

        res.json({
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            total_amount: invoice.total_amount,
            qris_url: qrisData.publicUrl,
            qris_data_url: qrisData.dataUrl
        });
    } catch (err) {
        console.error('[QRIS] getInvoiceQris error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const sendInvoiceQrisWA = async (req, res) => {
    const { id } = req.params;
    const { device_id } = req.body;
    const { organization_id } = req.user;

    try {
        const invRes = await pool.query(
            `SELECT i.*, c.phone_number, c.name as contact_name, o.name as org_name
             FROM invoices i
             JOIN contacts c ON i.contact_id = c.id
             JOIN organizations o ON i.organization_id = o.id
             WHERE i.id = $1 AND i.organization_id = $2`,
            [id, organization_id]
        );
        if (invRes.rows.length === 0) return res.status(404).json({ error: "Invoice or Contact not found" });
        const invoice = invRes.rows[0];

        if (!invoice.phone_number) {
            return res.status(400).json({ error: "Contact phone number is missing" });
        }

        let sessionId;
        if (device_id) {
            const devRes = await pool.query(
                "SELECT session_id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2 AND status = 'connected'",
                [device_id, organization_id]
            );
            if (devRes.rows.length === 0) return res.status(400).json({ error: "Selected device not connected or invalid" });
            sessionId = devRes.rows[0].session_id;
        } else {
            const devRes = await pool.query(
                "SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' LIMIT 1",
                [organization_id]
            );
            if (devRes.rows.length === 0) return res.status(400).json({ error: "No connected WhatsApp device" });
            sessionId = devRes.rows[0].session_id;
        }

        const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        const qrisData = await qrisService.generateInvoiceQris({
            invoice,
            appUrl
        });

        const caption = qrisService.formatQrisWhatsAppMessage({
            invoice,
            orgName: invoice.org_name,
            appUrl
        });

        await waService.sendMedia(sessionId, invoice.phone_number, qrisData.publicUrl, caption);
        await pool.query("UPDATE invoices SET status = 'sent' WHERE id = $1 AND status = 'draft'", [id]);

        res.json({
            success: true,
            message: 'Dynamic QRIS Invoice sent successfully via WhatsApp',
            qris_url: qrisData.publicUrl
        });
    } catch (err) {
        console.error('[QRIS] sendInvoiceQrisWA error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const downloadPdf = async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch Data
        const invRes = await pool.query(`
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone
            FROM invoices i LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE i.id = $1 AND i.organization_id = $2
        `, [id, req.user.organization_id]);

        if (invRes.rows.length === 0) return res.status(404).send("Not found");

        const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
        const settings = await getSettingsInternal(req.user.organization_id);

        const buffer = await generateInvoicePdf({ ...invRes.rows[0], items: itemsRes.rows }, settings);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invRes.rows[0].invoice_number}.pdf`);
        res.send(buffer);

    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- PUBLIC ACCESS ---
export const getPublicInvoice = async (req, res) => {
    const { token } = req.params;
    try {
        const invRes = await pool.query(`
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone, c.email as contact_email,
                   o.name as org_name_default
            FROM invoices i
            LEFT JOIN contacts c ON i.contact_id = c.id
            JOIN organizations o ON i.organization_id = o.id
            WHERE i.public_token = $1
        `, [token]);

        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

        const invoice = invRes.rows[0];
        const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
        const settings = await getSettingsInternal(invoice.organization_id);

        // Check if org has an active payment gateway
        const gwRes = await pool.query(
            'SELECT gateway_type FROM invoice_payment_gateways WHERE organization_id = $1 AND is_default = true AND is_active = true LIMIT 1',
            [invoice.organization_id]
        );
        const hasGateway = gwRes.rows.length > 0;

        // Payment history
        const paymentsRes = await pool.query(
            'SELECT amount, payment_method, reference_id, notes, paid_at FROM invoice_payments WHERE invoice_id = $1 ORDER BY paid_at DESC',
            [invoice.id]
        );

        // Use custom org name if set in invoice settings, else default org name
        const finalOrgName = settings.org_name || invoice.org_name_default;

        const appUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
        let qrisData = null;
        try {
            qrisData = await qrisService.generateInvoiceQris({ invoice, appUrl });
        } catch (qrErr) {
            console.error('[QRIS] Public generation error:', qrErr.message);
        }

        res.json({
            invoice: { ...invoice, items: itemsRes.rows, payments: paymentsRes.rows },
            qris: qrisData ? { url: qrisData.publicUrl, data_url: qrisData.dataUrl } : null,
            settings: {
                logo_url: settings.logo_url,
                footer_note: settings.footer_note,
                org_name: finalOrgName,
                org_address: settings.org_address,
                org_email: settings.org_email,
                org_phone: settings.org_phone
            },
            org_name: finalOrgName,
            has_gateway: hasGateway
        });

    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- PUBLIC PDF DOWNLOAD (no auth required) ---
export const publicDownloadPdf = async (req, res) => {
    const { token } = req.params;
    try {
        const invRes = await pool.query(`
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone
            FROM invoices i LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE i.public_token = $1
        `, [token]);

        if (invRes.rows.length === 0) return res.status(404).send('Not found');

        const invoice = invRes.rows[0];
        const itemsRes = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
        const settings = await getSettingsInternal(invoice.organization_id);

        const buffer = await generateInvoicePdf({ ...invoice, items: itemsRes.rows }, settings);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.invoice_number}.pdf`);
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// --- PUBLIC PAY INVOICE (creates payment link via gateway) ---
export const publicPayInvoice = async (req, res) => {
    const { token } = req.params;
    try {
        // Get invoice by public token
        const invRes = await pool.query(`
            SELECT i.*, c.name as contact_name, c.phone_number as contact_phone, c.email as contact_email
            FROM invoices i
            LEFT JOIN contacts c ON i.contact_id = c.id
            WHERE i.public_token = $1
        `, [token]);

        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
        const invoice = invRes.rows[0];

        if (invoice.status === 'paid') {
            return res.status(400).json({ error: 'Invoice sudah dibayar' });
        }

        // If payment_url already exists and not expired, return it
        if (invoice.payment_url) {
            return res.json({ payment_url: invoice.payment_url });
        }

        // Get active gateway for this org
        const gateway = await PaymentGatewayService.getActiveGateway(invoice.organization_id);
        if (!gateway) {
            return res.status(400).json({ error: 'Pembayaran online belum dikonfigurasi' });
        }

        // Calculate remaining amount (support partial payments)
        const paidSoFar = parseFloat(invoice.paid_amount || 0);
        const remaining = Math.max(0, parseFloat(invoice.total_amount) - paidSoFar);

        if (remaining <= 0) {
            return res.status(400).json({ error: 'Invoice sudah lunas' });
        }

        const externalId = `inv-${invoice.id}-${crypto.randomBytes(4).toString('hex')}`;
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');

        const result = await gateway.createPaymentLink({
            external_id: externalId,
            amount: Math.round(remaining),
            description: `Invoice #${invoice.invoice_number}`,
            customer_name: invoice.contact_name || 'Customer',
            customer_email: invoice.contact_email || undefined,
            customer_phone: invoice.contact_phone || undefined,
            success_redirect_url: `${appUrl}/p/invoice/${token}?status=success`,
            items: [{ name: `Invoice #${invoice.invoice_number}`, quantity: 1, price: Math.round(remaining) }]
        });

        // Save payment URL to invoice
        await pool.query(
            `UPDATE invoices SET payment_url = $1, gateway_invoice_id = $2, payment_gateway = $3, updated_at = NOW() WHERE id = $4`,
            [result.payment_url, result.gateway_invoice_id, gateway.getDisplayName().toLowerCase(), invoice.id]
        );

        res.json({ payment_url: result.payment_url });
    } catch (err) {
        console.error('[PublicPay] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// --- PAYMENT HISTORY ---
export const getPaymentHistory = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        // Verify invoice belongs to org
        const check = await pool.query('SELECT id FROM invoices WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Not found' });

        const result = await pool.query(
            `SELECT ip.*, u.name as created_by_name
             FROM invoice_payments ip
             LEFT JOIN users u ON ip.created_by = u.id
             WHERE ip.invoice_id = $1
             ORDER BY ip.paid_at DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const convertToInvoice = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const invRes = await pool.query(
            "UPDATE invoices SET document_type = 'invoice', invoice_number = REPLACE(invoice_number, 'QUO/', 'INV/'), updated_at = NOW() WHERE id = $1 AND organization_id = $2 RETURNING *",
            [id, organization_id]
        );
        if (invRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ message: 'Converted', data: invRes.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getSalesKpi = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE document_type = 'invoice' AND status = 'paid') as won_deals,
                COUNT(*) FILTER (WHERE document_type = 'invoice' AND status IN ('unpaid', 'sent')) as pending_deals,
                COUNT(*) FILTER (WHERE document_type = 'quotation') as open_quotations,
                COALESCE(SUM(total_amount) FILTER (WHERE document_type = 'invoice' AND status = 'paid'), 0) as total_revenue,
                COALESCE(SUM(total_cogs) FILTER (WHERE document_type = 'invoice' AND status = 'paid'), 0) as total_cogs
            FROM invoices 
            WHERE organization_id = $1
        `, [organization_id]);

        const agentStats = await pool.query(`
            SELECT 
                u.id,
                u.name,
                COUNT(i.id) as deals_closed,
                COALESCE(SUM(i.total_amount), 0) as revenue
            FROM invoices i
            JOIN users u ON i.created_by = u.id
            WHERE i.organization_id = $1 AND i.status = 'paid' AND i.document_type = 'invoice'
            GROUP BY u.id, u.name
            ORDER BY revenue DESC
            LIMIT 5
        `, [organization_id]);

        // Weekly revenue trend (last 7 days)
        const trend = await pool.query(`
            WITH dates AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date AS date
            )
            SELECT 
                d.date,
                COALESCE(SUM(i.total_amount), 0) as revenue
            FROM dates d
            LEFT JOIN invoices i ON DATE(i.created_at) = d.date 
                AND i.organization_id = $1 
                AND i.status = 'paid' 
                AND i.document_type = 'invoice'
            GROUP BY d.date
            ORDER BY d.date ASC
        `, [organization_id]);

        res.json({
            overview: stats.rows[0],
            topAgents: agentStats.rows,
            trend: trend.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- PAYMENT GATEWAY CONFIG ---
export const getGatewayConfigs = async (req, res) => {
    try {
        const configs = await PaymentGatewayService.getGatewayConfigs(req.user.organization_id);
        const supported = PaymentGatewayService.getSupportedGateways();
        res.json({ configs, supported });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const saveGatewayConfig = async (req, res) => {
    const { gateway_type, config, is_active, is_default } = req.body;
    try {
        await PaymentGatewayService.saveGatewayConfig(
            req.user.organization_id, gateway_type, config, is_active, is_default
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteGatewayConfig = async (req, res) => {
    const { gateway_type } = req.params;
    try {
        await PaymentGatewayService.deleteGatewayConfig(req.user.organization_id, gateway_type);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const testGatewayConnection = async (req, res) => {
    const { gateway_type, config } = req.body;
    try {
        const result = await PaymentGatewayService.testGatewayConnection(gateway_type, config);
        res.json(result);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

export const createQuickLink = async (req, res) => {
    const { contact_id, amount, description = 'Quick Payment' } = req.body;
    const { organization_id } = req.user;

    try {
        const access = await checkFeatureAccess(organization_id, 'fin_invoice');
        if (!access.allowed) {
            return res.status(403).json({ error: "Fitur Invoicing tidak aktif. Silakan upgrade paket.", upsell: true });
        }

        const gateway = await PaymentGatewayService.getActiveGateway(organization_id);
        if (!gateway) {
            return res.status(400).json({ error: 'Pembayaran online belum dikonfigurasi. Harap atur di menu Settings.' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const settings = await getSettingsInternal(organization_id);
            const prefix = settings.prefix || 'INV';
            const invNumber = `${prefix}/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
            
            const contactRes = await client.query('SELECT name, phone_number, email FROM contacts WHERE id = $1 AND organization_id = $2', [contact_id, organization_id]);
            if (contactRes.rows.length === 0) throw new Error("Contact not found");
            const contact = contactRes.rows[0];

            const token = generateToken();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1); // 1 day expiry for quick link

            const invRes = await client.query(
                `INSERT INTO invoices 
                 (organization_id, contact_id, invoice_number, issue_date, due_date, subtotal, tax_amount, dp_amount, total_amount, notes, public_token, status)
                 VALUES ($1, $2, $3, NOW(), $4, $5, 0, 0, $5, $6, $7, 'unpaid')
                 RETURNING id`,
                [organization_id, contact_id, invNumber, dueDate, amount, description, token]
            );
            const invoiceId = invRes.rows[0].id;

            await client.query(
                `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount) VALUES ($1, $2, 1, $3, $3)`,
                [invoiceId, description, amount]
            );

            const externalId = `inv-${invoiceId}-${crypto.randomBytes(4).toString('hex')}`;
            const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
            
            const result = await gateway.createPaymentLink({
                external_id: externalId,
                amount: Math.round(amount),
                description: description,
                customer_name: contact.name || 'Customer',
                customer_email: contact.email || undefined,
                customer_phone: contact.phone_number || undefined,
                success_redirect_url: `${appUrl}/p/invoice/${token}?status=success`,
                items: [{ name: description, quantity: 1, price: Math.round(amount) }]
            });

            await client.query(
                `UPDATE invoices SET payment_url = $1, gateway_invoice_id = $2, payment_gateway = $3 WHERE id = $4`,
                [result.payment_url, result.gateway_invoice_id, gateway.getDisplayName().toLowerCase(), invoiceId]
            );

            await client.query('COMMIT');
            res.status(201).json({ payment_url: result.payment_url, invoice_id: invoiceId, token });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};