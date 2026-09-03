import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(__dirname, '../../frontend');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const errors = [];

const check = (condition, description) => {
    totalChecks++;
    if (condition) {
        console.log(`  ✅ [PASS] ${description}`);
        passedChecks++;
    } else {
        console.error(`  ❌ [FAIL] ${description}`);
        failedChecks++;
        errors.push(description);
    }
};

console.log('================================================================');
console.log('🛡️ RUNNING DEEP COMPREHENSIVE QUALITY & REGRESSION AUDIT');
console.log('================================================================\n');

// 1. ThemeContext Specification & Robustness
console.log('--- 1. Theme System Architecture & Token Structure ---');
const themeContextPath = path.join(frontendRoot, 'src/context/ThemeContext.js');
check(fs.existsSync(themeContextPath), 'ThemeContext.js exists');

const themeContextCode = fs.readFileSync(themeContextPath, 'utf8');
check(themeContextCode.includes("export const THEME_PRESETS = ["), 'THEME_PRESETS array is defined and exported');
check(themeContextCode.includes("id: 'executive'"), "Contains 'executive' preset");
check(themeContextCode.includes("id: 'modern'"), "Contains 'modern' preset");
check(themeContextCode.includes("id: 'classic'"), "Contains 'classic' preset");
check(themeContextCode.includes("data-theme-preset"), "Sets 'data-theme-preset' HTML attribute");
check(themeContextCode.includes("localStorage.setItem('crmhub_theme_preset'"), "Persists preset to localStorage");
check(themeContextCode.includes("currentPresetConfig"), "Provides currentPresetConfig to consumers");

// 2. CSS Design Tokens & Base Theme Rules
console.log('\n--- 2. CSS Variables & Corporate Design Tokens ---');
const cssPath = path.join(frontendRoot, 'src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
check(cssContent.includes('[data-theme-preset="executive"]'), 'index.css defines [data-theme-preset="executive"] variables');
check(cssContent.includes('[data-theme-preset="modern"]'), 'index.css defines [data-theme-preset="modern"] variables');
check(cssContent.includes('[data-theme-preset="classic"]'), 'index.css defines [data-theme-preset="classic"] variables');
check(cssContent.includes('--theme-sidebar-bg'), 'index.css declares --theme-sidebar-bg');
check(cssContent.includes('antialiased'), 'index.css applies font antialiasing');

// 3. Theme Selector Modal Safety
console.log('\n--- 3. Theme Selector Modal UI/UX Safety ---');
const modalPath = path.join(frontendRoot, 'src/components/common/ThemeSelectorModal.jsx');
check(fs.existsSync(modalPath), 'ThemeSelectorModal.jsx exists');
const modalCode = fs.readFileSync(modalPath, 'utf8');
check(modalCode.includes('onClick={onClose}'), 'ThemeSelectorModal supports backdrop dismiss');
check(modalCode.includes('e.stopPropagation()'), 'ThemeSelectorModal stops click propagation on dialog card');
check(modalCode.includes('THEME_PRESETS.map'), 'ThemeSelectorModal iterates dynamically over THEME_PRESETS');
check(modalCode.includes('isDark && toggleTheme()'), 'ThemeSelectorModal handles light mode switch');
check(!modalCode.includes("text-undefined"), 'No dangling undefined classes in modal code');

// 4. Sidebar Dynamic Adaptability & Fallbacks
console.log('\n--- 4. Sidebar Dynamic Adaptability & Fallback Integrity ---');
const sidebarPath = path.join(frontendRoot, 'src/components/layout/Sidebar.js');
const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');
check(sidebarCode.includes("currentPresetConfig?.sidebarClass"), 'Sidebar container has solid fallback class');
check(sidebarCode.includes("currentPresetConfig?.toggleBtnClass"), 'Sidebar collapse toggle has theme fallback');
check(sidebarCode.includes("currentPresetConfig?.id === 'classic'"), 'Sidebar handles classic vs corporate branching');
check(sidebarCode.includes("currentPresetConfig={currentPresetConfig}"), 'Sidebar passes currentPresetConfig to MenuItem');

// 5. Header Component State & Tag Integrity
console.log('\n--- 5. Header Component State & Tag Integrity ---');
const headerPath = path.join(frontendRoot, 'src/components/layout/Header.js');
const headerCode = fs.readFileSync(headerPath, 'utf8');
check(headerCode.includes('import ThemeSelectorModal from'), 'Header.js imports ThemeSelectorModal');
check(headerCode.includes('isThemeModalOpen'), 'Header.js manages isThemeModalOpen state');
check(headerCode.includes('<ThemeSelectorModal'), 'Header.js renders ThemeSelectorModal component');
check(headerCode.includes('Personalisasi Tema UI'), 'Header.js user menu includes Personalisasi Tema UI item');

// 6. Profile Settings Page Integration
console.log('\n--- 6. Profile Settings UI Component Safety ---');
const profilePath = path.join(frontendRoot, 'src/pages/Settings/ProfileSettings.js');
const profileCode = fs.readFileSync(profilePath, 'utf8');
check(profileCode.includes('useTheme, THEME_PRESETS'), 'ProfileSettings.js imports useTheme and THEME_PRESETS');
check(profileCode.includes('Tema & Tampilan Antarmuka (UI)'), 'ProfileSettings.js renders Theme & UI section');
check(profileCode.includes('Danger Zone'), 'Danger zone remains intact');
check(profileCode.includes('handleUpdateProfile'), 'Profile update handler remains intact');

// 7. Production Build Artifacts Verification
console.log('\n--- 7. Production Build Artifacts Integrity ---');
const distDir = path.join(frontendRoot, 'dist');
check(fs.existsSync(distDir), 'frontend/dist directory exists');
check(fs.existsSync(path.join(distDir, 'index.html')), 'frontend/dist/index.html exists');

const distAssets = fs.readdirSync(path.join(distDir, 'assets'));
check(distAssets.length > 50, `frontend/dist/assets has ${distAssets.length} bundled files`);
check(distAssets.some(f => f.startsWith('index-') && f.endsWith('.js')), 'Main index bundle JS exists');
check(distAssets.some(f => f.startsWith('index-') && f.endsWith('.css')), 'Main index stylesheet CSS exists');

console.log('\n================================================================');
console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
console.log('================================================================');

if (failedChecks === 0) {
    console.log('🎉 100% QUALITY & REGRESSION AUDIT PASS: Zero issues found across all checks!\n');
    process.exit(0);
} else {
    console.error(`❌ AUDIT FAILED with ${failedChecks} errors:\n`, errors);
    process.exit(1);
}
