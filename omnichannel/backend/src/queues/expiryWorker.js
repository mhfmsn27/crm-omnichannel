import pool from '../config/db.js';
import * as waService from '../services/waGatewayService.js';
import { sendSystemNotification } from '../services/notificationService.js';
import { sendSubscriptionWarningEmail, sendSubscriptionExpiredEmail } from '../services/emailService.js';

// Schedule to run every hour
export const initExpiryWorker = () => {
    // Run immediately on boot after small delay
    setTimeout(checkExpiry, 30000);

    // Schedule intervals (every 1 hour)
    setInterval(() => {
        checkExpiry();
    }, 60 * 60 * 1000);
};

const checkExpiry = async () => {
    console.log("[ExpiryWorker] Checking subscriptions (Hourly)...");
    const client = await pool.connect();
    try {
        // 1. WARNING (H-3)
        // Check if expiration date (in Jakarta Time) is exactly 3 days from today
        // DISTINCT to avoid duplicates if multiple admins
        const warningQuery = `
            SELECT DISTINCT ON (s.id) s.id, s.expires_at, o.name as org_name, u.name as user_name, u.phone, u.email, p.name as plan_name
            FROM subscriptions s
            JOIN organizations o ON s.organization_id = o.id
            JOIN plans p ON s.plan_id = p.id
            JOIN users u ON o.id = u.organization_id
            WHERE s.status = 'active'
            AND (s.expires_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date + INTERVAL '3 days'
            AND u.role = 'admin_member'
        `;

        const warningRes = await client.query(warningQuery);
        for (const sub of warningRes.rows) {
            const dateStr = new Date(sub.expires_at).toLocaleDateString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Send WA
            await sendSystemNotification('sub_warning', {
                name: sub.user_name,
                phone: sub.phone,
                email: sub.email,
                org_name: sub.org_name
            }, {
                plan_name: sub.plan_name,
                expiry_date: dateStr
            });

            // Send Email
            sendSubscriptionWarningEmail(sub.email, sub.user_name, sub.plan_name, dateStr).catch(err =>
                console.error(`[ExpiryWorker] Failed to send warning email to ${sub.email}:`, err.message)
            );
        }

        // 2. EXPIRED
        // Check if expired strictly by timestamp comparison < NOW()
        // Use DISTINCT to process each subscription once
        const expiredQuery = `
            SELECT DISTINCT ON (s.id) s.id, s.organization_id, s.expires_at, o.name as org_name, u.name as user_name, u.phone, u.email, p.name as plan_name
            FROM subscriptions s
            JOIN organizations o ON s.organization_id = o.id
            JOIN plans p ON s.plan_id = p.id
            JOIN users u ON o.id = u.organization_id
            WHERE s.status = 'active'
            AND s.expires_at < NOW()
            AND u.role = 'admin_member'
        `;

        const expiredRes = await client.query(expiredQuery);

        // Fetch Free Plan ID (Cached or queried once)
        let freePlanId = null;
        try {
            // Look for plan with price_monthly 0 (assuming Free/Basic is 0)
            const planRes = await client.query("SELECT id FROM plans WHERE price_monthly = 0 ORDER BY price_monthly ASC LIMIT 1");
            if (planRes.rows.length > 0) freePlanId = planRes.rows[0].id;
        } catch (e) {
            console.error("[ExpiryWorker] Failed to find Free plan ID:", e);
        }

        if (expiredRes.rows.length > 0) {
            console.log(`[ExpiryWorker] Found ${expiredRes.rows.length} expired subscriptions.`);
        }

        for (const sub of expiredRes.rows) {
            console.log(`[ExpiryWorker] Processing expired subscription for Org ${sub.org_name}`);

            // 1. Downgrade to Free Plan (if found)
            if (freePlanId) {
                // Set status to 'active' (free tier is active), expires_at to NULL (forever free)
                await client.query(
                    "UPDATE subscriptions SET plan_id = $1, status = 'active', expires_at = NULL, updated_at = NOW() WHERE id = $2",
                    [freePlanId, sub.id]
                );
                await client.query("UPDATE organizations SET subscription_status = 'active' WHERE id = $1", [sub.organization_id]);
                console.log(`[ExpiryWorker] Downgraded Org ${sub.org_name} to Free Plan`);
            } else {
                // Fallback if no free plan found: Just mark expired
                await client.query("UPDATE subscriptions SET status = 'expired' WHERE id = $1", [sub.id]);
                await client.query("UPDATE organizations SET subscription_status = 'expired' WHERE id = $1", [sub.organization_id]);
                console.log(`[ExpiryWorker] Marked Org ${sub.org_name} as Expired (No Free Plan)`);
            }

            // 2. Disconnect and Delete All Devices (Soft Delete / Hapus per request)
            try {
                // Fetch sessions
                const sessionsRes = await client.query("SELECT session_id FROM whatsapp_sessions WHERE organization_id = $1", [sub.organization_id]);
                console.log(`[ExpiryWorker] Deleting ${sessionsRes.rows.length} devices for Org ${sub.organization_id}`);

                for (const session of sessionsRes.rows) {
                    try {
                        await waService.deleteSession(session.session_id); // Remove from Gateway
                    } catch (gwErr) {
                        console.error(`[ExpiryWorker] Gateway delete error for ${session.session_id}:`, gwErr.message);
                    }
                }

                // Delete from DB (This effectively hides all chats in Inbox as per 'ON DELETE SET NULL' or stricter logic)
                await client.query("DELETE FROM whatsapp_sessions WHERE organization_id = $1", [sub.organization_id]);

            } catch (devErr) {
                console.error(`[ExpiryWorker] Failed to delete devices for Org ${sub.organization_id}:`, devErr.message);
            }

            // Send WA Notification
            await sendSystemNotification('sub_expired', {
                name: sub.user_name,
                phone: sub.phone,
                email: sub.email,
                org_name: sub.org_name
            });

            // Send Email Notification
            sendSubscriptionExpiredEmail(sub.email, sub.user_name, sub.plan_name).catch(err =>
                console.error(`[ExpiryWorker] Failed to send expired email to ${sub.email}:`, err.message)
            );
        }

    } catch (err) {
        console.error("[ExpiryWorker] Error:", err);
    } finally {
        client.release();
    }
};