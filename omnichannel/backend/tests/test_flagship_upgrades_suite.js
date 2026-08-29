/**
 * Test Suite: Flagship CRM Upgrades (AI Lead Scoring, Wallboard, Call Logger, vCard Sync, Data Masking)
 */
import { strict as assert } from 'assert';
import * as leadScoringService from '../src/services/leadScoringService.js';
import * as wallboardController from '../src/controllers/wallboardController.js';
import * as callLogController from '../src/controllers/callLogController.js';
import * as contactSyncService from '../src/services/contactSyncService.js';
import * as dataMasking from '../src/utils/dataMasking.js';

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
    try {
        await fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Reason: ${err.message}`);
        failed++;
    }
};

const runSuite = async () => {
    console.log('\n================================================================');
    console.log('🚀 TEST SUITE: FLAGSHIP CRM UPGRADES');
    console.log('================================================================\n');

    console.log('--- 1. Predictive AI Lead Scoring Engine ---');

    await test('LeadScoring: Exports calculateLeadScore function', () => {
        assert.equal(typeof leadScoringService.calculateLeadScore, 'function');
    });

    console.log('\n--- 2. Live Wallboard Operations Controller ---');

    await test('Wallboard: Exports getLiveWallboardMetrics function', () => {
        assert.equal(typeof wallboardController.getLiveWallboardMetrics, 'function');
    });

    console.log('\n--- 3. Click-to-Call & Telephony Logs ---');

    await test('CallLog: Exports recordCallLog and getCallHistory', () => {
        assert.equal(typeof callLogController.recordCallLog, 'function');
        assert.equal(typeof callLogController.getCallHistory, 'function');
    });

    console.log('\n--- 4. vCard 3.0 Mobile Contact Sync Stream ---');

    await test('ContactSync: Exports generateVCardStream', () => {
        assert.equal(typeof contactSyncService.generateVCardStream, 'function');
    });

    console.log('\n--- 5. Data Masking & UU PDP Compliance ---');

    await test('DataMasking: Correctly masks 16-digit NIK & Credit Card numbers for agents', () => {
        const rawText = 'Halo, NIK saya adalah 3201234567890123 dan nomor CC 4111222233334444';
        const masked = dataMasking.maskSensitiveData(rawText, 'agent');

        assert.ok(!masked.includes('3201234567890123'), 'Raw NIK must not be visible to agent');
        assert.ok(masked.includes('3201********0123'), 'NIK must be masked in center');
        assert.ok(!masked.includes('4111222233334444'), 'Raw CC must not be visible to agent');
    });

    await test('DataMasking: Transparently allows full data view for admin roles', () => {
        const rawText = 'NIK 3201234567890123';
        const unmasked = dataMasking.maskSensitiveData(rawText, 'admin_member');
        assert.equal(unmasked, rawText, 'Admin must see full raw data for operational verification');
    });

    console.log('\n================================================================');
    console.log(`  RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
};

runSuite().catch(e => {
    console.error('Suite error:', e);
    process.exit(1);
});
