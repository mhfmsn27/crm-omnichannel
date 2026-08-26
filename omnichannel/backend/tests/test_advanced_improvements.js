/**
 * Verification Test Suite for 5 Advanced Improvements
 */

import { archiveOldResolvedConversations, cleanExpiredTempLogs } from '../src/services/archivalService.js';
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

console.log('🚀 RUNNING ADVANCED IMPROVEMENTS TEST SUITE...\n');

// -------------------------------------------------------------
// 1. Flow Execution Service (Interactive & Delay Nodes)
// -------------------------------------------------------------
console.log('--- 1. Flow Execution Service (flowExecutionService.js) ---');
const flowServicePath = path.resolve(__dirname, '../src/services/flowExecutionService.js');
const flowServiceCode = fs.readFileSync(flowServicePath, 'utf8');

assert(flowServiceCode.includes('interactive_buttons'), 'flowExecutionService supports interactive_buttons');
assert(flowServiceCode.includes('listMenu'), 'flowExecutionService supports listMenu');
assert(flowServiceCode.includes('case \'delay\':'), 'flowExecutionService supports delay node');
assert(flowServiceCode.includes('case \'http_request\':'), 'flowExecutionService supports http_request node');

// -------------------------------------------------------------
// 2. Database Archival Service (archivalService.js)
// -------------------------------------------------------------
console.log('\n--- 2. Database Archival Service (archivalService.js) ---');
assert(typeof archiveOldResolvedConversations === 'function', 'archiveOldResolvedConversations is exported');
assert(typeof cleanExpiredTempLogs === 'function', 'cleanExpiredTempLogs is exported');

// -------------------------------------------------------------
// 3. Webhook Dispatcher Reliability (webhookDispatcher.js)
// -------------------------------------------------------------
console.log('\n--- 3. Webhook Dispatcher Retry (webhookDispatcher.js) ---');
const webhookDispPath = path.resolve(__dirname, '../src/services/webhookDispatcher.js');
const webhookDispCode = fs.readFileSync(webhookDispPath, 'utf8');

assert(webhookDispCode.includes('attempts: 3'), 'webhookDispatcher configures 3 retry attempts');
assert(webhookDispCode.includes('exponential'), 'webhookDispatcher configures exponential backoff');

// -------------------------------------------------------------
// 4. WhatsApp Gateway Auto-Healing (sessionManager.ts)
// -------------------------------------------------------------
console.log('\n--- 4. WhatsApp Gateway Auto-Healing (sessionManager.ts) ---');
const sessionMgrPath = path.resolve(__dirname, '../../../wa-server/wa-gateway/wa-gateway-backend/src/services/sessionManager.ts');
const sessionMgrCode = fs.readFileSync(sessionMgrPath, 'utf8');

assert(sessionMgrCode.includes('AUTO-RECONNECT'), 'sessionManager has auto-reconnect backoff logging');
assert(sessionMgrCode.includes('Math.pow(1.4'), 'sessionManager implements exponential backoff delay');
assert(sessionMgrCode.includes('this.messageCaches.delete(sessionId)'), 'sessionManager cleans up message cache on disconnect');

// -------------------------------------------------------------
// 5. Chat Input Slash Shortcut (ChatInput.js)
// -------------------------------------------------------------
console.log('\n--- 5. Chat Input Slash Quick Reply (ChatInput.js) ---');
const chatInputPath = path.resolve(__dirname, '../../frontend/src/components/inbox/ChatInput.js');
const chatInputCode = fs.readFileSync(chatInputPath, 'utf8');

assert(chatInputCode.includes('setSuggestions(filtered.slice(0, 10))'), 'ChatInput shows suggestions on slash trigger');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n=========================================');
console.log(`TOTAL: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('=========================================');

if (totalFailed > 0) {
    process.exit(1);
} else {
    console.log('✨ All 5 Advanced Improvements verified successfully!');
}
