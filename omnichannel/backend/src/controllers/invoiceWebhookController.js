/**
 * Invoice Webhook Controller
 * Unified handler for payment gateway callbacks related to CRM invoices
 */
import pool from '../config/db.js';
import * as PaymentGatewayService from '../services/PaymentGatewayService.js';
import * as waService from '../services/waGatewayService.js';
import MetaService from '../services/MetaService.js';
import TelegramService from '../services/TelegramService.js';
import crypto from 'crypto';

/**
 * POST /webhook/invoice-payment/:gateway_type
 * Called by payment gateways when invoice payment status changes
 */
export const handleInvoicePaymentWebhook = async (req, res) => {
    const { gateway_type } = req.params;

    try {
        // 1. Find all gateway configs of this type to try validation
        const gwRows = await pool.query(
            `SELECT * FROM invoice_payment_gateways WHERE gateway_type = $1 AND is_active = true`,
            [gateway_type]
        );

        if (gwRows.rows.length === 0) {
            console.warn(`[InvoiceWebhook] No active ${gateway_type} gateway found`);
            return res.sendStatus(200); // Acknowledge but ignore
        }

        // Acknowledge immediately — gateways expect fast response
        res.sendStatus(200);

        // 2. Try validating with each config (multi-tenant: different orgs may use the same gateway type)
        let validResult = null;
        let matchedOrgId = null;

        for (const gw of gwRows.rows) {
            try {
                const adapter = PaymentGatewayService.resolveAdapterByType(gateway_type, gw.config);
                const result = await adapter.validateWebhook(req);

                if (result.isValid && result.externalId) {
                    validResult = result;
                    matchedOrgId = gw.organization_id;
                    break;
                }
            } catch (e) {
                // Try next config
                continue;
            }
        }

        if (!validResult) {
            console.warn(`[InvoiceWebhook] ${gateway_type}: No valid match found for webhook`);
            return;
        }

        const { status, amount, externalId } = validResult;

        // 3. Parse external_id format: "inv-{invoiceId}-{hex}"
        const parts = externalId.split('-');
        if (parts[0] !== 'inv' || !parts[1]) {
            console.log(`[InvoiceWebhook] Ignoring non-invoice external_id: ${externalId}`);
            return;
        }
        const invoiceId = parseInt(parts[1]);
        if (isNaN(invoiceId)) return;

        // 4. Get invoice details
        const invRes = await pool.query(
            `SELECT i.*, c.phone_number, c.name as contact_name, c.telegram_id,
                    conv.id as conversation_id, conv.channel, conv.whatsapp_session_id,
                    conv.telegram_bot_id,
                    ws.session_id as wa_uuid, ws.type as device_type,
                    ws.access_token, ws.phone_number_id,
                    tb.bot_token as tg_token
             FROM invoices i
             JOIN contacts c ON i.contact_id = c.id
             LEFT JOIN conversations conv ON conv.contact_id = c.id AND conv.organization_id = i.organization_id
             LEFT JOIN whatsapp_sessions ws ON conv.whatsapp_session_id = ws.id
             LEFT JOIN telegram_bots tb ON conv.telegram_bot_id = tb.id
             WHERE i.id = $1 AND i.organization_id = $2`,
            [invoiceId, matchedOrgId]
        );

        if (invRes.rows.length === 0) {
            console.warn(`[InvoiceWebhook] Invoice ${invoiceId} not found for org ${matchedOrgId}`);
            return;
        }

        const invoice = invRes.rows[0];

        // 5. Handle based on status
        if (status === 'paid') {
            // Idempotency check
            if (invoice.status === 'paid') return;

            // Update invoice status
            await pool.query(
                `UPDATE invoices SET status = 'paid', paid_at = NOW(), paid_amount = $1, 
                 payment_gateway = $2, gateway_invoice_id = $3, updated_at = NOW() 
                 WHERE id = $4`,
                [amount, gateway_type, externalId, invoiceId]
            );

            // Record payment in history
            await pool.query(
                `INSERT INTO invoice_payments (invoice_id, amount, payment_method, reference_id, notes, paid_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [invoiceId, amount, gateway_type, externalId, `Auto-paid via ${gateway_type}`]
            );

            // Deduct stock for items
            const itemsRes = await pool.query('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = $1 AND product_id IS NOT NULL', [invoiceId]);
            for (const item of itemsRes.rows) {
                await pool.query('UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock IS NOT NULL', [item.quantity, item.product_id]);
            }

            // Send confirmation to customer
            const confirmText = `Halo ${invoice.contact_name || 'Kak'}! 👋\n\nKami ingin menginformasikan bahwa pembayaran untuk *Invoice #${invoice.invoice_number}* senilai *Rp ${parseInt(amount).toLocaleString('id-ID')}* telah berhasil kami terima. ✅\n\nTerima kasih banyak atas kepercayaannya. Jika ada pertanyaan lebih lanjut, jangan ragu untuk membalas pesan ini ya! Semoga harinya menyenangkan. ✨`;

            await sendConfirmationMessage(invoice, confirmText, req.io);

        } else if (status === 'expired') {
            await pool.query(
                `UPDATE invoices SET payment_url = NULL, gateway_invoice_id = NULL, updated_at = NOW() 
                 WHERE id = $1 AND status != 'paid'`,
                [invoiceId]
            );
        }

    } catch (err) {
        console.error(`[InvoiceWebhook] ${gateway_type} error:`, err.message);
        if (!res.headersSent) res.sendStatus(500);
    }
};

/**
 * Send confirmation message via the appropriate channel
 */
async function sendConfirmationMessage(invoice, text, io) {
    const normalizePhone = (phone) => {
        let p = String(phone || '').split('@')[0].replace(/[^0-9]/g, '');
        if (p.startsWith('0')) p = '62' + p.slice(1);
        else if (p.startsWith('8')) p = '62' + p;
        return p;
    };

    try {
        if (invoice.channel === 'telegram' && invoice.tg_token) {
            await TelegramService.sendMessage(invoice.tg_token, invoice.telegram_id, text);
        } else if (invoice.device_type === 'official' && invoice.access_token && invoice.phone_number_id) {
            await MetaService.sendMessage(
                { access_token: invoice.access_token, phone_number_id: invoice.phone_number_id, organization_id: invoice.organization_id },
                invoice.phone_number,
                'text', text
            );
        } else {
            // Fallback to use specific session or any connected session for this org
            let sessionId = invoice.wa_uuid;
            if (!sessionId) {
                const devRes = await pool.query(
                    "SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1 AND status = 'connected' LIMIT 1",
                    [invoice.organization_id]
                );
                if (devRes.rows.length > 0) {
                    sessionId = devRes.rows[0].session_id;
                }
            }

            if (sessionId) {
                await waService.sendText(sessionId, normalizePhone(invoice.phone_number), text);
            } else {
                console.warn('[InvoiceWebhook] No connected WhatsApp device to send confirmation for Org:', invoice.organization_id);
            }
        }
    } catch (sendErr) {
        console.error('[InvoiceWebhook] Failed to send confirmation:', sendErr.message);
    }

    // Save message to DB
    if (invoice.conversation_id) {
        const waMessageId = `inv.paid.${crypto.randomUUID()}`;
        const msgRes = await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id)
             VALUES ($1, $2, true, 'text', $3, 'sent', $4)
             ON CONFLICT (wa_message_id) DO NOTHING
             RETURNING *`,
            [invoice.conversation_id, invoice.organization_id, text, waMessageId]
        );

        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2`,
            ['✅ Pembayaran invoice diterima', invoice.conversation_id]
        );

        if (io && msgRes.rows.length > 0) {
            io.to(`org_${invoice.organization_id}`).emit('new_message', {
                conversationId: invoice.conversation_id,
                message: msgRes.rows[0]
            });
        }
    }

    // Emit payment event
    if (io) {
        io.to(`org_${invoice.organization_id}`).emit('invoice_paid', {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            amount: invoice.total_amount
        });
    }
}
