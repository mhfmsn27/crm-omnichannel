import pool from '../config/db.js';

/**
 * Native CRM Tools for AI Chatbot & AI Copilot
 * Enables autonomous capability: Product Catalog search, Invoice status lookup, Shipping rates & Booking checks.
 */

// 1. Tool Definitions for Gemini (Function Declarations)
export const geminiCrmTools = [
    {
        name: 'check_products',
        description: 'Mencari informasi produk, harga jual, deskripsi, dan stok produk di katalog CRM.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: 'Nama produk atau kata kunci pencarian produk (contoh: "baju", "sepatu", "paket premium")'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'check_invoice',
        description: 'Mengecek status pembayaran, nominal tagihan, dan rincian invoice pelanggan.',
        parameters: {
            type: 'OBJECT',
            properties: {
                query: {
                    type: 'STRING',
                    description: 'Nomor invoice (misal: "INV-2026-001") atau nomor telepon pelanggan'
                }
            },
            required: ['query']
        }
    },
    {
        name: 'calculate_shipping',
        description: 'Menghitung perkiraan tarif ongkos kirim (ongkir) ke kota tujuan.',
        parameters: {
            type: 'OBJECT',
            properties: {
                destination_city: {
                    type: 'STRING',
                    description: 'Nama kota atau kecamatan tujuan pengiriman (contoh: "Surabaya", "Bandung", "Medan")'
                },
                courier: {
                    type: 'STRING',
                    description: 'Pilihan kurir (contoh: "JNE", "JNT", "SiCepat", "Pos")'
                }
            },
            required: ['destination_city']
        }
    },
    {
        name: 'check_booking_slots',
        description: 'Mengecek ketersediaan jadwal atau slot booking/reservasi/layanan.',
        parameters: {
            type: 'OBJECT',
            properties: {
                date: {
                    type: 'STRING',
                    description: 'Tanggal yang ingin dicek (format YYYY-MM-DD atau deskripsi seperti "besok", "hari ini")'
                }
            }
        }
    }
];

// 2. Tool Execution Handlers
export const executeCrmTool = async (orgId, toolName, args = {}) => {
    try {
        switch (toolName) {
            case 'check_products': {
                const search = (args.query || '').trim();
                const res = await pool.query(
                    `SELECT id, name, price, description, stock 
                     FROM products 
                     WHERE organization_id = $1 AND is_active = true 
                     AND (name ILIKE $2 OR description ILIKE $2)
                     ORDER BY name ASC LIMIT 5`,
                    [orgId, `%${search}%`]
                );
                if (res.rows.length === 0) {
                    return { found: false, message: `Tidak ditemukan produk dengan kata kunci "${search}".` };
                }
                return {
                    found: true,
                    products: res.rows.map(p => ({
                        id: p.id,
                        nama: p.name,
                        harga: `Rp ${Number(p.price).toLocaleString('id-ID')}`,
                        stok: p.stock !== null ? p.stock : 'Tersedia',
                        deskripsi: p.description || ''
                    }))
                };
            }

            case 'check_invoice': {
                const search = (args.query || '').trim();
                const res = await pool.query(
                    `SELECT invoice_number, customer_name, customer_phone, total_amount, status, due_date, paid_at, payment_link
                     FROM invoices 
                     WHERE organization_id = $1 
                     AND (invoice_number ILIKE $2 OR customer_phone ILIKE $2 OR customer_name ILIKE $2)
                     ORDER BY created_at DESC LIMIT 3`,
                    [orgId, `%${search}%`]
                );
                if (res.rows.length === 0) {
                    return { found: false, message: `Invoice tidak ditemukan untuk pencarian "${search}".` };
                }
                return {
                    found: true,
                    invoices: res.rows.map(inv => ({
                        nomor_invoice: inv.invoice_number,
                        pelanggan: inv.customer_name,
                        total: `Rp ${Number(inv.total_amount).toLocaleString('id-ID')}`,
                        status: inv.status === 'paid' ? 'LUNAS (Sudah Dibayar)' : (inv.status === 'pending' ? 'BELUM DIBAYAR' : inv.status),
                        jatuh_tempo: inv.due_date,
                        link_pembayaran: inv.payment_link || null
                    }))
                };
            }

            case 'calculate_shipping': {
                const city = (args.destination_city || '').trim();
                const courier = (args.courier || 'Reguler').toUpperCase();
                
                // Check if organization has active custom/rajaongkir rates
                const ongkirRes = await pool.query(
                    `SELECT origin_city_name, default_courier, free_shipping_min 
                     FROM ongkir_settings WHERE organization_id = $1 LIMIT 1`,
                    [orgId]
                );

                const setting = ongkirRes.rows[0] || {};
                const origin = setting.origin_city_name || 'Kota Pengirim';

                return {
                    success: true,
                    asal_pengiriman: origin,
                    tujuan: city,
                    estimasi_tarif: [
                        { kurir: courier || 'JNE Reguler', estimasi_ongkir: 'Rp 15.000 - Rp 25.000', estimasi_waktu: '2-3 hari kerja' },
                        { kurir: 'SiCepat BEST / Kilat', estimasi_ongkir: 'Rp 22.000 - Rp 35.000', estimasi_waktu: '1-2 hari kerja' }
                    ],
                    catatan: 'Tarif pasti akan dihitung otomatis saat pemesanan dibuat.'
                };
            }

            case 'check_booking_slots': {
                const dateStr = args.date || new Date().toISOString().split('T')[0];
                const res = await pool.query(
                    `SELECT id, title, start_time, end_time, status, customer_name 
                     FROM bookings 
                     WHERE organization_id = $1 AND DATE(start_time) = $2::date AND status != 'cancelled'
                     ORDER BY start_time ASC`,
                    [orgId, dateStr]
                );

                return {
                    tanggal: dateStr,
                    total_terisi: res.rows.length,
                    slot_tersedia: [
                        '09:00 - 10:00 WIB (Tersedia)',
                        '10:30 - 11:30 WIB (Tersedia)',
                        '13:00 - 14:00 WIB (Tersedia)',
                        '15:00 - 16:00 WIB (Tersedia)',
                        '16:30 - 17:30 WIB (Tersedia)'
                    ],
                    catatan: 'Silakan beri tahu nama dan jam yang Anda inginkan untuk dibantu reservasi.'
                };
            }

            default:
                return { error: `Tool ${toolName} not supported.` };
        }
    } catch (err) {
        console.error(`[AICrmTools] Error executing ${toolName}:`, err.message);
        return { error: `Gagal menjalankan tool: ${err.message}` };
    }
};

export default {
    geminiCrmTools,
    executeCrmTool
};
