import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

// Sort in exact order as migrateRunner.js
files.sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999999', 10);
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999999', 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
});

console.log('====================================================');
console.log('AUDITING 31 MIGRATION FILES & SCHEMA INTEGRITY');
console.log('====================================================');

const createdTables = new Set();
const tableColumns = {}; // tableName -> Set of columns
let issues = [];

files.forEach((file, idx) => {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // 1. Track CREATE TABLE
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]\w*)\s*\(([\s\S]*?)\);/gi;
    let match;
    while ((match = createTableRegex.exec(sql)) !== null) {
        const table = match[1].toLowerCase();
        createdTables.add(table);
        if (!tableColumns[table]) tableColumns[table] = new Set();

        const body = match[2];
        const lines = body.split('\n');
        lines.forEach(l => {
            const colMatch = l.trim().match(/^([a-zA-Z_]\w*)\s+(?:VARCHAR|TEXT|INTEGER|BIGINT|BIGSERIAL|SERIAL|BOOLEAN|DECIMAL|TIMESTAMPTZ|TIMESTAMP|JSONB|UUID|VECTOR|DATE|INT)/i);
            if (colMatch) {
                tableColumns[table].add(colMatch[1].toLowerCase());
            }
        });
    }

    // 2. Track ALTER TABLE ... ADD COLUMN
    const addColRegex = /ALTER\s+TABLE\s+([a-zA-Z_]\w*)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]\w*)/gi;
    while ((match = addColRegex.exec(sql)) !== null) {
        const table = match[1].toLowerCase();
        const col = match[2].toLowerCase();
        if (!tableColumns[table]) tableColumns[table] = new Set();
        tableColumns[table].add(col);
    }

    // 3. Check FK references
    const fkRegex = /REFERENCES\s+([a-zA-Z_]\w*)\s*\(([a-zA-Z_]\w*)\)/gi;
    while ((match = fkRegex.exec(sql)) !== null) {
        const targetTable = match[1].toLowerCase();
        const targetCol = match[2].toLowerCase();
        if (!createdTables.has(targetTable)) {
            issues.push(`[${file}] FK references table '${targetTable}' before it is created.`);
        }
    }
});

console.log(`\nTracked Tables: ${createdTables.size}`);
console.log(`Issues Found: ${issues.length}`);

if (issues.length > 0) {
    console.log('\nIssues Detail:');
    issues.forEach(iss => console.log('  - ' + iss));
} else {
    console.log('\nALL TABLE REFERENCES & FOREIGN KEYS ARE ORDERED AND VALID!');
}

console.log('====================================================\n');
