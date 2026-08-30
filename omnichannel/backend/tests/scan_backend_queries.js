import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, '../migrations');
const mFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
const schemaTables = new Set();

mFiles.forEach(f => {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]\w*)/gi;
    let m;
    while ((m = tableRegex.exec(sql)) !== null) {
        schemaTables.add(m[1].toLowerCase());
    }
});

function scanDir(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(item => {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            if (item !== 'node_modules' && item !== 'logs' && item !== 'uploads') {
                files = files.concat(scanDir(full));
            }
        } else if (item.endsWith('.js')) {
            files.push(full);
        }
    });
    return files;
}

const jsFiles = scanDir(path.resolve(__dirname, '../src'));
const realQueriedTables = new Set();
const missingActualTables = [];

const sqlTableRegex = /\b(?:FROM|JOIN|INSERT\s+INTO|UPDATE)\s+([a-zA-Z_]\w*)/gi;
const ignoreList = new Set([
    'information_schema', 'pg_class', 'pg_tables', 'unnest', 'jsonb_array_elements',
    'generate_series', 'now', 'jsonb_build_object', 'count', 'coalesce', 'values',
    'set', 'where', 'select', 'table', 'distinct', 'null', 'as', 'using', 'only',
    '_schema_migrations', 'users_table', 'target_table', 'source_table'
]);

jsFiles.forEach(f => {
    const code = fs.readFileSync(f, 'utf8');
    let tm;
    while ((tm = sqlTableRegex.exec(code)) !== null) {
        const tbl = tm[1].toLowerCase();
        if (!ignoreList.has(tbl) && !tbl.startsWith('$') && !tbl.startsWith('idx_')) {
            realQueriedTables.add(tbl);
            if (!schemaTables.has(tbl)) {
                missingActualTables.push({ file: path.relative(path.resolve(__dirname, '../src'), f), table: tbl });
            }
        }
    }
});

console.log('====================================================');
console.log('📊 BACKEND SQL QUERY VS SCHEMA AUDIT');
console.log('====================================================');
console.log(`Tracked Tables in Schema: ${schemaTables.size}`);
console.log(`Queried Tables in Backend Code: ${realQueriedTables.size}`);
console.log(`Potentially Missing Tables: ${missingActualTables.length}`);

if (missingActualTables.length > 0) {
    console.log('\nDetails of missing tables:');
    missingActualTables.forEach(item => console.log(`  ❌ [${item.file}] Table: ${item.table}`));
} else {
    console.log('\n✅ 100% OF ALL TABLES QUERIED IN BACKEND CODE EXIST IN MIGRATIONS SCHEMA!');
}
console.log('====================================================\n');
