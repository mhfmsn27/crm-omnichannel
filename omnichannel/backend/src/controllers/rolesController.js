import pool from '../config/db.js';
import { invalidateRoleTokens } from '../services/tokenService.js';

// Master list of all available permissions across all menus and submenus
export const ALL_PERMISSIONS = [
    // 1. Kotak Masuk (Inbox)
    { id: 'view_all_chats',       label: 'Lihat Semua Chat',          group: 'Kotak Masuk (Inbox)', description: 'Dapat melihat semua percakapan di inbox' },
    { id: 'receive_new_leads',    label: 'Terima Leads Baru',         group: 'Kotak Masuk (Inbox)', description: 'Otomatis menerima assign chat/leads baru yang masuk' },
    { id: 'assign_conversations',  label: 'Assign Percakapan',         group: 'Kotak Masuk (Inbox)', description: 'Mengalihkan chat ke agen lain' },
    { id: 'delete_messages',       label: 'Hapus Pesan',               group: 'Kotak Masuk (Inbox)', description: 'Menghapus pesan di dalam percakapan' },
    { id: 'manage_labels',         label: 'Kelola Label Kontak/Chat',  group: 'Kotak Masuk (Inbox)', description: 'Buat, edit, dan hapus label percakapan dan kontak' },

    // 2. Kontak & Leads
    { id: 'manage_contacts',       label: 'Kelola Kontak',             group: 'Kontak & Leads',      description: 'Akses, buat, edit, dan hapus data kontak' },
    { id: 'manage_leads',          label: 'Kelola Leads & Scoring',    group: 'Kontak & Leads',      description: 'Akses halaman prospek lead dan status prospek' },
    { id: 'import_contacts',       label: 'Import Kontak Excel/CSV',   group: 'Kontak & Leads',      description: 'Import kontak massal dari file Excel atau CSV' },
    { id: 'export_data',           label: 'Export Data Kontak',        group: 'Kontak & Leads',      description: 'Export kontak dan data ke file CSV/Excel' },

    // 3. Bookings
    { id: 'manage_bookings',       label: 'Kelola Jadwal Bookings',    group: 'Bookings & Jadwal',   description: 'Akses kalender dan reservasi/booking' },

    // 4. Saluran & Integrasi
    { id: 'manage_integrations',   label: 'Kelola Saluran Chat',       group: 'Integrasi Saluran',   description: 'Hubungkan WhatsApp, Email, Instagram, Messenger, Webchat' },
    { id: 'manage_webhooks',       label: 'Kelola Webhook & API Keys', group: 'Integrasi Saluran',   description: 'Konfigurasi webhook event dan akses token API' },

    // 5. Broadcast & Kampanye
    { id: 'manage_broadcast',      label: 'Buat & Kirim Broadcast',    group: 'Broadcast',           description: 'Buat dan luncurkan kampanye pesan siaran' },
    { id: 'broadcast_schedule',    label: 'Atur Jadwal Broadcast',     group: 'Broadcast',           description: 'Akses menu jadwal broadcast terencana' },
    { id: 'broadcast_reports',     label: 'Laporan Riwayat Broadcast', group: 'Broadcast',           description: 'Lihat status pengiriman dan analitik broadcast' },
    { id: 'manage_templates',      label: 'Kelola Template Pesan',     group: 'Broadcast',           description: 'Kelola template pesan broadcast & Meta templates' },
    { id: 'manage_rotator',        label: 'Kelola Rotator CS Link',    group: 'Broadcast',           description: 'Kelola tautan rotator WhatsApp CS' },

    // 6. Chatbot & Otomasi AI
    { id: 'manage_chatbot',        label: 'Konfigurasi Bot & Alur',    group: 'Chatbot & AI',        description: 'Kelola bot, visual flow builder, dan respon otomatis' },
    { id: 'chatbot_training',      label: 'AI Training & Knowledge',   group: 'Chatbot & AI',        description: 'Latih model AI, Global Knowledge Base, dan Multi-Bahasa' },

    // 7. CRM & Bisnis
    { id: 'manage_pipeline',       label: 'Kelola Pipeline Deals',     group: 'CRM & Bisnis',        description: 'Akses Kanban board penjualan dan deal tahapan' },
    { id: 'manage_sales_visits',   label: 'Kunjungan Sales (GPS)',     group: 'CRM & Bisnis',        description: 'Check-in lokasi GPS dan laporan foto kunjungan klien' },
    { id: 'manage_products',       label: 'Katalog Produk & Harga',    group: 'CRM & Bisnis',        description: 'Akses dan kelola produk, varian, dan inventori' },
    { id: 'manage_tasks',          label: 'Kelola Tasks & To-Do',      group: 'CRM & Bisnis',        description: 'Akses dan penugasan daftar tugas kerja' },
    { id: 'manage_tickets',        label: 'Sistem Tiket Bantuan & SLA',group: 'CRM & Bisnis',        description: 'Akses tiket keluhan pelanggan dan pengaturan SLA' },

    // 8. Tagihan & Invoicing
    { id: 'manage_invoice',        label: 'Kelola Tagihan & Faktur',   group: 'Tagihan / Invoicing', description: 'Buat faktur penjualan, kelola status bayar dan pengingat' },
    { id: 'bulk_invoice',          label: 'Import Tagihan Massal',     group: 'Tagihan / Invoicing', description: 'Akses import tagihan massal via template Excel' },
    { id: 'recurring_invoice',     label: 'Faktur Berlangganan',       group: 'Tagihan / Invoicing', description: 'Atur tagihan berulang berkala (recurring)' },

    // 9. Laporan & Analitik
    { id: 'view_reports',          label: 'Overview Laporan Ringkasan',group: 'Laporan & Analitik',  description: 'Lihat ringkasan performa dan overview umum' },
    { id: 'view_analytics',        label: 'Advanced Analytics',        group: 'Laporan & Analitik',  description: 'Akses atribusi lanjutan, sales funnel, dan performa agen' },
    { id: 'view_csat',             label: 'Laporan Survei CSAT',       group: 'Laporan & Analitik',  description: 'Akses skor kepuasan pelanggan dan feedback' },
    { id: 'view_wallboard',        label: 'Live Wallboard TV Monitor', group: 'Laporan & Analitik',  description: 'Tampilan real-time metrik layar besar TV' },
    { id: 'view_gamification',     label: 'Leaderboard & Gamifikasi',  group: 'Laporan & Analitik',  description: 'Lihat peringkat agen, badge, dan poin gamifikasi' },

    // 10. Tools & Alat Bantu
    { id: 'use_tools',             label: 'Akses Validator & Tools WA',group: 'Tools & Otomasi',    description: 'Akses number checker, group extractor, dan Google Maps scraper' },
    { id: 'use_warmer',            label: 'WhatsApp Warmer Circle',    group: 'Tools & Otomasi',    description: 'Akses pemanasan akun nomor WhatsApp otomatis' },
    { id: 'manage_followup',       label: 'Auto Follow-Up Otomatis',   group: 'Tools & Otomasi',    description: 'Buat urutan pesan follow-up otomatis' },
    { id: 'manage_chatform',       label: 'Interactive Chat Form',     group: 'Tools & Otomasi',    description: 'Buat dan kelola formulir interaktif di chat' },

    // 11. Pengaturan & Sistem
    { id: 'manage_team',           label: 'Kelola Tim & Anggota',      group: 'Pengaturan',          description: 'Tambah, edit, dan atur anggota tim pengguna' },
    { id: 'manage_roles',          label: 'Kelola Role & Hak Akses',   group: 'Pengaturan',          description: 'Akses dan konfigurasi hak akses role RBAC' },
    { id: 'manage_settings',       label: 'Konfigurasi Workspace',     group: 'Pengaturan',          description: 'Atur jam operasional, custom fields, divisi, dan lisensi' },
    { id: 'manage_system_health',  label: 'Server Health & Backup',    group: 'Pengaturan',          description: 'Pantau status server, database, dan cadangan data' },
    { id: 'manage_api',            label: 'Akses Developer API',       group: 'Pengaturan',          description: 'Akses dokumentasi dan kunci API developer' },
];

// Fallback mapping for backward-compatibility with older role definitions in database
export const PERMISSION_FALLBACKS = {
    manage_leads: ['manage_contacts'],
    import_contacts: ['manage_contacts'],
    export_data: ['manage_contacts'],
    broadcast_schedule: ['manage_broadcast'],
    broadcast_reports: ['manage_broadcast'],
    manage_templates: ['manage_broadcast'],
    manage_rotator: ['manage_broadcast'],
    manage_sales_visits: ['manage_pipeline', 'manage_crm'],
    bulk_invoice: ['manage_invoice'],
    recurring_invoice: ['manage_invoice'],
    view_analytics: ['view_reports'],
    view_csat: ['view_reports'],
    view_wallboard: ['view_reports'],
    view_gamification: ['view_reports'],
    use_warmer: ['use_tools'],
    manage_chatform: ['use_tools'],
    chatbot_training: ['manage_chatbot'],
    manage_webhooks: ['manage_integrations'],
    manage_roles: ['manage_team'],
    manage_settings: ['manage_team'],
    manage_system_health: ['manage_team'],
    manage_api: ['manage_team'],
};

// GET /api/app/roles/permissions — return master permission list
export const getPermissions = (req, res) => {
    res.json(ALL_PERMISSIONS);
};

// GET /api/app/roles — list all custom roles for org
export const getRoles = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM custom_roles WHERE organization_id = $1 ORDER BY role_level DESC, name ASC',
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('[Roles] getRoles error:', err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/roles — create a custom role
export const createRole = async (req, res) => {
    const { organization_id } = req.user;
    const { name, description, role_type, role_level, permissions, color } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Role name is required' });
    if (!['admin_member', 'agent'].includes(role_type)) {
        return res.status(400).json({ error: 'role_type must be admin_member or agent' });
    }
    const level = parseInt(role_level) || 1;
    if (level < 1 || level > 99) {
        return res.status(400).json({ error: 'role_level must be between 1 and 99' });
    }

    // Validate permissions against master list
    const validIds = new Set(ALL_PERMISSIONS.map(p => p.id));
    const safePerms = (Array.isArray(permissions) ? permissions : []).filter(p => validIds.has(p));

    try {
        const result = await pool.query(
            `INSERT INTO custom_roles (organization_id, name, description, role_type, role_level, permissions, color)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [organization_id, name.trim(), description || null, role_type, level, JSON.stringify(safePerms), color || 'blue']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'A role with this name already exists' });
        console.error('[Roles] createRole error:', err);
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/roles/:id — update a custom role
export const updateRole = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, description, role_type, role_level, permissions, color } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Role name is required' });
    if (!['admin_member', 'agent'].includes(role_type)) {
        return res.status(400).json({ error: 'role_type must be admin_member or agent' });
    }
    const level = parseInt(role_level) || 1;
    if (level < 1 || level > 99) {
        return res.status(400).json({ error: 'role_level must be between 1 and 99' });
    }

    const validIds = new Set(ALL_PERMISSIONS.map(p => p.id));
    const safePerms = (Array.isArray(permissions) ? permissions : []).filter(p => validIds.has(p));

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `UPDATE custom_roles
             SET name = $1, description = $2, role_type = $3, role_level = $4,
                 permissions = $5, color = $6, updated_at = NOW()
             WHERE id = $7 AND organization_id = $8
             RETURNING *`,
            [name.trim(), description || null, role_type, level, JSON.stringify(safePerms), color || 'blue', id, organization_id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Role not found' });
        }

        // Cascade update: sync permissions to all users assigned to this role
        await client.query(
            `UPDATE users
             SET role_level = $1, permissions = $2, updated_at = NOW()
             WHERE custom_role_id = $3 AND organization_id = $4`,
            [level, JSON.stringify(safePerms), id, organization_id]
        );

        await client.query('COMMIT');

        // Invalidate tokens for all users with this role so they get fresh permissions
        await invalidateRoleTokens(id, 'role_permissions_changed');

        res.json({
            ...result.rows[0],
            cascade_updated: true
        });
    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') return res.status(400).json({ error: 'A role with this name already exists' });
        console.error('[Roles] updateRole error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

// DELETE /api/app/roles/:id — delete a custom role
export const deleteRole = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Unassign users from this role AND clear their permissions
        // This ensures users don't retain old permissions from deleted role
        await client.query(
            `UPDATE users SET custom_role_id = NULL, permissions = '[]'::jsonb
             WHERE custom_role_id = $1 AND organization_id = $2`,
            [id, organization_id]
        );

        const result = await client.query(
            'DELETE FROM custom_roles WHERE id = $1 AND organization_id = $2 RETURNING id',
            [id, organization_id]
        );

        await client.query('COMMIT');

        if (result.rows.length === 0) return res.status(404).json({ error: 'Role not found' });

        // Invalidate tokens for users who had this role
        await invalidateRoleTokens(id, 'role_deleted');

        res.json({ message: 'Role deleted successfully. All assigned users have been unassigned.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Roles] deleteRole error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};
