import pool from '../config/db.js';

// Get all bookings for an organization
export const getBookings = async (req, res) => {
    try {
        const organization_id = req.user.organization_id;
        
        const result = await pool.query(`
            SELECT b.*, c.name as contact_name, c.phone_number as contact_phone
            FROM bookings b
            LEFT JOIN contacts c ON b.contact_id = c.id
            WHERE b.organization_id = $1
            ORDER BY b.start_time DESC
        `, [organization_id]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('[getBookings] Error:', err);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};

// Create a new booking
export const createBooking = async (req, res) => {
    try {
        const organization_id = req.user.organization_id;
        const { contact_id, title, start_time, end_time, status, notes } = req.body;

        if (!contact_id || !start_time || !end_time) {
            return res.status(400).json({ error: 'Contact, Start Time, and End Time are required' });
        }

        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        // Security Check: Verify contact belongs to this organization
        const contactCheck = await pool.query('SELECT id FROM contacts WHERE id = $1 AND organization_id = $2', [contact_id, organization_id]);
        if (contactCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Invalid contact. You do not have permission to use this contact.' });
        }

        const result = await pool.query(`
            INSERT INTO bookings (organization_id, contact_id, title, start_time, end_time, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [organization_id, contact_id, title, start_time, end_time, status || 'pending', notes]);

        // Fetch contact details for the response
        const contactResult = await pool.query('SELECT name as contact_name, phone_number as contact_phone FROM contacts WHERE id = $1', [contact_id]);
        const booking = { ...result.rows[0], ...contactResult.rows[0] };

        res.status(201).json(booking);
    } catch (err) {
        console.error('[createBooking] Error:', err);
        res.status(500).json({ error: 'Failed to create booking' });
    }
};

// Update a booking
export const updateBooking = async (req, res) => {
    try {
        const organization_id = req.user.organization_id;
        const bookingId = req.params.id;
        const { contact_id, title, start_time, end_time, status, notes } = req.body;

        if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        if (contact_id) {
            const contactCheck = await pool.query('SELECT id FROM contacts WHERE id = $1 AND organization_id = $2', [contact_id, organization_id]);
            if (contactCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Invalid contact. You do not have permission to use this contact.' });
            }
        }

        const result = await pool.query(`
            UPDATE bookings
            SET contact_id = COALESCE($1, contact_id),
                title = COALESCE($2, title),
                start_time = COALESCE($3, start_time),
                end_time = COALESCE($4, end_time),
                status = COALESCE($5, status),
                notes = COALESCE($6, notes),
                reminder_h24_sent = CASE WHEN $3::timestamptz IS NOT NULL AND $3::timestamptz != start_time THEN false ELSE reminder_h24_sent END,
                reminder_h1_sent = CASE WHEN $3::timestamptz IS NOT NULL AND $3::timestamptz != start_time THEN false ELSE reminder_h1_sent END,
                updated_at = NOW()
            WHERE id = $7 AND organization_id = $8
            RETURNING *
        `, [contact_id, title, start_time, end_time, status, notes, bookingId, organization_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const contactResult = await pool.query('SELECT name as contact_name, phone_number as contact_phone FROM contacts WHERE id = $1', [result.rows[0].contact_id]);
        const booking = { ...result.rows[0], ...contactResult.rows[0] };

        res.json(booking);
    } catch (err) {
        console.error('[updateBooking] Error:', err);
        res.status(500).json({ error: 'Failed to update booking' });
    }
};

// Delete a booking
export const deleteBooking = async (req, res) => {
    try {
        const organization_id = req.user.organization_id;
        const bookingId = req.params.id;

        const result = await pool.query(`
            DELETE FROM bookings
            WHERE id = $1 AND organization_id = $2
            RETURNING *
        `, [bookingId, organization_id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ success: true, message: 'Booking deleted successfully' });
    } catch (err) {
        console.error('[deleteBooking] Error:', err);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
};
