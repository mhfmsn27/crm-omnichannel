import pool from '../config/db.js';

// --- PUBLIC ENDPOINTS ---

// GET /api/public/landing
export const getPublicLanding = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT section_key, content FROM landing_page_sections WHERE is_active = true"
        );
        
        const response = {};
        result.rows.forEach(row => {
            response[row.section_key] = row.content;
        });
        
        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/public/pages/:slug
export const getPublicPage = async (req, res) => {
    const { slug } = req.params;
    try {
        // We need to fetch page_type and target_menu as well now, assuming DB has them
        // Fallback to 'static' if not present in result (handled in frontend)
        // Note: If columns missing in DB, this query might fail unless we select *
        const result = await pool.query(
            "SELECT * FROM public_pages WHERE slug = $1 AND is_published = true",
            [slug]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: "Page not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- SUPER ADMIN CMS ENDPOINTS ---

// GET /api/sa/cms/landing
export const getLandingSections = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM landing_page_sections ORDER BY id ASC");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/sa/cms/landing/:sectionKey
export const updateLandingSection = async (req, res) => {
    const { sectionKey } = req.params;
    const { content } = req.body; // JSON Object
    
    try {
        await pool.query(
            `UPDATE landing_page_sections SET content = $1, updated_at = NOW() 
             WHERE section_key = $2`,
            [content, sectionKey]
        );
        res.json({ message: 'Section updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/cms/landing/upload
export const uploadLandingImage = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/cms/${req.file.filename}`;
    res.json({ url: fileUrl });
};

// GET /api/sa/cms/pages
export const getPages = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, title, slug, is_published, page_type, target_menu, updated_at FROM public_pages ORDER BY created_at DESC");
        res.json(result.rows);
    } catch (err) {
        // Fallback if columns don't exist yet
        try {
             const result = await pool.query("SELECT id, title, slug, is_published, updated_at FROM public_pages ORDER BY created_at DESC");
             res.json(result.rows);
        } catch (e) {
             res.status(500).json({ error: err.message });
        }
    }
};

// GET /api/sa/cms/pages/:id
export const getPageById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM public_pages WHERE id = $1", [id]);
        if(result.rows.length === 0) return res.status(404).json({error: 'Not found'});
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/cms/pages
export const createPage = async (req, res) => {
    const { title, slug, content, meta_description, is_published, page_type, target_menu } = req.body;
    try {
        // Using UPSERT logic or checking column existence is hard here without migrations.
        // We assume the table has been altered to include page_type and target_menu.
        const result = await pool.query(
            `INSERT INTO public_pages (title, slug, content, meta_description, is_published, page_type, target_menu) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, slug, content, meta_description, is_published, page_type || 'static', target_menu || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // Fallback for old schema
        if (err.code === '42703') { // Undefined column
             const result = await pool.query(
                `INSERT INTO public_pages (title, slug, content, meta_description, is_published) 
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [title, slug, content, meta_description, is_published]
            );
            return res.status(201).json(result.rows[0]);
        }
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/sa/cms/pages/:id
export const updatePage = async (req, res) => {
    const { id } = req.params;
    const { title, slug, content, meta_description, is_published, page_type, target_menu } = req.body;
    try {
        const result = await pool.query(
            `UPDATE public_pages 
             SET title = $1, slug = $2, content = $3, meta_description = $4, is_published = $5, page_type = $6, target_menu = $7, updated_at = NOW()
             WHERE id = $8 RETURNING *`,
            [title, slug, content, meta_description, is_published, page_type || 'static', target_menu || null, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
         // Fallback for old schema
         if (err.code === '42703') {
             const result = await pool.query(
                `UPDATE public_pages 
                 SET title = $1, slug = $2, content = $3, meta_description = $4, is_published = $5, updated_at = NOW()
                 WHERE id = $6 RETURNING *`,
                [title, slug, content, meta_description, is_published, id]
            );
            return res.json(result.rows[0]);
         }
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/cms/pages/:id
export const deletePage = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM public_pages WHERE id = $1", [id]);
        res.json({ message: 'Page deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};