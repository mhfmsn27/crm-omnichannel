/**
 * Master Verification Test Suite for All Improvements (Fase 1 through Fase 5)
 */

import { cleanDigits, formatPhone62, normalizeWhatsappPhone, normalizeJid, isValidPhoneNumber } from '../src/utils/phoneHelper.js';
import { encrypt, decrypt, generateHmacSignature, verifyHmacSignature } from '../src/utils/encryptionHelper.js';
import { generateWarmerPersonaMessage } from '../src/services/aiWarmerPersona.js';
import { geminiCrmTools } from '../src/services/aiCrmTools.js';
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

console.log('🚀 RUNNING MASTER VERIFICATION TEST SUITE (ALL PHASES)...\n');

// -------------------------------------------------------------
// 1. Phone Helper Suite
// -------------------------------------------------------------
console.log('--- 1. Phone Helper Verification ---');
assert(formatPhone62('08123456789') === '628123456789', 'formatPhone62 standard 08xxx');
assert(normalizeWhatsappPhone('12345:0@lid') === '12345@lid', 'normalizeWhatsappPhone LID device suffix');
assert(normalizeJid('08123456789') === '628123456789@s.whatsapp.net', 'normalizeJid phone formatting');

// -------------------------------------------------------------
// 2. Encryption & Security Suite (AES-256-GCM & HMAC)
// -------------------------------------------------------------
console.log('\n--- 2. Encryption & Security Verification ---');
const plainSecret = 'my_super_secret_gemini_api_key_123456';
const encrypted = encrypt(plainSecret);

assert(encrypted.startsWith('enc_gcm:'), 'encrypt: outputs enc_gcm format');
assert(encrypted !== plainSecret, 'encrypt: ciphertext is not plain');

const decrypted = decrypt(encrypted);
assert(decrypted === plainSecret, 'decrypt: decrypted text matches original exactly');

// Transparent Legacy Plaintext Compatibility
const legacyPlaintext = 'AIzaSyA_legacy_api_key_stored_in_db';
assert(decrypt(legacyPlaintext) === legacyPlaintext, 'decrypt: transparently passes legacy plaintext without error');

// HMAC Signature
const payload = { event: 'message.created', id: '12345' };
const secretKey = 'my_webhook_secret_key';
const signature = generateHmacSignature(payload, secretKey);

assert(typeof signature === 'string' && signature.length === 64, 'generateHmacSignature: produces 64-char hex string');
assert(verifyHmacSignature(payload, signature, secretKey) === true, 'verifyHmacSignature: verifies valid payload signature');
assert(verifyHmacSignature({ event: 'tampered' }, signature, secretKey) === false, 'verifyHmacSignature: rejects tampered payload');

// -------------------------------------------------------------
// 3. AI Warmer Persona Suite
// -------------------------------------------------------------
console.log('\n--- 3. AI Warmer Persona Message Generator ---');
const msgKuliner = generateWarmerPersonaMessage('kuliner');
assert(typeof msgKuliner === 'string' && msgKuliner.length > 5, 'generateWarmerPersonaMessage: kuliner topic returns message');

const msgAuto = generateWarmerPersonaMessage('auto');
assert(typeof msgAuto === 'string' && msgAuto.length > 5, 'generateWarmerPersonaMessage: auto mode returns valid message');

// -------------------------------------------------------------
// 4. AI Native CRM Tools Suite
// -------------------------------------------------------------
console.log('\n--- 4. AI Native CRM Tools Suite ---');
assert(geminiCrmTools.length === 4, 'geminiCrmTools has 4 native tool declarations');

// -------------------------------------------------------------
// 5. Frontend Components & PWA Files
// -------------------------------------------------------------
console.log('\n--- 5. Frontend Components & PWA Suite ---');
const customer360Path = path.resolve(__dirname, '../../frontend/src/components/inbox/Customer360Drawer.jsx');
assert(fs.existsSync(customer360Path), 'Customer360Drawer.jsx exists');

const swPath = path.resolve(__dirname, '../../frontend/public/sw.js');
assert(fs.existsSync(swPath), 'sw.js Service Worker exists');

const manifestPath = path.resolve(__dirname, '../../frontend/public/manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json PWA exists');

const pwaHelperPath = path.resolve(__dirname, '../../frontend/src/utils/pwaHelper.js');
assert(fs.existsSync(pwaHelperPath), 'pwaHelper.js exists');

// -------------------------------------------------------------
// 6. Health Controller Check
// -------------------------------------------------------------
console.log('\n--- 6. Health Check Controller Verification ---');
const healthControllerPath = path.resolve(__dirname, '../src/controllers/healthController.js');
assert(fs.existsSync(healthControllerPath), 'healthController.js exists');

// -------------------------------------------------------------
// 7. Modular Backend Architecture Suite
// -------------------------------------------------------------
console.log('\n--- 7. Modular Backend Controllers & Utilities ---');
const webhookLidPath = path.resolve(__dirname, '../src/controllers/webhook/lidResolver.js');
assert(fs.existsSync(webhookLidPath), 'webhook/lidResolver.js exists');

const webhookHistoryPath = path.resolve(__dirname, '../src/controllers/webhook/historySyncHandler.js');
assert(fs.existsSync(webhookHistoryPath), 'webhook/historySyncHandler.js exists');

const webhookEventsPath = path.resolve(__dirname, '../src/controllers/webhook/webhookEventHandlers.js');
assert(fs.existsSync(webhookEventsPath), 'webhook/webhookEventHandlers.js exists');

const webhookIncomingPath = path.resolve(__dirname, '../src/controllers/webhook/incomingMessageHandler.js');
assert(fs.existsSync(webhookIncomingPath), 'webhook/incomingMessageHandler.js exists');

const inboxCachePath = path.resolve(__dirname, '../src/controllers/inbox/inboxCache.js');
assert(fs.existsSync(inboxCachePath), 'inbox/inboxCache.js exists');

const inboxConvPath = path.resolve(__dirname, '../src/controllers/inbox/conversationController.js');
assert(fs.existsSync(inboxConvPath), 'inbox/conversationController.js exists');

const inboxActionPath = path.resolve(__dirname, '../src/controllers/inbox/conversationActionController.js');
assert(fs.existsSync(inboxActionPath), 'inbox/conversationActionController.js exists');

const inboxMsgPath = path.resolve(__dirname, '../src/controllers/inbox/messageController.js');
assert(fs.existsSync(inboxMsgPath), 'inbox/messageController.js exists');

const responseHelperPath = path.resolve(__dirname, '../src/utils/responseHelper.js');
assert(fs.existsSync(responseHelperPath), 'utils/responseHelper.js exists');

const asyncHandlerPath = path.resolve(__dirname, '../src/utils/asyncHandler.js');
assert(fs.existsSync(asyncHandlerPath), 'utils/asyncHandler.js exists');

// -------------------------------------------------------------
// 8. Modular Frontend Hooks Suite
// -------------------------------------------------------------
console.log('\n--- 8. Frontend Custom Hooks ---');
const hookSocketPath = path.resolve(__dirname, '../../frontend/src/hooks/useInboxSocket.js');
assert(fs.existsSync(hookSocketPath), 'useInboxSocket.js exists');

const hookConvPath = path.resolve(__dirname, '../../frontend/src/hooks/useConversations.js');
assert(fs.existsSync(hookConvPath), 'useConversations.js exists');

const hookMsgPath = path.resolve(__dirname, '../../frontend/src/hooks/useMessages.js');
assert(fs.existsSync(hookMsgPath), 'useMessages.js exists');

const hookModalsPath = path.resolve(__dirname, '../../frontend/src/hooks/useInboxModals.js');
assert(fs.existsSync(hookModalsPath), 'useInboxModals.js exists');

const hookActionsPath = path.resolve(__dirname, '../../frontend/src/hooks/useInboxActions.js');
assert(fs.existsSync(hookActionsPath), 'useInboxActions.js exists');

// -------------------------------------------------------------
// 9. DevOps & Deployment Verification
// -------------------------------------------------------------
console.log('\n--- 9. DevOps & Centralized Migrations ---');
const dockerProdPath = path.resolve(__dirname, '../../docker-compose.prod.yml');
const dockerProdLocalPath = path.resolve(__dirname, '../docker-compose.prod.yml');
assert(fs.existsSync(dockerProdPath) || fs.existsSync(dockerProdLocalPath), 'docker-compose.prod.yml exists');

const migrateRunnerPath = path.resolve(__dirname, '../src/utils/migrateRunner.js');
assert(fs.existsSync(migrateRunnerPath), 'migrateRunner.js exists');

const seedRunnerPath = path.resolve(__dirname, '../src/utils/seedRunner.js');
assert(fs.existsSync(seedRunnerPath), 'seedRunner.js exists');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n=========================================');
console.log(`TOTAL: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('=========================================');

if (totalFailed > 0) {
    process.exit(1);
} else {
    console.log('🎉 ALL MASTER VERIFICATION TESTS PASSED SUCCESSFULLY! (100% PASS)');
}
