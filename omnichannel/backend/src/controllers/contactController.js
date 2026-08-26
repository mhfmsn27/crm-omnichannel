import pool from '../config/db.js';
import XLSX from 'xlsx';
import fs from 'fs';
import * as waService from '../services/waGatewayService.js';
import { formatPhone62 } from '../utils/phoneHelper.js';

// --- CRUD ENDPOINTS ---

// GET /api/app/contacts
export const getContacts = async (req, res) => {
    const { organization_id } = req.user;
    const { page = 1, limit = 10, search, label_id, label_ids, subscription_status } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT c.*, 
            COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) FILTER (WHERE l.id IS NOT NULL), '[]') as labels,
            (
                SELECT ws.name 
                FROM conversations conv 
                JOIN whatsapp_sessions ws ON conv.whatsapp_session_id = ws.id
                WHERE conv.contact_id = c.id 
                ORDER BY conv.last_message_at DESC 
                LIMIT 1
            ) as device_name
            FROM contacts c
            LEFT JOIN contact_labels cl ON c.id = cl.contact_id
            LEFT JOIN labels l ON cl.label_id = l.id
            WHERE c.organization_id = $1
        `;

        const params = [organization_id];
        let paramIndex = 2;

        if (search) {
            query += ` AND (c.name ILIKE $${paramIndex} OR c.phone_number ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filter by Subscription Status
        if (subscription_status === 'subscribed') {
            query += ` AND c.is_subscribed = true`;
        } else if (subscription_status === 'unsubscribed') {
            query += ` AND c.is_subscribed = false`;
        }

        // Label Filtering
        let filterIds = [];
        if (label_ids) filterIds = Array.isArray(label_ids) ? label_ids : label_ids.split(',');
        else if (label_id) filterIds = [label_id];

        if (filterIds.length > 0) {
            query += ` AND EXISTS (SELECT 1 FROM contact_labels cl2 WHERE cl2.contact_id = c.id AND cl2.label_id = ANY($${paramIndex}::int[]))`;
            params.push(filterIds);
            paramIndex++;
        }

        query += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Count Total
        let countQuery = `SELECT count(DISTINCT c.id) FROM contacts c WHERE c.organization_id = $1`;
        const countParams = [organization_id];
        let countParamIndex = 2;

        if (search) {
            countQuery += ` AND (c.name ILIKE $${countParamIndex} OR c.phone_number ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }
        if (subscription_status === 'subscribed') {
            countQuery += ` AND c.is_subscribed = true`;
        } else if (subscription_status === 'unsubscribed') {
            countQuery += ` AND c.is_subscribed = false`;
        }
        if (filterIds.length > 0) {
            countQuery += ` AND EXISTS (
                SELECT 1 FROM contact_labels cl2 
                WHERE cl2.contact_id = c.id 
                AND cl2.label_id = ANY($${countParamIndex}::int[])
            )`;
            countParams.push(filterIds);
            countParamIndex++;
        }

        const countRes = await pool.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0]?.count || 0);

        res.json({
            data: result.rows,
            meta: { total, page: parseInt(page), last_page: Math.ceil(total / limit) }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/contacts/by-device - Get contacts that have conversations via specific device(s)
export const getContactsByDevice = async (req, res) => {
    const { organization_id } = req.user;
    const { device_ids, limit = 20, search } = req.query;

    if (!device_ids) {
        return res.status(400).json({ error: 'device_ids is required' });
    }

    const deviceIdArray = Array.isArray(device_ids) ? device_ids : device_ids.split(',').map(d => d.trim());

    try {
        let query = `
            SELECT DISTINCT c.id, c.name, c.phone_number, c.email, c.created_at,
                   c.lead_status, c.lead_score, c.is_subscribed, c.last_chat_at,
                   COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) FILTER (WHERE l.id IS NOT NULL), '[]') as labels
            FROM contacts c
            LEFT JOIN conversations conv ON conv.contact_id = c.id AND conv.whatsapp_session_id = ANY($2::int[])
            LEFT JOIN contact_labels cl ON c.id = cl.contact_id
            LEFT JOIN labels l ON cl.label_id = l.id
            WHERE c.organization_id = $1
            AND conv.id IS NOT NULL
        `;

        const params = [organization_id, deviceIdArray];
        let paramIdx = 3;

        if (search) {
            query += ` AND (c.name ILIKE $${paramIdx} OR c.phone_number ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        query += ` GROUP BY c.id ORDER BY c.last_chat_at DESC LIMIT $${paramIdx}`;
        params.push(limit);

        const result = await pool.query(query, params);

        // Get count for selected devices
        const countQuery = `
            SELECT COUNT(DISTINCT c.id) as total
            FROM contacts c
            JOIN conversations conv ON conv.contact_id = c.id AND conv.whatsapp_session_id = ANY($2::int[])
            WHERE c.organization_id = $1
        `;
        const countRes = await pool.query(countQuery, [organization_id, deviceIdArray]);

        res.json({
            data: result.rows,
            total: parseInt(countRes.rows[0]?.total || 0)
        });
    } catch (err) {
        console.error('[Contacts] getContactsByDevice error:', err);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/contacts/device-counts - Get contact counts per device
export const getContactCountsByDevice = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await pool.query(`
            SELECT ws.id as device_id, ws.name as device_name, ws.whatsapp_number,
                   COUNT(DISTINCT conv.contact_id) as contact_count
            FROM whatsapp_sessions ws
            LEFT JOIN conversations conv ON conv.whatsapp_session_id = ws.id
            WHERE ws.organization_id = $1
            AND ws.status != 'disconnected'
            GROUP BY ws.id, ws.name, ws.whatsapp_number
            ORDER BY ws.name ASC
        `, [organization_id]);

        res.json(result.rows);
    } catch (err) {
        console.error('[Contacts] getContactCountsByDevice error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const createContact = async (req, res) => {
    const { organization_id } = req.user;
    const { name, phone, email, label_ids, birth_date, country, province, city, postal_code, po_box, address, address_line_2 } = req.body;

    const formattedPhone = formatPhone62(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
        return res.status(400).json({ error: "Nomor WhatsApp tidak valid (min 10 digit)." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Ensure columns exist (Auto-Migration)
        await client.query(`
            ALTER TABLE contacts 
            ADD COLUMN IF NOT EXISTS birth_date DATE,
            ADD COLUMN IF NOT EXISTS country TEXT,
            ADD COLUMN IF NOT EXISTS province TEXT,
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS postal_code TEXT,
            ADD COLUMN IF NOT EXISTS po_box TEXT,
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS address_line_2 TEXT
        `);

        const check = await client.query(
            'SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2',
            [organization_id, formattedPhone]
        );

        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Nomor WhatsApp sudah terdaftar." });
        }

        const insertRes = await client.query(
            `INSERT INTO contacts (
                organization_id, name, phone_number, email, source, 
                birth_date, country, province, city, postal_code, po_box, address, address_line_2
            ) 
             VALUES ($1, $2, $3, $4, 'manual', $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING id, name, phone_number, email`,
            [
                organization_id, name, formattedPhone, email,
                birth_date || null, country, province, city, postal_code, po_box, address, address_line_2
            ]
        );
        const contactId = insertRes.rows[0].id;

        // BATCH INSERT labels instead of sequential queries (fix N+1)
        if (label_ids && Array.isArray(label_ids) && label_ids.length > 0) {
            // Use UNNEST for batch insert
            const labelIds = label_ids.filter(id => id && !isNaN(parseInt(id)));
            if (labelIds.length > 0) {
                await client.query(`
                    INSERT INTO contact_labels (contact_id, label_id)
                    SELECT $1, unnest($2::int[])
                    ON CONFLICT DO NOTHING
                `, [contactId, labelIds]);
            }
        }

        await client.query('COMMIT');
        res.status(201).json(insertRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const updateContact = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, label_ids, birth_date, country, province, city, postal_code, po_box, address, address_line_2 } = req.body;
    const { organization_id } = req.user;

    const formattedPhone = formatPhone62(phone);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Ensure columns exist (Auto-Migration)
        await client.query(`
            ALTER TABLE contacts 
            ADD COLUMN IF NOT EXISTS birth_date DATE,
            ADD COLUMN IF NOT EXISTS country TEXT,
            ADD COLUMN IF NOT EXISTS province TEXT,
            ADD COLUMN IF NOT EXISTS city TEXT,
            ADD COLUMN IF NOT EXISTS postal_code TEXT,
            ADD COLUMN IF NOT EXISTS po_box TEXT,
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS address_line_2 TEXT
        `);

        // Check for duplicate phone number on OTHER contacts
        const check = await client.query(
            'SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2 AND id != $3',
            [organization_id, formattedPhone, id]
        );

        if (check.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Nomor WhatsApp ini sudah terdaftar pada kontak lain." });
        }

        await client.query(
            `UPDATE contacts SET 
                name = $1, phone_number = $2, email = $3, 
                birth_date = $4, country = $5, province = $6, city = $7, 
                postal_code = $8, po_box = $9, address = $10, address_line_2 = $11,
                updated_at = NOW() 
             WHERE id = $12 AND organization_id = $13`,
            [
                name, formattedPhone, email,
                birth_date || null, country, province, city, postal_code, po_box, address, address_line_2,
                id, organization_id
            ]
        );

        await client.query('DELETE FROM contact_labels WHERE contact_id = $1', [id]);

        // BATCH INSERT labels instead of sequential queries (fix N+1)
        if (label_ids && Array.isArray(label_ids) && label_ids.length > 0) {
            const labelIds = label_ids.filter(id => id && !isNaN(parseInt(id)));
            if (labelIds.length > 0) {
                await client.query(`
                    INSERT INTO contact_labels (contact_id, label_id)
                    SELECT $1, unnest($2::int[])
                    ON CONFLICT DO NOTHING
                `, [id, labelIds]);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Contact updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        // Catch unique violation specifically if race condition occurs
        if (err.code === '23505') {
            return res.status(400).json({ error: "Nomor WhatsApp sudah terdaftar." });
        }
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const deleteContact = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM contacts WHERE id = $1 AND organization_id = $2', [id, req.user.organization_id]);
        res.json({ message: 'Contact deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/contacts/:id - Full contact with lead score + custom field values
export const getContact = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT c.*,
                COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) FILTER (WHERE l.id IS NOT NULL), '[]') as labels
             FROM contacts c
             LEFT JOIN contact_labels cl ON c.id = cl.contact_id
             LEFT JOIN labels l ON cl.label_id = l.id
             WHERE c.id = $1 AND c.organization_id = $2
             GROUP BY c.id`,
            [id, organization_id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
        res.json(result.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/app/contacts/:id/activity - Unified activity timeline
export const getContactActivity = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        // Run all queries in parallel for better performance
        const [msgs, broadcasts, pipelineHistory, tasks] = await Promise.all([
            // 1. Conversation messages
            pool.query(`
                SELECT m.id, m.content as description, m.created_at, 'message' as type,
                       'Pesan masuk/keluar' as title,
                       json_build_object('channel', ws.name) as metadata,
                       m.sentiment
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
                WHERE c.contact_id = $1 AND c.organization_id = $2
                ORDER BY m.created_at DESC
                LIMIT 50
            `, [id, organization_id]),

            // 2. Broadcast recipients
            pool.query(`
                SELECT br.id, COALESCE(br.sent_at, NOW()) as created_at, 'broadcast' as type,
                       'Broadcast: ' || COALESCE(bc.name, 'Tanpa judul') as title,
                       br.status as description,
                       json_build_object('channel', 'WhatsApp') as metadata
                FROM broadcast_recipients br
                JOIN broadcasts bc ON br.broadcast_id = bc.id
                JOIN contacts c ON c.phone_number = br.phone_number AND c.organization_id = bc.organization_id
                WHERE c.id = $1 AND bc.organization_id = $2
                ORDER BY br.sent_at DESC NULLS LAST
                LIMIT 20
            `, [id, organization_id]),

            // 3. Pipeline stage changes
            pool.query(`
                SELECT psh.id, psh.created_at as created_at, 'pipeline' as type,
                       'Pipeline diperbarui' as title,
                       ps_from.name as description,
                       json_build_object(
                           'pipeline_name', p.name,
                           'stage_name', ps_to.name,
                           'channel', 'Pipeline'
                       ) as metadata
                FROM pipeline_stage_history psh
                JOIN pipelines p ON psh.pipeline_id = p.id
                LEFT JOIN pipeline_stages ps_from ON psh.from_stage_id = ps_from.id
                LEFT JOIN pipeline_stages ps_to ON psh.to_stage_id = ps_to.id
                JOIN conversations c ON psh.conversation_id = c.id
                WHERE c.contact_id = $1 AND c.organization_id = $2
                ORDER BY psh.created_at DESC
                LIMIT 20
            `, [id, organization_id]),

            // 4. Tasks
            pool.query(`
                SELECT t.id, t.created_at, 'task' as type,
                       t.title as title,
                       t.status as description,
                       json_build_object('task_status', t.status, 'channel', 'Task') as metadata
                FROM tasks t
                WHERE t.contact_id = $1 AND t.organization_id = $2
                ORDER BY t.created_at DESC
                LIMIT 20
            `, [id, organization_id])
        ]);

        // Merge all activities, sort by created_at DESC
        const all = [
            ...msgs.rows,
            ...broadcasts.rows,
            ...pipelineHistory.rows,
            ...tasks.rows,
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json(all.slice(0, 100));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /api/app/contacts/segment-count - Count contacts matching segment filters
export const getContactSegmentCount = async (req, res) => {
    const { organization_id } = req.user;
    const { lead_status, min_score, active_days, label_id, subscribed, has_conversation, has_phone } = req.query;

    try {
        let query = `SELECT COUNT(DISTINCT c.id) as count FROM contacts c`;
        const joins = [];
        const params = [organization_id];
        let i = 2;

        if (lead_status || min_score || active_days || label_id || subscribed || has_conversation) {
            // Add conversation join for activity filtering
            if (has_conversation || active_days) {
                joins.push(`JOIN conversations conv ON conv.contact_id = c.id`);
            }
            if (label_id) {
                joins.push(`JOIN contact_labels cl ON cl.contact_id = c.id`);
            }
        }

        let where = `c.organization_id = $1`;

        if (lead_status) {
            where += ` AND c.lead_status = $${i++}`;
            params.push(lead_status);
        }
        if (min_score) {
            where += ` AND COALESCE(c.lead_score, 0) >= $${i++}`;
            params.push(parseInt(min_score));
        }
        if (active_days) {
            where += ` AND conv.last_message_at >= NOW() - ($${i++} * INTERVAL '1 day')`;
            params.push(parseInt(active_days) || 1);
        }
        if (label_id) {
            where += ` AND cl.label_id = $${i++}`;
            params.push(parseInt(label_id));
        }
        if (subscribed === 'true') {
            where += ` AND c.is_subscribed = true`;
        }
        if (has_conversation === 'true') {
            where += ` AND EXISTS (SELECT 1 FROM conversations conv2 WHERE conv2.contact_id = c.id)`;
        }
        if (has_phone === 'true') {
            where += ` AND c.phone_number IS NOT NULL AND LENGTH(c.phone_number) > 8`;
        }

        const sql = `SELECT COUNT(DISTINCT c.id) as count FROM contacts c ${joins.join(' ')} WHERE ${where}`;
        const result = await pool.query(sql, params);
        res.json({ count: parseInt(result.rows[0]?.count || 0) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const bulkDelete = async (req, res) => {
    const { ids } = req.body;
    const { organization_id } = req.user;

    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No IDs provided" });

    try {
        await pool.query(
            'DELETE FROM contacts WHERE id = ANY($1::int[]) AND organization_id = $2',
            [ids, organization_id]
        );
        res.json({ message: `${ids.length} contacts deleted` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const bulkAssignLabel = async (req, res) => {
    const { contact_ids, label_id } = req.body;
    const { organization_id } = req.user;

    if (!contact_ids || !label_id) return res.status(400).json({ error: "Missing data" });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const labelCheck = await client.query('SELECT id FROM labels WHERE id = $1 AND organization_id = $2', [label_id, organization_id]);
        if (labelCheck.rows.length === 0) throw new Error("Label not found");

        for (const contactId of contact_ids) {
            await client.query(
                `INSERT INTO contact_labels (contact_id, label_id) 
                  SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM contacts WHERE id = $1 AND organization_id = $3)
                  ON CONFLICT DO NOTHING`,
                [contactId, label_id, organization_id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: "Labels assigned successfully" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const assignLabel = async (req, res) => {
    const { id } = req.params;
    const { label_id, label_ids } = req.body;
    const { organization_id } = req.user;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const idsToAdd = label_ids || [label_id];

        for (const lid of idsToAdd) {
            await client.query(
                `INSERT INTO contact_labels (contact_id, label_id) 
                  SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM labels WHERE id = $2 AND organization_id = $3)
                  ON CONFLICT DO NOTHING`,
                [id, lid, organization_id]
            );
        }

        await client.query('COMMIT');

        const updatedLabelsRes = await client.query(`
            SELECT l.id, l.name, l.color 
            FROM contact_labels cl 
            JOIN labels l ON cl.label_id = l.id 
            WHERE cl.contact_id = $1
        `, [id]);

        req.io.to(`org_${organization_id}`).emit('contact_updated', {
            contactId: parseInt(id),
            labels: updatedLabelsRes.rows
        });

        res.json({ message: 'Labels assigned', labels: updatedLabelsRes.rows });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const removeLabel = async (req, res) => {
    const { id, labelId } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query(
            `DELETE FROM contact_labels 
             WHERE contact_id = $1 AND label_id = $2`,
            [id, labelId]
        );

        const updatedLabelsRes = await pool.query(`
            SELECT l.id, l.name, l.color 
            FROM contact_labels cl 
            JOIN labels l ON cl.label_id = l.id 
            WHERE cl.contact_id = $1
        `, [id]);

        req.io.to(`org_${organization_id}`).emit('contact_updated', {
            contactId: parseInt(id),
            labels: updatedLabelsRes.rows
        });

        res.json({ message: 'Label removed', labels: updatedLabelsRes.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const importContacts = async (req, res) => {
    const { organization_id } = req.user;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "File is required" });

    const client = await pool.connect();
    try {
        const workbook = XLSX.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        await client.query('BEGIN');

        const labelsRes = await client.query('SELECT id, name FROM labels WHERE organization_id = $1', [organization_id]);
        const labelMap = new Map(labelsRes.rows.map(l => [l.name.toLowerCase(), l.id]));

        // Fetch existing custom fields
        const fieldsRes = await client.query('SELECT id, field_key, field_label FROM contact_custom_fields WHERE organization_id = $1', [organization_id]);
        const fieldMap = new Map(fieldsRes.rows.map(f => [f.field_label.toLowerCase(), f.field_key]));

        const rows = data.slice(0, 2000);
        const standardKeys = ['phone', 'mobile', 'no wa', 'name', 'nama', 'email', 'labels'];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rawPhone = row['Phone'] || row['phone'] || row['Mobile'] || row['No WA'];
            const name = row['Name'] || row['name'] || row['Nama'] || '';
            const email = row['Email'] || row['email'] || '';
            const rawLabels = row['Labels'] || row['labels'] || '';

            const phone = formatPhone62(rawPhone);

            if (!phone || phone.length < 10) {
                failedCount++;
                errors.push(`Row ${i + 2}: Invalid Phone (${rawPhone})`);
                continue;
            }

            try {
                let contactId;
                const check = await client.query('SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2', [organization_id, phone]);

                if (check.rows.length > 0) {
                    contactId = check.rows[0].id;
                    await client.query(
                        'UPDATE contacts SET name = $1, email = $2, updated_at = NOW() WHERE id = $3',
                        [name, email, contactId]
                    );
                } else {
                    const newC = await client.query(
                        `INSERT INTO contacts (organization_id, name, phone_number, email, source) 
                         VALUES ($1, $2, $3, $4, 'import') RETURNING id`,
                        [organization_id, name, phone, email]
                    );
                    contactId = newC.rows[0].id;
                }

                if (rawLabels) {
                    const labelNames = String(rawLabels).split(',').map(s => s.trim());
                    for (const lName of labelNames) {
                        if (!lName) continue;
                        let labelId = labelMap.get(lName.toLowerCase());

                        if (!labelId) {
                            const newLabel = await client.query(
                                'INSERT INTO labels (organization_id, name, color) VALUES ($1, $2, $3) RETURNING id',
                                [organization_id, lName, '#6366F1']
                            );
                            labelId = newLabel.rows[0].id;
                            labelMap.set(lName.toLowerCase(), labelId);
                        }

                        await client.query(
                            'INSERT INTO contact_labels (contact_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                            [contactId, labelId]
                        );
                    }
                }

                // --- DYNAMIC CUSTOM FIELDS PROCESSING ---
                for (const key of Object.keys(row)) {
                    if (standardKeys.includes(key.toLowerCase())) continue;
                    
                    const val = row[key];
                    if (val === undefined || val === null || val === '') continue;

                    const labelLower = key.toLowerCase();
                    let fieldKey = fieldMap.get(labelLower);

                    if (!fieldKey) {
                        // Auto-create custom field definition
                        fieldKey = labelLower.replace(/[^a-z0-9_]/g, '_');
                        if (!fieldKey) fieldKey = `custom_${Date.now()}`;
                        
                        try {
                            // Check if fieldKey already exists by coincidence
                            const checkKey = await client.query('SELECT id FROM contact_custom_fields WHERE organization_id = $1 AND field_key = $2', [organization_id, fieldKey]);
                            if (checkKey.rows.length === 0) {
                                await client.query(
                                    `INSERT INTO contact_custom_fields (organization_id, field_key, field_label, field_type) 
                                     VALUES ($1, $2, $3, 'text')`,
                                    [organization_id, fieldKey, key]
                                );
                            }
                            fieldMap.set(labelLower, fieldKey);
                        } catch (e) {
                            // If it fails (e.g. concurrent insert), ignore and skip this field for now
                            console.error('Error creating custom field:', e);
                            continue;
                        }
                    }

                    // Save the value
                    if (fieldKey) {
                        await client.query(
                            `INSERT INTO contact_field_values (contact_id, organization_id, field_key, value, updated_at)
                             VALUES ($1, $2, $3, $4, NOW())
                             ON CONFLICT (contact_id, field_key)
                             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
                            [contactId, organization_id, fieldKey, String(val)]
                        );
                    }
                }

                successCount++;
            } catch (e) {
                failedCount++;
                errors.push(`Row ${i + 2}: DB Error - ${e.message}`);
            }
        }

        await client.query('COMMIT');
        fs.unlinkSync(file.path);

        res.json({
            success_count: successCount,
            failed_count: failedCount,
            errors
        });

    } catch (err) {
        await client.query('ROLLBACK');
        if (file) fs.unlinkSync(file.path);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const exportContacts = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await pool.query(`
            SELECT c.name as "Name", c.phone_number as "Phone", c.email as "Email",
            string_agg(l.name, ', ') as "Labels"
            FROM contacts c
            LEFT JOIN contact_labels cl ON c.id = cl.contact_id
            LEFT JOIN labels l ON cl.label_id = l.id
            WHERE c.organization_id = $1
            AND (c.source IS NULL OR c.source NOT IN ('webchat', 'instagram', 'messenger', 'telegram'))
            GROUP BY c.id
        `, [organization_id]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, "Contacts");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="contacts.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NEW: GET /api/app/contacts/unsubscribe-logs
export const getUnsubscribeLogs = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(`
            SELECT ul.*, c.name as contact_name, c.phone_number
            FROM unsubscribe_logs ul
            JOIN contacts c ON ul.contact_id = c.id
            WHERE ul.organization_id = $1
            ORDER BY ul.unsubscribed_at DESC
            LIMIT 100
        `, [organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const unsubscribeContact = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query(
            `UPDATE contacts SET is_subscribed = false, unsubscribed_at = NOW() 
             WHERE id = $1 AND organization_id = $2`,
            [id, organization_id]
        );

        // Log the manual unsubscription
        await pool.query(
            `INSERT INTO unsubscribe_logs (organization_id, contact_id, method, details)
             VALUES ($1, $2, 'manual', 'Admin Manually Unsubscribed')`,
            [organization_id, id]
        );

        res.json({ message: "Contact unsubscribed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const resubscribeContact = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query(
            `UPDATE contacts SET is_subscribed = true, unsubscribed_at = NULL 
             WHERE id = $1 AND organization_id = $2`,
            [id, organization_id]
        );

        res.json({ message: "Contact resubscribed successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateContactNote = async (req, res) => {
    const { id } = req.params;
    const { internal_note } = req.body;
    const { organization_id } = req.user;

    try {
        // Auto-migration for internal_note column
        await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_note TEXT');

        await pool.query(
            `UPDATE contacts SET internal_note = $1 WHERE id = $2 AND organization_id = $3`,
            [internal_note, id, organization_id]
        );

        res.json({ message: "Note updated" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getContactLTV = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const ltvRes = await pool.query(
            "SELECT COALESCE(SUM(total_amount), 0) as total_ltv FROM invoices WHERE contact_id = $1 AND organization_id = $2 AND status = 'paid'",
            [id, organization_id]
        );
        const ltv = ltvRes.rows[0].total_ltv;

        const historyRes = await pool.query(
            "SELECT id, invoice_number, total_amount, status, issue_date FROM invoices WHERE contact_id = $1 AND organization_id = $2 ORDER BY created_at DESC LIMIT 5",
            [id, organization_id]
        );
        
        res.json({
            ltv,
            history: historyRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};