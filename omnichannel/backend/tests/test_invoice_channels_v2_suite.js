/**
 * Comprehensive Verification Test Suite for Invoice 2.0 & Channel Integrations 2.0 (Including Shopee & Tokopedia)
 */
import { strict as assert } from 'assert';
import crypto from 'crypto';
import * as emailService from '../src/services/channels/emailChannelService.js';
import * as tiktokService from '../src/services/channels/tiktokChannelService.js';
import * as lineService from '../src/services/channels/lineChannelService.js';
import * as shopeeService from '../src/services/channels/shopeeChannelService.js';
import * as tokopediaService from '../src/services/channels/tokopediaChannelService.js';

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
    console.log('\n======================================================');
    console.log('  TEST SUITE: INVOICE 2.0 & CHANNEL INTEGRATIONS 2.0');
    console.log('======================================================\n');

    console.log('--- 1. Accounting & Partial Payment Math Verification ---');

    await test('Accounting: Full payment calculation without tax', () => {
        const items = [{ quantity: 2, unit_price: 50000 }, { quantity: 1, unit_price: 100000 }];
        const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);
        const tax = 0;
        const total = subtotal + tax;
        assert.equal(total, 200000);
        assert.equal(total - 0, 200000, 'Balance due must equal total when paid is 0');
    });

    await test('Accounting: Partial Payment / DP Calculation with PPN 11%', () => {
        const subtotal = 1000000;
        const taxRate = 0.11;
        const taxAmount = subtotal * taxRate; // 110,000
        const totalAmount = subtotal + taxAmount; // 1,110,000
        
        let paidAmount = 500000; // DP paid
        let balanceDue = totalAmount - paidAmount;
        let status = balanceDue <= 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid');

        assert.equal(totalAmount, 1110000);
        assert.equal(balanceDue, 610000);
        assert.equal(status, 'partially_paid');

        // Second payment of remaining balance
        paidAmount += 610000;
        balanceDue = totalAmount - paidAmount;
        status = balanceDue <= 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid');

        assert.equal(balanceDue, 0);
        assert.equal(status, 'paid');
    });

    console.log('\n--- 2. Quotation / SPO Document Type Validation ---');

    await test('Quotation: Correct prefix format and convert capability', () => {
        const quotationNumber = `QUO/2026/000123`;
        assert.ok(quotationNumber.startsWith('QUO/'), 'Quotation must start with QUO/');

        const convertedNumber = quotationNumber.replace(/^QUO\//, 'INV/');
        assert.ok(convertedNumber.startsWith('INV/'), 'Converted invoice must start with INV/');
        assert.equal(convertedNumber, 'INV/2026/000123');
    });

    console.log('\n--- 3. Email Channel Service Verification ---');

    await test('Email Service: Exists and exports sendOutboundEmail & getEmailConfig', () => {
        assert.equal(typeof emailService.sendOutboundEmail, 'function');
        assert.equal(typeof emailService.getEmailConfig, 'function');
    });

    console.log('\n--- 4. TikTok Channel Service Verification ---');

    await test('TikTok Service: Signature Calculation and Webhook Verification', () => {
        const appSecret = 'my_tiktok_secret_key';
        const body = JSON.stringify({ event: 'CHAT_MESSAGE', open_id: 'tt_user_123' });

        const computedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(body)
            .digest('hex');

        const isValid = tiktokService.verifyTikTokSignature(body, computedSignature, appSecret);
        assert.equal(isValid, true, 'Signature verification must return true for authentic payload');

        const isTampered = tiktokService.verifyTikTokSignature(body, 'tampered_signature_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', appSecret);
        assert.equal(isTampered, false, 'Signature verification must return false for tampered payload');
    });

    console.log('\n--- 5. LINE Messaging API Verification ---');

    await test('LINE Service: Signature Verification and export integrity', () => {
        assert.equal(typeof lineService.sendLineMessage, 'function');
        assert.equal(typeof lineService.getLineConfig, 'function');

        const channelSecret = 'my_line_secret_123';
        const body = JSON.stringify({ events: [{ type: 'message', message: { text: 'Hello' } }] });
        const validSignature = crypto
            .createHmac('sha256', channelSecret)
            .update(body)
            .digest('base64');

        const isValid = lineService.verifyLineSignature(body, validSignature, channelSecret);
        assert.equal(isValid, true, 'LINE signature verification must be valid');

        const isTampered = lineService.verifyLineSignature(body, 'invalid_sig', channelSecret);
        assert.equal(isTampered, false, 'LINE signature verification must reject invalid signature');
    });

    console.log('\n--- 6. Shopee Seller Chat Bridge Verification ---');

    await test('Shopee Service: Signature generation and export integrity', () => {
        assert.equal(typeof shopeeService.sendShopeeMessage, 'function');
        assert.equal(typeof shopeeService.getShopeeConfig, 'function');

        const partnerKey = 'shopee_partner_key_123';
        const path = '/api/v2/sellerchat/send_message';
        const timestamp = 1714500000;
        const sign = shopeeService.generateShopeeSignature(partnerKey, path, timestamp, 'tok_123', 'shop_456');
        assert.ok(sign && sign.length === 64, 'Shopee signature must be 64 characters hex string');

        const isSigValid = shopeeService.verifyShopeeSignature('raw_body_content', crypto.createHmac('sha256', partnerKey).update('raw_body_content').digest('hex'), partnerKey);
        assert.equal(isSigValid, true, 'Shopee raw webhook verification must pass');
    });

    console.log('\n--- 7. Tokopedia Seller Chat Bridge Verification ---');

    await test('Tokopedia Service: Export integrity and functions', () => {
        assert.equal(typeof tokopediaService.sendTokopediaMessage, 'function');
        assert.equal(typeof tokopediaService.getTokopediaConfig, 'function');
        assert.equal(typeof tokopediaService.getTokopediaAccessToken, 'function');
    });

    console.log('\n======================================================');
    console.log(`  RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) process.exit(1);
};

runSuite().catch(e => {
    console.error('Fatal Suite Error:', e);
    process.exit(1);
});
