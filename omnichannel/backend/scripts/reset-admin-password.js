#!/usr/bin/env node
/**
 * Utility Script: Reset User / Superadmin Password
 * Usage:
 *   node scripts/reset-admin-password.js superadmin@example.com Admin1234!
 *   node scripts/reset-admin-password.js your_email@domain.com your_new_password
 */

import pool from '../src/config/db.js';
import bcrypt from 'bcrypt';

const args = process.argv.slice(2);
const email = args[0] || 'superadmin@example.com';
const newPassword = args[1] || 'Admin1234!';

async function resetPassword() {
    console.log('\n=========================================');
    console.log('🔑 CRMHUB PASSWORD RESET UTILITY');
    console.log('=========================================');
    console.log(`👤 Target Email : ${email}`);
    console.log(`🔒 New Password : ${newPassword}`);
    console.log('-----------------------------------------');

    const client = await pool.connect();
    try {
        const checkRes = await client.query('SELECT id, name, role FROM users WHERE email = $1', [email]);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (checkRes.rows.length === 0) {
            console.log(`ℹ️  User "${email}" belum ada di database. Membuat akun baru...`);
            
            // Get or create organization
            let orgId = 1;
            const orgRes = await client.query('SELECT id FROM organizations LIMIT 1');
            if (orgRes.rows.length > 0) {
                orgId = orgRes.rows[0].id;
            } else {
                const newOrg = await client.query("INSERT INTO organizations (name) VALUES ('Default Organization') RETURNING id");
                orgId = newOrg.rows[0].id;
            }

            await client.query(
                `INSERT INTO users (organization_id, name, email, password_hash, role)
                 VALUES ($1, 'Super Admin', $2, $3, 'super_admin')`,
                [orgId, email, hashedPassword]
            );
            console.log(`✅ Akun "${email}" berhasil dibuat dengan password "${newPassword}"!`);
        } else {
            await client.query(
                'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
                [hashedPassword, email]
            );
            console.log(`✅ Password untuk akun "${email}" berhasil di-reset menjadi "${newPassword}"!`);
        }

        console.log('=========================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Gagal mereset password:', err.message);
        process.exit(1);
    } finally {
        client.release();
    }
}

resetPassword();
