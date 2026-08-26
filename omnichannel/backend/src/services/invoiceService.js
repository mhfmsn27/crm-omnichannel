
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateInvoicePdf = (transaction, user) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });
        doc.on('error', reject);

        // 1. HEADER
        doc.fontSize(20).text('INVOICE', { align: 'right' });
        doc.fontSize(10).text(`Invoice #: ${transaction.invoice_number}`, { align: 'right' });
        doc.text(`Date: ${new Date(transaction.created_at).toLocaleDateString()}`, { align: 'right' });
        doc.text(`Status: PAID`, { align: 'right', color: 'green' });
        doc.moveDown();

        // Logo (Optional - simplistic placeholder text if no file)
        const appName = user.appName || 'Cloudchat.id'; // Get from options (passed as user obj in current impl, or refactor)
        doc.fontSize(18).fillColor('#4F46E5').text(appName, 50, 50);
        doc.fontSize(10).fillColor('black').text('SaaS Platform for WhatsApp Automation', 50, 75);
        doc.moveDown(2);

        // 2. BILL TO
        doc.text('Bill To:', 50, 150);
        doc.font('Helvetica-Bold').text(user.org_name || user.name);
        doc.font('Helvetica').text(user.email);
        doc.moveDown(2);

        // 3. TABLE HEADER
        const tableTop = 250;
        doc.font('Helvetica-Bold');
        doc.text('Item Description', 50, tableTop);
        doc.text('Type', 280, tableTop);
        doc.text('Amount', 400, tableTop, { align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // 4. TABLE ITEMS
        let position = tableTop + 30;
        doc.font('Helvetica');

        const itemName = transaction.item_name || (transaction.plan_id ? 'Subscription Plan' : 'Add-on');

        doc.text(itemName, 50, position);
        doc.text(transaction.cycle || 'One-time', 280, position);
        doc.text(`Rp ${parseInt(transaction.subtotal).toLocaleString('id-ID')}`, 400, position, { align: 'right' });

        doc.moveTo(50, position + 20).lineTo(550, position + 20).strokeColor('#eeeeee').stroke();

        // 5. TOTALS
        let totalPos = position + 40;

        doc.text('Subtotal:', 300, totalPos);
        doc.text(`Rp ${parseInt(transaction.subtotal).toLocaleString('id-ID')}`, 400, totalPos, { align: 'right' });

        totalPos += 20;
        doc.text('PPN (11%):', 300, totalPos);
        doc.text(`Rp ${parseInt(transaction.tax).toLocaleString('id-ID')}`, 400, totalPos, { align: 'right' });

        totalPos += 20;
        doc.text('Admin Fee:', 300, totalPos);
        doc.text(`Rp ${parseInt(transaction.admin_fee).toLocaleString('id-ID')}`, 400, totalPos, { align: 'right' });

        if (transaction.unique_code > 0) {
            totalPos += 20;
            doc.text('Unique Code:', 300, totalPos);
            doc.text(`${transaction.unique_code}`, 400, totalPos, { align: 'right' });
        }

        totalPos += 25;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('Grand Total:', 300, totalPos);
        doc.text(`Rp ${parseInt(transaction.amount).toLocaleString('id-ID')}`, 400, totalPos, { align: 'right' });

        // 6. FOOTER
        doc.fontSize(10).font('Helvetica').text('Thank you for your business!', 50, 700, { align: 'center', width: 500 });

        doc.end();
    });
};
