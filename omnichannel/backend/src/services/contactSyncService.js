/**
 * Mobile Contacts Sync & vCard 3.0 Generator Service
 * Creates high-performance VCF streams for Android/iOS & Google Contacts
 */
import pool from '../config/db.js';

export const generateVCardStream = async (organizationId) => {
    try {
        const contactsRes = await pool.query(
            `SELECT c.*, o.name as org_name
             FROM contacts c
             JOIN organizations o ON o.id = c.organization_id
             WHERE c.organization_id = $1
             ORDER BY c.name ASC`,
            [organizationId]
        );

        let vcf = '';

        contactsRes.rows.forEach(contact => {
            const name = (contact.name || 'Kontak Pelanggan').trim();
            let phone = String(contact.phone_number || '').replace(/[^0-9+]/g, '');
            if (phone.startsWith('0')) phone = '+62' + phone.slice(1);
            else if (phone.startsWith('62')) phone = '+' + phone;

            vcf += 'BEGIN:VCARD\r\n';
            vcf += 'VERSION:3.0\r\n';
            vcf += `FN:${name}\r\n`;
            vcf += `N:${name};;;;\r\n`;
            if (phone) {
                vcf += `TEL;TYPE=CELL:${phone}\r\n`;
            }
            if (contact.email) {
                vcf += `EMAIL;TYPE=INTERNET:${contact.email}\r\n`;
            }
            if (contact.org_name) {
                vcf += `ORG:${contact.org_name}\r\n`;
            }
            if (contact.notes) {
                vcf += `NOTE:${contact.notes.replace(/\r?\n/g, ' ')}\r\n`;
            }
            vcf += 'END:VCARD\r\n';
        });

        return vcf;

    } catch (err) {
        console.error('[ContactSync Error]:', err.message);
        throw err;
    }
};
