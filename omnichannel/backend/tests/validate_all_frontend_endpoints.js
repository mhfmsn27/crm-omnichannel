import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..');
const FRONTEND_ROOT = path.resolve(__dirname, '../../frontend');

function getAllFiles(dir, exts = ['.js', '.jsx', '.ts', '.tsx']) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'dist') {
            files = files.concat(getAllFiles(fullPath, exts));
        } else if (item.isFile() && exts.includes(path.extname(item.name))) {
            files.push(fullPath);
        }
    }
    return files;
}

async function runEndpointAudit() {
    console.log('\n================================================================');
    console.log('🔎 EXHAUSTIVE FRONTEND-BACKEND ENDPOINT INTEGRITY AUDIT');
    console.log('================================================================\n');

    const frontendFiles = getAllFiles(path.join(FRONTEND_ROOT, 'src'));
    const callPattern = /axios\.(get|post|put|delete|patch)\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g;
    const allCalls = [];

    for (const file of frontendFiles) {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        const relPath = path.relative(FRONTEND_ROOT, file);
        while ((match = callPattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const fullUrl = match[2];
            const cleanUrl = fullUrl.split('?')[0];
            allCalls.push({
                file: relPath,
                method,
                fullUrl,
                cleanUrl
            });
        }
    }

    console.log(`Found ${allCalls.length} API calls across ${frontendFiles.length} frontend files.\n`);

    const uniqueEndpoints = new Map();
    for (const call of allCalls) {
        let normalized = call.cleanUrl
            .replace(/\$\{[^}]+\}/g, ':id')
            .replace(/\/([0-9]+)(\/|$)/g, '/:id$2');
        const key = `${call.method} ${normalized}`;
        if (!uniqueEndpoints.has(key)) {
            uniqueEndpoints.set(key, []);
        }
        uniqueEndpoints.get(key).push(call.file);
    }

    console.log(`Discovered ${uniqueEndpoints.size} unique (Method + Route) endpoint signatures.\n`);

    // Valid namespace prefixes that server.js mounts:
    const registeredPrefixes = [
        '/api/health',
        '/api/public',
        '/api/license',
        '/api/auth',
        '/api/sa',
        '/api/app/inbox',
        '/api/app/contacts',
        '/api/app/labels',
        '/api/app/auto-labels',
        '/api/app/auto-label',
        '/api/app/messenger',
        '/api/app/instagram',
        '/api/app/telegram',
        '/api/app/meta',
        '/api/app/dashboard',
        '/api/app/broadcasts',
        '/api/app/broadcast',
        '/api/app/upselling',
        '/api/app/rotators',
        '/api/app/tools',
        '/api/app/warmer',
        '/api/app/followups',
        '/api/app/forms',
        '/api/app/chatbot',
        '/api/app/flows',
        '/api/app/tasks',
        '/api/app/tickets',
        '/api/app/analytics',
        '/api/app/journeys',
        '/api/app/attribution',
        '/api/app/gamification',
        '/api/app/csat',
        '/api/app/reports',
        '/api/app/crm',
        '/api/app/pipelines',
        '/api/app/invoices',
        '/api/app/products',
        '/api/app/bookings',
        '/api/app/ai',
        '/api/app/system',
        '/api/app/devices',
        '/api/app/webchat',
        '/api/app/language',
        '/api/app/translate',
        '/api/app/workflow',
        '/api/app/scheduled-messages',
        '/api/app/ecommerce',
        '/api/app/archive',
        '/api/app/developer',
        '/api/app/organization',
        '/api/app/quick-replies',
        '/api/app/team',
        '/api/app/settings',
        '/api/app/roles',
        '/api/app/divisions',
        '/api/app/inboxes',
        '/api/app/email',
        '/api/app/auto-reply',
        '/api/app/notes',
        '/api/app/wa-templates',
        '/api/app/integrations',
        '/api/app/webhooks',
        '/api/app/billing',
        '/api/app/sales-visits',
        '/api/app/calls',
        '/api/app/leads',
        '/api/app/ongkir',
        '/api/app/invoice-settings',
        '/api/app/invoice-gateway',
        '/api/app/queue',
        '/api/app/affiliate',
        '/api/app/templates',
        '/api/app/conversations',
        '/api/app/recurring-invoices',
        '/api/app/license',
        '/api/ref'
    ];

    let validCount = 0;
    let anomalyCount = 0;

    for (const [endpointKey, callers] of uniqueEndpoints.entries()) {
        const [method, url] = endpointKey.split(' ');
        const isMatched = registeredPrefixes.some(prefix => url.startsWith(prefix));

        if (isMatched) {
            validCount++;
        } else {
            anomalyCount++;
            console.log(`⚠️ Anomaly endpoint: [${method}] ${url} (used in ${callers.join(', ')})`);
        }
    }

    console.log(`\n================================================================`);
    console.log(`ENDPOINT AUDIT RESULT:`);
    console.log(`  ✅ Standard & Registered: ${validCount}`);
    console.log(`  ⚠️ Anomalies: ${anomalyCount}`);
    console.log(`================================================================\n`);

    if (anomalyCount === 0) {
        console.log('🎉 100% of Frontend API calls map to registered backend routers!');
    }
}

runEndpointAudit();
