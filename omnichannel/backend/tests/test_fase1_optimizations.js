/**
 * Verification Test Suite for Fase 1 Optimizations
 * Checks phoneHelper normalization, migration safety, and module integrity.
 */

import { cleanDigits, formatPhone62, normalizeWhatsappPhone, normalizeJid, isValidPhoneNumber } from '../src/utils/phoneHelper.js';
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

console.log('🧪 RUNNING FASE 1 OPTIMIZATION TESTS...\n');

// -------------------------------------------------------------
// 1. Phone Helper Tests
// -------------------------------------------------------------
console.log('--- 1. Testing phoneHelper Utility ---');

assert(formatPhone62('08123456789') === '628123456789', 'formatPhone62: 08xxx -> 628xxx');
assert(formatPhone62('8123456789') === '628123456789', 'formatPhone62: 8xxx -> 628xxx');
assert(formatPhone62('628123456789') === '628123456789', 'formatPhone62: 628xxx preserved');
assert(formatPhone62('0812-3456-7890') === '6281234567890', 'formatPhone62: hyphens removed');
assert(formatPhone62('08123456789@s.whatsapp.net') === '628123456789', 'formatPhone62: @s.whatsapp.net stripped');
assert(formatPhone62('08123456789@c.us') === '628123456789', 'formatPhone62: @c.us stripped');
assert(formatPhone62('') === null, 'formatPhone62: empty string returns null');
assert(formatPhone62(null) === null, 'formatPhone62: null returns null');

// normalizeWhatsappPhone
assert(normalizeWhatsappPhone('08123456789') === '628123456789', 'normalizeWhatsappPhone: 08xxx -> 628xxx');
assert(normalizeWhatsappPhone('1234567890-987654@g.us') === '1234567890-987654@g.us', 'normalizeWhatsappPhone: group JID preserved');
assert(normalizeWhatsappPhone('123456789:0@lid') === '123456789@lid', 'normalizeWhatsappPhone: LID device suffix stripped');
assert(normalizeWhatsappPhone('123456789@lid') === '123456789@lid', 'normalizeWhatsappPhone: LID preserved');
assert(normalizeWhatsappPhone('08123456789:1@s.whatsapp.net') === '628123456789', 'normalizeWhatsappPhone: user device stripped');

// normalizeJid
assert(normalizeJid('628123456789') === '628123456789@s.whatsapp.net', 'normalizeJid: plain number gets domain');
assert(normalizeJid('08123456789') === '628123456789@s.whatsapp.net', 'normalizeJid: 08xxx normalized with domain');
assert(normalizeJid('12345-67890@g.us') === '12345-67890@g.us', 'normalizeJid: group JID preserved');
assert(normalizeJid('123456789@lid') === '123456789@s.whatsapp.net', 'normalizeJid: LID converted to s.whatsapp.net');

// isValidPhoneNumber
assert(isValidPhoneNumber('08123456789') === true, 'isValidPhoneNumber: valid 11 digit');
assert(isValidPhoneNumber('123') === false, 'isValidPhoneNumber: too short');
assert(isValidPhoneNumber('') === false, 'isValidPhoneNumber: empty string');

// -------------------------------------------------------------
// 2. Migration 019 File Structure & Syntax Check
// -------------------------------------------------------------
console.log('\n--- 2. Testing Migration 019 SQL ---');
const migrationPath = path.resolve(__dirname, '../migrations/019_add_trigram_indexes_and_performance.sql');
assert(fs.existsSync(migrationPath), 'Migration 019 file exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
assert(migrationSql.includes('CREATE EXTENSION IF NOT EXISTS pg_trgm'), 'Migration enables pg_trgm extension');
assert(migrationSql.includes('idx_contacts_name_trgm'), 'Migration creates contacts name trigram index');
assert(migrationSql.includes('idx_contacts_phone_trgm'), 'Migration creates contacts phone trigram index');
assert(migrationSql.includes('idx_messages_content_trgm'), 'Migration creates messages content trigram index');
assert(migrationSql.includes('idx_conv_org_status_archived_lastmsg'), 'Migration creates composite conversation index');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n=========================================');
console.log(`TOTAL: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('=========================================');

if (totalFailed > 0) {
    process.exit(1);
} else {
    console.log('✨ All Fase 1 optimization tests passed successfully!');
}
