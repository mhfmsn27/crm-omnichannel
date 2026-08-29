import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    getWIBTimeBreakdown, 
    checkWarmerActiveHours, 
    calculateNextWarmerDelay 
} from '../src/services/warmerTimeHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(__dirname, '../../frontend');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const errors = [];

const test = (condition, description) => {
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
console.log('⏰ RUNNING WHATSAPP WARMER HUMAN ACTIVE HOURS TEST SUITE');
console.log('================================================================\n');

// 1. Timezone Breakdown in WIB
console.log('--- 1. WIB Timezone Conversion ---');
// 2026-08-27T01:00:00Z UTC is 08:00:00 WIB (UTC+7)
const utcMorning = new Date(Date.UTC(2026, 7, 27, 1, 0, 0)); 
const wibMorning = getWIBTimeBreakdown(utcMorning);
test(wibMorning.hour === 8, `UTC 01:00 converts correctly to 08:00 WIB (got: ${wibMorning.hour})`);

// 2026-08-27T18:00:00Z UTC is 01:00:00 WIB next day (Dini hari)
const utcDiniHari = new Date(Date.UTC(2026, 7, 27, 18, 0, 0));
const wibDiniHari = getWIBTimeBreakdown(utcDiniHari);
test(wibDiniHari.hour === 1, `UTC 18:00 converts correctly to 01:00 WIB dini hari (got: ${wibDiniHari.hour})`);

// 2. Active Hours Detection Logic
console.log('\n--- 2. Active Hours Check (Default 08:00 - 21:00 WIB) ---');
const circleDefault = {
    name: 'Sales Circle',
    active_hours_start: 8,
    active_hours_end: 21,
    enable_active_hours: true,
    interval_min: 60,
    interval_max: 300,
    daily_limit_per_device: 50
};

// Test at 01:30 WIB (Dini Hari / Pagi Buta) -> MUST BE INACTIVE
const date0130 = new Date(Date.UTC(2026, 7, 27, 18, 30, 0)); // 01:30 WIB
const check0130 = checkWarmerActiveHours(circleDefault, date0130);
test(check0130.isActive === false, '01:30 WIB is correctly identified as SLEEP / INACTIVE');

// Test at 06:00 WIB (Pagi Buta) -> MUST BE INACTIVE
const date0600 = new Date(Date.UTC(2026, 7, 26, 23, 0, 0)); // 06:00 WIB
const check0600 = checkWarmerActiveHours(circleDefault, date0600);
test(check0600.isActive === false, '06:00 WIB is correctly identified as SLEEP / INACTIVE');

// Test at 08:00 WIB (Jam Mulai Pagi) -> MUST BE ACTIVE
const date0800 = new Date(Date.UTC(2026, 7, 27, 1, 0, 0)); // 08:00 WIB
const check0800 = checkWarmerActiveHours(circleDefault, date0800);
test(check0800.isActive === true, '08:00 WIB is correctly identified as ACTIVE');

// Test at 14:00 WIB (Siang Hari) -> MUST BE ACTIVE
const date1400 = new Date(Date.UTC(2026, 7, 27, 7, 0, 0)); // 14:00 WIB
const check1400 = checkWarmerActiveHours(circleDefault, date1400);
test(check1400.isActive === true, '14:00 WIB is correctly identified as ACTIVE');

// Test at 21:00 WIB (Jam Selesai Malam) -> MUST BE INACTIVE
const date2100 = new Date(Date.UTC(2026, 7, 27, 14, 0, 0)); // 21:00 WIB
const check2100 = checkWarmerActiveHours(circleDefault, date2100);
test(check2100.isActive === false, '21:00 WIB is correctly identified as SLEEP / INACTIVE');

// Test at 23:30 WIB (Tengah Malam) -> MUST BE INACTIVE
const date2330 = new Date(Date.UTC(2026, 7, 27, 16, 30, 0)); // 23:30 WIB
const check2330 = checkWarmerActiveHours(circleDefault, date2330);
test(check2330.isActive === false, '23:30 WIB is correctly identified as SLEEP / INACTIVE');

// 3. Delay & Reschedule Calculations
console.log('\n--- 3. Delay & Reschedule Verification ---');

// When at 01:00 WIB: Must delay until ~08:00 WIB today (~7 hours, 25,000,000+ ms)
const scheduleFrom0100 = calculateNextWarmerDelay(circleDefault, date0130, { minJitterMinutes: 2, maxJitterMinutes: 5 });
test(scheduleFrom0100.delayMs > 6 * 3600 * 1000, `From 01:30 WIB, delay until morning is ~6.5h+ (${Math.round(scheduleFrom0100.delayMs / 3600000)}h)`);
test(scheduleFrom0100.reason === 'EARLY_MORNING_PAUSE_RESUME_TODAY', `Reason is EARLY_MORNING_PAUSE_RESUME_TODAY`);
test(scheduleFrom0100.nextRunWIB.includes('Hari ini pukul 08:'), `Next run description targets today at 08:xx WIB (got: "${scheduleFrom0100.nextRunWIB}")`);

// When at 21:30 WIB: Must delay until ~08:00 WIB tomorrow (~10.5 hours)
const date2130 = new Date(Date.UTC(2026, 7, 27, 14, 30, 0)); // 21:30 WIB
const scheduleFrom2130 = calculateNextWarmerDelay(circleDefault, date2130, { minJitterMinutes: 2, maxJitterMinutes: 5 });
test(scheduleFrom2130.delayMs > 10 * 3600 * 1000, `From 21:30 WIB, delay until tomorrow morning is ~10.5h+ (${Math.round(scheduleFrom2130.delayMs / 3600000)}h)`);
test(scheduleFrom2130.reason === 'EVENING_PAUSE_RESUME_MORNING', `Reason is EVENING_PAUSE_RESUME_MORNING`);
test(scheduleFrom2130.nextRunWIB.includes('Besok pukul 08:'), `Next run description targets tomorrow at 08:xx WIB (got: "${scheduleFrom2130.nextRunWIB}")`);

// When Daily Limit Reached: Must resume tomorrow morning, NOT midnight!
const scheduleDailyLimit = calculateNextWarmerDelay(circleDefault, date1400, { isDailyLimitReached: true });
test(scheduleDailyLimit.reason === 'DAILY_LIMIT_REACHED_RESUME_MORNING', 'When daily limit reached, reason is DAILY_LIMIT_REACHED_RESUME_MORNING');
test(scheduleDailyLimit.nextRunWIB.includes('Besok pukul 08:'), `When daily limit reached, resumes tomorrow at 08:xx WIB (got: "${scheduleDailyLimit.nextRunWIB}")`);

// 4. File Integrity & Code Base Checks
console.log('\n--- 4. Migration & Code File Integrity ---');
const migration020Path = path.join(backendRoot, 'migrations/020_add_warmer_active_hours.sql');
test(fs.existsSync(migration020Path), 'Migration 020_add_warmer_active_hours.sql exists');

const migrationContent = fs.readFileSync(migration020Path, 'utf8');
test(migrationContent.includes('active_hours_start INTEGER DEFAULT 8'), 'Migration 020 adds active_hours_start with default 8');
test(migrationContent.includes('active_hours_end INTEGER DEFAULT 21'), 'Migration 020 adds active_hours_end with default 21');
test(migrationContent.includes('enable_active_hours BOOLEAN DEFAULT TRUE'), 'Migration 020 adds enable_active_hours with default TRUE');

const warmerWorkerPath = path.join(backendRoot, 'src/queues/warmerWorker.js');
const workerContent = fs.readFileSync(warmerWorkerPath, 'utf8');
test(workerContent.includes('checkWarmerActiveHours'), 'warmerWorker.js imports and calls checkWarmerActiveHours');
test(workerContent.includes('calculateNextWarmerDelay'), 'warmerWorker.js imports and calls calculateNextWarmerDelay');

const warmerControllerPath = path.join(backendRoot, 'src/controllers/warmerController.js');
const controllerContent = fs.readFileSync(warmerControllerPath, 'utf8');
test(controllerContent.includes('updateWarmer'), 'warmerController.js exports updateWarmer function');
test(controllerContent.includes('active_hours_start'), 'warmerController.js handles active_hours_start');

const broadcastRoutesPath = path.join(backendRoot, 'src/routes/broadcastRoutes.js');
const routesContent = fs.readFileSync(broadcastRoutesPath, 'utf8');
test(routesContent.includes("router.put('/warmer/:id'"), 'broadcastRoutes.js mounts PUT /warmer/:id');

const warmerPagePath = path.join(frontendRoot, 'src/pages/WarmerPage.js');
const pageContent = fs.readFileSync(warmerPagePath, 'utf8');
test(pageContent.includes('Jam Operasional Chat Harian'), 'WarmerPage.js includes Jam Operasional Chat UI');
test(pageContent.includes('Istirahat Malam'), 'WarmerPage.js displays Istirahat Malam status badge');

console.log('\n================================================================');
console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
console.log('================================================================');

if (failedChecks === 0) {
    console.log('🎉 100% WARMER HUMAN ACTIVE HOURS AUDIT PASS: Warmer is now realistic, safe, and logical!\n');
    process.exit(0);
} else {
    console.error(`❌ AUDIT FAILED with ${failedChecks} errors:\n`, errors);
    process.exit(1);
}
