import pool from '../config/db.js';
import { invalidateRoleTokens } from '../services/tokenService.js';

// Master list of all available permissions (used by frontend and validation)
export const ALL_PERMISSIONS = [
    // Inbox
    { id: 'view_all_chats',       label: 'Lihat Semua Chat',          group: 'Inbox',      description: 'Dapat melihat semua percakapan di inbox' },
    { id: 'receive_new_leads',    label: 'Terima Leads Baru',         group: 'Inbox',      description: 'Otomatis menerima assign chat/leads baru yang masuk' },
    { id: 'assign_conversations',  label: 'Assign Percakapan',         group: 'Inbox',      description: 'Mengalihkan chat ke agent lain' },
    { id: 'delete_messages',       label: 'Hapus Pesan',               group: 'Inbox',      description: 'Menghapus pesan di dalam percakapan' },
    { id: 'manage_labels',         label: 'Kelola Label',              group: 'Inbox',      description: 'Buat, edit, dan hapus label percakapan' },
    // Kontak
    { id: 'manage_contacts',       label: 'Kelola Kontak',             group: 'Kontak',     description: 'Buat, edit, dan hapus kontak' },
    { id: 'export_data',           label: 'Export Data',               group: 'Kontak',     description: 'Export kontak dan data ke file CSV/Excel' },
    // Broadcast
    { id: 'manage_broadcast',      label: 'Akses Broadcast',           group: 'Broadcast',  description: 'Buat dan kirim kampanye broadcast' },
    // Chatbot
    { id: 'manage_chatbot',        label: 'Konfigurasi Chatbot',       group: 'Chatbot',    description: 'Atur bot, alur, dan knowledge base' },
    // CRM
    { id: 'manage_pipeline',       label: 'Kelola Pipeline',           group: 'CRM',        description: 'Akses dan kelola pipeline penjualan' },
    { id: 'manage_invoice',        label: 'Kelola Invoice',            group: 'CRM',        description: 'Buat dan kelola invoice/tagihan pelanggan' },
    // Produk
    { id: 'manage_products',       label: 'Kelola Produk',             group: 'Produk',     description: 'Akses dan kelola katalog produk' },
    // Tools & Otomasi
    { id: 'use_tools',             label: 'Akses Tools',               group: 'Tools',      description: 'Gunakan number checker, group extractor, dan GMaps scraper' },
    { id: 'manage_followup',       label: 'Kelola Follow-up',          group: 'Tools',      description: 'Buat dan kelola urutan follow-up otomatis' },
    // Tugas & Tiket
    { id: 'manage_tasks',          label: 'Kelola Tasks',              group: 'Tugas',      description: 'Akses dan kelola daftar tugas tim' },
    { id: 'manage_tickets',        label: 'Kelola Tiket/SLA',          group: 'Tugas',      description: 'Akses sistem tiket dan kebijakan SLA' },
    // Laporan
    { id: 'view_reports',          label: 'Lihat Laporan',             group: 'Laporan',    description: 'Akses halaman laporan dan statistik' },
    // Tim
    { id: 'manage_team',           label: 'Kelola Tim / User',         group: 'Pengaturan', description: 'Akses halaman Manage User untuk menambah, edit, dan hapus anggota tim' },
];

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
