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

const DEFAULT_TUTORIALS = {
    'tutorial-chatbot': {
        title: 'Panduan Lengkap & Tutorial Modul Chatbot AI',
        meta_description: 'Pelajari cara mudah mengatur asisten AI, menghubungkan API Key, mengunggah Knowledge Base, dan mendesain Visual Flow interaktif.',
        page_type: 'tutorial',
        target_menu: 'chatbot',
        content: JSON.stringify({
            video_urls: [],
            items: [
                {
                    title: '1. Pengenalan AI Chatbot & Customer Service Assistant',
                    body: 'Fitur Chatbot AI di CRMHub memungkinkan Anda menjawab pesan pelanggan secara otomatis 24/7 di semua channel (WhatsApp, Instagram, Telegram, Messenger, Webchat).\n\nChatbot mendukung model AI mutakhir termasuk Google Gemini, OpenAI (GPT-4o), dan OpenRouter.'
                },
                {
                    title: '2. Menghubungkan API Key AI (Gemini / OpenAI / OpenRouter)',
                    body: '1. Buka menu Chatbot → API Setting.\n2. Pilih AI Provider yang Anda gunakan (Google Gemini, OpenAI, atau OpenRouter).\n3. Tempelkan API Key Anda dan klik Simpan Pengaturan.\n4. Sistem akan otomatis memverifikasi kunci API Anda.'
                },
                {
                    title: '3. Menyiapkan Basis Pengetahuan (Knowledge Base)',
                    body: '1. Buka menu Chatbot → Knowledge Base.\n2. Tambahkan FAQ Tanya-Jawab produk, harga, dan ketentuan layanan Anda.\n3. Anda juga dapat mengunggah file PDF / Brosur untuk dianalisis oleh AI.\n4. AI akan menjawab pertanyaan pelanggan secara akurat berdasarkan dokumen tersebut.'
                },
                {
                    title: '4. Mengatur Alur Percakapan Interaktif (Visual Flow Builder)',
                    body: '1. Buka menu Chatbot → Visual Flow.\n2. Buat alur percakapan interaktif berbasis kata kunci pemicu (trigger keyword).\n3. Rancang tombol pilihan, menu interaktif, hingga eskalasi ke staf manusia (Live Agent Transfer).'
                },
                {
                    title: '5. Mengaktifkan Chatbot pada Saluran Komunikasi',
                    body: '1. Buka menu Integrasi / Device.\n2. Aktifkan saklar AI Assistant pada perangkat WhatsApp, Halaman Facebook, Akun Instagram, atau Bot Telegram Anda.\n3. Chatbot kini aktif melayani pelanggan secara otomatis!'
                }
            ]
        })
    },
    'tutorial-broadcast': {
        title: 'Panduan Lengkap & Tutorial Modul Broadcast',
        meta_description: 'Pelajari cara mengirimkan pesan massal ke ribuan kontak pelanggan secara terjadwal dan aman dengan fitur anti-banned cerdas.',
        page_type: 'tutorial',
        target_menu: 'broadcast',
        content: JSON.stringify({
            video_urls: [],
            items: [
                {
                    title: '1. Pengenalan Modul Broadcast & Kampanye Massal',
                    body: 'Modul Broadcast memungkinkan pengiriman pesan massal ke ribuan kontak pelanggan secara terjadwal dan aman dengan fitur anti-banned cerdas, rotasi nomor, dan jeda pengiriman.'
                },
                {
                    title: '2. Mempersiapkan Daftar Kontak & Label Target',
                    body: '1. Pastikan kontak target sudah memiliki tag / label yang sesuai di menu Contacts.\n2. Anda juga dapat mengimpor file Excel / CSV kontak baru dengan mudah di menu Contacts.'
                },
                {
                    title: '3. Membuat & Menjadwalkan Kampanye Broadcast',
                    body: '1. Buka menu Broadcast → Create Campaign.\n2. Tulis pesan dengan personalisasi nama dinamis {name}.\n3. Pilih perangkat pengirim, jadwal pengiriman, dan jeda delay aman.\n4. Klik Mulai Kampanye untuk mengirim pesan.'
                }
            ]
        })
    }
};

// GET /api/public/pages/:slug
export const getPublicPage = async (req, res) => {
    const { slug } = req.params;
    try {
        let result = await pool.query(
            "SELECT * FROM public_pages WHERE slug = $1 AND is_published = true",
            [slug]
        );
        
        if (result.rows.length === 0) {
            // Check if it is a known default tutorial page
            if (DEFAULT_TUTORIALS[slug]) {
                const def = DEFAULT_TUTORIALS[slug];
                try {
                    const inserted = await pool.query(
                        `INSERT INTO public_pages (slug, title, content, meta_description, is_published, page_type, target_menu)
                         VALUES ($1, $2, $3, $4, true, $5, $6)
                         ON CONFLICT (slug) DO UPDATE SET
                            title = EXCLUDED.title,
                            content = EXCLUDED.content,
                            meta_description = EXCLUDED.meta_description,
                            is_published = true,
                            updated_at = NOW()
                         RETURNING *`,
                        [slug, def.title, def.content, def.meta_description, def.page_type, def.target_menu]
                    );
                    return res.json(inserted.rows[0]);
                } catch (insertErr) {
                    return res.json({
                        slug,
                        title: def.title,
                        content: def.content,
                        meta_description: def.meta_description,
                        is_published: true,
                        page_type: def.page_type,
                        target_menu: def.target_menu
                    });
                }
            }
            return res.status(404).json({ error: "Page not found" });
        }
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