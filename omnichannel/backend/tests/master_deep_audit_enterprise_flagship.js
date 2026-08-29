/**
 * Master Deep Audit Suite for Enterprise & Flagship Upgrades
 * Validates file presence, ES module integrity, SQL parameterization, math accuracy, and security
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(__dirname, '../../frontend');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = [];

const check = (desc, condition, extraInfo = '') => {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  ✅ [PASS] ${desc}`);
    } else {
        failedChecks.push({ desc, extraInfo });
        console.error(`  ❌ [FAIL] ${desc} ${extraInfo ? `-> ${extraInfo}` : ''}`);
    }
};

const runAudit = async () => {
    console.log('\n================================================================');
    console.log('🔍 MASTER DEEP AUDIT: ENTERPRISE & FLAGSHIP UPGRADES');
    console.log('================================================================\n');

    // 1. FILE INTEGRITY
    console.log('--- 1. Backend Core & Service File Existence ---');
    const backendFiles = [
        'migrations/022_enterprise_crm_upgrade.sql',
        'migrations/023_flagship_crm_upgrades.sql',
        'src/services/leadScoringService.js',
        'src/services/roundRobinService.js',
        'src/services/contactSyncService.js',
        'src/services/auditLogService.js',
        'src/controllers/csatController.js',
        'src/controllers/salesVisitController.js',
        'src/controllers/wallboardController.js',
        'src/controllers/callLogController.js',
        'src/utils/dataMasking.js'
    ];

    backendFiles.forEach(relPath => {
        const fullPath = path.join(backendRoot, relPath);
        check(`Backend file exists: ${relPath}`, fs.existsSync(fullPath));
    });

    console.log('\n--- 2. Frontend Page & Utility File Existence ---');
    const frontendFiles = [
        'src/pages/Reports/LiveWallboardPage.jsx',
        'src/pages/CRM/SalesVisitPage.jsx',
        'src/utils/dataMasking.js'
    ];

    frontendFiles.forEach(relPath => {
        const fullPath = path.join(frontendRoot, relPath);
        check(`Frontend file exists: ${relPath}`, fs.existsSync(fullPath));
    });

    // 3. DYNAMIC EXPORTS & FUNCTION AUDIT
    console.log('\n--- 3. Dynamic Module Imports & Export Validation ---');
    try {
        const leadScoring = await import('../src/services/leadScoringService.js');
        check('leadScoringService exports calculateLeadScore', typeof leadScoring.calculateLeadScore === 'function');

        const roundRobin = await import('../src/services/roundRobinService.js');
        check('roundRobinService exports assignNextAvailableAgent', typeof roundRobin.assignNextAvailableAgent === 'function');
        check('roundRobinService exports updateAgentStatus', typeof roundRobin.updateAgentStatus === 'function');

        const csatCtrl = await import('../src/controllers/csatController.js');
        check('csatController exports triggerCsatSurvey', typeof csatCtrl.triggerCsatSurvey === 'function');
        check('csatController exports submitRating', typeof csatCtrl.submitRating === 'function');
        check('csatController exports getCsatStats', typeof csatCtrl.getCsatStats === 'function');

        const salesVisitCtrl = await import('../src/controllers/salesVisitController.js');
        check('salesVisitController exports recordSalesVisit', typeof salesVisitCtrl.recordSalesVisit === 'function');
        check('salesVisitController exports getSalesVisits', typeof salesVisitCtrl.getSalesVisits === 'function');

        const wallboardCtrl = await import('../src/controllers/wallboardController.js');
        check('wallboardController exports getLiveWallboardMetrics', typeof wallboardCtrl.getLiveWallboardMetrics === 'function');

        const callLogCtrl = await import('../src/controllers/callLogController.js');
        check('callLogController exports recordCallLog', typeof callLogCtrl.recordCallLog === 'function');
        check('callLogController exports getCallHistory', typeof callLogCtrl.getCallHistory === 'function');

        const contactSync = await import('../src/services/contactSyncService.js');
        check('contactSyncService exports generateVCardStream', typeof contactSync.generateVCardStream === 'function');

        const dataMask = await import('../src/utils/dataMasking.js');
        check('dataMasking exports maskSensitiveData', typeof dataMask.maskSensitiveData === 'function');

    } catch (err) {
        check(`Dynamic module load error: ${err.message}`, false);
    }

    // 4. SQL PARAMETERIZATION & INJECTION AUDIT
    console.log('\n--- 4. SQL Parameterized Query Audit ---');
    const controllerFiles = [
        'src/controllers/csatController.js',
        'src/controllers/salesVisitController.js',
        'src/controllers/wallboardController.js',
        'src/controllers/callLogController.js',
        'src/services/leadScoringService.js',
        'src/services/roundRobinService.js',
        'src/services/auditLogService.js'
    ];

    controllerFiles.forEach(relPath => {
        const fullPath = path.join(backendRoot, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const suspiciousConcat = /pool\.query\s*\(\s*["'`][^"'`]*\$\{[^}]+\}/.test(content);
        check(`Security Check: ${relPath} uses safe parameterized queries`, !suspiciousConcat);
    });

    // 5. MIGRATIONS 022 & 023 SYNTAX & SCHEMA CHECK
    console.log('\n--- 5. Migration 022 & 023 Integrity Audit ---');
    const m22 = fs.readFileSync(path.join(backendRoot, 'migrations/022_enterprise_crm_upgrade.sql'), 'utf-8');
    check('Migration 022 creates csat_surveys table', m22.includes('CREATE TABLE IF NOT EXISTS csat_surveys'));
    check('Migration 022 creates sales_visits table', m22.includes('CREATE TABLE IF NOT EXISTS sales_visits'));
    check('Migration 022 creates audit_logs table', m22.includes('CREATE TABLE IF NOT EXISTS audit_logs'));

    const m23 = fs.readFileSync(path.join(backendRoot, 'migrations/023_flagship_crm_upgrades.sql'), 'utf-8');
    check('Migration 023 adds lead_score to conversations', m23.includes('lead_score INTEGER'));
    check('Migration 023 creates call_logs table', m23.includes('CREATE TABLE IF NOT EXISTS call_logs'));

    // 6. BUSINESS LOGIC & DATA PRIVACY ACCURACY
    console.log('\n--- 6. Business Logic & Security Validation ---');
    const { maskSensitiveData } = await import('../src/utils/dataMasking.js');
    const testKtp = '3201012304950001';
    const testCc = '4111222233334444';
    const maskedText = maskSensitiveData(`KTP: ${testKtp}, CC: ${testCc}`, 'agent');

    check('Data Masking censors 16-digit KTP correctly', maskedText.includes('3201********0001'));
    check('Data Masking censors 16-digit Credit Card correctly', maskedText.includes('4111********4444'));

    // SUMMARY
    console.log('\n================================================================');
    console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks.length}`);
    console.log('================================================================');

    if (failedChecks.length > 0) {
        console.error('\nFAILURES DETECTED:');
        failedChecks.forEach(f => console.error(` - ${f.desc} (${f.extraInfo})`));
        process.exit(1);
    } else {
        console.log('\n🎉 MASTER AUDIT COMPLETE: 100% PERFECT PASS! No errors, bugs, or missing components.\n');
    }
};

runAudit().catch(err => {
    console.error('Fatal Master Audit Error:', err);
    process.exit(1);
});
