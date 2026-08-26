
import pool from '../config/db.js';
import * as tripayService from '../services/tripayService.js';
import { sendInvoice } from '../services/emailService.js';
import { sendSystemNotification } from '../services/notificationService.js';
import { processAffiliateCommission } from './affiliateController.js';

export const handleWebhook = async (req, res) => {
    try {
        // 1. Validate Signature
        const { isValid, data } = await tripayService.validateCallback(req);

        if (!isValid) {
            console.error("[TriPay Webhook] Invalid Signature");
            return res.status(400).json({ success: false, message: "Invalid Signature" });
        }

        // 2. Check Status
        // TriPay status: PAID, UNPAID, EXPIRED, FAILED, REFUND
        const { merchant_ref, status } = data;

        if (status !== 'PAID') {
            return res.json({ success: true }); // Acknowledge receipt but don't process
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 3. Get Transaction
            const trxRes = await client.query(
                `SELECT t.*, u.name as user_name, u.phone, u.email, o.name as org_name 
                 FROM transactions t 
                 JOIN users u ON t.organization_id = u.organization_id AND u.role IN ('admin_member', 'super_admin')
                 JOIN organizations o ON t.organization_id = o.id
                 WHERE t.invoice_number = $1 
                 LIMIT 1`,
                [merchant_ref]
            );

            if (trxRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ success: false, message: "Transaction not found" });
            }
            const trx = trxRes.rows[0];

            // Idempotency Check
            if (trx.status === 'success') {
                await client.query('ROLLBACK');
                return res.json({ success: true });
            }

            // 4. Update Transaction Status
            await client.query(
                `UPDATE transactions SET status = 'success', approved_at = NOW(), payment_method = 'TriPay' WHERE id = $1`,
                [trx.id]
            );

            // 5. Provisioning (Copy logic from webhookController/doku logic)
            if (trx.addon_id) {
                // ... Addon Logic
                const addonRes = await client.query('SELECT duration_days, name FROM addons WHERE id = $1', [trx.addon_id]);
                const addon = addonRes.rows[0];
                const duration = addon?.duration_days || 30;
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + duration);

                let subId;
                const subRes = await client.query('SELECT id FROM subscriptions WHERE organization_id = $1 AND status = \'active\'', [trx.organization_id]);

                if (subRes.rows.length > 0) {
                    subId = subRes.rows[0].id;
                    await client.query(
                        `INSERT INTO subscription_addons (subscription_id, addon_id, quantity, price_at_purchase, expires_at, status)
                         VALUES ($1, $2, $3, $4, $5, 'active')`,
                        [subId, trx.addon_id, 1, trx.amount, expiresAt]
                    );
                } else {
                    // Create dummy sub if needed
                    const newSub = await client.query(
                        `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at) 
                         VALUES ($1, 1, 'active', NOW() + interval '1 year') RETURNING id`, [trx.organization_id]
                    );
                    subId = newSub.rows[0].id;
                    await client.query(
                        `INSERT INTO subscription_addons (subscription_id, addon_id, quantity, price_at_purchase, expires_at, status)
                         VALUES ($1, $2, $3, $4, $5, 'active')`,
                        [subId, trx.addon_id, 1, trx.amount, expiresAt]
                    );
                }
                trx.item_name = addon?.name || 'Add-on';

            } else if (trx.plan_id) {
                // ... Plan Logic
                const planRes = await client.query('SELECT name FROM plans WHERE id = $1', [trx.plan_id]);
                trx.item_name = planRes.rows[0]?.name || 'Subscription Plan';

                let durationMonths = trx.cycle === 'yearly' ? 12 : 1;
                const now = new Date();
                let newExpiresAt;

                const subRes = await client.query('SELECT * FROM subscriptions WHERE organization_id = $1 AND status = \'active\'', [trx.organization_id]);

                if (subRes.rows.length > 0) {
                    const currentExpiry = new Date(subRes.rows[0].expires_at);
                    const baseDate = currentExpiry > now ? currentExpiry : now;
                    const nextDate = new Date(baseDate);
                    nextDate.setMonth(nextDate.getMonth() + durationMonths);
                    newExpiresAt = nextDate;

                    await client.query('UPDATE subscriptions SET plan_id = $1, expires_at = $2, updated_at = NOW() WHERE id = $3', [trx.plan_id, newExpiresAt, subRes.rows[0].id]);
                } else {
                    const nextDate = new Date();
                    nextDate.setMonth(nextDate.getMonth() + durationMonths);
                    newExpiresAt = nextDate;
                    await client.query(
                        `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at) VALUES ($1, $2, 'active', $3)`,
                        [trx.organization_id, trx.plan_id, newExpiresAt]
                    );
                }
                await client.query('UPDATE organizations SET plan_id = $1, subscription_status = \'active\' WHERE id = $2', [trx.plan_id, trx.organization_id]);
            }

            // --- AFFILIATE COMMISSION HOOK ---
            await processAffiliateCommission(trx, client);

            await client.query('COMMIT');

            // Notifications
            sendInvoice(trx.id).catch(e => console.error("Invoice error", e));
            sendSystemNotification('order_success', {
                name: trx.user_name, phone: trx.phone, email: trx.email, org_name: trx.org_name
            }, {
                item_name: trx.item_name,
                amount: parseInt(trx.amount).toLocaleString('id-ID'),
                invoice_url: `${process.env.APP_URL}/invoice/${trx.invoice_number}`
            });

            res.json({ success: true });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("[TriPay Webhook] DB Error:", err);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("[TriPay Webhook] Unhandled Error:", err);
        res.status(500).json({ success: false });
    }
};

// Sync Channels from TriPay API to DB
export const syncChannels = async (req, res) => {
    try {
        const channels = await tripayService.getPaymentChannels();
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const ch of channels) {
                // Upsert logic for payment_channels
                // Mapping:
                // provider_name = ch.name (e.g. "BCA Virtual Account") - For User Display
                // account_number = ch.code (e.g. "BRIVA") - For System Code

                // Check if exists based on CODE
                const check = await client.query("SELECT id FROM payment_channels WHERE type = 'tripay' AND account_number = $1", [ch.code]);

                if (check.rows.length === 0) {
                    // Parameter count matches $1..$4
                    await client.query(
                        `INSERT INTO payment_channels (type, provider_name, account_number, account_holder, instructions, is_active)
                         VALUES ('tripay', $1, $2, $3, $4, true)`,
                        [ch.name, ch.code, 'TriPay', 'Pay via ' + ch.name]
                    );
                } else {
                    // Update name if needed, or just reactivate
                    await client.query("UPDATE payment_channels SET provider_name = $1, is_active = true WHERE id = $2", [ch.name, check.rows[0].id]);
                }
            }
            await client.query('COMMIT');
            res.json({ message: `Synced ${channels.length} channels from TriPay.` });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
