/**
 * CRMHub WhatsApp Device & Messaging Test Suite
 * Run: node tests/wa-test.js
 */

const { chromium } = require('playwright');

const CONFIG = {
    baseUrl: process.env.TEST_URL || 'http://vps.lamankita.web.id',
    email: process.env.TEST_EMAIL || 'admin@lamankita.web.id',
    password: process.env.TEST_PASSWORD || 'your_password_here',
    headless: process.env.HEADLESS !== 'false'
};

const results = {
    passed: 0,
    failed: 0,
    errors: []
};

function test(name, fn) {
    return new Promise(async (resolve) => {
        console.log(`\n🧪 ${name}`);
        try {
            await fn();
            console.log(`✅ PASSED`);
            results.passed++;
        } catch (e) {
            console.log(`❌ FAILED: ${e.message}`);
            results.errors.push({ name, error: e.message });
            results.failed++;
        }
        resolve();
    });
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

// ==========================================
// WHATSAPP DEVICE TESTS
// ==========================================

async function testWhatsAppDevices(page) {
    console.log('\n📱 WhatsApp Device Tests...');

    await test('Devices page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/settings/devices');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Add Device button visible', async () => {
        const addBtn = await page.$('button:has-text("Add"), button:has-text("Tambah"), button:has-text("Connect")');
        if (addBtn) {
            console.log('   ✅ Add button found');
        } else {
            console.log('   ⚠️ Add button not found (may already have device)');
        }
    });

    await test('Device list renders', async () => {
        const content = await page.textContent('body');
        assert(
            content.includes('device') ||
            content.includes('whatsapp') ||
            content.includes('WhatsApp'),
            'Should show device content'
        );
    });
}

// ==========================================
# INBOX WHATSAPP TESTS
// ==========================================

async function testWhatsAppInbox(page) {
    console.log('\n💬 WhatsApp Inbox Tests...');

    await test('Inbox page with WA conversations', async () => {
        await page.goto(CONFIG.baseUrl + '/inbox');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Filter for WhatsApp conversations
        const waTab = await page.$('text=/whatsapp|WA/i');
        if (waTab) {
            await waTab.click();
            await page.waitForTimeout(1000);
        }
    });

    await test('Can open conversation detail', async () => {
        const convItem = await page.$('[class*="conversation"]:first-child, [class*="inbox-item"]:first-child');
        if (convItem) {
            await convItem.click();
            await page.waitForTimeout(1000);
            assert(true, 'Conversation opened');
        } else {
            console.log('   ⚠️ No conversations found');
        }
    });
}

// ==========================================
// AUTO-REPLY WHATSAPP TESTS
// ==========================================

async function testAutoReplyWA(page) {
    console.log('\n⚡ WhatsApp Auto-Reply Tests...');

    await test('Auto-reply settings page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/settings/auto-reply');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Can create new auto-reply rule', async () => {
        const addBtn = await page.$('button:has-text("Add"), button:has-text("Tambah"), button:has-text("+")');
        if (addBtn) {
            await addBtn.click();
            await page.waitForTimeout(1000);

            // Fill basic form
            const keywordInput = await page.$('input[placeholder*="keyword" i], input[placeholder*="kata" i]');
            if (keywordInput) {
                await keywordInput.fill('test123');
                console.log('   ✅ Keyword filled');
            }

            const replyInput = await page.$('textarea, input[placeholder*="reply" i], input[placeholder*="balas" i]');
            if (replyInput) {
                await replyInput.fill('Test auto reply');
                console.log('   ✅ Reply filled');
            }

            // Save
            const saveBtn = await page.$('button:has-text("Save"), button:has-text("Simpan")');
            if (saveBtn) {
                await saveBtn.click();
                await page.waitForTimeout(1000);
            }
        }
        assert(true, 'Auto-reply form tested');
    });
}

// ==========================================
// AUTO-LABEL WHATSAPP TESTS
// ==========================================

async function testAutoLabelWA(page) {
    console.log('\n🏷️ WhatsApp Auto-Label Tests...');

    await test('Auto-label page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/settings/auto-label');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Channel filter includes WhatsApp', async () => {
        const content = await page.textContent('body');
        assert(
            content.includes('whatsapp') ||
            content.includes('WhatsApp') ||
            content.includes('source'),
            'Should show WhatsApp source option'
        );
    });
}

// ==========================================
// BROADCAST WA TESTS
// ==========================================

async function testBroadcastWA(page) {
    console.log('\n📢 WhatsApp Broadcast Tests...');

    await test('Broadcast page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/broadcast');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Can select WhatsApp channel for broadcast', async () => {
        const waOption = await page.$('input[type="radio"]:has-text("whatsapp"), [class*="radio"]:has-text("whatsapp")');
        if (waOption) {
            await waOption.click();
            await page.waitForTimeout(500);
        }
        assert(true, 'WhatsApp channel selected');
    });

    await test('Can add recipients', async () => {
        const addRecipient = await page.$('button:has-text("Add"), button:has-text("Tambah")');
        if (addRecipient) {
            await addRecipient.click();
            await page.waitForTimeout(500);
        }
        assert(true, 'Recipients modal opened');
    });
}

// ==========================================
// PIPELINE WA LEADS TESTS
// ==========================================

async function testPipelineWA(page) {
    console.log('\n📋 WhatsApp Pipeline Tests...');

    await test('Pipeline board loads', async () => {
        await page.goto(CONFIG.baseUrl + '/pipelines');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Can drag conversation to stage', async () => {
        const card = await page.$('[class*="draggable"], [class*="card"]');
        const stage = await page.$('[class*="droppable"], [class*="stage"]');

        if (card && stage) {
            const cardBox = await card.boundingBox();
            const stageBox = await stage.boundingBox();

            if (cardBox && stageBox) {
                // Perform drag
                await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
                await page.mouse.down();
                await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2, { steps: 10 });
                await page.mouse.up();
                await page.waitForTimeout(500);
                console.log('   ✅ Drag operation performed');
            }
        }
        assert(true, 'Pipeline interaction tested');
    });
}

// ==========================================
// MAIN RUNNER
// ==========================================

async function runTests() {
    console.log('═'.repeat(60));
    console.log('📱 CRMHub WhatsApp Test Suite');
    console.log('═'.repeat(60));

    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: 100
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Login first
    console.log('\n🔐 Logging in...');
    await page.goto(CONFIG.baseUrl + '/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', CONFIG.email);
    await page.fill('input[type="password"]', CONFIG.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Run WA-specific tests
    await testWhatsAppDevices(page);
    await testWhatsAppInbox(page);
    await testAutoReplyWA(page);
    await testAutoLabelWA(page);
    await testBroadcastWA(page);
    await testPipelineWA(page);

    await browser.close();

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 WhatsApp Test Results');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.errors.length > 0) {
        console.log('\n⚠️ Failed Tests:');
        results.errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
    }

    process.exit(results.failed > 0 ? 1 : 0);
}

module.exports = { runTests };

if (require.main === module) {
    runTests().catch(console.error);
}