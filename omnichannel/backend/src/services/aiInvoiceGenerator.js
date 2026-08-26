/**
 * AI Invoice Generator Service
 * Analyzes conversation chat to auto-generate invoice draft
 */

import pool from '../config/db.js';
import crypto from 'crypto';
import { generateResponse } from './aiService.js';

/**
 * Analyze conversation and generate invoice draft
 * @param {number} conversationId - Conversation ID
 * @param {number} organizationId - Organization ID
 * @returns {Promise<Object>} - Generated invoice items and summary
 */
export const analyzeAndGenerateInvoice = async (conversationId, organizationId) => {
    try {
        // 1. Get conversation details
        const convRes = await pool.query(`
            SELECT c.*, ct.name as contact_name, ct.phone_number, ct.email as contact_email
            FROM conversations c
            JOIN contacts ct ON c.contact_id = ct.id
            WHERE c.id = $1 AND c.organization_id = $2
        `, [conversationId, organizationId]);

        if (convRes.rows.length === 0) {
            throw new Error('Conversation not found');
        }

        const conversation = convRes.rows[0];

        // 2. Get recent messages (last 20 for analysis)
        const messagesRes = await pool.query(`
            SELECT content, from_me, type, created_at
            FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `, [conversationId]);

        const messages = messagesRes.rows.reverse();

        // 3. Get organization settings
        const settingsRes = await pool.query(
            'SELECT * FROM invoice_settings WHERE organization_id = $1',
            [organizationId]
        );
        const settings = settingsRes.rows[0] || {};

        // 4. Build context for AI
        const chatContext = messages.map(m => {
            const sender = m.from_me ? 'Agent' : 'Customer';
            return `[${sender}]: ${m.content}`;
        }).join('\n');

        // 5. Use AI to analyze and extract line items
        const aiPrompt = `
Anda adalah asisten AI yang membantu membuat draft invoice dari percakapan chat.

Konteks Percakapan:
${chatContext}

TUGAS:
1. Analisis percakapan di atas
2. Identifikasi barang/jasa yang disebutkan
3. Buat daftar item untuk invoice dengan:
   - deskripsi (apa yang dijual/jasa)
   - jumlah (quantity)
   - harga satuan

FORMAT OUTPUT (JSON only, tanpa text lain):
{
  "items": [
    {"description": "Nama Produk/Jasa", "quantity": 1, "unit_price": 100000}
  ],
  "notes": "Catatan penting dari percakapan",
  "subtotal": 100000,
  "suggested_due_days": 7
}

ATURAN:
- Jika tidak ada produk/jasa yang jelas, return items kosong
- Unit price dalam Rupiah (tanpa Rp atau koma)
- quantity minimal 1
- Sertakan ongkos kirim jika disebutkan
- notes bisa berisi info penting dari chat
`;

        // 6. Call AI for analysis
        let items = [];
        let notes = '';
        let suggestedDueDays = settings.due_days || 7;

        try {
            const aiResponse = await generateResponse(
                organizationId,
                aiPrompt,
                [], // empty history as we're sending context directly
                {}, // botConfig not needed for analysis
                'Analyze this chat for invoice items'
            );

            // Parse AI response
            if (aiResponse && aiResponse.startsWith('{')) {
                const parsed = JSON.parse(aiResponse);
                items = parsed.items || [];
                notes = parsed.notes || '';
                suggestedDueDays = parsed.suggested_due_days || 7;
            } else {
                // Fallback: try to extract from AI response text
                console.log('[AI Invoice] AI Response:', aiResponse);
            }
        } catch (aiError) {
            console.error('[AI Invoice] AI Analysis failed:', aiError);
            // Fallback: extract items manually from messages
            items = extractItemsFromMessages(messages);
        }

        // 7. Calculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const taxRate = (settings.tax_percentage || 0) / 100;
        const taxAmount = subtotal * taxRate;
        const totalAmount = subtotal + taxAmount;

        // 8. Build result
        return {
            contact: {
                id: conversation.contact_id,
                name: conversation.contact_name,
                phone_number: conversation.phone_number,
                email: conversation.contact_email
            },
            items: items.map(item => ({
                ...item,
                amount: item.quantity * item.unit_price
            })),
            subtotal,
            tax_rate: settings.tax_percentage || 0,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            notes,
            suggested_due_days: suggestedDueDays,
            conversation_id: conversationId,
            generated_at: new Date().toISOString()
        };

    } catch (error) {
        console.error('[AI Invoice] Generator Error:', error);
        throw error;
    }
};

/**
 * Simple fallback: extract items from messages if AI fails
 */
const extractItemsFromMessages = (messages) => {
    const items = [];
    const pricePattern = /(\d{1,3}(?:[.,]\d{3})*|\d+)/g;

    for (const msg of messages) {
        if (msg.from_me || !msg.content) continue;

        const text = msg.content.toLowerCase();

        // Look for price mentions
        const priceMatches = text.match(pricePattern);
        if (priceMatches && priceMatches.length > 0) {
            const price = parseInt(priceMatches[0].replace(/[.,]/g, ''));
            if (price > 0 && price < 100000000) { // Reasonable price range
                items.push({
                    description: 'Item dari chat',
                    quantity: 1,
                    unit_price: price
                });
            }
        }
    }

    return items;
};

/**
 * Generate invoice number based on settings
 */
export const generateInvoiceNumber = async (organizationId) => {
    const settingsRes = await pool.query(
        'SELECT prefix FROM invoice_settings WHERE organization_id = $1',
        [organizationId]
    );
    const prefix = settingsRes.rows[0]?.prefix || 'INV';
    const year = new Date().getFullYear();
    const random = Date.now().toString().slice(-6);
    return `${prefix}/${year}/${random}`;
};

/**
 * Create invoice from AI-generated draft
 */
export const createFromDraft = async (organizationId, draft) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check feature access
        const access = await import('../services/featureGateService.js').then(m => m.checkFeatureAccess(organizationId, 'fin_invoice'));
        if (!access.allowed) {
            throw new Error('Invoice feature not available');
        }

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(organizationId);
        const token = crypto.randomBytes(16).toString('hex');

        // Calculate dates
        const issueDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (draft.suggested_due_days || 7));

        // Insert invoice
        const invRes = await client.query(`
            INSERT INTO invoices
            (organization_id, contact_id, invoice_number, issue_date, due_date,
             subtotal, tax_amount, total_amount, notes, public_token, status, conversation_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unpaid', $11)
            RETURNING id
        `, [
            organizationId,
            draft.contact_id,
            invoiceNumber,
            issueDate,
            dueDate,
            draft.subtotal,
            draft.tax_amount,
            draft.total_amount,
            draft.notes || '',
            token,
            draft.conversation_id
        ]);

        const invoiceId = invRes.rows[0].id;

        // Insert line items
        for (const item of draft.items) {
            await client.query(`
                INSERT INTO invoice_items
                (invoice_id, description, quantity, unit_price, amount)
                VALUES ($1, $2, $3, $4, $5)
            `, [invoiceId, item.description, item.quantity, item.unit_price, item.amount]);
        }

        // Link to conversation
        if (draft.conversation_id) {
            await client.query(`
                UPDATE conversations
                SET invoice_id = $1
                WHERE id = $2 AND organization_id = $3
            `, [invoiceId, draft.conversation_id, organizationId]);
        }

        await client.query('COMMIT');

        return {
            id: invoiceId,
            invoice_number: invoiceNumber,
            public_token: token,
            invoice_url: `${process.env.APP_URL}/p/invoice/${token}`
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};