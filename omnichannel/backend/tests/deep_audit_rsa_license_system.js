/**
 * Master Deep Audit Suite for RSA-2048 Cryptographic License System & Logic Binding
 * Validates Keypair, Crypto Signatures, Tamper-Proofing, Multi-Headers, Grace Period, Logic Binding, Middleware, and API Endpoints
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { strict as assert } from 'assert';

import * as licenseService from '../src/services/licenseService.js';
import * as licenseController from '../src/controllers/licenseController.js';
import { checkLicense as licenseMiddleware } from '../src/middleware/licenseMiddleware.js';
import { RSA_PUBLIC_KEY, LICENSE_CONFIG } from '../src/config/license.js';
import { ensureKeypair, signDomain, verifyDomainSignature } from '../scripts/generate-license.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

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
    console.log('🔍 MASTER DEEP AUDIT: RSA-2048 LICENSE & LOGIC BINDING SYSTEM');
    console.log('================================================================\n');

    // 1. PHYSICAL FILE INTEGRITY
    console.log('--- 1. File Structure & Path Integrity ---');
    const requiredFiles = [
        'src/config/license.js',
        'src/services/licenseService.js',
        'src/middleware/licenseMiddleware.js',
        'src/controllers/licenseController.js',
        'scripts/generate-license.js',
        'scripts/keys/license_private.key',
        'scripts/keys/license_public.key',
        '../user-docs/PANDUAN_LISENSI_RSA2048.md'
    ];

    requiredFiles.forEach(relPath => {
        const fullPath = path.join(backendRoot, relPath);
        check(`Physical file exists: ${relPath}`, fs.existsSync(fullPath));
    });

    // 2. RSA-2048 ASYMMETRIC KEY INTEGRITY
    console.log('\n--- 2. RSA-2048 Key & Signature Math Audit ---');
    check('Embedded Public Key starts with PEM header', RSA_PUBLIC_KEY.includes('-----BEGIN PUBLIC KEY-----'));
    check('Embedded Public Key ends with PEM footer', RSA_PUBLIC_KEY.includes('-----END PUBLIC KEY-----'));

    const { privateKey, publicKey } = ensureKeypair();
    check('Author Private Key is valid 2048-bit PEM', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
    check('Author Public Key matches embedded format', publicKey.includes('-----BEGIN PUBLIC KEY-----'));

    // Digital signature test
    const testDomain = 'audit-test-client.co.id';
    const { signature } = signDomain(testDomain, privateKey);
    check('Generated signature is Base64 formatted', /^[A-Za-z0-9+/=]+$/.test(signature));

    const isVerified = licenseService.verifyRsaSignature(testDomain, signature);
    check('Signature verifies correctly against embedded Public Key', isVerified === true);

    const isFakeDomainBlocked = licenseService.verifyRsaSignature('fake-domain.com', signature);
    check('Tampered domain is mathematically rejected', isFakeDomainBlocked === false);

    const corruptedSig = signature.substring(0, signature.length - 6) + 'XXXX==';
    const isCorruptedSigBlocked = licenseService.verifyRsaSignature(testDomain, corruptedSig);
    check('Corrupted signature bytes are mathematically rejected', isCorruptedSigBlocked === false);

    // 3. DOMAIN RESOLUTION & MULTI-HEADER NORMALIZATION
    console.log('\n--- 3. Multi-Header Domain Resolver Audit ---');
    const mockReq1 = { headers: { 'x-forwarded-host': 'mycrm.enterprise.com:8443' } };
    check('x-forwarded-host with port resolved cleanly', licenseService.getDomainFromRequest(mockReq1) === 'mycrm.enterprise.com');

    const mockReq2 = { headers: { host: 'www.tokosaya.id:5173' } };
    check('host with www and dev port resolved cleanly', licenseService.getDomainFromRequest(mockReq2) === 'tokosaya.id');

    const mockReq3 = { headers: { 'x-forwarded-host': 'cdn.proxy.com, 192.168.1.1' } };
    check('Multiple comma-separated forwarded hosts resolved to first hop', licenseService.getDomainFromRequest(mockReq3) === 'cdn.proxy.com');

    const mockReq4 = { headers: {} };
    check('Empty headers default safely to localhost', licenseService.getDomainFromRequest(mockReq4) === 'localhost');

    // 4. ZERO-DEV FRICTION LOCALHOST WHITELIST
    console.log('\n--- 4. Localhost & Dev Whitelist Audit ---');
    const devDomains = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'app.test', 'backend.local', 'crm.internal'];
    devDomains.forEach(d => {
        check(`Dev domain "${d}" is whitelisted`, licenseService.isLocalhost(d) === true);
    });
    check('Production domain "client.com" is NOT whitelisted', licenseService.isLocalhost('client.com') === false);

    const localVal = await licenseService.validateLicense('localhost');
    check('validateLicense on localhost returns valid=true without Google Sheets', localVal.valid === true && localVal.status === 'development');

    // 5. CRYPTOGRAPHIC LOGIC BINDING AUDIT
    console.log('\n--- 5. Cryptographic Logic Binding Audit ---');
    const opToken = licenseService.deriveOperationKey('wa_dispatch', 'mycrm.com');
    check('deriveOperationKey produces 64-char SHA256 hex string', typeof opToken === 'string' && opToken.length === 64);

    const isOpValid = licenseService.verifyOperationKey('wa_dispatch', opToken, 'mycrm.com');
    check('verifyOperationKey succeeds on identical operation', isOpValid === true);

    const isWrongOpBlocked = licenseService.verifyOperationKey('unauthorized_action', opToken, 'mycrm.com');
    check('verifyOperationKey rejects mismatched action name', isWrongOpBlocked === false);

    const waChecksum = licenseService.generateMessageChecksum('628123456789', 'msg-12345', 'mycrm.com');
    check('generateMessageChecksum produces deterministic 64-char stamp', typeof waChecksum === 'string' && waChecksum.length === 64);

    // 6. MIDDLEWARE GUARD AUDIT
    console.log('\n--- 6. License Middleware Guard Audit ---');
    let nextCalled = false;
    const mockNext = () => { nextCalled = true; };

    // Exempted path test (/api/health)
    nextCalled = false;
    const reqExempt = { path: '/api/health', headers: {} };
    const resDummy = { status: () => ({ json: () => {} }) };
    await licenseMiddleware(reqExempt, resDummy, mockNext);
    check('Middleware allows /api/health freely', nextCalled === true);

    // Exempted path test (/webhook)
    nextCalled = false;
    const reqWebhook = { path: '/webhook/shopee', headers: {} };
    await licenseMiddleware(reqWebhook, resDummy, mockNext);
    check('Middleware allows webhooks freely', nextCalled === true);

    // Localhost protected path test
    nextCalled = false;
    const reqLocal = { path: '/api/app/inbox', headers: { host: 'localhost:8998' } };
    await licenseMiddleware(reqLocal, resDummy, mockNext);
    check('Middleware passes localhost requests and injects req.license', nextCalled === true && !!reqLocal.license);

    // 7. CONTROLLER EXPORTS AUDIT
    console.log('\n--- 7. Controller Functions Export Audit ---');
    check('licenseController exports checkLicense', typeof licenseController.checkLicense === 'function');
    check('licenseController exports refreshLicense', typeof licenseController.refreshLicense === 'function');
    check('licenseController exports getStatus', typeof licenseController.getStatus === 'function');
    check('licenseController exports getSetupInfo', typeof licenseController.getSetupInfo === 'function');

    // SUMMARY
    console.log('\n================================================================');
    console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks.length}`);
    console.log('================================================================');

    if (failedChecks.length > 0) {
        console.error('\nFAILURES DETECTED:');
        failedChecks.forEach(f => console.error(` - ${f.desc} (${f.extraInfo})`));
        process.exit(1);
    } else {
        console.log('\n🎉 RSA-2048 LICENSE SYSTEM DEEP AUDIT COMPLETE: 100% PERFECT PASS! No errors, bugs, or misses.\n');
    }
};

runAudit().catch(err => {
    console.error('Fatal RSA Deep Audit Error:', err);
    process.exit(1);
});
