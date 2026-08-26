import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

/**
 * Ensures the uploads/qris directory exists
 */
const getQrisDir = () => {
    const qrisDir = path.join(projectRoot, 'uploads', 'qris');
    if (!fs.existsSync(qrisDir)) {
        fs.mkdirSync(qrisDir, { recursive: true });
    }
    return qrisDir;
};

/**
 * Generate a dynamic QRIS PNG image and Data URL for an invoice
 * @param {Object} params
 * @param {Object} params.invoice - Invoice data (id, invoice_number, total_amount, public_token)
 * @param {string} [params.qrContent] - Optional raw QRIS payload (EMVCo string). If not provided, uses public pay link.
 * @param {string} params.appUrl - Base application URL
 * @returns {Promise<{ filename: string, filePath: string, publicUrl: string, dataUrl: string }>}
 */
export const generateInvoiceQris = async ({ invoice, qrContent, appUrl }) => {
    const qrisDir = getQrisDir();
    const cleanAppUrl = (appUrl || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    
    // Content to encode into QR code: either gateway's raw QR string or the direct invoice checkout URL
    const targetContent = qrContent || `${cleanAppUrl}/p/invoice/${invoice.public_token}?auto_pay=qris`;

    const filename = `qris-inv-${invoice.id}-${Date.now()}.png`;
    const filePath = path.join(qrisDir, filename);

    // Generate PNG file for WhatsApp attachment
    await QRCode.toFile(filePath, targetContent, {
        type: 'png',
        width: 512,
        margin: 2,
        color: {
            dark: '#111827',
            light: '#ffffff'
        }
    });

    // Also generate data URL for instant frontend display
    const dataUrl = await QRCode.toDataURL(targetContent, {
        width: 320,
        margin: 2,
        color: {
            dark: '#111827',
            light: '#ffffff'
        }
    });

    const publicUrl = `${cleanAppUrl}/uploads/qris/${filename}`;

    return {
        filename,
        filePath,
        publicUrl,
        dataUrl
    };
};

/**
 * Format a standard WhatsApp QRIS message caption
 */
export const formatQrisWhatsAppMessage = ({ invoice, orgName, appUrl }) => {
    const cleanAppUrl = (appUrl || process.env.APP_URL || '').replace(/\/$/, '');
    const formattedAmount = parseInt(invoice.total_amount || 0).toLocaleString('id-ID');
    const invoiceUrl = `${cleanAppUrl}/p/invoice/${invoice.public_token}`;

    return `🧾 *TAGIHAN PEMBAYARAN QRIS*\n` +
           `━━━━━━━━━━━━━━━━━━━━\n` +
           `🏢 *Merchant:* ${orgName || 'CRMHUB'}\n` +
           `📄 *No. Invoice:* #${invoice.invoice_number}\n` +
           `💰 *Total Tagihan:* Rp ${formattedAmount}\n` +
           `📅 *Jatuh Tempo:* ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('id-ID') : 'Hari ini'}\n` +
           `━━━━━━━━━━━━━━━━━━━━\n\n` +
           `📲 *Cara Pembayaran:* \n` +
           `1. Buka aplikasi BCA, Mandiri, GoPay, OVO, Dana, ShopeePay, atau Mobile Banking Anda.\n` +
           `2. Scan gambar QRIS di atas.\n` +
           `3. Periksa nominal *Rp ${formattedAmount}* dan konfirmasi pembayaran.\n\n` +
           `🔗 *Lihat Rincian / Pembayaran Lain:* \n${invoiceUrl}\n\n` +
           `_Terima kasih atas kepercayaan Anda!_`;
};
