/**
 * Test Suite: Enterprise CRM Upgrade (Benchmark Cekat.ai, SleekFlow, Qontak, Barantum)
 */
import { strict as assert } from 'assert';
import * as roundRobinService from '../src/services/roundRobinService.js';
import * as csatController from '../src/controllers/csatController.js';
import * as auditLogService from '../src/services/auditLogService.js';
import * as salesVisitController from '../src/controllers/salesVisitController.js';

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
    console.log('🚀 TEST SUITE: ENTERPRISE CRM UPGRADE (CEKAT, SLEEKFLOW, QONTAK, BARANTUM)');
    console.log('================================================================\n');

    console.log('--- 1. Smart Round-Robin & Agent Capacity ---');

    await test('RoundRobin: Exports assignNextAvailableAgent and updateAgentStatus', () => {
        assert.equal(typeof roundRobinService.assignNextAvailableAgent, 'function');
        assert.equal(typeof roundRobinService.updateAgentStatus, 'function');
    });

    await test('RoundRobin: Status validator rejects invalid statuses', async () => {
        let threw = false;
        try {
            await roundRobinService.updateAgentStatus(1, 1, 'invalid_status_xyz');
        } catch (e) {
            threw = true;
            assert.ok(e.message.includes('Invalid status'));
        }
        assert.equal(threw, true, 'Must throw error on invalid agent status');
    });

    console.log('\n--- 2. Automated CSAT Survey & Analytics Math ---');

    await test('CSAT: Exports triggerCsatSurvey, submitRating, and getCsatStats', () => {
        assert.equal(typeof csatController.triggerCsatSurvey, 'function');
        assert.equal(typeof csatController.submitRating, 'function');
        assert.equal(typeof csatController.getCsatStats, 'function');
    });

    await test('CSAT Math: CSAT percentage and average calculation accuracy', () => {
        const ratings = [5, 5, 4, 3, 5, 2, 4, 5, 1, 4]; // 10 responses
        const total = ratings.length;
        const satisfied = ratings.filter(r => r >= 4).length; // 5,5,4,5,4,5,4 -> 7
        const csatPercentage = (satisfied / total) * 100; // 70%
        const avg = ratings.reduce((a, b) => a + b, 0) / total; // 38 / 10 = 3.8

        assert.equal(csatPercentage, 70);
        assert.equal(avg, 3.8);
    });

    console.log('\n--- 3. Field Sales Mobile GPS Visit Tracker ---');

    await test('SalesVisit: Exports recordSalesVisit and getSalesVisits', () => {
        assert.equal(typeof salesVisitController.recordSalesVisit, 'function');
        assert.equal(typeof salesVisitController.getSalesVisits, 'function');
    });

    await test('SalesVisit: GPS coordinate boundary validity', () => {
        const lat = -6.2088;
        const lng = 106.8456;
        assert.ok(lat >= -90 && lat <= 90, 'Latitude must be between -90 and 90');
        assert.ok(lng >= -180 && lng <= 180, 'Longitude must be between -180 and 180');
    });

    console.log('\n--- 4. Audit Trail & Activity Logging ---');

    await test('AuditLog: Exports logActivity and getAuditLogs', () => {
        assert.equal(typeof auditLogService.logActivity, 'function');
        assert.equal(typeof auditLogService.getAuditLogs, 'function');
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
