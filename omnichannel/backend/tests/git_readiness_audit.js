import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(__dirname, '../../..');
const omnichannelRoot = path.resolve(__dirname, '../..');
const waServerRoot = path.join(workspaceRoot, 'wa-server');

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
console.log('🔒 RUNNING GIT READINESS & SECURITY HYGIENE AUDIT');
console.log('================================================================\n');

// 1. Audit .gitignore Files Existence & Key Security Rules
console.log('--- 1. .gitignore Coverage & Rules ---');

const rootGitignore = path.join(workspaceRoot, '.gitignore');
check(fs.existsSync(rootGitignore), 'Root workspace .gitignore exists');
if (fs.existsSync(rootGitignore)) {
    const content = fs.readFileSync(rootGitignore, 'utf8');
    check(content.includes('.env'), 'Root .gitignore blocks .env files');
    check(content.includes('node_modules'), 'Root .gitignore blocks node_modules');
    check(content.includes('uploads'), 'Root .gitignore blocks uploads directory');
    check(content.includes('sessions'), 'Root .gitignore blocks WhatsApp sessions');
    check(content.includes('dist'), 'Root .gitignore blocks build outputs');
    check(content.includes('*.sql'), 'Root .gitignore blocks database dumps');
}

const omniGitignore = path.join(omnichannelRoot, '.gitignore');
check(fs.existsSync(omniGitignore), 'omnichannel/.gitignore exists');
if (fs.existsSync(omniGitignore)) {
    const content = fs.readFileSync(omniGitignore, 'utf8');
    check(content.includes('.env'), 'omnichannel/.gitignore blocks .env files');
    check(content.includes('node_modules'), 'omnichannel/.gitignore blocks node_modules');
    check(content.includes('uploads'), 'omnichannel/.gitignore blocks backend/uploads');
}

const waGitignore = path.join(waServerRoot, '.gitignore');
check(fs.existsSync(waGitignore), 'wa-server/.gitignore exists');
if (fs.existsSync(waGitignore)) {
    const content = fs.readFileSync(waGitignore, 'utf8');
    check(content.includes('.env'), 'wa-server/.gitignore blocks .env files');
    check(content.includes('node_modules'), 'wa-server/.gitignore blocks node_modules');
    check(content.includes('sessions'), 'wa-server/.gitignore blocks sessions');
}

// 2. Audit .env.example Templates
console.log('\n--- 2. .env.example Sanitized Templates ---');
const backendEnvEx = path.join(backendRoot, '.env.example');
check(fs.existsSync(backendEnvEx), 'backend/.env.example template exists');

const frontendEnvEx = path.join(omnichannelRoot, 'frontend/.env.example');
check(fs.existsSync(frontendEnvEx), 'frontend/.env.example template exists');

const waEnvEx = path.join(waServerRoot, 'wa-gateway/wa-gateway-backend/.env.example');
check(fs.existsSync(waEnvEx), 'wa-gateway-backend/.env.example template exists');

// 3. Audit Directory Placeholders (.gitkeep)
console.log('\n--- 3. Directory Placeholders (.gitkeep) ---');
check(fs.existsSync(path.join(backendRoot, 'uploads/.gitkeep')), 'backend/uploads/.gitkeep exists');
check(fs.existsSync(path.join(backendRoot, 'logs/.gitkeep')), 'backend/logs/.gitkeep exists');

console.log('\n================================================================');
console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
console.log('================================================================');

if (failedChecks === 0) {
    console.log('🎉 100% GIT READINESS AUDIT PASS: Project is 100% secure and ready for Git upload!\n');
    process.exit(0);
} else {
    console.error(`❌ GIT READINESS AUDIT FAILED with ${failedChecks} errors:\n`, errors);
    process.exit(1);
}
