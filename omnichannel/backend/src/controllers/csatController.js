/**
 * CSAT (Customer Satisfaction Survey) Controller
 * Benchmark Mekari Qontak / SleekFlow
 */
import pool from '../config/db.js';
import crypto from 'crypto';
import * as waService from '../services/waGatewayService.js';

const generateToken = () => crypto.randomBytes(16).toString('hex');

// Trigger CSAT Survey after a conversation is resolved
export const triggerCsatSurvey = async (conversationId, organizationId, customMessage = null) => {
    try {
        const convRes = await pool.query(
            `SELECT c.*, ct.phone_number, ct.name as contact_name, ws.session_id as wa_uuid, o.csat_enabled, o.csat_message_template
             FROM conversations c
             JOIN contacts ct ON c.contact_id = ct.id
             JOIN organizations o ON o.id = c.organization_id
             LEFT JOIN whatsapp_sessions ws ON ws.organization_id = c.organization_id AND ws.status = 'connected'
             WHERE c.id = $1 AND c.organization_id = $2`,
            [conversationId, organizationId]
        );

        if (convRes.rows.length === 0) return null;
        const conv = convRes.rows[0];

        // Check if organization has CSAT enabled
        if (conv.csat_enabled === false) return null;

        const token = generateToken();

        // 1. Create CSAT survey record
        const surveyRes = await pool.query(
            `INSERT INTO csat_surveys (organization_id, conversation_id, contact_id, agent_id, public_token, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING *`,
            [organizationId, conversationId, conv.contact_id, conv.assigned_to_agent_id, token]
        );

        await pool.query(
            `UPDATE conversations SET csat_status = 'sent', csat_token = $1, updated_at = NOW() WHERE id = $2`,
            [token, conversationId]
        );

        // 2. Dispatch via WhatsApp if available
        if (conv.phone_number && conv.wa_uuid) {
            const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
            const ratingUrl = `${appUrl}/rating/${token}`;

            const defaultTemplate = `Halo kak *${conv.contact_name || 'Pelanggan'}*, percakapan Anda telah diselesaikan oleh tim CS kami. 🙏\n\nBantu kami meningkatkan kualitas layanan dengan memberikan penilaian (1-5 bintang) melalui link berikut:\n⭐ ${ratingUrl}\n\nAtau balas pesan ini dengan angka *1* (Sangat Buruk) sampai *5* (Sangat Puas). Terima kasih!`;

            const messageText = customMessage || conv.csat_message_template || defaultTemplate;

            let phone = String(conv.phone_number).replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) phone = '62' + phone.slice(1);

            await waService.sendText(conv.wa_uuid, phone, messageText).catch(e => {
                console.warn("[CSAT WA Send Error]:", e.message);
            });
        }

        return surveyRes.rows[0];

    } catch (err) {
        console.error('[CSAT Trigger Error]:', err.message);
        return null;
    }
};

// Public/authenticated endpoint to submit CSAT rating
export const submitRating = async (req, res) => {
    const { token } = req.params;
    const { rating, feedback } = req.body;

    const ratingVal = parseInt(rating);
    if (!ratingVal || ratingVal < 1 || ratingVal > 5) {
        return res.status(400).json({ error: "Rating harus berupa angka 1 sampai 5 bintang." });
    }

    try {
        const surveyRes = await pool.query(
            `SELECT * FROM csat_surveys WHERE public_token = $1 AND status != 'completed'`,
            [token]
        );

        if (surveyRes.rows.length === 0) {
            return res.status(404).json({ error: "Survei tidak ditemukan atau sudah pernah diisi." });
        }

        const survey = surveyRes.rows[0];

        const updated = await pool.query(
            `UPDATE csat_surveys 
             SET rating = $1, feedback = $2, status = 'completed', responded_at = NOW() 
             WHERE id = $3
             RETURNING *`,
            [ratingVal, feedback || null, survey.id]
        );

        // Update conversation rating
        await pool.query(
            `UPDATE conversations SET csat_rating = $1, csat_status = 'received', updated_at = NOW() WHERE id = $2`,
            [ratingVal, survey.conversation_id]
        );

        res.json({
            success: true,
            message: "Terima kasih atas penilaian dan masukan yang Anda berikan! 🙏",
            survey: updated.rows[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get CSAT analytics stats for dashboard
export const getCsatStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const statsRes = await pool.query(
            `SELECT 
                COUNT(*) as total_surveys,
                COUNT(*) FILTER (WHERE status = 'completed') as total_responses,
                ROUND(AVG(rating) FILTER (WHERE status = 'completed'), 2) as average_rating,
                ROUND((COUNT(*) FILTER (WHERE rating >= 4)::decimal / NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0)) * 100, 1) as csat_percentage,
                COUNT(*) FILTER (WHERE rating = 5) as stars_5,
                COUNT(*) FILTER (WHERE rating = 4) as stars_4,
                COUNT(*) FILTER (WHERE rating = 3) as stars_3,
                COUNT(*) FILTER (WHERE rating = 2) as stars_2,
                COUNT(*) FILTER (WHERE rating = 1) as stars_1
             FROM csat_surveys
             WHERE organization_id = $1`,
            [organization_id]
        );

        const agentLeaderboard = await pool.query(
            `SELECT u.id, u.name, 
                    COUNT(s.id) as total_reviews,
                    ROUND(AVG(s.rating), 2) as avg_rating,
                    ROUND((COUNT(*) FILTER (WHERE s.rating >= 4)::decimal / NULLIF(COUNT(s.id), 0)) * 100, 1) as satisfied_rate
             FROM csat_surveys s
             JOIN users u ON s.agent_id = u.id
             WHERE s.organization_id = $1 AND s.status = 'completed'
             GROUP BY u.id, u.name
             ORDER BY avg_rating DESC LIMIT 10`,
            [organization_id]
        );

        res.json({
            summary: statsRes.rows[0],
            leaderboard: agentLeaderboard.rows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
