import pool from '../../config/db.js';
import { sendInvoice } from '../../services/emailService.js';
import { sendSystemNotification } from '../../services/notificationService.js';
import { processAffiliateCommission } from '../affiliateController.js';

// GET /api/sa/orders
export const getOrders = async (req, res) => {
    const { status } = req.query;
    try {
        let query = `
            SELECT t.*, o.name as org_name, 
            (SELECT email FROM users WHERE organization_id = o.id ORDER BY created_at ASC LIMIT 1) as user_email,
            CASE WHEN t.addon_id IS NOT NULL THEN 'Add-on' ELSE 'Subscription' END as type,
            COALESCE(p.name, a.name) as item_name
            FROM transactions t
            JOIN organizations o ON t.organization_id = o.id
            LEFT JOIN plans p ON t.plan_id = p.id
            LEFT JOIN addons a ON t.addon_id = a.id
            WHERE 1=1
        `;
        const params = [];
        let idx = 1;

        if (status && status !== 'all') {
            query += ` AND t.status = $${idx}`;
            params.push(status);
            idx++;
        }

        query += ` ORDER BY t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/orders/:id/approve
export const approveOrder = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Transaction
        const trxRes = await client.query(`
            SELECT t.*, u.name as user_name, u.phone, u.email, o.name as org_name,
            COALESCE(p.name, a.name) as item_name
            FROM transactions t
            JOIN organizations o ON t.organization_id = o.id
            LEFT JOIN users u ON u.organization_id = o.id -- Get Any User for Notif, ideally owner
            LEFT JOIN plans p ON t.plan_id = p.id
            LEFT JOIN addons a ON t.addon_id = a.id
            WHERE t.id = $1
            LIMIT 1`, [id]);

        if (trxRes.rows.length === 0) throw new Error("Transaction not found");
        const trx = trxRes.rows[0];

        if (trx.status === 'success') throw new Error("Transaction already approved");

        // 2. Approve Transaction
        await client.query(
            `UPDATE transactions 
             SET status = 'success', approved_at = NOW(), approved_by = $1 
             WHERE id = $2`,
            [req.user.id, id]
        );

        // 3. Process Benefit (Plan vs Add-on)
        const subRes = await client.query(
            'SELECT * FROM subscriptions WHERE organization_id = $1 AND status IN (\'active\', \'trialing\')',
            [trx.organization_id]
        );

        if (trx.addon_id) {
            // --- ADD-ON LOGIC ---
            // Ensure we have a base subscription to attach addon to
            let subId;
            if (subRes.rows.length === 0) {
                const newSub = await client.query(
                    `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at)
                     VALUES ($1, 1, 'active', NOW() + interval '30 days') RETURNING id`,
                    [trx.organization_id]
                );
                subId = newSub.rows[0].id;
            } else {
                subId = subRes.rows[0].id;
            }

            await client.query(
                `INSERT INTO subscription_addons (subscription_id, addon_id, quantity, price_at_purchase, status, expires_at)
                 VALUES ($1, $2, $3, $4, 'active', NOW() + interval '30 days')`,
                [subId, trx.addon_id, 1, trx.amount]
            );

        } else if (trx.plan_id) {
            // --- PLAN LOGIC ---
            const now = new Date();
            let baseDate = now;
            let subId = null;

            // Determine Base Date & Subscription ID
            if (subRes.rows.length > 0) {
                subId = subRes.rows[0].id;
                const currentExpiry = new Date(subRes.rows[0].expires_at);
                if (currentExpiry > now) {
                    baseDate = currentExpiry;
                }
            }

            // Calculate New Expiry
            let newExpiresAt = new Date(baseDate);
            if (trx.cycle === 'yearly') {
                newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);
            } else {
                newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
            }

            if (subId) {
                // Update Existing
                await client.query(
                    'UPDATE subscriptions SET plan_id = $1, expires_at = $2, status = \'active\' WHERE id = $3',
                    [trx.plan_id, newExpiresAt, subId]
                );
            } else {
                // Create New with Correct Plan (Not Default 1)
                await client.query(
                    `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at)
                     VALUES ($1, $2, 'active', $3)`,
                    [trx.organization_id, trx.plan_id, newExpiresAt]
                );
            }

            // Allow DB constraints/buffers to settle if needed, but sequential query is fine here.

            // Update Org Record
            await client.query(
                'UPDATE organizations SET plan_id = $1, subscription_status = \'active\' WHERE id = $2',
                [trx.plan_id, trx.organization_id]
            );
        }

        // --- AFFILIATE COMMISSION HOOK ---
        await processAffiliateCommission(trx, client);

        await client.query('COMMIT');

        // 4. Send Email Invoice
        sendInvoice(id);

        // 5. Send WA Notification
        sendSystemNotification('order_success', {
            name: trx.user_name || 'Member',
            phone: trx.phone,
            email: trx.email,
            org_name: trx.org_name
        }, {
            item_name: trx.item_name,
            amount: parseInt(trx.amount).toLocaleString('id-ID'),
            invoice_url: `${process.env.APP_URL}/p/invoice/${trx.invoice_number}`
        });

        res.json({ message: 'Order approved successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/sa/orders/:id/reject
export const rejectOrder = async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    try {
        await pool.query(
            `UPDATE transactions 
             SET status = 'failed', admin_note = $1, approved_by = $2 
             WHERE id = $3`,
            [reason, req.user.id, id]
        );
        res.json({ message: 'Order rejected' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
