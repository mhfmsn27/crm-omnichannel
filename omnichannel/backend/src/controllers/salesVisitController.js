/**
 * Field Sales Mobile GPS Visit Controller
 * Benchmark Barantum / Enterprise Field Force CRM
 */
import pool from '../config/db.js';

// Record a new GPS sales visit
export const recordSalesVisit = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const {
        contact_id,
        customer_name,
        latitude,
        longitude,
        location_name,
        address,
        notes,
        photo_url
    } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: "Koordinat GPS (latitude & longitude) wajib disediakan." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO sales_visits 
             (organization_id, user_id, contact_id, customer_name, latitude, longitude, location_name, address, notes, photo_url, checkin_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             RETURNING *`,
            [
                organization_id, userId, contact_id || null, 
                customer_name || 'Klien Lapangan', latitude, longitude, 
                location_name || null, address || null, notes || null, photo_url || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Check-in kunjungan sales lapangan berhasil dicatat!",
            data: result.rows[0]
        });

    } catch (err) {
        console.error('[SalesVisit Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Get list of sales visits
export const getSalesVisits = async (req, res) => {
    const { organization_id, role, id: userId } = req.user;
    const { date, user_id, contact_id, limit = 50 } = req.query;

    try {
        let query = `
            SELECT v.*, u.name as sales_name, u.email as sales_email, c.name as contact_real_name, c.phone_number as contact_phone
            FROM sales_visits v
            JOIN users u ON v.user_id = u.id
            LEFT JOIN contacts c ON v.contact_id = c.id
            WHERE v.organization_id = $1
        `;
        const params = [organization_id];
        let idx = 2;

        // Non-admin can only see their own visits unless privileged
        if (role === 'agent') {
            query += ` AND v.user_id = $${idx}`;
            params.push(userId);
            idx++;
        } else if (user_id) {
            query += ` AND v.user_id = $${idx}`;
            params.push(user_id);
            idx++;
        }

        if (contact_id) {
            query += ` AND v.contact_id = $${idx}`;
            params.push(contact_id);
            idx++;
        }

        if (date) {
            query += ` AND DATE(v.checkin_time) = $${idx}`;
            params.push(date);
            idx++;
        }

        query += ` ORDER BY v.checkin_time DESC LIMIT $${idx}`;
        params.push(parseInt(limit) || 50);

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
