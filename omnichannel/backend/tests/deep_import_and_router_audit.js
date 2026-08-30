/**
 * Master Deep Static & Dynamic Import & Router Audit Suite
 * Audits 100% of all routes, controllers, services, middlewares, and workers.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const srcDir = path.join(backendRoot, 'src');

console.log('================================================================');
console.log('🔍 MASTER DEEP AUDIT: ALL BACKEND MODULE IMPORTS & ROUTE HANDLERS');
console.log('================================================================\n');

let totalChecks = 0;
let errors = [];
let warnings = [];

function check(title, condition, errorMsg = '') {
    totalChecks++;
    if (condition) {
        console.log(`  ✅ [PASS] ${title}`);
    } else {
        console.error(`  ❌ [FAIL] ${title} - ${errorMsg}`);
        errors.push(`${title}: ${errorMsg}`);
    }
}

// 1. Scan and Import all Route files
console.log('--- 1. Auditing All Express Route Definitions ---');
const routesDir = path.join(srcDir, 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

for (const file of routeFiles) {
    const routePath = path.join(routesDir, file);
    try {
        const mod = await import(`file://${routePath.replace(/\\/g, '/')}`);
        const router = mod.default;

        if (router && router.stack) {
            let undefinedHandlers = 0;
            router.stack.forEach((layer) => {
                if (layer.route) {
                    layer.route.stack.forEach((subLayer) => {
                        if (typeof subLayer.handle !== 'function') {
                            undefinedHandlers++;
                        }
                    });
                } else if (typeof layer.handle !== 'function') {
                    undefinedHandlers++;
                }
            });

            check(`Route ${file} (contains ${router.stack.length} layers, 0 undefined handlers)`, undefinedHandlers === 0, `${undefinedHandlers} handlers are undefined`);
        } else {
            check(`Route ${file} exports valid Express router`, false, 'Default export is not a Router');
        }
    } catch (err) {
        check(`Route ${file} imports cleanly`, false, err.message);
    }
}

// 2. Scan and Import all Controller files
console.log('\n--- 2. Auditing All Controller Exports ---');
const controllersDir = path.join(srcDir, 'controllers');

function scanDirRecursive(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(scanDirRecursive(fullPath));
        } else if (file.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
}

const controllerFiles = scanDirRecursive(controllersDir);
for (const file of controllerFiles) {
    const relPath = path.relative(backendRoot, file);
    try {
        const mod = await import(`file://${file.replace(/\\/g, '/')}`);
        const exportKeys = Object.keys(mod);
        check(`Controller ${relPath} (exports ${exportKeys.length} functions)`, exportKeys.length > 0, 'No exports found');
    } catch (err) {
        check(`Controller ${relPath} imports cleanly`, false, err.message);
    }
}

// 3. Scan and Import all Service files
console.log('\n--- 3. Auditing All Service Exports ---');
const servicesDir = path.join(srcDir, 'services');
const serviceFiles = scanDirRecursive(servicesDir);

for (const file of serviceFiles) {
    const relPath = path.relative(backendRoot, file);
    try {
        const mod = await import(`file://${file.replace(/\\/g, '/')}`);
        const exportKeys = Object.keys(mod);
        check(`Service ${relPath} (exports ${exportKeys.length} members)`, exportKeys.length > 0, 'No exports found');
    } catch (err) {
        check(`Service ${relPath} imports cleanly`, false, err.message);
    }
}

// 4. Scan and Import all Middleware files
console.log('\n--- 4. Auditing All Middleware Exports ---');
const middlewareDir = path.join(srcDir, 'middleware');
const middlewareFiles = fs.readdirSync(middlewareDir).filter(f => f.endsWith('.js'));

for (const file of middlewareFiles) {
    const fullPath = path.join(middlewareDir, file);
    try {
        const mod = await import(`file://${fullPath.replace(/\\/g, '/')}`);
        const exportKeys = Object.keys(mod);
        check(`Middleware ${file} (exports ${exportKeys.length} items)`, exportKeys.length > 0, 'No exports found');
    } catch (err) {
        check(`Middleware ${file} imports cleanly`, false, err.message);
    }
}

// 5. Scan and Import all Queues & Workers
console.log('\n--- 5. Auditing All Queue & Worker Exports ---');
const queuesDir = path.join(srcDir, 'queues');
const queueFiles = fs.readdirSync(queuesDir).filter(f => f.endsWith('.js'));

for (const file of queueFiles) {
    const fullPath = path.join(queuesDir, file);
    try {
        const mod = await import(`file://${fullPath.replace(/\\/g, '/')}`);
        const exportKeys = Object.keys(mod);
        check(`Queue/Worker ${file} (exports ${exportKeys.length} items)`, exportKeys.length > 0, 'No exports found');
    } catch (err) {
        check(`Queue/Worker ${file} imports cleanly`, false, err.message);
    }
}

// 6. Scan and Import all Utils
console.log('\n--- 6. Auditing All Utility Exports ---');
const utilsDir = path.join(srcDir, 'utils');
const utilFiles = fs.readdirSync(utilsDir).filter(f => f.endsWith('.js'));

for (const file of utilFiles) {
    const fullPath = path.join(utilsDir, file);
    try {
        const mod = await import(`file://${fullPath.replace(/\\/g, '/')}`);
        const exportKeys = Object.keys(mod);
        check(`Utility ${file} (exports ${exportKeys.length} items)`, exportKeys.length > 0, 'No exports found');
    } catch (err) {
        check(`Utility ${file} imports cleanly`, false, err.message);
    }
}

console.log('\n================================================================');
console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${totalChecks - errors.length} | FAILED: ${errors.length}`);
console.log('================================================================\n');

if (errors.length > 0) {
    console.error('💥 AUDIT FAILED with errors:\n', errors);
    process.exit(1);
} else {
    console.log('🎉 AUDIT 100% PERFECT! All imports, exports, and router handlers are verified clean.\n');
    process.exit(0);
}
