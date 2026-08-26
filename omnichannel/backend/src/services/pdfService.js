import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const generateInvoicePdf = (invoice, settings) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // --- HEADER ---

        // 1. INVOICE Title (Top Left)
        const themeColor = settings?.theme_color || '#4f46e5';
        doc.fillColor(themeColor)
            .fontSize(20)
            .text('INVOICE', 50, 50, { align: 'left' });

        doc.fillColor('black'); // Reset default color

        // 2. Logo (Centered)
        if (settings?.logo_url) {
            try {
                const cleanPath = settings.logo_url.startsWith('/') ? settings.logo_url.slice(1) : settings.logo_url;
                const logoPath = path.join(__dirname, '../../', cleanPath);
                if (fs.existsSync(logoPath)) {
                    // Centered Logo: page width is ~595. Center is ~297.
                    // Image width 80. X = 297 - 40 = 257.
                    doc.image(logoPath, 257, 40, { width: 80 });
                }
            } catch (e) { console.warn("Invoice Logo Error", e); }
        }

        // 3. Invoice Meta (Top Right)
        const issueDate = invoice.issue_date ? new Date(invoice.issue_date) : new Date(invoice.created_at);
        doc.fontSize(10)
            .text(invoice.invoice_number || invoice.transaction_id || '-', 400, 50, { align: 'right' })
            .text(`Issue Date: ${issueDate.toLocaleDateString()}`, 400, 65, { align: 'right' });
        
        if (invoice.due_date) {
            doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 400, 80, { align: 'right' });
        }

        doc.moveDown(4); // Space after header area

        // --- FROM & TO SECTION ---
        const currentY = doc.y;

        // 4. From (Organization) - Left Side
        const orgName = settings.org_name || 'Organization Name';
        const orgEmail = settings.org_email || 'Organization Email';
        const orgPhone = settings.org_phone || '';

        doc.fontSize(10).font('Helvetica-Bold').text('From:', 50, currentY);
        doc.font('Helvetica-Bold').text(orgName, 50, currentY + 15);
        doc.font('Helvetica').fontSize(9).text(orgEmail, 50, currentY + 30);
        if (orgPhone) doc.text(orgPhone, 50, currentY + 45);

        // 5. To (Customer) - Right Side
        const customerName = invoice.contact_name || invoice.user_name || 'Customer';
        const customerDetail = invoice.contact_phone || invoice.email || '-';

        doc.fontSize(10).font('Helvetica-Bold').text('To:', 350, currentY);
        doc.font('Helvetica-Bold').text(customerName, 350, currentY + 15);
        doc.font('Helvetica').fontSize(9).text(`Contact: ${customerDetail}`, 350, currentY + 30);

        doc.moveDown(4);

        // --- TABLE HEADER ---
        let tableTop = Math.max(doc.y + 20, 250); 
        
        doc.rect(50, tableTop - 5, 500, 20).fill(themeColor);
        doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
        
        doc.text('Description', 60, tableTop)
            .text('Qty', 280, tableTop, { width: 50, align: 'center' })
            .text('Price', 340, tableTop, { width: 80, align: 'right' })
            .text('Amount', 450, tableTop, { width: 90, align: 'right' });

        // doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.fillColor('black');

        // --- ITEMS ---
        let position = tableTop + 30;
        doc.font('Helvetica');

        // Check if it's a CRM Invoice with items array, or a legacy SaaS billing transaction
        if (invoice.items && Array.isArray(invoice.items) && invoice.items.length > 0) {
            invoice.items.forEach(item => {
                doc.text(item.description || 'Item', 60, position, { width: 210 });
                doc.text(item.quantity || 1, 280, position, { width: 50, align: 'center' });
                doc.text(`Rp ${parseInt(item.unit_price || 0).toLocaleString('id-ID')}`, 340, position, { width: 80, align: 'right' });
                doc.text(`Rp ${parseInt(item.amount || 0).toLocaleString('id-ID')}`, 450, position, { width: 90, align: 'right' });
                position += 20;
            });
        } else {
            // Legacy SaaS transaction
            const itemName = invoice.item_name || (invoice.plan_id ? 'Subscription Plan' : 'Add-on');
            doc.text(itemName, 60, position, { width: 210 });
            doc.text('1', 280, position, { width: 50, align: 'center' }); // Qty 1
            doc.text(`Rp ${parseInt(invoice.subtotal || 0).toLocaleString('id-ID')}`, 340, position, { width: 80, align: 'right' });
            doc.text(`Rp ${parseInt(invoice.subtotal || 0).toLocaleString('id-ID')}`, 450, position, { width: 90, align: 'right' });
            position += 20;
        }

        const itemsBottom = position + 10;
        doc.moveTo(50, itemsBottom).lineTo(550, itemsBottom).strokeColor('#aaaaaa').stroke();

        // --- SUMMARY ---
        let summaryY = itemsBottom + 20;
        
        const subtotal = parseInt(invoice.subtotal || 0);
        const taxAmount = parseInt(invoice.tax_amount || invoice.tax || 0);
        const adminFee = parseInt(invoice.admin_fee || 0);
        const uniqueCode = parseInt(invoice.unique_code || 0);
        const totalAmount = parseInt(invoice.total_amount || invoice.amount || 0);

        doc.text('Subtotal:', 350, summaryY)
            .text(`Rp ${subtotal.toLocaleString('id-ID')}`, 450, summaryY, { align: 'right' });
            
        if (taxAmount > 0) {
            summaryY += 20;
            doc.text(`Tax:`, 350, summaryY)
               .text(`Rp ${taxAmount.toLocaleString('id-ID')}`, 450, summaryY, { align: 'right' });
        }

        if (adminFee > 0) {
             summaryY += 20;
             doc.text(`Admin Fee:`, 350, summaryY)
               .text(`Rp ${adminFee.toLocaleString('id-ID')}`, 450, summaryY, { align: 'right' });
        }

        if (uniqueCode > 0) {
            summaryY += 20;
            doc.text('Unique Code:', 300, summaryY)
               .text(`${uniqueCode}`, 450, summaryY, { align: 'right' });
        }

        summaryY += 25;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(themeColor)
            .text('Grand Total:', 350, summaryY)
            .text(`Rp ${totalAmount.toLocaleString('id-ID')}`, 450, summaryY, { align: 'right' });
        doc.fillColor('black');
        
        const dpAmount = parseInt(invoice.dp_amount || 0);
        if (dpAmount > 0) {
            summaryY += 20;
            doc.font('Helvetica').fontSize(10)
               .text('DP (Down Payment):', 300, summaryY)
               .text(`- Rp ${dpAmount.toLocaleString('id-ID')}`, 450, summaryY, { align: 'right' });
            
            summaryY += 20;
            const balanceDue = Math.max(0, totalAmount - dpAmount);
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#e11d48')
               .text('Sisa Tagihan:', 300, summaryY)
               .text(`Rp ${balanceDue.toLocaleString('id-ID')}`, 450, summaryY, { align: 'right' });
            doc.fillColor('black');
        }

        // --- FOOTER & NOTES ---
        summaryY += 40;
        doc.fontSize(10).font('Helvetica-Bold').text('Status:', 50, summaryY);
        
        // Status Badge
        const status = (invoice.status || 'unpaid').toUpperCase();
        const statusColor = (status === 'SUCCESS' || status === 'PAID') ? '#10b981' : '#ef4444';
        doc.fontSize(11).fillColor(statusColor).text(status, 95, summaryY);
        
        if (invoice.notes) {
            doc.moveDown(2);
            doc.fillColor('#444444').font('Helvetica-Bold').fontSize(10).text('Notes:');
            doc.font('Helvetica').fontSize(9).text(invoice.notes, { width: 300 });
        }

        doc.fontSize(10).fillColor('black').text(settings.footer_note || 'Thank you for your business!', 50, 700, { align: 'center', width: 500 });

        doc.end();
    });
};
