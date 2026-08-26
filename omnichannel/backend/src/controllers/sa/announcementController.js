
import pool from '../../config/db.js';

// GET /api/sa/announcements
export const getAnnouncements = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/announcements
export const createAnnouncement = async (req, res) => {
    const { title, content, type, image_url, link_url, placement } = req.body;
    try {
        // Safe check for placement column in insert (assumes column exists after migration)
        // Default placement to 'dashboard' if not provided
        await pool.query(
            'INSERT INTO announcements (title, content, type, image_url, link_url, placement) VALUES ($1, $2, $3, $4, $5, $6)',
            [title, content, type || 'info', image_url, link_url, placement || 'dashboard']
        );
        res.status(201).json({ message: 'Announcement created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/sa/announcements/:id
export const deleteAnnouncement = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/sa/announcements/:id/toggle
export const toggleStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    try {
        await pool.query('UPDATE announcements SET is_active = $1 WHERE id = $2', [is_active, id]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
