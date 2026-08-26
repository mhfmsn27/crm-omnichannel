
import pool from '../config/db.js';
import { sendSystemNotification } from '../services/notificationService.js';

// Schedule to run at 08:00 WIB everyday
export const initTrialWorker = () => {
    const scheduleNextRun = () => {
        const now = new Date();
        const target = new Date(now);
        target.setUTCHours(1, 0, 0, 0); // 01:00 UTC = 08:00 WIB

        if (now > target) {
            target.setUTCDate(target.getUTCDate() + 1);
        }

        const delay = target.getTime() - now.getTime();
        console.log(`[TrialWorker] Next run in ${Math.round(delay/1000/60)} minutes`);

        setTimeout(async () => {
            await checkTrialExpiry();
            scheduleNextRun();
        }, delay);
    };

    scheduleNextRun();
};

const checkTrialExpiry = async () => {
    console.log("[TrialWorker] Checking expired trials...");
    const client = await pool.connect();
    try {
        // Check expired trials
        const expiredQuery = `
            SELECT s.id, s.trial_ends_at, o.name as org_name, u.name as user_name, u.phone, u.email, p.name as plan_name
            FROM subscriptions s
            JOIN organizations o ON s.organization_id = o.id
            JOIN plans p ON s.plan_id = p.id
            JOIN users u ON o.id = u.organization_id
            WHERE s.status = 'trialing' 
            AND s.trial_ends_at < NOW()
            AND u.role = 'admin_member'
        `;

        const expiredRes = await client.query(expiredQuery);
        for (const sub of expiredRes.rows) {
            // Update status
            await client.query("UPDATE subscriptions SET status = 'expired' WHERE id = $1", [sub.id]);
            await client.query("UPDATE organizations SET subscription_status = 'expired' WHERE id = (SELECT organization_id FROM subscriptions WHERE id = $1)", [sub.id]);

            // Send Notification
            await sendSystemNotification('sub_expired', {
                name: sub.user_name,
                phone: sub.phone,
                email: sub.email,
                org_name: sub.org_name
            }, {
                plan_name: `${sub.plan_name} (Trial)`
            });
            
            console.log(`[TrialWorker] Expired trial for ${sub.org_name}`);
        }

    } catch (err) {
        console.error("[TrialWorker] Error:", err);
    } finally {
        client.release();
    }
};
