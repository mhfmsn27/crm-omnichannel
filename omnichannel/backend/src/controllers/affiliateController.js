
import pool from '../config/db.js';
import { sendSystemNotification } from '../services/notificationService.js';
import crypto from 'crypto';

// --- AUTO MIGRATION ---
const ensureAffiliateSchema = async () => {
    try {
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_id INT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS affiliate_clicks INT DEFAULT 0; -- NEW: Click Tracking
            
            -- Add wallet balance to users if not strictly calculated from commissions
            -- But usually calculated on fly. Let's optimize by adding wallet_balance column? 
            -- No, let's calculate on fly or use a separate affiliate_wallet table.
            -- For simplicity, let's just calculate: Sum(Commissions) - Sum(Payouts).

            CREATE TABLE IF NOT EXISTS affiliate_commissions (
                id SERIAL PRIMARY KEY,
                partner_id INT NOT NULL,
                source_user_id INT, -- The user who purchased
                amount NUMERIC(15,2) NOT NULL,
                order_ref VARCHAR(50), -- Invoice number
                description TEXT,
                status VARCHAR(20) DEFAULT 'available', -- available, void
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS affiliate_payouts (
                id SERIAL PRIMARY KEY,
                partner_id INT NOT NULL,
                amount NUMERIC(15,2) NOT NULL,
                bank_details TEXT,
                status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
                proof_url TEXT,
                requested_at TIMESTAMPTZ DEFAULT NOW(),
                processed_at TIMESTAMPTZ
            );
            
            -- Seed Settings
            INSERT INTO system_settings (key, value, group_name, type) 
            VALUES ('affiliate_commission_rate', '20', 'affiliate', 'number'),
                   ('affiliate_min_payout', '100000', 'affiliate', 'number')
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log("[Affiliate] Schema matched.");
    } catch (e) {
        console.warn("[Affiliate] Schema warning:", e.message);
    }
};
ensureAffiliateSchema();

// --- HELPER: Process Commission ---
export const processAffiliateCommission = async (trx, client) => {
    // trx object contains: organization_id, amount, invoice_number, item_name
    console.log(`[Affiliate] Processing Commission for Invoice: ${trx.invoice_number}, Org: ${trx.organization_id}, Amount: ${trx.amount}`);
    try {
        if (trx.addon_id) {
            console.log(`[Affiliate] Skipped: Commission not applicable for Add-ons (Invoice: ${trx.invoice_number})`);
            return;
        }

        // Find owner of organization
        const ownerRes = await client.query(
            "SELECT id, name, referrer_id FROM users WHERE organization_id = $1 ORDER BY id ASC LIMIT 1",
            [trx.organization_id]
        );

        if (ownerRes.rows.length === 0) {
            console.log(`[Affiliate] Skipped: No owner found for Org ${trx.organization_id}`);
            return;
        }

        const owner = ownerRes.rows[0];
        if (!owner.referrer_id) {
            console.log(`[Affiliate] Skipped: Owner ${owner.name} (ID: ${owner.id}) has no referrer.`);
            return;
        }

        // Get Commission Rate
        const settingRes = await client.query("SELECT value FROM system_settings WHERE key = 'affiliate_commission_rate'");
        const rate = parseFloat(settingRes.rows[0]?.value || 20);

        // Calculate based on Subtotal (Base Price - Promo), excluding Tax & Admin Fees
        // Fallback to amount if subtotal is not available (legacy)
        const baseAmount = trx.subtotal ? parseFloat(trx.subtotal) : parseFloat(trx.amount);

        const commissionAmount = (baseAmount * rate) / 100;
        console.log(`[Affiliate] Rate: ${rate}%, Base: ${baseAmount}, Commission: ${commissionAmount}`);
        console.log(`[Affiliate] Rate: ${rate}%, Commission Amount: ${commissionAmount}`);

        if (commissionAmount <= 0) {
            console.log("[Affiliate] Skipped: Commission amount is 0 or negative.");
            return;
        }

        // Insert Commission
        await client.query(
            `INSERT INTO affiliate_commissions (partner_id, source_user_id, amount, order_ref, description, status)
             VALUES ($1, $2, $3, $4, $5, 'available')`,
            [owner.referrer_id, owner.id, commissionAmount, trx.invoice_number, `Commission from ${trx.item_name || 'Order'}`]
        );

        console.log(`[Affiliate] Commission recorded: ${commissionAmount} for Partner ${owner.referrer_id} (Source: ${owner.id})`);

    } catch (err) {
        console.error("[Affiliate] Commission Error:", err);
        // Don't block the main transaction, just log.
    }
};

// --- PUBLIC: Track Click ---
export const trackReferralClick = async (req, res) => {
    const { code } = req.params;
    const { json } = req.query;

    try {
        if (!code) {
            if (json) return res.status(400).json({ error: "No code" });
            return res.redirect(`${process.env.APP_URL}/register`);
        }

        // Check if code exists
        const userRes = await pool.query("SELECT id FROM users WHERE referral_code = $1", [code]);
        if (userRes.rows.length > 0) {
            // Async click counting
            await pool.query("UPDATE users SET affiliate_clicks = affiliate_clicks + 1 WHERE id = $1", [userRes.rows[0].id]);
        }

        if (json) return res.json({ success: true, code });

        // Redirect to Register Page with Ref param
        return res.redirect(`${process.env.APP_URL}/register?ref=${code}`);

    } catch (err) {
        console.error("Referral Track Error:", err);
        if (json) return res.status(500).json({ error: err.message });
        return res.redirect(`${process.env.APP_URL}/register`);
    }
};

// --- USER APIs ---

export const getPartnerStats = async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. Referral Link/Code
        let userRes = await pool.query("SELECT referral_code, affiliate_clicks FROM users WHERE id = $1", [userId]);
        let userData = userRes.rows[0];
        let refCode = userData?.referral_code;

        // Generate if missing
        if (!refCode) {
            refCode = crypto.randomBytes(4).toString('hex');
            await pool.query("UPDATE users SET referral_code = $1 WHERE id = $2", [refCode, userId]);
        }

        // 2. Stats
        // Total Earnings
        const earnRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM affiliate_commissions WHERE partner_id = $1 AND status = 'available'",
            [userId]
        );
        const totalEarnings = parseFloat(earnRes.rows[0].total);

        // Paid Out
        const payoutRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM affiliate_payouts WHERE partner_id = $1 AND status = 'approved'",
            [userId]
        );
        const totalPaid = parseFloat(payoutRes.rows[0].total);

        // Pending Payouts (deducted from balance view usually, or just show as pending)
        const pendingRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total FROM affiliate_payouts WHERE partner_id = $1 AND status = 'pending'",
            [userId]
        );
        const totalPending = parseFloat(pendingRes.rows[0].total);

        const balance = totalEarnings - totalPaid - totalPending;

        // Total Referrals
        const refRes = await pool.query("SELECT COUNT(*) as count FROM users WHERE referrer_id = $1", [userId]);
        const totalReferrals = parseInt(refRes.rows[0].count);

        res.json({
            referral_code: refCode,
            referral_link: `${process.env.APP_URL}/ref/${refCode}`, // Use APP URL for tracking
            stats: {
                total_earnings: totalEarnings,
                paid_out: totalPaid,
                balance: balance,
                total_referrals: totalReferrals,
                total_clicks: userData?.affiliate_clicks || 0 // New Field
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getCommissionHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT c.*, u.name as source_user_name
            FROM affiliate_commissions c
            LEFT JOIN users u ON c.source_user_id = u.id
            WHERE c.partner_id = $1
            ORDER BY c.created_at DESC LIMIT 50
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getPayoutHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query("SELECT * FROM affiliate_payouts WHERE partner_id = $1 ORDER BY requested_at DESC", [userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const requestPayout = async (req, res) => {
    const userId = req.user.id;
    const { amount, bank_details } = req.body;

    try {
        // Valdiate Min Payout
        const settingRes = await pool.query("SELECT value FROM system_settings WHERE key = 'affiliate_min_payout'");
        const minPayout = parseFloat(settingRes.rows[0]?.value || 100000);

        if (amount < minPayout) return res.status(400).json({ error: `Minimum payout is Rp ${minPayout.toLocaleString()}` });

        // Validate Balance
        // Re-calc balance
        const earnRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM affiliate_commissions WHERE partner_id = $1 AND status = 'available'", [userId]);
        const payoutRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM affiliate_payouts WHERE partner_id = $1 AND status IN ('approved', 'pending')", [userId]); // Include pending!

        const balance = parseFloat(earnRes.rows[0].total) - parseFloat(payoutRes.rows[0].total);

        if (amount > balance) return res.status(400).json({ error: "Insufficient balance" });

        await pool.query(
            "INSERT INTO affiliate_payouts (partner_id, amount, bank_details, status) VALUES ($1, $2, $3, 'pending')",
            [userId, amount, bank_details]
        );

        // Notify Admin? (Optional)

        res.json({ message: "Payout requested" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- ADMIN APIs ---

export const getAdminPayoutRequests = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, u.name as partner_name, u.email as partner_email
            FROM affiliate_payouts p
            JOIN users u ON p.partner_id = u.id
            ORDER BY 
                CASE WHEN p.status = 'pending' THEN 1 ELSE 2 END,
                p.requested_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updatePayoutStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // approved, rejected

    try {
        await pool.query(
            "UPDATE affiliate_payouts SET status = $1, processed_at = NOW() WHERE id = $2",
            [status, id]
        );
        res.json({ message: "Status updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
