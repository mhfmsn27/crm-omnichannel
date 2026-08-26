
import pool from '../config/db.js';
import XLSX from 'xlsx'; 
import fs from 'fs';
import redisConnection from '../config/redis.js';
import * as waService from './waGatewayService.js';

// --- HELPERS ---
const formatPhone = (phone) => {
    let p = String(phone).replace(/[^0-9]/g, '');
    if (p.startsWith('0')) p = '62' + p.slice(1);
    if (p.startsWith('8')) p = '62' + p;
    return p;
};

// Helper: Process Participant List from Gateway/Cache Data
const processParticipants = (participants) => {
    if (!Array.isArray(participants)) return [];
    
    return participants.map(p => {
        let rawId = "";
        let adminStatus = null;

        // 1. Handle String
        if (typeof p === 'string') {
            rawId = p;
        } 
        // 2. Handle Object
        else if (typeof p === 'object' && p !== null) {
            adminStatus = p.admin || p.isAdmin;
            const candidates = [];
            
            if (p.id) {
                if (typeof p.id === 'string') candidates.push(p.id);
                else if (typeof p.id === 'object') {
                    if (p.id._serialized) candidates.push(p.id._serialized);
                    if (p.id.user && p.id.server) candidates.push(`${p.id.user}@${p.id.server}`);
                    else if (p.id.user) candidates.push(p.id.user);
                }
            }
            
            if (p.jid) candidates.push(p.jid);
            if (p.number) candidates.push(p.number); 
            if (p.phone) candidates.push(p.phone); 
            
            const validStrings = candidates.filter(v => {
                if (typeof v !== 'string') return false;
                return v.includes('@') || /^\d{10,15}$/.test(v);
            });

            const phoneJid = validStrings.find(v => v.endsWith('@s.whatsapp.net'));
            const cUsJid = validStrings.find(v => v.endsWith('@c.us'));
            const plainNumber = validStrings.find(v => /^\d{10,15}$/.test(v));
            const lidJid = validStrings.find(v => v.endsWith('@lid'));

            if (phoneJid) rawId = phoneJid;
            else if (cUsJid) rawId = cUsJid;
            else if (plainNumber) rawId = plainNumber;
            else if (lidJid) rawId = lidJid; 
            else if (validStrings.length > 0) rawId = validStrings[0];
            else {
                 if (p.id && typeof p.id === 'object' && p.id.user) {
                     rawId = p.id.user; 
                 }
            }
        }

        let phone = rawId;
        if (phone && phone.includes('@')) {
            phone = phone.split('@')[0];
        }
        if (phone && phone.includes(':')) {
            phone = phone.split(':')[0];
        }

        return {
            id: rawId,
            phone: formatPhone(phone),
            admin: adminStatus
        };
    });
};

// ==========================================
// 1. WHATSAPP NUMBER CHECKER LOGIC
// ==========================================

export const createBatch = async (orgId, name, deviceId, numbers) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const batchRes = await client.query(
            `INSERT INTO number_check_batches (organization_id, session_id, name, total_numbers, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
            [orgId, deviceId, name, numbers.length]
        );
        const batchId = batchRes.rows[0].id;
        const query = `INSERT INTO number_check_items (batch_id, input_number, formatted_number, status) VALUES ($1, $2, $3, 'pending')`;
        for (const num of numbers) {
            const formatted = formatPhone(num);
            await client.query(query, [batchId, num, formatted]);
        }
        await client.query('COMMIT');
        return batchId;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const getBatches = async (orgId) => {
    const res = await pool.query(
        `SELECT b.*, ws.name as device_name FROM number_check_batches b LEFT JOIN whatsapp_sessions ws ON b.session_id = ws.id WHERE b.organization_id = $1 ORDER BY b.created_at DESC LIMIT 20`,
        [orgId]
    );
    return res.rows;
};

export const getBatchDetails = async (orgId, batchId, page = 1, limit = 50, status = 'all') => {
    const offset = (page - 1) * limit;
    const batchCheck = await pool.query('SELECT id FROM number_check_batches WHERE id = $1 AND organization_id = $2', [batchId, orgId]);
    if (batchCheck.rows.length === 0) throw new Error("Batch not found or access denied");

    let query = `SELECT * FROM number_check_items WHERE batch_id = $1`;
    const params = [batchId];
    let idx = 2;
    if (status === 'valid') { query += ` AND is_registered = true`; }
    else if (status === 'invalid') { query += ` AND is_registered = false`; }
    query += ` ORDER BY id ASC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(limit, offset);

    const itemsRes = await pool.query(query, params);
    const countRes = await pool.query(`SELECT * FROM number_check_batches WHERE id = $1`, [batchId]);
    return { batch: countRes.rows[0], items: itemsRes.rows, meta: { page, limit } };
};

export const parseExcelNumbers = (filePath) => {
    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        return data.map(row => {
            const keys = Object.keys(row);
            const phoneKey = keys.find(k => ['phone', 'mobile', 'no hp', 'wa'].includes(k.toLowerCase()));
            return phoneKey ? row[phoneKey] : (row['Phone'] || row['phone']);
        }).filter(n => n);
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
};

export const saveValidContacts = async (orgId, batchId, labelId, newLabelName) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let finalLabelId = labelId;
        if (newLabelName) {
             const labelRes = await client.query(
                `INSERT INTO labels (organization_id, name, color) VALUES ($1, $2, '#10B981') 
                 ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name 
                 RETURNING id`,
                [orgId, newLabelName]
            );
            finalLabelId = labelRes.rows[0].id;
        }
        
        const insertQuery = `
            INSERT INTO contacts (organization_id, name, phone_number, source, created_at)
            SELECT $1, 'Valid WA ' || input_number, formatted_number, 'checker', NOW()
            FROM number_check_items
            WHERE batch_id = $2 AND is_registered = true
            ON CONFLICT (organization_id, phone_number) DO NOTHING
            RETURNING id
        `;
        await client.query(insertQuery, [orgId, batchId]);

        if (finalLabelId) {
            await client.query(`
                INSERT INTO contact_labels (contact_id, label_id)
                SELECT c.id, $1
                FROM contacts c
                JOIN number_check_items nci ON c.phone_number = nci.formatted_number
                WHERE c.organization_id = $2 AND nci.batch_id = $3 AND nci.is_registered = true
                ON CONFLICT DO NOTHING
            `, [finalLabelId, orgId, batchId]);
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

export const generateExport = async (orgId, batchId) => {
    const batchCheck = await pool.query('SELECT name FROM number_check_batches WHERE id = $1 AND organization_id = $2', [batchId, orgId]);
    if (batchCheck.rows.length === 0) throw new Error("Batch not found");
    const batchName = batchCheck.rows[0].name;
    const res = await pool.query(
        `SELECT input_number as "Input", formatted_number as "Formatted", CASE WHEN is_registered THEN 'VALID' ELSE 'INVALID' END as "Status" FROM number_check_items WHERE batch_id = $1 ORDER BY id ASC`,
        [batchId]
    );
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(res.rows);
    XLSX.utils.book_append_sheet(wb, ws, "Result");
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { buffer, filename: `${batchName}-Result.xlsx` };
};

// ==========================================
// 2. WHATSAPP GROUP EXTRACTOR LOGIC
// ==========================================

export const fetchGroups = async (deviceId) => {
    const devRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1', [deviceId]);
    if (devRes.rows.length === 0) throw new Error("Device not found");
    const sessionId = devRes.rows[0].session_id;

    const cacheKey = `groups_full_data:${sessionId}`;
    
    // Try Cache First
    const cached = await redisConnection.get(cacheKey);
    if (cached) {
        const groups = JSON.parse(cached);
        return groups.map(g => ({
            id: g.id,
            subject: g.subject,
            size: g.participants ? g.participants.length : 0
        }));
    }

    // Fetch from Gateway
    const groups = await waService.getGroups(sessionId);
    
    // Save to Redis
    await redisConnection.set(cacheKey, JSON.stringify(groups), 'EX', 1800);

    return groups.map(g => ({
        id: g.id,
        subject: g.subject,
        size: g.participants ? g.participants.length : 0
    }));
};

export const extractGroupMembers = async (deviceId, groupJid) => {
    const devRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1', [deviceId]);
    if (devRes.rows.length === 0) throw new Error("Device not found");
    const sessionId = devRes.rows[0].session_id;

    try {
        const meta = await waService.getGroupMetaData(sessionId, groupJid);
        if (!meta) throw new Error("Empty response from gateway.");
        
        const participantsData = meta.participants || meta.data?.participants || [];
        let participants = processParticipants(participantsData);

        const lidParticipants = participants.filter(p => p.id && p.id.includes('@lid'));
        
        if (lidParticipants.length > 0) {
             const lidsToResolve = lidParticipants.map(p => p.id);
             const resolvedData = await waService.checkWids(sessionId, lidsToResolve);
             
             const resolutionMap = new Map();
             if (Array.isArray(resolvedData)) {
                 resolvedData.forEach(r => {
                     if (r.exists && r.jid && !r.jid.includes('@lid')) {
                         resolutionMap.set(r.input, r.jid);
                         if (r.input && r.input.includes('@')) {
                             resolutionMap.set(r.input.split('@')[0], r.jid);
                         }
                     }
                 });
             }

             participants = participants.map(p => {
                 if (p.id && resolutionMap.has(p.id)) {
                     const realJid = resolutionMap.get(p.id);
                     return { ...p, id: realJid, phone: formatPhone(realJid.split('@')[0]) };
                 }
                 if (p.id && p.id.includes('@')) {
                     const strippedId = p.id.split('@')[0];
                     if (resolutionMap.has(strippedId)) {
                         const realJid = resolutionMap.get(strippedId);
                         return { ...p, id: realJid, phone: formatPhone(realJid.split('@')[0]) };
                     }
                     if (p.id.includes('@lid') && /^\d{9,15}$/.test(strippedId)) {
                         const optimisticPhone = formatPhone(strippedId);
                         if(optimisticPhone) {
                             return { 
                                 ...p, 
                                 id: `${optimisticPhone}@s.whatsapp.net`, 
                                 phone: optimisticPhone
                             };
                         }
                     }
                 }
                 return p;
             });
        }
        
        return {
            id: meta.id?._serialized || meta.id || groupJid,
            subject: meta.subject || 'Unknown Group',
            size: participants.length,
            participants
        };
    } catch (error) {
        throw new Error(`Failed to extract group: ${error.message}`);
    }
};

export const saveGroupContacts = async (orgId, contacts, labelName) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let labelId;
        if (labelName) {
            const labelRes = await client.query(
                `INSERT INTO labels (organization_id, name, color) VALUES ($1, $2, '#10B981') 
                 ON CONFLICT (organization_id, name) DO UPDATE SET name = EXCLUDED.name 
                 RETURNING id`,
                [orgId, labelName]
            );
            labelId = labelRes.rows[0].id;
        }

        let savedCount = 0;
        for (const c of contacts) {
            const cleanPhone = formatPhone(c.phone);
            if(!cleanPhone || cleanPhone.length < 8) continue;

            const contactRes = await client.query(
                `INSERT INTO contacts (organization_id, name, phone_number, source)
                 VALUES ($1, $2, $3, 'group_extract')
                 ON CONFLICT (organization_id, phone_number) DO UPDATE SET updated_at = NOW()
                 RETURNING id`,
                [orgId, c.name || cleanPhone, cleanPhone]
            );
            const contactId = contactRes.rows[0].id;
            savedCount++;

            if (labelId) {
                await client.query(
                    `INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [contactId, labelId]
                );
            }
        }

        await client.query('COMMIT');
        return { saved_count: savedCount };

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};
