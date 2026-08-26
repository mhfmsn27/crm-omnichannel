/**
 * Test Suite for Centralized Migration & Seeder Runner
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalPassed = 0;
let totalFailed = 0;

const assert = (condition, testName) => {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        totalPassed++;
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        totalFailed++;
    }
};

console.log('🧪 RUNNING DATABASE MIGRATION & SEEDER SYSTEM TESTS...\n');

// 1. Check migrateRunner.js exists and is valid
const migrateRunnerPath = path.resolve(__dirname, '../src/utils/migrateRunner.js');
assert(fs.existsSync(migrateRunnerPath), 'migrateRunner.js exists');

const migrateRunnerCode = fs.readFileSync(migrateRunnerPath, 'utf8');
assert(migrateRunnerCode.includes('_schema_migrations'), 'migrateRunner manages _schema_migrations tracking table');
assert(migrateRunnerCode.includes('client.query(\'BEGIN\')'), 'migrateRunner uses safe transactions');
assert(migrateRunnerCode.includes('MIGRATIONS_DIR'), 'migrateRunner targets migrations directory');

// 2. Check seedRunner.js exists and is valid
const seedRunnerPath = path.resolve(__dirname, '../src/utils/seedRunner.js');
assert(fs.existsSync(seedRunnerPath), 'seedRunner.js exists');

const seedRunnerCode = fs.readFileSync(seedRunnerPath, 'utf8');
assert(seedRunnerCode.includes('superadmin@example.com'), 'seedRunner seeds default superadmin');
assert(seedRunnerCode.includes('plan_features'), 'seedRunner seeds plan features');
assert(seedRunnerCode.includes('Demo Organization'), 'seedRunner seeds default demo organization');

// 3. Check package.json scripts
const packageJsonPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

assert(pkg.scripts['db:migrate'] !== undefined, 'package.json has db:migrate script');
assert(pkg.scripts['db:seed'] !== undefined, 'package.json has db:seed script');
assert(pkg.scripts['db:setup'] !== undefined, 'package.json has db:setup script');

// 4. Check all migration files integrity
const migrationsDir = path.resolve(__dirname, '../migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

assert(migrationFiles.length >= 25, `migrations directory contains ${migrationFiles.length} SQL migration files`);
assert(migrationFiles.includes('001_initial_schema.sql'), '001_initial_schema.sql is present');
assert(migrationFiles.includes('019_add_trigram_indexes_and_performance.sql'), '019_add_trigram_indexes_and_performance.sql is present');

// Summary
console.log('\n=========================================');
console.log(`TOTAL: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('=========================================');

if (totalFailed > 0) {
    process.exit(1);
} else {
    console.log('✨ All Database Migration & Seeder tests passed successfully!');
}
