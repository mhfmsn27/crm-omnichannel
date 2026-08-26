
import pool from '../config/db.js';
import * as xenditService from '../services/xenditService.js';
import { sendInvoice } from '../services/emailService.js';
import { sendSystemNotification } from '../services/notificationService.js';
import { processAffiliateCommission } from './affiliateController.js';

// Sync Channels
export const syncChannels = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Deactivate all existing Xendit channels first to clean up old individual banks
        await client.query("UPDATE payment_channels SET is_active = false WHERE type = 'xendit'");

        // 2. Upsert the Single Generic Channel
        const genericChannel = {
            type: 'xendit',
            provider_name: 'Online Payment (Xendit)', // Generic Name
            account_number: 'XENDIT-AUTO', // Placeholder
            account_holder: 'Automated',
            instructions: 'Pay via Xendit Invoice (Virtual Account, E-Wallet, QRIS, Retail)',
            is_active: true
        };

        const check = await client.query(
            "SELECT id FROM payment_channels WHERE type = 'xendit' AND account_number = $1",
            [genericChannel.account_number]
        );

        if (check.rows.length > 0) {
            await client.query(
                `UPDATE payment_channels 
                 SET provider_name = $1, instructions = $2, is_active = true 
                 WHERE id = $3`,
                [genericChannel.provider_name, genericChannel.instructions, check.rows[0].id]
            );
        } else {
            await client.query(
                `INSERT INTO payment_channels (type, provider_name, account_number, account_holder, instructions, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [genericChannel.type, genericChannel.provider_name, genericChannel.account_number, genericChannel.account_holder, genericChannel.instructions, true]
            );
        }

        await client.query('COMMIT');
        res.json({ message: `Synced Xendit Channel. All payment methods are now available under '${genericChannel.provider_name}'` });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// Webhook Handler
export const handleWebhook = async (req, res) => {
    const { isValid } = await xenditService.validateCallback(req);
    if (!isValid) return res.status(403).json({ message: "Invalid Callback Token" });

    const { status, external_id, paid_amount } = req.body;
    // Xendit invoice callback: status could be 'PAID', 'EXPIRED'

    if (status !== 'PAID') return res.sendStatus(200); // Ignore others for now

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // external_id is our invoice_number
        const trxRes = await client.query(
            `SELECT t.*, u.name as user_name, u.phone, u.email, o.name as org_name
             FROM transactions t
             JOIN users u ON t.organization_id = u.organization_id AND u.role IN ('admin_member', 'super_admin')
             JOIN organizations o ON t.organization_id = o.id
             WHERE t.invoice_number = $1
             LIMIT 1`,
            [external_id]
        );

        if (trxRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).send('Transaction not found');
        }
        const trx = trxRes.rows[0];

        if (trx.status === 'success') {
            await client.query('ROLLBACK');
            return res.sendStatus(200);
        }

        // Verify amount if needed, though Xendit ensures paid amount matches invoice

        await client.query(
            `UPDATE transactions SET status = 'success', approved_at = NOW(), payment_method = 'XENDIT_AUTO' WHERE id = $1`,
            [trx.id]
        );

        // --- DUPLICATED SUBSCRIPTION LOGIC (Refactor recommended in future) ---
        // Copying logic from dokuController/tripayController for consistency
        if (trx.addon_id) {
            const addonRes = await client.query('SELECT duration_days, name FROM addons WHERE id = $1', [trx.addon_id]);
            const addon = addonRes.rows[0];
            const duration = addon?.duration_days || 30;

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + duration);

            let subId;
            const subRes = await client.query(
                'SELECT id FROM subscriptions WHERE organization_id = $1 AND status = \'active\'',
                [trx.organization_id]
            );

            if (subRes.rows.length > 0) {
                subId = subRes.rows[0].id;
                await client.query(
                    `INSERT INTO subscription_addons (subscription_id, addon_id, quantity, price_at_purchase, expires_at, status)
                     VALUES ($1, $2, $3, $4, $5, 'active')`,
                    [subId, trx.addon_id, 1, trx.amount, expiresAt]
                );
            } else {
                const newSub = await client.query(
                    `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at)
                     VALUES ($1, 1, 'active', NOW() + interval '1 year') RETURNING id`,
                    [trx.organization_id]
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
            const planRes = await client.query('SELECT name FROM plans WHERE id = $1', [trx.plan_id]);
            trx.item_name = planRes.rows[0]?.name || 'Subscription Plan';

            let durationMonths = trx.cycle === 'yearly' ? 12 : 1;
            const now = new Date();
            let newExpiresAt;

            const subRes = await client.query(
                'SELECT * FROM subscriptions WHERE organization_id = $1 AND status = \'active\'',
                [trx.organization_id]
            );

            if (subRes.rows.length > 0) {
                const currentExpiry = new Date(subRes.rows[0].expires_at);
                const baseDate = currentExpiry > now ? currentExpiry : now;
                const nextDate = new Date(baseDate);
                nextDate.setMonth(nextDate.getMonth() + durationMonths);
                newExpiresAt = nextDate;

                await client.query(
                    'UPDATE subscriptions SET plan_id = $1, expires_at = $2, updated_at = NOW() WHERE id = $3',
                    [trx.plan_id, newExpiresAt, subRes.rows[0].id]
                );
            } else {
                const nextDate = new Date();
                nextDate.setMonth(nextDate.getMonth() + durationMonths);
                newExpiresAt = nextDate;

                await client.query(
                    `INSERT INTO subscriptions (organization_id, plan_id, status, expires_at) VALUES ($1, $2, 'active', $3)`,
                    [trx.organization_id, trx.plan_id, newExpiresAt]
                );
            }

            await client.query(
                'UPDATE organizations SET plan_id = $1, subscription_status = \'active\' WHERE id = $2',
                [trx.plan_id, trx.organization_id]
            );
        }

        // --- AFFILIATE COMMISSION HOOK ---
        await processAffiliateCommission(trx, client);

        await client.query('COMMIT');
        sendInvoice(trx.id).catch(err => console.error("Failed to send invoice email", err));

        sendSystemNotification('order_success', {
            name: trx.user_name,
            phone: trx.phone,
            email: trx.email,
            org_name: trx.org_name
        }, {
            item_name: trx.item_name,
            amount: parseInt(trx.amount).toLocaleString('id-ID'),
            invoice_url: `${process.env.APP_URL}/invoice/${trx.invoice_number}`
        });

        res.sendStatus(200);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[Xendit Webhook] Error processing:", err);
        res.sendStatus(500);
    } finally {
        client.release();
    }
};
