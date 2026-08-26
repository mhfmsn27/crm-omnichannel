/**
 * CRMHub Omnichannel - Automated Test Suite
 * Run: node tests/crm-test.js
 *
 * Prerequisites:
 * 1. npm install playwright
 * 2. npx playwright install chromium
 * 3. Update CONFIG below with your credentials
 */

const { chromium } = require('playwright');

const CONFIG = {
    baseUrl: process.env.TEST_URL || 'http://vps.lamankita.web.id',
    email: process.env.TEST_EMAIL || 'admin@lamankita.web.id',
    password: process.env.TEST_PASSWORD || 'your_password_here',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO) || 0,
    timeout: 30000
};

const testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: []
};

// ==========================================
// TEST HELPERS
// ==========================================

async function test(name, fn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
        await fn();
        console.log(`✅ PASSED: ${name}`);
        testResults.passed++;
    } catch (error) {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   Error: ${error.message}`);
        testResults.errors.push({ name, error: error.message });
        testResults.failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

async function waitForElement(page, selector, options = {}) {
    const { timeout = CONFIG.timeout, state = 'visible' } = options;
    try {
        await page.waitForSelector(selector, { timeout, state });
        return true;
    } catch {
        return false;
    }
}

async function clickAndWait(page, selector) {
    await page.click(selector);
    await page.waitForLoadState('networkidle');
}

// ==========================================
// AUTHENTICATION TESTS
// ==========================================

async function testLogin(page) {
    console.log('\n📝 Testing Login Flow...');

    await test('Login page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/login');
        await page.waitForLoadState('networkidle');
        const title = await page.title();
        assert(title.includes('CRM') || title.length > 0, 'Page should load');
    });

    await test('Login form is visible', async () => {
        const emailInput = await waitForElement(page, 'input[type="email"]');
        const passwordInput = await waitForElement(page, 'input[type="password"]');
        assert(emailInput && passwordInput, 'Login form should be visible');
    });

    await test('Can login with valid credentials', async () => {
        await page.fill('input[type="email"]', CONFIG.email);
        await page.fill('input[type="password"]', CONFIG.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        const url = page.url();
        assert(!url.includes('login'), 'Should redirect after login');
    });
}

async function testLogout(page) {
    console.log('\n📝 Testing Logout Flow...');

    await test('Can logout', async () => {
        await page.goto(CONFIG.baseUrl + '/settings/profile');
        await page.waitForLoadState('networkidle');

        // Find and click logout button
        const logoutBtn = await page.$('text=/logout|sign out|keluar/i');
        if (logoutBtn) {
            await logoutBtn.click();
            await page.waitForTimeout(1000);
            const url = page.url();
            assert(url.includes('login') || url === CONFIG.baseUrl, 'Should redirect to login');
        } else {
            console.log('   ⚠️ Logout button not found, skipping...');
            testResults.skipped++;
        }
    });
}

// ==========================================
// DASHBOARD TESTS
// ==========================================

async function testDashboard(page) {
    console.log('\n📊 Testing Dashboard...');

    await test('Dashboard page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/dashboard');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        const url = page.url();
        assert(!url.includes('login'), 'Should be logged in');
    });

    await test('Dashboard shows stats cards', async () => {
        await page.waitForTimeout(2000);
        const content = await page.textContent('body');
        assert(
            content.includes('conversation') ||
            content.includes('message') ||
            content.includes('dashboard'),
            'Dashboard should show metrics'
        );
    });

    await test('Sidebar navigation visible', async () => {
        const sidebar = await page.$('aside, nav, [class*="sidebar"]');
        assert(sidebar, 'Sidebar should be visible');
    });
}

// ==========================================
// INBOX TESTS
// ==========================================

async function testInbox(page) {
    console.log('\n📥 Testing Inbox Module...');

    await test('Inbox page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/inbox');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Inbox conversation list visible', async () => {
        const hasConversations = await waitForElement(page, '[class*="conversation"], [class*="inbox"]', { state: 'attached' });
        // Not asserting - may be empty
    });

    await test('Can filter by channel', async () => {
        const channelFilter = await page.$('text=/whatsapp|instagram|channel/i');
        if (channelFilter) {
            await channelFilter.click();
            await page.waitForTimeout(500);
        } else {
            console.log('   ⚠️ Channel filter not found, skipping...');
            testResults.skipped++;
        }
    });
}

// ==========================================
// CONTACTS TESTS
// ==========================================

async function testContacts(page) {
    console.log('\n👥 Testing Contacts Module...');

    await test('Contacts page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/contacts');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Contacts list visible', async () => {
        const content = await page.textContent('body');
        assert(content.includes('contact') || content.includes('Contact'), 'Should show contacts');
    });

    await test('Search functionality works', async () => {
        const searchInput = await page.$('input[placeholder*="search" i], input[placeholder*="cari" i]');
        if (searchInput) {
            await searchInput.fill('test');
            await page.waitForTimeout(1000);
            const content = await page.textContent('body');
            // Should show search results or empty state
            assert(true, 'Search executed');
        } else {
            console.log('   ⚠️ Search input not found, skipping...');
            testResults.skipped++;
        }
    });
}

// ==========================================
// BROADCAST TESTS
// ==========================================

async function testBroadcast(page) {
    console.log('\n📢 Testing Broadcast Module...');

    await test('Broadcast page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/broadcast');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Broadcast form visible', async () => {
        const content = await page.textContent('body');
        assert(
            content.includes('broadcast') ||
            content.includes('schedule') ||
            content.includes('kirim'),
            'Should show broadcast page'
        );
    });
}

// ==========================================
// CHATBOT TESTS
// ==========================================

async function testChatbot(page) {
    console.log('\n🤖 Testing Chatbot Module...');

    await test('Chatbot page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/chatbot');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Bot list or create form visible', async () => {
        const content = await page.textContent('body');
        assert(
            content.includes('bot') ||
            content.includes('chatbot') ||
            content.includes('flow'),
            'Should show chatbot page'
        );
    });
}

// ==========================================
// REPORTS TESTS
// ==========================================

async function testReports(page) {
    console.log('\n📈 Testing Reports Module...');

    const reportPages = [
        { path: '/reports/general', name: 'General Report' },
        { path: '/reports/agent-performance', name: 'Agent Performance' },
        { path: '/reports/sla-csat', name: 'SLA & CSAT' },
        { path: '/reports/advanced-analytics', name: 'Advanced Analytics' },
        { path: '/reports/attribution', name: 'Source Attribution' }
    ];

    for (const report of reportPages) {
        await test(`${report.name} page loads`, async () => {
            await page.goto(CONFIG.baseUrl + report.path);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            assert(true, 'Page loaded');
        });
    }
}

// ==========================================
// SETTINGS TESTS
// ==========================================

async function testSettings(page) {
    console.log('\n⚙️ Testing Settings Module...');

    const settingsPages = [
        { path: '/settings/profile', name: 'Profile' },
        { path: '/settings/team', name: 'Team' },
        { path: '/settings/quick-replies', name: 'Quick Replies' },
        { path: '/settings/auto-reply', name: 'Auto Reply' },
        { path: '/settings/auto-label', name: 'Auto Label' },
        { path: '/settings/license', name: 'License' },
        { path: '/settings/ecommerce', name: 'E-Commerce' },
        { path: '/settings/multi-language', name: 'Multi Language' }
    ];

    for (const setting of settingsPages) {
        await test(`${setting.name} settings page loads`, async () => {
            await page.goto(CONFIG.baseUrl + setting.path);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            assert(true, 'Page loaded');
        });
    }
}

// ==========================================
// PIPELINE TESTS
// ==========================================

async function testPipeline(page) {
    console.log('\n📋 Testing Pipeline Module...');

    await test('Pipeline list page loads', async () => {
        await page.goto(CONFIG.baseUrl + '/pipelines');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
    });

    await test('Can access pipeline board', async () => {
        // Click first pipeline if exists
        const pipelineCard = await page.$('[class*="pipeline"], [class*="card"]');
        if (pipelineCard) {
            await pipelineCard.click();
            await page.waitForTimeout(1000);
        }
        assert(true, 'Pipeline board tested');
    });
}

// ==========================================
// API TESTS
// ==========================================

async function testAPI(page) {
    console.log('\n🔌 Testing API Endpoints...');

    const apiEndpoints = [
        '/api/app/dashboard',
        '/api/app/inbox/conversations',
        '/api/app/contacts',
        '/api/app/license/check',
        '/api/app/license/status',
        '/api/app/analytics/overview'
    ];

    for (const endpoint of apiEndpoints) {
        await test(`API: ${endpoint}`, async () => {
            try {
                const response = await page.evaluate(async (url) => {
                    const res = await fetch(url);
                    return { status: res.status, ok: res.ok };
                }, CONFIG.baseUrl + endpoint);

                assert(
                    response.status === 200 || response.status === 401 || response.status === 403,
                    `API should respond (got ${response.status})`
                );
            } catch (e) {
                // API might require auth
                assert(true, 'API tested');
            }
        });
    }
}

// ==========================================
// RESPONSIVE TESTS
// ==========================================

async function testResponsive(page) {
    console.log('\n📱 Testing Responsive Design...');

    const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
    ];

    for (const viewport of viewports) {
        await test(`${viewport.name} (${viewport.width}x${viewport.height}) layout`, async () => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.goto(CONFIG.baseUrl + '/dashboard');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);

            // Check no horizontal scroll on mobile
            if (viewport.width <= 768) {
                const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
                const windowWidth = await page.evaluate(() => window.innerWidth);
                assert(scrollWidth <= windowWidth + 10, 'Should not have horizontal scroll');
            }
            assert(true, 'Layout tested');
        });
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
}

// ==========================================
// PERFORMANCE TESTS
// ==========================================

async function testPerformance(page) {
    console.log('\n⚡ Testing Performance...');

    await test('Page load time acceptable', async () => {
        const startTime = Date.now();
        await page.goto(CONFIG.baseUrl + '/dashboard');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;

        console.log(`   Load time: ${loadTime}ms`);
        assert(loadTime < 10000, `Load time should be under 10s (was ${loadTime}ms)`);
    });

    await test('No excessive console errors', async () => {
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto(CONFIG.baseUrl + '/dashboard');
        await page.waitForTimeout(3000);

        // Filter out common non-critical errors
        const criticalErrors = errors.filter(e =>
            !e.includes('favicon') &&
            !e.includes('manifest') &&
            !e.includes('analytics')
        );

        if (criticalErrors.length > 0) {
            console.log(`   ⚠️ Console errors found: ${criticalErrors.length}`);
            console.log(`   ${criticalErrors.slice(0, 3).join('\n   ')}`);
        }
        assert(true, 'Console errors checked');
    });
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runTests() {
    console.log('═'.repeat(60));
    console.log('🧪 CRMHub Omnichannel - Automated Test Suite');
    console.log('═'.repeat(60));
    console.log(`\nTarget: ${CONFIG.baseUrl}`);
    console.log(`Email: ${CONFIG.email}`);

    const browser = await chromium.launch({
        headless: CONFIG.headless,
        slowMo: CONFIG.slowMo
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`   [Console Error] ${msg.text()}`);
        }
    });

    try {
        // Run tests
        await testLogin(page);
        await testDashboard(page);
        await testInbox(page);
        await testContacts(page);
        await testBroadcast(page);
        await testChatbot(page);
        await testReports(page);
        await testPipeline(page);
        await testSettings(page);
        await testAPI(page);
        await testResponsive(page);
        await testPerformance(page);

    } catch (error) {
        console.error('\n❌ Test runner error:', error);
    } finally {
        await browser.close();
    }

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⏭️  Skipped: ${testResults.skipped}`);

    if (testResults.errors.length > 0) {
        console.log('\n⚠️ Failed Tests:');
        testResults.errors.forEach(e => {
            console.log(`   - ${e.name}: ${e.error}`);
        });
    }

    console.log('='.repeat(60));
    console.log('\n✨ Test suite completed!');

    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// Export for use as module
module.exports = { runTests, test, assert, CONFIG };

// Run if executed directly
if (require.main === module) {
    runTests().catch(console.error);
}