import pool from '../config/db.js';
import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

const broadcastQueue = new Queue('broadcast-queue', { connection: redisConnection });

export const initUpsellingScheduler = async () => {
    await ensureTableExists(); // Ensure DB is ready
    console.log("[UpsellingScheduler] Initialized. Checking every 60s.");
    setInterval(runCheck, 60 * 1000);
    // Run immediately on boot
    runCheck();
};

const ensureTableExists = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS upselling_campaigns (
                id SERIAL PRIMARY KEY,
                organization_id INT NOT NULL,
                name TEXT NOT NULL,
                frequency VARCHAR(50) NOT NULL, -- 'daily', 'monthly', 'yearly'
                time TIME NOT NULL,
                day_of_month INT,
                month_of_year INT,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                device_id INT, -- NULL means AI/Auto
                rotator_group_id INT,
                target_type VARCHAR(50), -- 'label', 'all', etc
                target_value TEXT,
                message_template TEXT,
                delay_seconds INT DEFAULT 60,
                status VARCHAR(50) DEFAULT 'active',
                last_run_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            ALTER TABLE contacts ADD COLUMN IF NOT EXISTS birth_date DATE;
        `);
    } catch (err) {
        console.error("[UpsellingScheduler] Schema Check Error:", err);
    } finally {
        client.release();
    }
};

const runCheck = async () => {
    try {
        const client = await pool.connect();

        // Find campaigns that are active, started, not ended, and haven't run today
        // Logic: 
        // 1. Fetch Candidates
        // 2. Filter by Frequency & Time match in JS (easier than complex SQL with Timezones)

        // Force Timezone to Jakarta (GMT+7) for accurate scheduling
        const nowIdx = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
        const now = new Date(nowIdx);
        const nowHours = now.getHours();
        const nowMinutes = now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];

        const res = await client.query(`
            SELECT * FROM upselling_campaigns 
            WHERE status = 'active' 
            AND start_date <= NOW() 
            AND (end_date IS NULL OR end_date >= NOW())
        `);

        console.log(`[UpsellingScheduler] Checking ${res.rows.length} campaigns at ${nowHours}:${nowMinutes}`);

        for (const camp of res.rows) {
            // Check if already run today
            if (camp.last_run_at) {
                const lastRunLocal = new Date(new Date(camp.last_run_at).toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
                const lastRunDate = lastRunLocal.toISOString().split('T')[0];
                if (lastRunDate === todayStr) continue; // Already run today
            }

            // Check Time (Robust numeric comparison)
            const [campH, campM] = camp.time.split(':').map(Number);
            if (nowHours < campH || (nowHours === campH && nowMinutes < campM)) continue;

            // Check Frequency
            const d = now.getDate();
            const m = now.getMonth() + 1; // 1-12

            let shouldRun = false;
            if (camp.frequency === 'daily') {
                shouldRun = true;
            } else if (camp.frequency === 'monthly') {
                if (d === camp.day_of_month) shouldRun = true;
            } else if (camp.frequency === 'yearly') {
                if (d === camp.day_of_month && m === camp.month_of_year) shouldRun = true;
            }

            if (shouldRun) {
                await triggerBroadcast(client, camp);
            }
        }

        client.release();
    } catch (err) {
        console.error("[UpsellingScheduler] Error:", err);
    }
};

const triggerBroadcast = async (client, camp) => {
    console.log(`[UpsellingScheduler] Triggering campaign: ${camp.name} (ID: ${camp.id})`);

    // START TRANSACTION
    // Note: client passed from runCheck acts as 'pool', so we can use it, but we need to manage transaction manually if we want atomic ops.
    // However, `runCheck` iterates. We should assume `triggerBroadcast` logic is self-contained or uses the client safely.
    // 'client' here is actually a checked-out client from pool in runCheck. So we can use it.

    try {
        await client.query('BEGIN');

        const broadcastName = `Upselling: ${camp.name} - ${new Date().toISOString().split('T')[0]}`;

        const bRes = await client.query(`
            INSERT INTO broadcasts 
            (organization_id, name, message_template, target_type, target_value, rotator_group_id, device_id, status, created_at, scheduled_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing', NOW(), NOW())
            RETURNING id
        `, [
            camp.organization_id,
            broadcastName,
            camp.message_template,
            camp.target_type,
            camp.target_value,
            camp.rotator_group_id,
            camp.device_id
        ]);
        const broadcastId = bRes.rows[0].id;

        // Determine Channel Type
        let channelType = 'whatsapp';
        if (camp.device_id) {
            const devCheck = await client.query('SELECT type FROM whatsapp_sessions WHERE id = $1', [camp.device_id]);
            if (devCheck.rows.length > 0) {
                const t = devCheck.rows[0].type;
                if (['messenger', 'instagram', 'telegram', 'tiktok'].includes(t)) {
                    channelType = t;
                }
            }
        }
        let sourceFilter = "";
        if (channelType === 'whatsapp') {
            sourceFilter = " AND c.source NOT IN ('messenger', 'instagram', 'telegram', 'tiktok') ";
        } else {
            sourceFilter = ` AND c.source = '${channelType}' `;
        }

        // Resolve Recipients
        let recipients = [];
        if (camp.target_type === 'all') {
            const contactsRes = await client.query(`SELECT c.name, c.phone_number, c.birth_date FROM contacts c WHERE c.organization_id = $1 AND c.is_subscribed = true ${sourceFilter}`, [camp.organization_id]);
            recipients = contactsRes.rows.map(c => ({ name: c.name, phone: c.phone_number, birthday: c.birth_date }));
        } else if (camp.target_type === 'label') {
            const labelIds = JSON.parse(camp.target_value || '[]');
            if (labelIds.length > 0) {
                const contactsRes = await client.query(`
                    SELECT DISTINCT c.name, c.phone_number, c.birth_date 
                    FROM contacts c
                    JOIN contact_labels cl ON c.id = cl.contact_id
                    WHERE c.organization_id = $1 AND cl.label_id = ANY($2::int[]) AND c.is_subscribed = true ${sourceFilter}
                `, [camp.organization_id, labelIds]);
                recipients = contactsRes.rows.map(c => ({ name: c.name, phone: c.phone_number, birthday: c.birth_date }));
            }
        } else if (camp.target_type === 'group') {
            const selectedGroups = JSON.parse(camp.target_value || '[]');
            recipients = selectedGroups.map(g => ({
                name: g.name, phone: g.id, isGroup: true
            }));
        }

        if (recipients.length === 0) {
            console.log(`[UpsellingScheduler] No recipients for ${camp.name}. Skipping jobs.`);
            // Still accept the run
            await client.query('UPDATE upselling_campaigns SET last_run_at = NOW() WHERE id = $1', [camp.id]);
            await client.query("UPDATE broadcasts SET status = 'completed' WHERE id = $1", [broadcastId]);
            await client.query('COMMIT');
            return;
        }

        // Queue Jobs
        const jobs = [];
        for (let i = 0; i < recipients.length; i++) {
            const r = recipients[i];

            // Recipient Record
            const recRes = await client.query(
                `INSERT INTO broadcast_recipients (broadcast_id, phone_number, name, status, group_name)
                  VALUES ($1, $2, $3, 'queued', $4) RETURNING id`,
                [broadcastId, r.phone, r.name, r.isGroup ? r.name : null]
            );

            // Use camp.delay_seconds default or 5s
            const interval = (camp.delay_seconds || 5) * 1000;
            const delay = i * interval;

            jobs.push({
                name: 'send-message',
                data: {
                    broadcastId,
                    recipientId: recRes.rows[0].id,
                    contactId: null,
                    messageTemplate: camp.message_template,
                    rotatorGroupId: camp.rotator_group_id,
                    deviceId: camp.device_id,
                    orgId: camp.organization_id,
                    isGroup: r.isGroup,
                    customVars: {
                        birthday: r.birthday ? new Date(r.birthday).toISOString().split('T')[0] : ''
                    }
                },
                opts: { delay }
            });
        }

        await broadcastQueue.addBulk(jobs);
        await client.query('UPDATE upselling_campaigns SET last_run_at = NOW() WHERE id = $1', [camp.id]);
        await client.query('COMMIT');

    } catch (err) {
        await client.query('ROLLBACK');

        // Handle Foreign Key Violation (Device/Rotator Deleted)
        if (err.code === '23503') {
            console.warn(`[UpsellingScheduler] Campaign ${camp.id} failed: Device/Rotator dependency missing (FK Violation). Pausing campaign.`);

            try {
                // Use a fresh query to update status since previous transaction is dead
                await client.query("UPDATE upselling_campaigns SET status = 'paused', updated_at = NOW() WHERE id = $1", [camp.id]);
                console.log(`[UpsellingScheduler] Campaign ${camp.id} successfully paused.`);
            } catch (updateErr) {
                console.error(`[UpsellingScheduler] Failed to pause campaign ${camp.id}:`, updateErr.message);
            }
        } else {
            // Log other errors as usual
            console.error(`[UpsellingScheduler] Failed transaction for ${camp.id}:`, err);
        }
    }
};
