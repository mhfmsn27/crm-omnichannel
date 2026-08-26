import pool from '../config/db.js';
import axios from 'axios';
import * as dokuHelper from '../utils/dokuHelper.js';
import * as tripayService from '../services/tripayService.js';
import * as xenditService from '../services/xenditService.js';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { generateInvoicePdf } from '../services/invoiceService.js';

// Helper: Generate Invoice Number
const generateInvoice = () => `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// GET /api/public/payment-channels
export const getPaymentChannels = async (req, res) => {
    try {
        // Fetch Settings first
        const settingsRes = await pool.query("SELECT key, value FROM system_settings WHERE key IN ('enable_xendit', 'enable_tripay')");
        const settings = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);

        const enableXendit = settings['enable_xendit'] === 'true' || settings['enable_xendit'] === '1';
        const enableTripay = settings['enable_tripay'] === 'true' || settings['enable_tripay'] === '1';

        let query = 'SELECT * FROM payment_channels WHERE is_active = true';

        // Filter at DB level or Application level? Application level is easier for dynamic logic
        const result = await pool.query(query + ' ORDER BY id ASC');

        const filtered = result.rows.filter(c => {
            if (c.type === 'xendit' && !enableXendit) return false;
            if (c.type === 'tripay' && !enableTripay) return false;
            return true;
        });

        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/public/plans (List active plans for landing page)
export const getPublicPlans = async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.name, p.description, p.price_monthly, p.price_yearly, p.price_monthly_promo, p.price_yearly_promo, p.trial_days, p.is_trial_allowed,
             COALESCE(
               json_agg(
                 json_build_object(
                   'code', pf.feature_code,
                   'is_enabled', pf.is_enabled,
                   'limit_value', pf.limit_value
                 )
               ) FILTER (WHERE pf.id IS NOT NULL), 
               '[]'
             ) as features
            FROM plans p
            LEFT JOIN plan_features pf ON p.id = pf.plan_id
            WHERE p.is_active = true
            GROUP BY p.id
            ORDER BY p.price_monthly ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/billing/addons
export const getAvailableAddons = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // 1. Fetch Plans (with Trial info)
        const plansRes = await pool.query(`
            SELECT p.*, 
                COALESCE(
                    json_agg(
                        json_build_object(
                        'code', pf.feature_code,
                        'is_enabled', pf.is_enabled,
                        'limit_value', pf.limit_value
                        )
                    ) FILTER (WHERE pf.id IS NOT NULL), 
                    '[]'
                ) as features
            FROM plans p
            LEFT JOIN plan_features pf ON p.id = pf.plan_id
            WHERE p.is_active = true
            GROUP BY p.id
            ORDER BY p.price_monthly ASC
        `);

        // 2. Fetch Addons
        const addonsRes = await pool.query('SELECT * FROM addons WHERE is_active = true ORDER BY price_monthly ASC');

        // 3. Current Org Features (Plan + Addons)
        // Get features from Active Plan - JOINING PLANS table properly to be safe
        const planFeatRes = await pool.query(`
            SELECT pf.feature_code 
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            JOIN plan_features pf ON p.id = pf.plan_id
            WHERE s.organization_id = $1 AND s.status IN ('active', 'trialing') AND pf.is_enabled = true
        `, [organization_id]);

        // Get features from Active Addons
        const addonFeatRes = await pool.query(`
            SELECT a.feature_code
            FROM subscription_addons sa
            JOIN addons a ON sa.addon_id = a.id
            LEFT JOIN subscriptions s ON sa.subscription_id = s.id
            WHERE s.organization_id = $1
            AND sa.status = 'active'
            AND (sa.expires_at IS NULL OR sa.expires_at > NOW())
        `, [organization_id]);

        // Merge unique features
        const activeFeatures = new Set([
            ...planFeatRes.rows.map(r => r.feature_code),
            ...addonFeatRes.rows.map(r => r.feature_code)
        ]);


        // 4. Current Plan ID & Org Details
        const orgRes = await pool.query('SELECT plan_id, subscription_status, has_used_trial FROM organizations WHERE id = $1', [organization_id]);
        const orgData = orgRes.rows[0];

        res.json({
            plans: plansRes.rows,
            addons: addonsRes.rows,
            active_features: Array.from(activeFeatures),
            current_plan_id: orgData?.plan_id,
            subscription_status: orgData?.subscription_status,
            has_used_trial: orgData?.has_used_trial || false
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/billing/start-trial
export const startTrial = async (req, res) => {
    const { plan_id } = req.body;
    const { organization_id } = req.user;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Eligibility Check
        const orgRes = await client.query('SELECT has_used_trial FROM organizations WHERE id = $1', [organization_id]);
        if (orgRes.rows.length === 0) throw new Error("Organization not found.");
        if (orgRes.rows[0].has_used_trial) {
            throw new Error("Organization has already used a free trial.");
        }

        // 2. Plan Check
        const planRes = await client.query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [plan_id]);
        if (planRes.rows.length === 0) throw new Error("Plan not found");
        const plan = planRes.rows[0];

        if (!plan.is_trial_allowed || !plan.trial_days || plan.trial_days <= 0) {
            throw new Error("This plan does not support free trial.");
        }

        // 3. Create Subscription
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + plan.trial_days);

        // Invalidate old active subs first (if any, though rare for new user)
        await client.query(
            `UPDATE subscriptions SET status = 'cancelled' WHERE organization_id = $1 AND status IN ('active', 'trialing')`,
            [organization_id]
        );

        await client.query(
            `INSERT INTO subscriptions (organization_id, plan_id, status, is_trial, trial_ends_at, expires_at, created_at)
             VALUES ($1, $2, 'trialing', true, $3, $3, NOW())`,
            [organization_id, plan_id, trialEndsAt]
        );

        // 4. Update Organization
        await client.query(
            `UPDATE organizations SET plan_id = $1, subscription_status = 'trialing', has_used_trial = true WHERE id = $2`,
            [plan_id, organization_id]
        );

        // 5. Audit Log
        await client.query(
            'INSERT INTO activity_logs (actor_id, target_type, target_id, action, details) VALUES ($1, $2, $3, $4, $5)',
            [req.user.id, 'subscription', organization_id, 'START_TRIAL', `Started ${plan.trial_days}-day trial for plan ${plan.name}`]
        );

        await client.query('COMMIT');
        res.json({ message: `Trial started! Enjoy ${plan.trial_days} days of ${plan.name}.` });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

// GET /api/app/billing/history
export const getTransactionHistory = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(`
            SELECT t.*, 
            COALESCE(p.name, a.name) as item_name,
            pc.provider_name as bank_name,
            pc.account_number as bank_number,
            pc.account_holder as bank_holder
            FROM transactions t
            LEFT JOIN plans p ON t.plan_id = p.id
            LEFT JOIN addons a ON t.addon_id = a.id
            LEFT JOIN payment_channels pc ON t.payment_channel_id = pc.id
            WHERE t.organization_id = $1
            ORDER BY t.created_at DESC
        `, [organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/billing/history/:id/download
export const downloadInvoice = async (req, res) => {
    const { id } = req.params;
    const { organization_id, id: userId } = req.user;

    try {
        // 1. Fetch Transaction & User details
        const trxRes = await pool.query(`
            SELECT t.*, 
                   u.email, u.name as user_name, o.name as org_name,
                   COALESCE(p.name, a.name) as item_name
            FROM transactions t
            JOIN organizations o ON t.organization_id = o.id
            JOIN users u ON u.id = $1
            LEFT JOIN plans p ON t.plan_id = p.id
            LEFT JOIN addons a ON t.addon_id = a.id
            WHERE t.id = $2 AND t.organization_id = $3
        `, [userId, id, organization_id]);

        if (trxRes.rows.length === 0) return res.status(404).json({ error: "Invoice not found" });
        const trx = trxRes.rows[0];

        // 2. Generate PDF
        const settingsRes = await pool.query("SELECT value FROM system_settings WHERE key = 'app_name'");
        const appName = settingsRes.rows[0]?.value || process.env.APP_NAME || 'Cloudchat.id';

        const pdfBuffer = await generateInvoicePdf(trx, {
            name: trx.user_name,
            email: trx.email,
            org_name: trx.org_name,
            appName: appName // Pass dynamic app name
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${trx.invoice_number}.pdf`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error("Download Invoice Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/billing/validate-promo
export const validatePromo = async (req, res) => {
    const { code, plan_id, cycle, addon_id, amount } = req.body;
    try {
        const result = await pool.query("SELECT * FROM promo_codes WHERE code = $1 AND is_active = true", [code.toUpperCase()]);

        if (result.rows.length === 0) {
            return res.status(404).json({ valid: false, message: "Invalid promo code" });
        }

        const promo = result.rows[0];

        // Check expiry
        if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
            return res.status(400).json({ valid: false, message: "Promo code expired" });
        }

        // Check usage limit
        if (promo.max_uses && promo.used_count >= promo.max_uses) {
            return res.status(400).json({ valid: false, message: "Promo code usage limit reached" });
        }

        // Calculate Discount
        let discount = 0;
        const numericAmount = parseInt(amount);

        if (promo.type === 'percent') {
            discount = numericAmount * (parseFloat(promo.value) / 100);
        } else {
            discount = parseFloat(promo.value);
        }

        // Ensure discount doesn't exceed amount
        if (discount > numericAmount) discount = numericAmount;

        res.json({
            valid: true,
            code: promo.code,
            type: promo.type,
            value: promo.value,
            discount_amount: Math.floor(discount)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: Get Tax Rate
export const getTaxRate = async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM system_settings WHERE key = 'tax_rate'");
        const rate = result.rows.length > 0 ? parseFloat(result.rows[0].value) : 0;
        res.json({ tax_rate: rate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/billing/checkout
export const checkout = async (req, res) => {
    const { plan_id, payment_channel_id, cycle, addon_id, quantity = 1, promo_code } = req.body;
    const { id: userId, organization_id } = req.user;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 0. Fetch Fresh User Details
        const userRes = await client.query("SELECT name, email, phone FROM users WHERE id = $1", [userId]);
        if (userRes.rows.length === 0) throw new Error("User not found");
        const { name, email, phone } = userRes.rows[0];

        const customerPhone = phone || '081234567890';

        let baseAmount = 0;
        let description = "";
        let items = [];
        let thumbUrl = "https://tripay.co.id/images/purchase.png";

        // 1. Determine Base Amount (Subtotal) & Validate Logic
        if (addon_id) {
            // STRICT VALIDATION: Check if user has active plan
            const subCheck = await client.query(
                "SELECT id FROM subscriptions WHERE organization_id = $1 AND status IN ('active', 'trialing')",
                [organization_id]
            );
            if (subCheck.rows.length === 0) {
                throw new Error("Gagal Checkout. Anda harus memiliki paket langganan aktif untuk membeli add-on.");
            }

            const addonRes = await client.query('SELECT * FROM addons WHERE id = $1', [addon_id]);
            if (addonRes.rows.length === 0) throw new Error("Addon not found");
            const addon = addonRes.rows[0];

            if (addon.prerequisite_feature_code) {
                const access = await checkFeatureAccess(organization_id, addon.prerequisite_feature_code);
                if (!access.allowed) {
                    throw new Error(`Gagal Checkout. Fitur '${addon.prerequisite_feature_code}' harus aktif terlebih dahulu.`);
                }
            }

            const priceMonthly = parseInt(addon.price_monthly);
            const qty = parseInt(quantity);
            baseAmount = priceMonthly * qty;
            description = `Add-on: ${addon.name} x${qty}`;

            items.push({
                sku: addon.code || `ADD-${addon.id}`,
                name: addon.name,
                price: priceMonthly,
                quantity: qty,
                product_url: process.env.APP_URL,
                image_url: thumbUrl
            });

        } else if (plan_id) {
            const planRes = await client.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
            if (planRes.rows.length === 0) throw new Error("Plan not found");
            const plan = planRes.rows[0];

            if (cycle === 'yearly') {
                baseAmount = plan.price_yearly_promo ? parseInt(plan.price_yearly_promo) : parseInt(plan.price_yearly);
            } else {
                baseAmount = plan.price_monthly_promo ? parseInt(plan.price_monthly_promo) : parseInt(plan.price_monthly);
            }

            description = `Plan: ${plan.name} - ${cycle}`;

            // --- NEW: Calculate Period Date Range for Description ---
            let durationMonths = cycle === 'yearly' ? 12 : 1;
            let startDate = new Date();
            let endDate = new Date();

            // Check current subscription to stack dates
            const currentSubRes = await client.query('SELECT expires_at FROM subscriptions WHERE organization_id = $1 AND status = \'active\' LIMIT 1', [organization_id]);
            if (currentSubRes.rows.length > 0) {
                const currentExpiry = new Date(currentSubRes.rows[0].expires_at);
                if (currentExpiry > startDate) {
                    startDate = currentExpiry;
                }
            }
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + durationMonths);

            const fmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const periodStr = `${fmt.format(startDate)} - ${fmt.format(endDate)}`;

            const itemName = `Subscription ${plan.name} (${periodStr})`;

            items.push({
                sku: `PLAN-${plan.id}`,
                name: itemName,
                price: baseAmount,
                quantity: 1,
                product_url: process.env.APP_URL,
                image_url: thumbUrl
            });
        } else {
            throw new Error("Invalid request: Provide plan_id or addon_id");
        }

        // --- PROMO CODE LOGIC ---
        let discount = 0;
        let appliedPromoCode = null;

        if (promo_code) {
            const promoRes = await client.query("SELECT * FROM promo_codes WHERE code = $1 AND is_active = true", [promo_code.toUpperCase()]);
            if (promoRes.rows.length > 0) {
                const promo = promoRes.rows[0];
                // Check valid constraints again to be safe
                const isValidDate = !promo.expires_at || new Date(promo.expires_at) > new Date();
                const isValidLimit = !promo.max_uses || promo.used_count < promo.max_uses;

                if (isValidDate && isValidLimit) {
                    if (promo.type === 'percent') {
                        discount = Math.floor(baseAmount * (parseFloat(promo.value) / 100));
                    } else {
                        discount = parseFloat(promo.value);
                    }
                    if (discount > baseAmount) discount = baseAmount;

                    appliedPromoCode = promo.code;

                    // Increment usage
                    await client.query("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1", [promo.id]);
                }
            }
        }

        const taxableAmount = baseAmount - discount;

        // --- TAX LOGIC ---
        const taxRes = await client.query("SELECT value FROM system_settings WHERE key = 'tax_rate'");
        const taxRate = taxRes.rows.length > 0 ? parseFloat(taxRes.rows[0].value) : 0;
        const tax = Math.floor(taxableAmount * (taxRate / 100));

        const ADMIN_FEE = 0;

        const channelRes = await client.query('SELECT * FROM payment_channels WHERE id = $1', [payment_channel_id]);
        if (channelRes.rows.length === 0) throw new Error("Payment channel not found");
        const channel = channelRes.rows[0];

        let uniqueCode = 0;
        if (channel.type === 'manual_bank') {
            uniqueCode = Math.floor(Math.random() * 999) + 1;
        }

        // Final Amount
        const grandTotal = taxableAmount + tax + ADMIN_FEE + uniqueCode;

        const invoiceNumber = generateInvoice();

        // 3. Create Transaction Record
        // Append Promo to admin_note for record keeping
        const finalNote = appliedPromoCode ? `${description} | Promo: ${appliedPromoCode} (-${discount})` : description;

        const trxRes = await client.query(
            `INSERT INTO transactions 
             (organization_id, invoice_number, plan_id, addon_id, payment_channel_id, 
              subtotal, tax, admin_fee, unique_code, amount, 
              status, payment_method, cycle, admin_note)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13) 
             RETURNING id`,
            [
                organization_id, invoiceNumber, plan_id || null, addon_id || null, payment_channel_id,
                taxableAmount, tax, ADMIN_FEE, uniqueCode, grandTotal,
                channel.provider_name, cycle || 'monthly', finalNote
            ]
        );
        const transactionId = trxRes.rows[0].id;

        // 4. Handle Gateway Specifics
        if (channel.type === 'doku') {
            try {
                // Adjust items for DOKU (Distribute discount/tax or just send Line Item 'Subscription' with final Price?)
                // DOKU is strict about sum of items. Best to send 1 aggregated item or explicitly list tax/discount as items.
                // Sending negative price items (discount) might not be supported by all gateways.
                // Safe approach: Send 1 item "Plan Name (Net)" with grandTotal price.
                // Or: Item Price, Tax Item, Discount Item (if supported).
                // For simplicity and robustness: We override the items list sent to gateway to matched the charged amount.

                const gatewayItems = [{
                    name: description + (appliedPromoCode ? ` (Promo ${appliedPromoCode})` : ''),
                    price: grandTotal,
                    quantity: 1
                }];

                const dokuResponse = await dokuHelper.initiatePayment(
                    invoiceNumber,
                    parseInt(grandTotal),
                    { id: userId, name, email, phone: customerPhone },
                    gatewayItems
                );

                await client.query(`UPDATE transactions SET payment_proof_url = $1 WHERE id = $2`, [dokuResponse.response.payment.url, transactionId]);
                await client.query('COMMIT');

                return res.json({
                    transaction_id: transactionId,
                    payment_type: 'doku',
                    payment_url: dokuResponse.response.payment.url,
                    amount: grandTotal
                });
            } catch (dokuErr) {
                console.error("DOKU Checkout Error:", dokuErr);
                throw new Error(`DOKU Error: ${dokuErr.message}`);
            }
        }
        else if (channel.type === 'tripay') {
            try {
                // Similar to DOKU, for TriPay we just want to ensure the verification amount matches.
                // We will send specific line items for better UX on TriPay page if possible
                const tripayItems = [];
                tripayItems.push({
                    sku: items[0].sku,
                    name: items[0].name,
                    price: parseInt(taxableAmount), // Base - Discount
                    quantity: 1,
                    product_url: process.env.APP_URL,
                    image_url: thumbUrl
                });
                if (tax > 0) {
                    tripayItems.push({
                        sku: 'TAX',
                        name: 'VAT / PPN',
                        price: parseInt(tax),
                        quantity: 1,
                        product_url: process.env.APP_URL,
                        image_url: thumbUrl
                    });
                }

                // Note: TriPay sum of items MUST match amount.
                // taxableAmount + tax = grandTotal (assuming no admin fee/unique code for auto channels)

                const tripayPayload = {
                    method: channel.account_number,
                    merchant_ref: invoiceNumber,
                    amount: grandTotal,
                    customer_name: name,
                    customer_email: email,
                    customer_phone: customerPhone,
                    order_items: tripayItems,
                    return_url: `${process.env.APP_URL}/order/invoices`
                };

                const tripayData = await tripayService.requestTransaction(tripayPayload);

                await client.query(`UPDATE transactions SET payment_proof_url = $1 WHERE id = $2`, [tripayData.checkout_url, transactionId]);
                await client.query('COMMIT');

                return res.json({
                    transaction_id: transactionId,
                    payment_type: 'tripay',
                    payment_url: tripayData.checkout_url,
                    amount: grandTotal
                });

            } catch (tripayErr) {
                console.error("TriPay Checkout Error:", tripayErr);
                throw new Error(`TriPay Error: ${tripayErr.message}`);
            }
        }
        else if (channel.type === 'xendit') {
            try {
                // Xendit logic
                const xenditPayload = {
                    external_id: invoiceNumber,
                    amount: grandTotal,
                    payer_email: email,
                    description: description + (appliedPromoCode ? ` (Promo ${appliedPromoCode})` : ''),
                    success_redirect_url: `${process.env.APP_URL}/order/invoices`,
                    failure_redirect_url: `${process.env.APP_URL}/order/invoices`,
                    items: [
                        {
                            name: items[0].name,
                            quantity: 1,
                            price: grandTotal
                        }
                    ]
                };

                const xenditData = await xenditService.createInvoice(xenditPayload);

                await client.query(`UPDATE transactions SET payment_proof_url = $1 WHERE id = $2`, [xenditData.invoice_url, transactionId]);
                await client.query('COMMIT');

                return res.json({
                    transaction_id: transactionId,
                    payment_type: 'xendit', // Changed from doku/manual
                    payment_url: xenditData.invoice_url,
                    amount: grandTotal
                });

            } catch (xenditErr) {
                console.error("Xendit Checkout Error:", xenditErr);
                throw new Error(`Xendit Error: ${xenditErr.message}`);
            }
        }
        else {
            // Manual Transfer
            await client.query('COMMIT');
            return res.json({
                transaction_id: transactionId,
                payment_type: 'manual',
                bank_details: {
                    bank: channel.provider_name,
                    number: channel.account_number,
                    holder: channel.account_holder,
                    instructions: channel.instructions
                },
                amount: grandTotal,
                breakdown: {
                    subtotal: baseAmount,
                    discount: discount,
                    tax,
                    admin_fee: ADMIN_FEE,
                    unique_code: uniqueCode
                }
            });
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Checkout Controller Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// POST /api/app/billing/confirm-manual
export const confirmManualPayment = async (req, res) => {
    const { transaction_id } = req.body;
    const { organization_id } = req.user;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Payment proof image is required" });

    try {
        const proofUrl = `/uploads/${file.filename}`;

        const result = await pool.query(
            `UPDATE transactions
             SET payment_proof_url = $1, status = 'pending_confirmation', updated_at = NOW()
             WHERE id = $2 AND organization_id = $3 RETURNING id, status`,
            [proofUrl, transaction_id, organization_id]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Transaction not found" });

        res.json({
            message: "Payment proof uploaded. Waiting for admin confirmation.",
            transaction: result.rows[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
