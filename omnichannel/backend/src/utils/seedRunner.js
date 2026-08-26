import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

/**
 * Centralized Database Seeder for CRMHUB Omnichannel
 * Seeds:
 *  1. Default Subscription Plans & Plan Features
 *  2. Default Superadmin User (superadmin@example.com / Admin1234!)
 *  3. Default Demo Organization
 *  4. Default System Tags & Quick Reply Categories
 */

export const runSeeds = async () => {
    console.log('🌱 [DB Seeder] Starting database seeder...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // -------------------------------------------------------------
        // 1. Seed Default Plans
        // -------------------------------------------------------------
        console.log('  📦 Seeding default subscription plans...');
        const plansRes = await client.query('SELECT COUNT(*) FROM plans');
        if (parseInt(plansRes.rows[0].count) === 0) {
            const starterPlan = await client.query(`
                INSERT INTO plans (name, description, price_monthly, price_yearly, trial_days, is_trial_allowed, is_active)
                VALUES ('Starter / Trial', 'Paket percobaan fitur lengkap CRMHUB', 0, 0, 14, true, true)
                RETURNING id;
            `);
            const starterId = starterPlan.rows[0].id;

            const proPlan = await client.query(`
                INSERT INTO plans (name, description, price_monthly, price_monthly_promo, price_yearly, price_yearly_promo, trial_days, is_trial_allowed, is_active)
                VALUES ('Professional', 'Paket lengkap bisnis dengan multi-device dan AI Copilot', 299000, 199000, 2990000, 1990000, 0, false, true)
                RETURNING id;
            `);
            const proId = proPlan.rows[0].id;

            const entPlan = await client.query(`
                INSERT INTO plans (name, description, price_monthly, price_yearly, trial_days, is_trial_allowed, is_active)
                VALUES ('Enterprise Unlimited', 'Paket tanpa batas untuk skala enterprise & agensi', 799000, 7990000, 0, false, true)
                RETURNING id;
            `);
            const entId = entPlan.rows[0].id;

            // Plan features
            const features = [
                { plan_id: starterId, code: 'max_devices', limit: 1 },
                { plan_id: starterId, code: 'max_agents', limit: 2 },
                { plan_id: starterId, code: 'ai_copilot', limit: 100 },
                { plan_id: proId, code: 'max_devices', limit: 5 },
                { plan_id: proId, code: 'max_agents', limit: 10 },
                { plan_id: proId, code: 'ai_copilot', limit: 2000 },
                { plan_id: entId, code: 'max_devices', limit: 50 },
                { plan_id: entId, code: 'max_agents', limit: 100 },
                { plan_id: entId, code: 'ai_copilot', limit: 50000 }
            ];

            for (const f of features) {
                await client.query(
                    `INSERT INTO plan_features (plan_id, feature_code, is_enabled, limit_value) VALUES ($1, $2, true, $3)`,
                    [f.plan_id, f.code, f.limit]
                );
            }
            console.log('  ✅ Plans & features seeded successfully.');
        } else {
            console.log('  ⏩ Plans already exist, skipping plan seed.');
        }

        // -------------------------------------------------------------
        // 2. Seed Default Organization & Superadmin
        // -------------------------------------------------------------
        console.log('  👤 Seeding default superadmin & organization...');
        const firstPlan = await client.query('SELECT id FROM plans ORDER BY id ASC LIMIT 1');
        const planId = firstPlan.rows[0]?.id || null;

        // Check or create default Organization
        let orgId;
        const orgCheck = await client.query("SELECT id FROM organizations WHERE name = 'Demo Organization' LIMIT 1");
        if (orgCheck.rows.length === 0) {
            const newOrg = await client.query(
                `INSERT INTO organizations (name, plan_id, subscription_status, is_active)
                 VALUES ('Demo Organization', $1, 'active', true) RETURNING id`,
                [planId]
            );
            orgId = newOrg.rows[0].id;
            console.log(`  ✅ Created Demo Organization (ID: ${orgId})`);
        } else {
            orgId = orgCheck.rows[0].id;
        }

        // Check or create Super Admin User
        const adminEmail = 'superadmin@example.com';
        const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
        if (userCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('Admin1234!', 10);
            await client.query(
                `INSERT INTO users (organization_id, name, email, password, role, is_active)
                 VALUES ($1, 'Super Admin', $2, $3, 'superadmin', true)`,
                [orgId, adminEmail, hashedPassword]
            );
            console.log(`  ✅ Super Admin user created: ${adminEmail} (Password: Admin1234!)`);
        } else {
            console.log(`  ⏩ Superadmin (${adminEmail}) already exists.`);
        }

        // -------------------------------------------------------------
        // 3. Seed Default Tags & Categories
        // -------------------------------------------------------------
        console.log('  🏷️  Seeding default tags & categories...');
        const defaultTags = ['VIP Customer', 'Prospek Panas', 'Komplain', 'Follow Up', 'Pembayaran Pending'];
        for (const tag of defaultTags) {
            await client.query(
                `INSERT INTO tags (organization_id, name, color)
                 VALUES ($1, $2, '#4f46e5')
                 ON CONFLICT (organization_id, name) DO NOTHING`,
                [orgId, tag]
            ).catch(() => {});
        }

        await client.query('COMMIT');
        console.log('\n=========================================');
        console.log('🎉 [DB Seeder Completed Successfully]');
        console.log('=========================================\n');
        return { success: true };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('💥 [DB Seeder Error]:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

// Auto-run if executed directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runSeeds()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export default runSeeds;
