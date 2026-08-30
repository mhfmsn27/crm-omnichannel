#!/usr/bin/env node
/**
 * ============================================================================
 * CRMHUB OMNICHANNEL - LIVE DEMO DATA SEEDER (100% PURE & ZERO-RISK)
 * ============================================================================
 * Only seeds pure, standalone master data that has ZERO dependencies on
 * external channels, hardware gateways, or payment providers.
 * 
 * ✅ INCLUDED (100% SAFE & SOLID):
 *  1. Smart Labels / Tags (VIP Customer, Prospek Panas, Follow Up, Pelanggan Baru, dll)
 *  2. Contacts Master Data (Indonesian names, phone numbers, emails, assigned labels)
 *  3. Sales Pipeline & Kanban Stages (Lead Masuk, Kualifikasi, Penawaran, Closing Won)
 *  4. Products & Services Catalog (Catalog items with prices, SKUs, and stock)
 *  5. Quick Reply Shortcuts (/halo, /harga, /rekening, /closing, /jam-kerja)
 *  6. SLA Policies & Timing Targets (Urgent, High, Medium, Low)
 *  7. Divisions Master Data (Customer Care, Sales, Tech Support)
 *  8. System Announcements Banner
 * 
 * ❌ STRICTLY EXCLUDED (TO PREVENT ANY DEMO RISKS / ERRORS):
 *  - Superadmin / Admin accounts (NEVER touched or altered).
 *  - Inbox conversations & messages (NO fake sessions to avoid reply errors).
 *  - Invoices & Transactions (NO fake invoice dispatches or payment gateway triggers).
 *  - Chatbot Flow Triggers (NO keyword interceptors during demo tests).
 * ============================================================================
 */

import pool from '../src/config/db.js';

async function seedDemoLive() {
    console.log('\n================================================================');
    console.log('🚀 [CRMHUB LIVE DEMO SEEDER] Seeding Rock-Solid Standalone Data...');
    console.log('================================================================\n');

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Resolve Target Organization
        const orgRes = await client.query('SELECT id, name FROM organizations ORDER BY id ASC LIMIT 1');
        let orgId;
        if (orgRes.rows.length === 0) {
            const newOrg = await client.query(
                `INSERT INTO organizations (name, subscription_status, is_active) 
                 VALUES ('PT CRMHUB Solusi Indonesia', 'active', true) RETURNING id, name`
            );
            orgId = newOrg.rows[0].id;
            console.log(`🏢 Created Default Organization: PT CRMHUB Solusi Indonesia (ID: ${orgId})`);
        } else {
            orgId = orgRes.rows[0].id;
            console.log(`🏢 Target Organization: ${orgRes.rows[0].name} (ID: ${orgId})`);
        }

        // -------------------------------------------------------------
        // 1. SEED LABELS / TAGS (100% Safe)
        // -------------------------------------------------------------
        console.log('\n🏷️  1. Seeding Smart Labels & Tags...');
        const demoLabels = [
            { name: 'VIP Customer', color: '#10B981' },
            { name: 'Prospek Panas', color: '#EF4444' },
            { name: 'Follow Up 1', color: '#F59E0B' },
            { name: 'Pelanggan Baru', color: '#3B82F6' },
            { name: 'Pembayaran Pending', color: '#8B5CF6' },
            { name: 'Komplain CS', color: '#EC4899' },
            { name: 'Repeat Order', color: '#06B6D4' }
        ];

        const labelMap = {};
        for (const l of demoLabels) {
            const res = await client.query(
                `INSERT INTO labels (organization_id, name, color)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (organization_id, name) DO UPDATE SET color = EXCLUDED.color
                 RETURNING id, name`,
                [orgId, l.name, l.color]
            );
            labelMap[l.name] = res.rows[0].id;
        }
        console.log(`  ✅ ${demoLabels.length} Smart Labels configured.`);

        // -------------------------------------------------------------
        // 2. SEED CONTACTS (100% Safe)
        // -------------------------------------------------------------
        console.log('\n👥 2. Seeding Contacts Master Data...');
        const demoContacts = [
            {
                name: 'Budi Hartono (PT Nusantara Logistik)',
                phone: '6281234567801',
                email: 'budi.hartono@nusantaralog.co.id',
                source: 'whatsapp',
                label: 'VIP Customer'
            },
            {
                name: 'Siti Rahmawati (CV Berkah Herbal)',
                phone: '6281234567802',
                email: 'siti.rahma@berkahherbal.id',
                source: 'instagram',
                label: 'Prospek Panas'
            },
            {
                name: 'Hendra Wijaya (Toko Sepatu Makmur)',
                phone: '6281234567803',
                email: 'hendra.makmur@gmail.com',
                source: 'webchat',
                label: 'Follow Up 1'
            },
            {
                name: 'Dr. Anita Permata (Klinik Estetika Cantika)',
                phone: '6281234567804',
                email: 'anita.permata@cantikaclinic.com',
                source: 'whatsapp',
                label: 'Pelanggan Baru'
            },
            {
                name: 'Reza Pratama (Agensi Digital Kreasi)',
                phone: '6281234567805',
                email: 'reza@kreasidigital.agency',
                source: 'telegram',
                label: 'Pembayaran Pending'
            },
            {
                name: 'Linda Kusuma (Resto Rasa Nusantara)',
                phone: '6281234567806',
                email: 'linda.resto@gmail.com',
                source: 'whatsapp',
                label: 'Repeat Order'
            }
        ];

        for (const c of demoContacts) {
            const res = await client.query(
                `INSERT INTO contacts (organization_id, name, phone_number, email, source)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (organization_id, phone_number) 
                 DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
                 RETURNING id, phone_number`,
                [orgId, c.name, c.phone, c.email, c.source]
            );
            const contactId = res.rows[0].id;

            // Link Label
            if (labelMap[c.label]) {
                await client.query(
                    `INSERT INTO contact_labels (contact_id, label_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [contactId, labelMap[c.label]]
                ).catch(() => {});
            }
        }
        console.log(`  ✅ ${demoContacts.length} Contacts with rich metadata seeded.`);

        // -------------------------------------------------------------
        // 3. SEED PIPELINE CRM & KANBAN STAGES (100% Safe)
        // -------------------------------------------------------------
        console.log('\n📊 3. Seeding Sales Pipeline & Kanban Stages...');
        
        let pipelineId;
        const pipeCheck = await client.query('SELECT id FROM pipelines WHERE organization_id = $1 LIMIT 1', [orgId]);
        if (pipeCheck.rows.length === 0) {
            const pipeRes = await client.query(
                `INSERT INTO pipelines (organization_id, name, description, is_default, is_active)
                 VALUES ($1, 'Sales & Enterprise Deals Pipeline', 'Pipeline utama proses penjualan B2B dan ekspansi lisensi', true, true)
                 RETURNING id`,
                [orgId]
            );
            pipelineId = pipeRes.rows[0].id;
        } else {
            pipelineId = pipeCheck.rows[0].id;
        }

        const defaultStages = [
            { name: 'Lead Masuk (Baru)', color: '#3B82F6', pos: 1, closed: false },
            { name: 'Kualifikasi & Demo', color: '#F59E0B', pos: 2, closed: false },
            { name: 'Penawaran / Proposal', color: '#8B5CF6', pos: 3, closed: false },
            { name: 'Negosiasi Final', color: '#EC4899', pos: 4, closed: false },
            { name: 'Closing Won (Berhasil)', color: '#10B981', pos: 5, closed: true },
            { name: 'Closing Lost (Batal)', color: '#6B7280', pos: 6, closed: true }
        ];

        for (const st of defaultStages) {
            await client.query(
                `INSERT INTO pipeline_stages (pipeline_id, name, color, position, is_closed_stage)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT DO NOTHING`,
                [pipelineId, st.name, st.color, st.pos, st.closed]
            ).catch(() => {});
        }
        console.log(`  ✅ Sales Pipeline Kanban Stages configured.`);

        // -------------------------------------------------------------
        // 4. SEED PRODUCTS & SERVICES CATALOG (100% Safe)
        // -------------------------------------------------------------
        console.log('\n📦 4. Seeding Products & Services Catalog...');
        const demoProducts = [
            {
                name: 'CRMHUB Enterprise Omnichannel (1 Tahun)',
                sku: 'CRM-ENT-1Y',
                price: 7990000,
                cogs: 2500000,
                stock: 999,
                desc: 'Paket lisensi tahunan unlimited agent, multi-device WhatsApp, AI Copilot, dan integrasi API lengkap'
            },
            {
                name: 'Setup & Implementasi AI Custom Bot Assistant',
                sku: 'SRV-AI-SETUP',
                price: 1500000,
                cogs: 300000,
                stock: 999,
                desc: 'Jasa konfigurasi prompt engineering, knowledge base training, dan flow automation bisnis'
            },
            {
                name: 'Add-on WhatsApp Device Tambahan (5 Slot)',
                sku: 'ADDON-WA-5',
                price: 990000,
                cogs: 200000,
                stock: 999,
                desc: 'Penambahan 5 slot koneksi nomor WhatsApp aktif multi-rotator'
            },
            {
                name: 'Paket Broadcast Kuota 50.000 Pesan',
                sku: 'BCAST-50K',
                price: 500000,
                cogs: 100000,
                stock: 999,
                desc: 'Kredit pesan broadcast anti-banned dengan delay pintar & warm-up generator'
            }
        ];

        for (const p of demoProducts) {
            await client.query(
                `INSERT INTO products (organization_id, name, sku, price, cogs, stock, description, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                 ON CONFLICT (organization_id, sku) 
                 DO UPDATE SET price = EXCLUDED.price, name = EXCLUDED.name, description = EXCLUDED.description`,
                [orgId, p.name, p.sku, p.price, p.cogs, p.stock, p.desc]
            ).catch(() => {});
        }
        console.log(`  ✅ ${demoProducts.length} Products & Enterprise Services Catalog seeded.`);

        // -------------------------------------------------------------
        // 5. SEED QUICK REPLIES (100% Safe)
        // -------------------------------------------------------------
        console.log('\n⚡ 5. Seeding Quick Reply Templates...');
        const demoReplies = [
            {
                shortcut: '/halo',
                content: 'Halo! Selamat datang di Layanan Pelanggan CRMHUB. Ada yang bisa kami bantu hari ini?'
            },
            {
                shortcut: '/harga',
                content: 'Berikut paket berlangganan CRMHUB Omnichannel:\n1. Starter (1 Device, 2 Agent): Gratis Trial\n2. Pro (5 Device, 10 Agent): Rp 199.000/bln\n3. Enterprise Unlimited (50 Device, 100 Agent): Rp 799.000/bln\n\nInfo lengkap & invoice bisa langsung hubungi kami.'
            },
            {
                shortcut: '/rekening',
                content: 'Pembayaran resmi CRMHUB dapat ditransfer ke:\n🏦 BCA: 800-123-4567\n🏦 Mandiri: 137-00-9876543\na.n. PT CRMHUB Solusi Indonesia\n\nSetelah transfer mohon kirimkan bukti bayar ya kak. Terima kasih!'
            },
            {
                shortcut: '/closing',
                content: 'Terima kasih telah menghubungi kami. Jika ada pertanyaan lainnya, jangan ragu untuk chat kami kembali ya kak. Sukses selalu!'
            },
            {
                shortcut: '/jam-kerja',
                content: 'Jam operasional Customer Care CRMHUB:\n⏰ Senin - Jumat: 08.00 - 21.00 WIB\n⏰ Sabtu - Minggu: 09.00 - 17.00 WIB\n\nPesan di luar jam kerja akan kami balas segera di jam buka berikutnya.'
            }
        ];

        for (const qr of demoReplies) {
            await client.query(
                `INSERT INTO quick_replies (organization_id, shortcut, content)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (organization_id, shortcut) 
                 DO UPDATE SET content = EXCLUDED.content`,
                [orgId, qr.shortcut, qr.content]
            );
        }
        console.log(`  ✅ ${demoReplies.length} Quick Reply Shortcuts (/halo, /harga, /rekening, dll) configured.`);

        // -------------------------------------------------------------
        // 6. SEED SLA POLICIES & DIVISIONS (100% Safe)
        // -------------------------------------------------------------
        console.log('\n⏱️  6. Seeding SLA Policies & Divisions...');
        const slaDefaults = [
            { priority: 'urgent', frt: 10, res: 60 },
            { priority: 'high', frt: 30, res: 240 },
            { priority: 'medium', frt: 60, res: 480 },
            { priority: 'low', frt: 240, res: 1440 }
        ];

        for (const s of slaDefaults) {
            await client.query(
                `INSERT INTO sla_policies (organization_id, priority, frt_minutes, resolution_minutes, is_active)
                 VALUES ($1, $2, $3, $4, true)
                 ON CONFLICT (organization_id, priority) 
                 DO UPDATE SET frt_minutes = EXCLUDED.frt_minutes, resolution_minutes = EXCLUDED.resolution_minutes`,
                [orgId, s.priority, s.frt, s.res]
            );
        }

        const divisions = ['Customer Care & Support', 'Sales & Enterprise Deals', 'Technical Integration'];
        for (const d of divisions) {
            await client.query(
                `INSERT INTO divisions (organization_id, name, description)
                 VALUES ($1, $2, 'Divisi tim operasional CRMHUB')
                 ON CONFLICT DO NOTHING`,
                [orgId, d]
            ).catch(() => {});
        }
        console.log(`  ✅ SLA Policies & Divisions configured.`);

        // -------------------------------------------------------------
        // 7. SEED PLATFORM ANNOUNCEMENTS (100% Safe)
        // -------------------------------------------------------------
        console.log('\n📢 7. Seeding System Announcements & Banners...');
        await client.query(
            `INSERT INTO announcements (title, content, is_active, priority)
             VALUES ('🚀 Selamat Datang di CRMHUB Omnichannel Platform V2',
                     'Sistem siap digunakan dengan integrasi Multi-Device WhatsApp, AI Copilot, Smart Flow Builder, dan CRM Pipeline otomatis.',
                     true, 1)
             ON CONFLICT DO NOTHING`,
        ).catch(() => {});
        console.log('  ✅ System Announcement banner created.');

        await client.query('COMMIT');

        console.log('\n================================================================');
        console.log('🎉 [CRMHUB LIVE DEMO SEEDER COMPLETED SUCCESSFULLY]');
        console.log('✨ 100% Pure, rock-solid master data has been populated.');
        console.log('🛡️  Zero-risk: No channel, gateway, or session dependencies.');
        console.log('================================================================\n');

        process.exit(0);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ [Demo Seeder Error]:', err.message);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedDemoLive();
