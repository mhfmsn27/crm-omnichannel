import pool from '../config/db.js';
import { createInvoice } from '../services/xenditService.js';
import crypto from 'crypto';

// POST /api/app/inbox/conversations/:id/create-payment-link
export const createPaymentLink = async (req, res) => {
    const { id: conversationId } = req.params;
    const { organization_id } = req.user;
    const { amount, description, duration_hours = 24 } = req.body;

    if (!amount || isNaN(parseInt(amount)) || parseInt(amount) <= 0) {
        return res.status(400).json({ error: 'Jumlah pembayaran tidak valid.' });
    }
    if (!description || !description.trim()) {
        return res.status(400).json({ error: 'Deskripsi pembayaran wajib diisi.' });
    }
    const durationHours = Math.min(Math.max(parseInt(duration_hours) || 24, 1), 72);

    try {
        const convRes = await pool.query(
            `SELECT ct.email, ct.name, ct.phone_number
             FROM conversations c
             JOIN contacts ct ON c.contact_id = ct.id
             WHERE c.id = $1 AND c.organization_id = $2`,
            [conversationId, organization_id]
        );
        if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        const contact = convRes.rows[0];
        const safeMail = contact.email || `customer+${conversationId}@noreply.crmhub.id`;
        const externalId = `chat-${conversationId}-${crypto.randomBytes(6).toString('hex')}`;
        const parsedAmount = parseInt(amount);

        const invoice = await createInvoice({
            external_id: externalId,
            amount: parsedAmount,
            payer_email: safeMail,
            description: description.trim(),
            invoice_duration: durationHours * 3600,
            items: [{ name: description.trim(), quantity: 1, price: parsedAmount }],
        });

        const invoiceUrl = invoice.invoice_url;

        // Save to payment_links for tracking & history
        await pool.query(
            `INSERT INTO payment_links (conversation_id, organization_id, external_id, amount, description, invoice_url, duration_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [conversationId, organization_id, externalId, parsedAmount, description.trim(), invoiceUrl, durationHours]
        );

        res.json({
            success: true,
            invoice_url: invoiceUrl,
            amount: parsedAmount,
            description: description.trim(),
            duration_hours: durationHours,
            external_id: externalId,
        });
    } catch (err) {
        console.error('[PaymentLink] createPaymentLink error:', err.message);
        if (err.message.includes('not configured')) {
            return res.status(400).json({ error: 'Xendit belum dikonfigurasi. Silakan atur API key di System Settings.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/inbox/conversations/:id/payment-links
export const getPaymentLinks = async (req, res) => {
    const { id: conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        // Verify conversation belongs to org
        const check = await pool.query(
            'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2',
            [conversationId, organization_id]
        );
        if (check.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        const result = await pool.query(
            `SELECT id, external_id, amount, description, invoice_url, duration_hours, status, paid_at, created_at
             FROM payment_links
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [conversationId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
