import pool from '../config/db.js';
import * as waGatewayService from './waGatewayService.js';

const formatTime = (dateObj) => {
    return new Date(dateObj).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const processBookingReminders = async (io) => {
    try {
        // Find H-24 (Tomorrow)
        const res24 = await pool.query(`
            SELECT DISTINCT ON (b.id) b.*, c.phone_number, c.name as contact_name, o.name as org_name, ws.session_id
            FROM bookings b
            JOIN contacts c ON b.contact_id = c.id
            JOIN organizations o ON b.organization_id = o.id
            LEFT JOIN whatsapp_sessions ws ON o.id = ws.organization_id AND ws.device_status = 'active'
            WHERE b.status IN ('pending', 'confirmed')
              AND b.reminder_h24_sent = false
              AND b.start_time BETWEEN NOW() + INTERVAL '23 hours 50 minutes' AND NOW() + INTERVAL '24 hours 10 minutes'
            ORDER BY b.id, ws.updated_at DESC
        `);

        for (const b of res24.rows) {
            if (b.session_id && b.phone_number) {
                const message = `🔔 *Reminder H-1*\n\nHalo ${b.contact_name},\nMengingatkan jadwal reservasi Anda untuk *${b.title}* di *${b.org_name}* besok pada jam *${formatTime(b.start_time)}*.\n\nMohon hadir tepat waktu!`;
                try {
                    await waGatewayService.sendText(b.session_id, b.phone_number, message);
                    await pool.query('UPDATE bookings SET reminder_h24_sent = true WHERE id = $1', [b.id]);
                } catch (e) {
                    console.error('[BookingReminder] H-24 error:', e.message);
                }
            }
        }

        // Find H-1 (1 hour from now)
        const res1 = await pool.query(`
            SELECT DISTINCT ON (b.id) b.*, c.phone_number, c.name as contact_name, o.name as org_name, ws.session_id
            FROM bookings b
            JOIN contacts c ON b.contact_id = c.id
            JOIN organizations o ON b.organization_id = o.id
            LEFT JOIN whatsapp_sessions ws ON o.id = ws.organization_id AND ws.device_status = 'active'
            WHERE b.status IN ('pending', 'confirmed')
              AND b.reminder_h1_sent = false
              AND b.start_time BETWEEN NOW() + INTERVAL '50 minutes' AND NOW() + INTERVAL '70 minutes'
            ORDER BY b.id, ws.updated_at DESC
        `);

        for (const b of res1.rows) {
            if (b.session_id && b.phone_number) {
                const message = `🚨 *Reminder H-1 Jam*\n\nHalo ${b.contact_name},\nReservasi Anda untuk *${b.title}* di *${b.org_name}* akan segera dimulai pada jam *${formatTime(b.start_time)}*.\n\nSampai jumpa!`;
                try {
                    await waGatewayService.sendText(b.session_id, b.phone_number, message);
                    await pool.query('UPDATE bookings SET reminder_h1_sent = true WHERE id = $1', [b.id]);
                } catch (e) {
                    console.error('[BookingReminder] H-1 error:', e.message);
                }
            }
        }

    } catch (err) {
        console.error('[BookingReminder] process error:', err.message);
    }
};
