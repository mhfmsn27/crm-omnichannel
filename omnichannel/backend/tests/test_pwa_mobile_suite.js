/**
 * Test Suite: PWA 2.0 & Mobile Capacitor Native Architecture
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { strict as assert } from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '../../frontend');

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
    console.log('🚀 TEST SUITE: PWA 2.0 & CAPACITOR MOBILE ARCHITECTURE');
    console.log('================================================================\n');

    console.log('--- 1. PWA Manifest 2.0 Validation ---');

    await test('Manifest: Exists and is valid JSON', () => {
        const manifestPath = path.join(frontendRoot, 'public/manifest.json');
        assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
        const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        assert.equal(content.id, 'com.crmhub.omnichannel');
        assert.equal(content.display, 'standalone');
        assert.ok(Array.isArray(content.icons) && content.icons.length >= 2, 'Must have multiple icon sizes');
        assert.ok(Array.isArray(content.shortcuts) && content.shortcuts.length >= 4, 'Must have app shortcuts');
    });

    console.log('\n--- 2. Enhanced Service Worker 2.0 Validation ---');

    await test('Service Worker: Exists and handles cache, push, and notificationclick', () => {
        const swPath = path.join(frontendRoot, 'public/sw.js');
        assert.ok(fs.existsSync(swPath), 'sw.js must exist');
        const swContent = fs.readFileSync(swPath, 'utf-8');
        assert.ok(swContent.includes("addEventListener('install'"), 'Must handle install event');
        assert.ok(swContent.includes("addEventListener('fetch'"), 'Must handle fetch caching event');
        assert.ok(swContent.includes("addEventListener('push'"), 'Must handle Web Push event');
        assert.ok(swContent.includes("addEventListener('notificationclick'"), 'Must handle notification click');
    });

    console.log('\n--- 3. Capacitor Native Mobile Config Validation ---');

    await test('Capacitor: Valid capacitor.config.json for Android & iOS', () => {
        const capPath = path.join(frontendRoot, 'capacitor.config.json');
        assert.ok(fs.existsSync(capPath), 'capacitor.config.json must exist');
        const capConfig = JSON.parse(fs.readFileSync(capPath, 'utf-8'));
        assert.equal(capConfig.appId, 'com.crmhub.omnichannel');
        assert.equal(capConfig.webDir, 'dist');
        assert.ok(capConfig.plugins.PushNotifications, 'Push notifications plugin must be configured');
    });

    console.log('\n--- 4. Mobile Safe-Area & Viewport Meta Tags ---');

    await test('Index HTML: Viewport cover and mobile meta tags', () => {
        const indexPath = path.join(frontendRoot, 'index.html');
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        assert.ok(indexContent.includes('viewport-fit=cover'), 'Viewport must include viewport-fit=cover');
        assert.ok(indexContent.includes('apple-mobile-web-app-capable'), 'Must have iOS PWA meta tag');
        assert.ok(indexContent.includes('manifest.json'), 'Must link to manifest.json');
    });

    console.log('\n--- 5. Mobile Components Existence ---');

    await test('Components: PwaInstallBanner and MobileBottomNav exist', () => {
        const pwaBanner = path.join(frontendRoot, 'src/components/common/PwaInstallBanner.jsx');
        const mobileNav = path.join(frontendRoot, 'src/components/layout/MobileBottomNav.jsx');
        const nativeBridge = path.join(frontendRoot, 'src/utils/nativeBridge.js');
        assert.ok(fs.existsSync(pwaBanner), 'PwaInstallBanner.jsx must exist');
        assert.ok(fs.existsSync(mobileNav), 'MobileBottomNav.jsx must exist');
        assert.ok(fs.existsSync(nativeBridge), 'nativeBridge.js must exist');
    });

    console.log('\n================================================================');
    console.log(`  RESULT: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
};

runSuite().catch(e => {
    console.error('PWA Mobile Suite error:', e);
    process.exit(1);
});
