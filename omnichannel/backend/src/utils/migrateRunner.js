import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

/**
 * Centralized Database Migration Runner for CRMHUB Omnichannel
 * Features:
 *  - Automatic `_schema_migrations` tracking table
 *  - Deterministic version ordering (Numbered migrations first, then feature migrations)
 *  - Safe per-file Transaction execution
 *  - Idempotent (can be re-run safely at any time on local or VPS)
 */

export const runMigrations = async () => {
    console.log('🔄 [DB Migration] Starting database migration runner...');
    const client = await pool.connect();

    try {
        // 1. Ensure tracking table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS _schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 2. Fetch already executed migrations
        const executedRes = await client.query('SELECT filename FROM _schema_migrations');
        const executedSet = new Set(executedRes.rows.map(r => r.filename));

        // 3. Read and order all SQL migration files
        const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));

        // Sort: Numbered files first ('001_...', '002_...'), then alphabetical
        files.sort((a, b) => {
            const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999999', 10);
            const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999999', 10);
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
        });

        console.log(`📁 [DB Migration] Found ${files.length} total migration files in ${MIGRATIONS_DIR}`);

        let appliedCount = 0;
        let skippedCount = 0;

        for (const file of files) {
            if (executedSet.has(file)) {
                console.log(`  ⏩ Skipped: ${file} (already applied)`);
                skippedCount++;
                continue;
            }

            console.log(`  ⏳ Applying: ${file}...`);
            const filePath = path.join(MIGRATIONS_DIR, file);
            const sqlContent = fs.readFileSync(filePath, 'utf8');

            // Execute in dedicated transaction
            try {
                await client.query('BEGIN');
                await client.query(sqlContent);
                await client.query(
                    'INSERT INTO _schema_migrations (filename) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`  ✅ Applied:  ${file}`);
                appliedCount++;
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`\n❌ [DB Migration Failed] Error executing ${file}:`);
                console.error(`   Message: ${err.message}`);
                throw err;
            }
        }

        console.log('\n=========================================');
        console.log(`🎉 [DB Migration Completed]`);
        console.log(`   Applied: ${appliedCount} | Already up to date: ${skippedCount}`);
        console.log('=========================================\n');
        return { appliedCount, skippedCount, total: files.length };

    } catch (err) {
        console.error('💥 [DB Migration Fatal Error]:', err.message);
        throw err;
    } finally {
        client.release();
    }
};

// Auto-run if executed directly via CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export default runMigrations;
