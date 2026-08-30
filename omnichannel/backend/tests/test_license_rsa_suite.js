/**
 * Test Suite: Enterprise RSA-2048 Cryptographic License System & Logic Binding
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { strict as assert } from 'assert';

import * as licenseService from '../src/services/licenseService.js';
import { RSA_PUBLIC_KEY, LICENSE_CONFIG } from '../src/config/license.js';
import { ensureKeypair, signDomain, verifyDomainSignature } from '../scripts/generate-license.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    console.log('🚀 TEST SUITE: ENTERPRISE RSA-2048 LICENSE SYSTEM & LOGIC BINDING');
    console.log('================================================================\n');

    console.log('--- 1. RSA-2048 Asymmetric Cryptography Verification ---');

    await test('RSA Keypair Generation & Embedded Public Key Format', () => {
        assert.ok(RSA_PUBLIC_KEY.includes('BEGIN PUBLIC KEY'), 'Public key must be in PEM format');
        assert.ok(RSA_PUBLIC_KEY.includes('END PUBLIC KEY'), 'Public key must have closing PEM tag');
        const { privateKey, publicKey } = ensureKeypair();
        assert.ok(privateKey.length > 500, 'Private key must be generated and valid');
        assert.ok(publicKey.length > 200, 'Public key must be generated and valid');
    });

    await test('RSA Digital Signing & Signature Verification', () => {
        const { privateKey } = ensureKeypair();
        const testDomain = 'tokosaya.com';
        
        // Sign domain
        const { signature } = signDomain(testDomain, privateKey);
        assert.ok(signature.length > 50, 'RSA Signature must be non-empty Base64 string');

        // Verify with official public key
        const isValid = licenseService.verifyRsaSignature(testDomain, signature);
        assert.equal(isValid, true, 'Valid domain signature must pass RSA verification');

        // Tampered domain must fail
        const tamperedDomain = 'tokolain.com';
        const isTamperedValid = licenseService.verifyRsaSignature(tamperedDomain, signature);
        assert.equal(isTamperedValid, false, 'Tampered domain must fail RSA verification');

        // Tampered signature must fail
        const tamperedSig = signature.slice(0, -4) + 'AAAA';
        const isTamperedSigValid = licenseService.verifyRsaSignature(testDomain, tamperedSig);
        assert.equal(isTamperedSigValid, false, 'Tampered signature must fail RSA verification');
    });

    console.log('\n--- 2. Multi-Header Domain Resolution & Whitelist ---');

    await test('Domain Resolver: Port and prefix normalization', () => {
        const req1 = { headers: { host: 'www.mycrm.id:8998' } };
        assert.equal(licenseService.getDomainFromRequest(req1), 'mycrm.id');

        const req2 = { headers: { 'x-forwarded-host': 'https://app.client.com:5173' } };
        assert.equal(licenseService.getDomainFromRequest(req2), 'app.client.com');

        const req3 = { headers: { 'x-forwarded-host': 'proxy.domain.com, 10.0.0.1' } };
        assert.equal(licenseService.getDomainFromRequest(req3), 'proxy.domain.com');

        const req4 = { headers: { host: '127.0.0.1:8998' } };
        assert.equal(licenseService.getDomainFromRequest(req4), '127.0.0.1');
    });

    await test('Localhost & Dev Whitelist (Zero Dev Friction)', async () => {
        assert.equal(licenseService.isLocalhost('localhost'), true);
        assert.equal(licenseService.isLocalhost('127.0.0.1'), true);
        assert.equal(licenseService.isLocalhost('::1'), true);
        assert.equal(licenseService.isLocalhost('testapp.local'), true);
        assert.equal(licenseService.isLocalhost('staging.test'), true);
        assert.equal(licenseService.isLocalhost('myproductiondomain.com'), false);

        // Validation for localhost must return unrestricted license
        const result = await licenseService.validateLicense('localhost');
        assert.equal(result.valid, true);
        assert.equal(result.status, 'development');
    });

    console.log('\n--- 3. Cryptographic Logic Binding ---');

    await test('deriveOperationKey & verifyOperationKey', () => {
        const domain = 'tokosaya.com';
        const opKey = licenseService.deriveOperationKey('wa_dispatch', domain);
        assert.ok(opKey && opKey.length === 64, 'Operation key must be 64-char SHA256 hex string');

        const isValid = licenseService.verifyOperationKey('wa_dispatch', opKey, domain);
        assert.equal(isValid, true, 'Valid operation key must verify successfully');

        const isWrongOp = licenseService.verifyOperationKey('other_op', opKey, domain);
        assert.equal(isWrongOp, false, 'Different operation must fail verification');

        const isWrongKey = licenseService.verifyOperationKey('wa_dispatch', 'invalid_key', domain);
        assert.equal(isWrongKey, false, 'Invalid key must fail verification');
    });

    await test('generateMessageChecksum: Outbound WhatsApp Stamp', () => {
        const phone = '6281234567890';
        const messageId = 'pending-1700000000000-abcd';
        const checksum = licenseService.generateMessageChecksum(phone, messageId, 'tokosaya.com');
        assert.ok(checksum && checksum.length === 64, 'Checksum must be 64-char SHA256 hex string');

        const checksum2 = licenseService.generateMessageChecksum(phone, messageId, 'tokosaya.com');
        assert.equal(checksum, checksum2, 'Checksum must be deterministic');

        const diffChecksum = licenseService.generateMessageChecksum('6289999999999', messageId, 'tokosaya.com');
        assert.notEqual(checksum, diffChecksum, 'Different phone number must produce different checksum');
    });

    console.log('\n--- 4. Author CLI Generator Validation ---');

    await test('CLI Generator script executes and generates valid output format', () => {
        const { privateKey, publicKey } = ensureKeypair();
        const testClientDomain = 'klienresmi.id';
        const { signature } = signDomain(testClientDomain, privateKey);
        
        const isCliVerified = verifyDomainSignature(testClientDomain, signature, publicKey);
        assert.equal(isCliVerified, true, 'CLI signature output must be verifiable');
    });

    console.log('\n================================================================');
    console.log(`  RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
};

runSuite().catch(e => {
    console.error('Fatal RSA License Test Error:', e);
    process.exit(1);
});
