/**
 * Contact Import Service - OPTIMIZED VERSION
 * Handles CSV/Excel contact import with batch processing
 * Solves N+1 query problem by using batch INSERT/UPDATE
 */

import pool from '../config/db.js';

const BATCH_SIZE = 500; // Process 500 contacts at a time

export const importContacts = async (organizationId, userId, options) => {
    const { filename, content, duplicate_action = 'skip' } = options;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Parse CSV content
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have header and at least one data row');
        }

        // Parse header
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const nameIndex = header.indexOf('name');
        const phoneIndex = header.indexOf('phone');
        const emailIndex = header.indexOf('email');
        const addressIndex = header.indexOf('address');
        const companyIndex = header.indexOf('company');
        const notesIndex = header.indexOf('notes');

        if (nameIndex === -1 || phoneIndex === -1) {
            throw new Error('CSV must have "name" and "phone" columns');
        }

        // Parse all contacts first
        const contacts = [];
        const parseErrors = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length < header.length) continue;

            const name = values[nameIndex]?.trim();
            const phone = values[phoneIndex]?.trim();

            if (!name || !phone) {
                parseErrors.push({ row: i + 1, error: 'Name or phone is empty' });
                continue;
            }

            contacts.push({
                name,
                phone: phone.replace(/[^0-9]/g, ''), // Normalize phone
                email: emailIndex >= 0 ? values[emailIndex]?.trim() : null,
                address: addressIndex >= 0 ? values[addressIndex]?.trim() : null,
                company: companyIndex >= 0 ? values[companyIndex]?.trim() : null,
                notes: notesIndex >= 0 ? values[notesIndex]?.trim() : null,
                row: i + 1
            });
        }

        if (contacts.length === 0) {
            throw new Error('No valid contacts found in CSV');
        }

        // Get existing phone numbers in ONE query (batch lookup)
        const phones = contacts.map(c => c.phone);
        const existingRes = await client.query(`
            SELECT phone, id FROM contacts
            WHERE organization_id = $1 AND phone = ANY($2)
        `, [organizationId, phones]);

        const existingPhones = new Map(
            existingRes.rows.map(r => [r.phone, r.id])
        );

        // Separate into new and existing contacts
        const newContacts = [];
        const existingContacts = [];
        let skipped = 0;

        for (const contact of contacts) {
            if (existingPhones.has(contact.phone)) {
                if (duplicate_action === 'skip') {
                    skipped++;
                    continue;
                }
                contact.existingId = existingPhones.get(contact.phone);
                existingContacts.push(contact);
            } else {
                newContacts.push(contact);
            }
        }

        // Batch INSERT new contacts
        let imported = 0;
        if (newContacts.length > 0) {
            imported += await batchInsertContacts(client, organizationId, userId, newContacts);
        }

        // Batch UPDATE existing contacts
        if (existingContacts.length > 0 && duplicate_action !== 'skip') {
            imported += await batchUpdateContacts(client, organizationId, existingContacts);
        }

        // Log import
        await client.query(`
            INSERT INTO contact_import_logs
            (organization_id, filename, total_rows, imported_count, skipped_count, error_count, errors, imported_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [organizationId, filename, lines.length - 1, imported, skipped, parseErrors.length, JSON.stringify(parseErrors), userId]);

        await client.query('COMMIT');

        return {
            success: true,
            total: lines.length - 1,
            imported,
            skipped,
            errors: parseErrors.length,
            errorDetails: parseErrors
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Batch insert contacts for performance
 * Uses UNNEST for bulk insert
 */
async function batchInsertContacts(client, organizationId, userId, contacts) {
    if (contacts.length === 0) return 0;

    let totalInserted = 0;

    // Process in batches
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);

        const names = batch.map(c => c.name);
        const phones = batch.map(c => c.phone);
        const emails = batch.map(c => c.email || null);
        const addresses = batch.map(c => c.address || null);
        const companies = batch.map(c => c.company || null);
        const notes = batch.map(c => c.notes || null);

        const result = await client.query(`
            INSERT INTO contacts
            (organization_id, name, phone, email, address, company, notes, created_by)
            SELECT * FROM UNNEST(
                $1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::int[]
            )
            ON CONFLICT (organization_id, phone) DO NOTHING
            RETURNING id
        `, [
            Array(batch.length).fill(organizationId),
            names,
            phones,
            emails,
            addresses,
            companies,
            notes,
            Array(batch.length).fill(userId)
        ]);

        totalInserted += result.rowCount;
    }

    return totalInserted;
}

/**
 * Batch update existing contacts for performance
 */
async function batchUpdateContacts(client, organizationId, contacts) {
    if (contacts.length === 0) return 0;

    let totalUpdated = 0;

    // Process in batches
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);

        const ids = batch.map(c => c.existingId);
        const names = batch.map(c => c.name);
        const emails = batch.map(c => c.email || null);
        const addresses = batch.map(c => c.address || null);
        const companies = batch.map(c => c.company || null);
        const notes = batch.map(c => c.notes || null);

        const result = await client.query(`
            UPDATE contacts c SET
                name = u.name,
                email = COALESCE(u.email, c.email),
                address = COALESCE(u.address, c.address),
                company = COALESCE(u.company, c.company),
                notes = COALESCE(u.notes, c.notes),
                updated_at = NOW()
            FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[]) AS u(id, name, email, address, company, notes)
            WHERE c.id = u.id
        `, [ids, names, emails, addresses, companies, notes]);

        totalUpdated += result.rowCount;
    }

    return totalUpdated;
}

// Simple CSV line parser (handles quoted values)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

export const getImportHistory = async (organizationId, limit = 20) => {
    const result = await pool.query(`
        SELECT * FROM contact_import_logs
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2
    `, [organizationId, limit]);
    return result.rows;
};
