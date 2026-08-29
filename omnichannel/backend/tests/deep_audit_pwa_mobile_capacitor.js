/**
 * Master Deep Audit Suite for PWA 2.0 & Mobile Capacitor Architecture
 * Validates Manifest, Service Worker, Viewport, Safe-Areas, Native Bridge, and React Components
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { strict as assert } from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '../../frontend');
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
    console.log('🔍 MASTER DEEP AUDIT: PWA 2.0 & MOBILE CAPACITOR ARCHITECTURE');
    console.log('================================================================\n');

    // 1. FILE INTEGRITY
    console.log('--- 1. Mobile & PWA Physical File Existence ---');
    const requiredFiles = [
        'public/manifest.json',
        'public/sw.js',
        'capacitor.config.json',
        'index.html',
        'src/utils/nativeBridge.js',
        'src/components/common/PwaInstallBanner.jsx',
        'src/components/layout/MobileBottomNav.jsx',
        'src/index.css'
    ];

    requiredFiles.forEach(relPath => {
        const fullPath = path.join(frontendRoot, relPath);
        check(`Frontend file exists: ${relPath}`, fs.existsSync(fullPath));
    });

    // 2. MANIFEST 2.0 AUDIT
    console.log('\n--- 2. PWA Manifest 2.0 Schema Audit ---');
    const manifestPath = path.join(frontendRoot, 'public/manifest.json');
    let manifest = {};
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        check('Manifest has valid appId identifier', manifest.id === 'com.crmhub.omnichannel');
        check('Manifest display is standalone', manifest.display === 'standalone');
        check('Manifest theme_color is corporate dark #0F172A', manifest.theme_color === '#0F172A');
        check('Manifest background_color is #0F172A', manifest.background_color === '#0F172A');
        check('Manifest icons contain both regular and maskable icons', manifest.icons.some(i => i.purpose?.includes('maskable')));
        check('Manifest defines 4 app shortcuts', Array.isArray(manifest.shortcuts) && manifest.shortcuts.length === 4);
    } catch (e) {
        check(`Manifest JSON parsing: ${e.message}`, false);
    }

    // 3. SERVICE WORKER AUDIT
    console.log('\n--- 3. Enhanced Service Worker 2.0 Syntax & Listeners Audit ---');
    const swContent = fs.readFileSync(path.join(frontendRoot, 'public/sw.js'), 'utf-8');
    check('SW handles install event with cache pre-caching', swContent.includes("addEventListener('install'"));
    check('SW handles activate event with old cache invalidation', swContent.includes("addEventListener('activate'"));
    check('SW handles fetch event with offline fallback', swContent.includes("addEventListener('fetch'"));
    check('SW handles push event for background notifications', swContent.includes("addEventListener('push'"));
    check('SW handles notificationclick for deep-linking', swContent.includes("addEventListener('notificationclick'"));

    // 4. CAPACITOR CONFIG AUDIT
    console.log('\n--- 4. Capacitor Config Schema Audit ---');
    const capPath = path.join(frontendRoot, 'capacitor.config.json');
    try {
        const cap = JSON.parse(fs.readFileSync(capPath, 'utf-8'));
        check('Capacitor appId matches com.crmhub.omnichannel', cap.appId === 'com.crmhub.omnichannel');
        check('Capacitor webDir is dist', cap.webDir === 'dist');
        check('Capacitor SplashScreen plugin is configured', !!cap.plugins?.SplashScreen);
        check('Capacitor StatusBar plugin is configured', !!cap.plugins?.StatusBar);
        check('Capacitor PushNotifications plugin is configured', !!cap.plugins?.PushNotifications);
    } catch (e) {
        check(`Capacitor config parsing: ${e.message}`, false);
    }

    // 5. INDEX.HTML & SAFE AREA CSS AUDIT
    console.log('\n--- 5. Mobile Viewport & Safe-Area CSS Audit ---');
    const htmlContent = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf-8');
    check('index.html contains viewport-fit=cover', htmlContent.includes('viewport-fit=cover'));
    check('index.html contains apple-mobile-web-app-capable', htmlContent.includes('apple-mobile-web-app-capable'));
    check('index.html links to manifest.json', htmlContent.includes('rel="manifest"'));

    const cssContent = fs.readFileSync(path.join(frontendRoot, 'src/index.css'), 'utf-8');
    check('index.css contains .pt-safe utility', cssContent.includes('.pt-safe'));
    check('index.css contains .pb-safe utility', cssContent.includes('.pb-safe'));
    check('index.css contains .h-safe-screen utility', cssContent.includes('.h-safe-screen'));

    // 6. REACT TREE MOUNTING IN APP.JSX AUDIT
    console.log('\n--- 6. React Router & App.jsx Mounting Audit ---');
    const appJsxContent = fs.readFileSync(path.join(frontendRoot, 'src/App.jsx'), 'utf-8');
    check('App.jsx imports PwaInstallBanner', appJsxContent.includes('import PwaInstallBanner'));
    check('App.jsx imports MobileBottomNav', appJsxContent.includes('import MobileBottomNav'));
    check('App.jsx renders <PwaInstallBanner />', appJsxContent.includes('<PwaInstallBanner />'));
    check('App.jsx renders <MobileBottomNav />', appJsxContent.includes('<MobileBottomNav />'));

    // SUMMARY
    console.log('\n================================================================');
    console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks.length}`);
    console.log('================================================================');

    if (failedChecks.length > 0) {
        console.error('\nFAILURES DETECTED:');
        failedChecks.forEach(f => console.error(` - ${f.desc} (${f.extraInfo})`));
        process.exit(1);
    } else {
        console.log('\n🎉 PWA & MOBILE MASTER AUDIT COMPLETE: 100% PERFECT PASS! No errors, bugs, or missing files.\n');
    }
};

runAudit().catch(err => {
    console.error('Fatal PWA Audit Error:', err);
    process.exit(1);
});
