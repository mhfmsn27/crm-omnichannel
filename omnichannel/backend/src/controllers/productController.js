import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── CATEGORIES ────────────────────────────────────────────────────────────

export const getCategories = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT pc.*, COUNT(p.id)::int AS product_count
             FROM product_categories pc
             LEFT JOIN products p ON p.category_id = pc.id AND p.organization_id = pc.organization_id
             WHERE pc.organization_id = $1
             GROUP BY pc.id
             ORDER BY pc.name`,
            [organization_id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const createCategory = async (req, res) => {
    const { organization_id } = req.user;
    const { name, color = '#6366f1' } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
    try {
        const result = await pool.query(
            `INSERT INTO product_categories (organization_id, name, color) VALUES ($1, $2, $3) RETURNING *`,
            [organization_id, name.trim(), color]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateCategory = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, color } = req.body;
    try {
        const fields = [], params = [];
        let idx = 1;
        if (name !== undefined) { fields.push(`name = $${idx++}`); params.push(name.trim()); }
        if (color !== undefined) { fields.push(`color = $${idx++}`); params.push(color); }
        if (!fields.length) return res.status(400).json({ error: 'Tidak ada field yang diubah' });
        params.push(id, organization_id);
        const result = await pool.query(
            `UPDATE product_categories SET ${fields.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteCategory = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        await pool.query(`UPDATE products SET category_id = NULL WHERE category_id = $1 AND organization_id = $2`, [id, organization_id]);
        const result = await pool.query(
            `DELETE FROM product_categories WHERE id = $1 AND organization_id = $2 RETURNING id`,
            [id, organization_id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Kategori tidak ditemukan' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// ─── PRODUCTS ──────────────────────────────────────────────────────────────

export const getProducts = async (req, res) => {
    const { organization_id } = req.user;
    const { search = '', category_id, is_active, page = 1, limit = 50 } = req.query;
    try {
        const conditions = ['p.organization_id = $1'];
        const params = [organization_id];
        let idx = 2;

        if (search) {
            conditions.push(`(p.name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
            params.push(`%${search}%`); idx++;
        }
        if (category_id) { conditions.push(`p.category_id = $${idx++}`); params.push(parseInt(category_id)); }
        if (is_active !== undefined && is_active !== '') {
            conditions.push(`p.is_active = $${idx++}`);
            params.push(is_active === 'true');
        }

        const where = conditions.join(' AND ');
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const [dataRes, countRes] = await Promise.all([
            pool.query(
                `SELECT p.*, pc.name AS category_name, pc.color AS category_color
                 FROM products p
                 LEFT JOIN product_categories pc ON pc.id = p.category_id
                 WHERE ${where}
                 ORDER BY p.is_active DESC, p.name ASC
                 LIMIT $${idx} OFFSET $${idx + 1}`,
                [...params, parseInt(limit), offset]
            ),
            pool.query(`SELECT COUNT(*) FROM products p WHERE ${where}`, params)
        ]);

        res.json({ products: dataRes.rows, total: parseInt(countRes.rows[0].count) });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getProduct = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT p.*, pc.name AS category_name, pc.color AS category_color
             FROM products p
             LEFT JOIN product_categories pc ON pc.id = p.category_id
             WHERE p.id = $1 AND p.organization_id = $2`,
            [id, organization_id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const createProduct = async (req, res) => {
    const { organization_id } = req.user;
    const { name, description, sku, price = 0, cost_price = 0, unit = 'pcs', category_id, stock, notes, is_active = true } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nama produk wajib diisi' });
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;
    try {
        const result = await pool.query(
            `INSERT INTO products (organization_id, category_id, name, description, sku, price, cost_price, unit, image_url, stock, notes, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [organization_id, category_id || null, name.trim(), description || null, sku || null,
             parseFloat(price), parseFloat(cost_price), unit, image_url, stock !== '' ? parseInt(stock) : null, notes || null, is_active === 'true' || is_active === true]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateProduct = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    const { name, description, sku, price, cost_price, unit, category_id, stock, notes, is_active } = req.body;
    try {
        const fields = [], params = [];
        let idx = 1;
        const set = (col, val) => { fields.push(`${col} = $${idx++}`); params.push(val); };

        if (name !== undefined) set('name', name.trim());
        if (description !== undefined) set('description', description || null);
        if (sku !== undefined) set('sku', sku || null);
        if (price !== undefined) set('price', parseFloat(price));
        if (cost_price !== undefined) set('cost_price', parseFloat(cost_price));
        if (unit !== undefined) set('unit', unit);
        if (category_id !== undefined) set('category_id', category_id || null);
        if (stock !== undefined) set('stock', stock !== '' ? parseInt(stock) : null);
        if (notes !== undefined) set('notes', notes || null);
        if (is_active !== undefined) set('is_active', is_active === 'true' || is_active === true);
        if (req.file) set('image_url', `/uploads/products/${req.file.filename}`);
        set('updated_at', new Date());

        if (!fields.length) return res.status(400).json({ error: 'Tidak ada field yang diubah' });
        params.push(id, organization_id);

        const result = await pool.query(
            `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
            params
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteProduct = async (req, res) => {
    const { organization_id } = req.user;
    const { id } = req.params;
    try {
        const check = await pool.query(
            `SELECT image_url FROM products WHERE id = $1 AND organization_id = $2`, [id, organization_id]
        );
        if (!check.rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });

        if (check.rows[0].image_url) {
            const imgPath = path.join(__dirname, '../../', check.rows[0].image_url);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const uploadProductImage = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Tidak ada file yang diupload' });
    res.json({ url: `/uploads/products/${req.file.filename}` });
};
