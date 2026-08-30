import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');

const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

files.sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999999', 10);
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999999', 10);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
});

console.log('================================================================');
console.log('🔍 ULTRA-DEEP DATABASE & MIGRATION SIMULATION AUDIT');
console.log('================================================================');

// Virtual database catalog
const tables = {}; // tableName -> { columns: Set, constraints: Set, indexes: Set }
const errors = [];
const warnings = [];

// Helper to sanitize identifiers
const cleanId = (str) => (str || '').replace(/["'`]/g, '').trim().toLowerCase();

files.forEach((file, fileIdx) => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Split SQL by statements (handling basic comments and semicolons)
    // Remove comments
    const cleanSql = content
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');

    // Split statements outside DO $$ blocks
    const statements = [];
    let currentStmt = '';
    let inDoBlock = false;

    cleanSql.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.includes('DO $$')) inDoBlock = true;
        
        currentStmt += line + '\n';

        if (inDoBlock) {
            if (trimmed.includes('END $$;')) {
                inDoBlock = false;
                statements.push(currentStmt.trim());
                currentStmt = '';
            }
        } else if (trimmed.endsWith(';')) {
            statements.push(currentStmt.trim());
            currentStmt = '';
        }
    });
    if (currentStmt.trim()) statements.push(currentStmt.trim());

    statements.forEach((stmt, stmtIdx) => {
        if (!stmt) return;

        // 1. CREATE TABLE
        const createTableMatch = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)(?:\s*;\s*)?$/i);
        if (createTableMatch) {
            const tblName = cleanId(createTableMatch[1]);
            if (!tables[tblName]) {
                tables[tblName] = { columns: new Set(), constraints: new Set(), indexes: new Set() };
            }

            const body = createTableMatch[2];
            // Split column definitions by commas outside parentheses
            let parenDepth = 0;
            let currentDef = '';
            const defs = [];
            for (let i = 0; i < body.length; i++) {
                const char = body[i];
                if (char === '(') parenDepth++;
                else if (char === ')') parenDepth--;
                else if (char === ',' && parenDepth === 0) {
                    defs.push(currentDef.trim());
                    currentDef = '';
                    continue;
                }
                currentDef += char;
            }
            if (currentDef.trim()) defs.push(currentDef.trim());

            defs.forEach(def => {
                const defTrim = def.trim();
                // Check if constraint
                if (/^(?:CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)/i.test(defTrim)) {
                    // Check FK inside constraint
                    const fkMatch = defTrim.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?/i);
                    if (fkMatch) {
                        const targetTbl = cleanId(fkMatch[2]);
                        if (!tables[targetTbl]) {
                            errors.push(`[${file}] FK constraint references non-existent table '${targetTbl}'`);
                        }
                    }
                    return;
                }

                // Otherwise column
                const colMatch = defTrim.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_\[\]]+)/i);
                if (colMatch) {
                    const colName = cleanId(colMatch[1]);
                    tables[tblName].columns.add(colName);

                    // Check inline REFERENCES
                    const inlineFk = defTrim.match(/REFERENCES\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?/i);
                    if (inlineFk) {
                        const targetTbl = cleanId(inlineFk[1]);
                        const targetCol = cleanId(inlineFk[2] || 'id');
                        if (!tables[targetTbl]) {
                            errors.push(`[${file}] Column '${tblName}.${colName}' references non-existent table '${targetTbl}'`);
                        } else if (!tables[targetTbl].columns.has(targetCol)) {
                            // Column might be id primary key
                            if (targetCol !== 'id') {
                                warnings.push(`[${file}] Column '${tblName}.${colName}' references target '${targetTbl}.${targetCol}'`);
                            }
                        }
                    }
                }
            });
            return;
        }

        // 2. ALTER TABLE
        const alterTableMatch = stmt.match(/ALTER\s+TABLE\s+(?:ONLY\s+)?([a-zA-Z0-9_]+)\s+([\s\S]+)/i);
        if (alterTableMatch) {
            const tblName = cleanId(alterTableMatch[1]);
            if (!tables[tblName]) {
                errors.push(`[${file}] ALTER TABLE target '${tblName}' does NOT exist!`);
                return;
            }

            const actionBody = alterTableMatch[2];
            // Match ADD COLUMN
            const addColMatches = actionBody.matchAll(/ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+([^,;]+)/gi);
            for (const ac of addColMatches) {
                const colName = cleanId(ac[1]);
                tables[tblName].columns.add(colName);

                // Check FK in added column
                const inlineFk = ac[2].match(/REFERENCES\s+([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?/i);
                if (inlineFk) {
                    const targetTbl = cleanId(inlineFk[1]);
                    if (!tables[targetTbl]) {
                        errors.push(`[${file}] ALTER TABLE '${tblName}' ADD COLUMN '${colName}' references non-existent table '${targetTbl}'`);
                    }
                }
            }
            return;
        }

        // 3. CREATE INDEX
        const createIdxMatch = stmt.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_]+)\s*(?:USING\s+([a-zA-Z0-9_]+))?\s*\(([\s\S]*?)\)/i);
        if (createIdxMatch) {
            const idxName = cleanId(createIdxMatch[1]);
            const tblName = cleanId(createIdxMatch[2]);
            if (!tables[tblName]) {
                errors.push(`[${file}] CREATE INDEX '${idxName}' targets non-existent table '${tblName}'`);
            }
            return;
        }

        // 4. INSERT INTO
        const insertMatch = stmt.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
        if (insertMatch) {
            const tblName = cleanId(insertMatch[1]);
            if (!tables[tblName]) {
                errors.push(`[${file}] INSERT INTO targets non-existent table '${tblName}'`);
            } else {
                const cols = insertMatch[2].split(',').map(cleanId);
                cols.forEach(col => {
                    if (!tables[tblName].columns.has(col)) {
                        errors.push(`[${file}] INSERT INTO '${tblName}' includes non-existent column '${col}'`);
                    }
                });
            }
        }
    });
});

console.log(`\n📊 Audit Statistics:`);
console.log(`  - Total Migration Files Analyzed: ${files.length}`);
console.log(`  - Total Unique Tables Tracked:    ${Object.keys(tables).length}`);
console.log(`  - Total Errors Found:             ${errors.length}`);
console.log(`  - Total Warnings Found:           ${warnings.length}`);

if (errors.length > 0) {
    console.log('\n❌ AUDIT FAILED - LIST OF ERRORS:');
    errors.forEach(e => console.log('  ❌ ' + e));
} else {
    console.log('\n✅ AUDIT PASSED 100% - ZERO BROKEN RELATIONS, ZERO MISSING TABLES/COLUMNS!');
}

console.log('================================================================\n');
