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

// Self-healing schema for CSAT surveys table
export const ensureCsatTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS csat_surveys (
                id SERIAL PRIMARY KEY,
                organization_id INT REFERENCES organizations(id) ON DELETE CASCADE,
                conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
                contact_id INT REFERENCES contacts(id) ON DELETE CASCADE,
                agent_id INT REFERENCES users(id) ON DELETE SET NULL,
                rating INT,
                feedback TEXT,
                public_token VARCHAR(255) UNIQUE,
                status VARCHAR(50) DEFAULT 'pending',
                responded_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_csat_surveys_org ON csat_surveys (organization_id);
            CREATE INDEX IF NOT EXISTS idx_csat_surveys_token ON csat_surveys (public_token);
        `);
    } catch (e) {
        console.error('[CSAT] ensureCsatTable error:', e.message);
    }
};
ensureCsatTable().catch(() => {});

// Get CSAT analytics stats for dashboard
export const getCsatStats = async (req, res) => {
    const { organization_id } = req.user;
    const days = parseInt(req.query.days) || 30;

    try {
        await ensureCsatTable();

        const dateCondition = days > 0 ? `AND created_at >= NOW() - ($2 || ' days')::INTERVAL` : '';
        const queryParams = days > 0 ? [organization_id, days] : [organization_id];

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
             WHERE organization_id = $1 ${dateCondition}`,
            queryParams
        );

        const leaderboardDateCondition = days > 0 ? `AND s.created_at >= NOW() - ($2 || ' days')::INTERVAL` : '';
        const agentLeaderboard = await pool.query(
            `SELECT u.id, u.name, 
                    COUNT(s.id) as total_reviews,
                    ROUND(AVG(s.rating), 2) as avg_rating,
                    ROUND((COUNT(*) FILTER (WHERE s.rating >= 4)::decimal / NULLIF(COUNT(s.id), 0)) * 100, 1) as satisfied_rate
             FROM csat_surveys s
             JOIN users u ON s.agent_id = u.id
             WHERE s.organization_id = $1 AND s.status = 'completed' ${leaderboardDateCondition}
             GROUP BY u.id, u.name
             ORDER BY avg_rating DESC LIMIT 10`,
            queryParams
        );

        const raw = statsRes.rows[0] || {};
        const totalSurveys = parseInt(raw.total_surveys) || 0;
        const totalResponses = parseInt(raw.total_responses) || 0;
        const avgRating = parseFloat(raw.average_rating) || 0;
        const responseRate = totalSurveys > 0 ? parseFloat(((totalResponses / totalSurveys) * 100).toFixed(1)) : 0;
        const stars5 = parseInt(raw.stars_5) || 0;
        const stars4 = parseInt(raw.stars_4) || 0;
        const stars3 = parseInt(raw.stars_3) || 0;
        const stars2 = parseInt(raw.stars_2) || 0;
        const stars1 = parseInt(raw.stars_1) || 0;

        const promoters = stars5 + stars4;
        const detractors = stars1 + stars2;
        const nps = totalResponses > 0 ? Math.round(((promoters - detractors) / totalResponses) * 100) : 0;

        const ratingDistribution = [
            { rating: 5, count: stars5 },
            { rating: 4, count: stars4 },
            { rating: 3, count: stars3 },
            { rating: 2, count: stars2 },
            { rating: 1, count: stars1 }
        ];

        res.json({
            // Direct camelCase properties expected by CSATReportPage
            avgRating,
            totalResponses,
            totalSurveys,
            responseRate,
            nps,
            ratingDistribution,
            // Legacy / nested object support
            summary: {
                ...raw,
                average_rating: avgRating,
                total_responses: totalResponses,
                total_surveys: totalSurveys,
                csat_percentage: raw.csat_percentage ? parseFloat(raw.csat_percentage) : 0,
                response_rate: responseRate,
                nps
            },
            leaderboard: agentLeaderboard.rows || []
        });
    } catch (err) {
        console.error('[CSAT] getCsatStats error:', err.message);
        res.json({
            avgRating: 0,
            totalResponses: 0,
            totalSurveys: 0,
            responseRate: 0,
            nps: 0,
            ratingDistribution: [5, 4, 3, 2, 1].map(r => ({ rating: r, count: 0 })),
            summary: {
                total_surveys: 0,
                total_responses: 0,
                average_rating: 0,
                csat_percentage: 0,
                response_rate: 0,
                nps: 0
            },
            leaderboard: []
        });
    }
};

// Get CSAT settings for organization
export const getSettings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const orgRes = await pool.query(
            'SELECT csat_enabled, csat_message_template FROM organizations WHERE id = $1',
            [organization_id]
        );
        res.json(orgRes.rows[0] || { csat_enabled: true, csat_message_template: null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update CSAT settings
export const updateSettings = async (req, res) => {
    const { organization_id } = req.user;
    const { csat_enabled, csat_message_template } = req.body;
    try {
        const updated = await pool.query(
            `UPDATE organizations 
             SET csat_enabled = COALESCE($1, csat_enabled),
                 csat_message_template = COALESCE($2, csat_message_template),
                 updated_at = NOW()
             WHERE id = $3
             RETURNING csat_enabled, csat_message_template`,
            [csat_enabled, csat_message_template, organization_id]
        );
        res.json({ success: true, settings: updated.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get CSAT survey list
export const getSurveys = async (req, res) => {
    const { organization_id } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const days = parseInt(req.query.days) || 0;

    try {
        await ensureCsatTable();

        const dateFilter = days > 0 ? `AND s.created_at >= NOW() - ($4 || ' days')::INTERVAL` : '';
        const params = days > 0 
            ? [organization_id, limit, offset, days] 
            : [organization_id, limit, offset];

        const surveysRes = await pool.query(
            `SELECT s.*, c.name as contact_name, c.phone_number, u.name as agent_name
             FROM csat_surveys s
             LEFT JOIN contacts c ON s.contact_id = c.id
             LEFT JOIN users u ON s.agent_id = u.id
             WHERE s.organization_id = $1 ${dateFilter}
             ORDER BY s.created_at DESC
             LIMIT $2 OFFSET $3`,
            params
        );

        const countDateFilter = days > 0 ? `AND created_at >= NOW() - ($2 || ' days')::INTERVAL` : '';
        const countParams = days > 0 ? [organization_id, days] : [organization_id];

        const countRes = await pool.query(
            `SELECT COUNT(*) as total FROM csat_surveys WHERE organization_id = $1 ${countDateFilter}`,
            countParams
        );

        const total = parseInt(countRes.rows[0]?.total || 0);

        res.json({
            surveys: surveysRes.rows,
            data: surveysRes.rows,
            total,
            page,
            limit
        });
    } catch (err) {
        console.error('[CSAT] getSurveys error:', err.message);
        res.json({
            surveys: [],
            data: [],
            total: 0,
            page,
            limit
        });
    }
};

// Endpoint to manually trigger survey
export const triggerSurvey = async (req, res) => {
    const { organization_id } = req.user;
    const { conversationId } = req.params;
    try {
        const survey = await triggerCsatSurvey(conversationId, organization_id);
        if (!survey) {
            return res.status(400).json({ error: "Gagal memicu survei CSAT atau percakapan tidak ditemukan." });
        }
        res.json({ success: true, survey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getStats = getCsatStats;

// Get public CSAT survey form data
export const getSurveyForm = async (req, res) => {
    const { token } = req.params;
    try {
        const surveyRes = await pool.query(
            `SELECT s.*, o.name as organization_name, o.logo_url
             FROM csat_surveys s
             JOIN organizations o ON s.organization_id = o.id
             WHERE s.public_token = $1`,
            [token]
        );
        if (surveyRes.rows.length === 0) {
            return res.status(404).json({ error: "Survei tidak ditemukan atau sudah kedaluwarsa." });
        }
        res.json(surveyRes.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const submitSurvey = submitRating;

export default {
    triggerCsatSurvey,
    submitRating,
    submitSurvey,
    getSurveyForm,
    getCsatStats,
    getStats,
    getSettings,
    updateSettings,
    getSurveys,
    triggerSurvey
};
