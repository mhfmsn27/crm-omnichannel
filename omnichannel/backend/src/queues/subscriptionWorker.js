import pool from '../config/db.js';
import { sendEmail } from '../services/emailService.js';
import { fcmService } from '../services/fcmService.js';

export const initSubscriptionWorker = () => {
    // Run every day at 09:00 AM (or run every hour and check)
    // For simplicity: Run every hour, but only process if not processed today.
    // Or simpler: Run every 60 minutes and logic checks if "7 days from now" matches expiry date date-part.

    // Interval: 1 hour = 3600000 ms
    setInterval(async () => {
        await checkExpiringSubscriptions();
    }, 3600000);

    // Run once on startup after 1 min
    setTimeout(() => {
        checkExpiringSubscriptions();
    }, 60000);

    console.log("Subscription Worker Initialized");
};

const checkExpiringSubscriptions = async () => {
    const client = await pool.connect();
    try {
        console.log("[SubscriptionWorker] Checking expiring subscriptions...");

        // 1. Get subscriptions expiring in 7 days (date match)
        // usage: expires_at::date = (NOW() + interval '7 days')::date
        // prevent sending multiple times: We can check a log table, OR simplistically relying on the fact that this runs hourly 
        // and we might send duplicate emails if we don't flag them.
        // BETTER: Check if we haven't sent 'expiry_warning_7d' notification for this sub yet.
        // Since we don't have a notification_logs table structure handy, we'll try to check 'system_notifications' or similar?
        // OR: Just query based on time range (expires_at between NOW+7d and NOW+7d+1h).

        // Simpler approach for MVP: 
        // SELECT * FROM subscriptions WHERE expires_at BETWEEN NOW() + interval '7 days' AND NOW() + interval '7 days 1 hour'
        // This relies on the worker running exactly every hour. Risk of miss/dupe.

        // Robust approach: 
        // Add a column `last_expiry_notification_at` to subscriptions? schema change.
        // OR use `activity_logs`.

        // Let's use `activity_logs`.

        const targetDateStart = new Date();
        targetDateStart.setDate(targetDateStart.getDate() + 7);
        targetDateStart.setHours(0, 0, 0, 0);

        const targetDateEnd = new Date(targetDateStart);
        targetDateEnd.setHours(23, 59, 59, 999);

        // Find subs expiring in 7 days
        const res = await client.query(`
            SELECT s.id, s.organization_id, s.expires_at, 
                   u.email, u.name, u.id as user_id,
                   p.name as plan_name
            FROM subscriptions s
            JOIN organizations o ON s.organization_id = o.id
            JOIN users u ON u.organization_id = o.id AND u.role = 'super_admin' -- Notify Super Admin Only
            JOIN plans p ON s.plan_id = p.id
            WHERE s.status IN ('active', 'trialing')
            AND s.expires_at >= $1 AND s.expires_at <= $2
        `, [targetDateStart, targetDateEnd]);

        for (const sub of res.rows) {
            // Check if we already notified this user for this subscription recently (in fast 24h)
            const logCheck = await client.query(`
                SELECT id FROM activity_logs 
                WHERE action = 'NOTIF_EXPIRY_7D' 
                AND target_id = $1 -- Subscription ID
                AND created_at > NOW() - INTERVAL '24 hours'
            `, [sub.id]);

            if (logCheck.rows.length === 0) {
                // Send Notification
                console.log(`[SubscriptionWorker] Sending warning to Org ${sub.organization_id} (User ${sub.email})`);

                // 1. Email
                const subject = `Peringatan: Paket ${sub.plan_name} Anda akan berakhir dalam 7 hari`;
                const html = `
                    <p>Halo ${sub.name},</p>
                    <p>Masa aktif paket <b>${sub.plan_name}</b> Anda akan berakhir pada <b>${new Date(sub.expires_at).toLocaleDateString()}</b> (7 hari lagi).</p>
                    <p>Silakan lakukan perpanjangan agar layanan Broadcast dan Chatbot tidak terhenti.</p>
                    <br>
                    <p>Terima kasih,<br>CRMHub Team</p>
                `;
                await sendEmail(sub.email, subject, html);

                // 2. In-App Notification (FCM + DB)
                const notifTitle = "Paket Segera Berakhir";
                const notifBody = `Paket ${sub.plan_name} Anda berakhir dalam 7 hari. Segera perpanjang!`;

                // Save to DB (wrapped: table may not exist on legacy databases)
                try {
                    await client.query(`
                        INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
                        VALUES ($1, $2, $3, 'system', false, NOW())
                    `, [sub.user_id, notifTitle, notifBody]);
                } catch (dbNotifErr) {
                    console.warn(`[SubscriptionWorker] Could not save in-app notification (table may not exist):`, dbNotifErr.message);
                }

                // Send FCM
                await fcmService.sendNewMessageNotification(
                    sub.organization_id,
                    sub.user_id,
                    'system', // special ID for system
                    'System',
                    notifBody
                );
                // Note: fcmService.sendNewMessageNotification is designed for chat, but we can reuse or use sendMulticast directly if we had tokens.
                // Actually `sendNewMessageNotification` inside fcmService fetches tokens. Let's use it or `sendMulticast` logic if exposed.
                // Refactoring `fcmService.js` exposed `sendMulticast`. We need tokens.

                // Easier: Use `fcmService.sendMulticast` after fetching tokens manually 
                const tokenRes = await client.query('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1', [sub.user_id]);
                const tokens = tokenRes.rows.map(r => r.fcm_token);
                if (tokens.length > 0) {
                    await fcmService.sendMulticast(tokens, notifTitle, notifBody, { type: 'system_notification' });
                }

                // Log Action
                await client.query(`
                    INSERT INTO activity_logs (actor_id, target_type, target_id, action, details)
                    VALUES ($1, 'subscription', $2, 'NOTIF_EXPIRY_7D', 'Sent 7-day expiry warning')
                `, [sub.user_id, sub.id]);
            }
        }

    } catch (err) {
        console.error("[SubscriptionWorker] Error:", err);
    } finally {
        client.release();
    }
};
