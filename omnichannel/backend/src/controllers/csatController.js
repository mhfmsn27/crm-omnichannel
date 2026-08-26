import pool from '../config/db.js';
import crypto from 'crypto';

// --- CSAT Settings ---

export const getSettings = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const result = await pool.query(
            `SELECT csat_enabled, csat_trigger, csat_questions FROM organizations WHERE id = $1`,
            [organization_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            csatEnabled: result.rows[0].csat_enabled || false,
            csatTrigger: result.rows[0].csat_trigger || 'conversation_closed',
            csatQuestions: result.rows[0].csat_questions || []
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const updateSettings = async (req, res) => {
    const { organization_id } = req.user;
    const { csatEnabled, csatTrigger, csatQuestions } = req.body;

    try {
        await pool.query(
            `UPDATE organizations SET
             csat_enabled = COALESCE($2, csat_enabled),
             csat_trigger = COALESCE($3, csat_trigger),
             csat_questions = COALESCE($4, csat_questions)
             WHERE id = $1`,
            [organization_id, csatEnabled, csatTrigger, csatQuestions ? JSON.stringify(csatQuestions) : null]
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- CSAT Surveys ---

export const getSurveys = async (req, res) => {
    const { organization_id } = req.user;
    const { page = 1, limit = 20, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT cs.*, c.contact_name, c.phone_number, conv.channel
            FROM csat_surveys cs
            LEFT JOIN contacts c ON cs.contact_id = c.id
            LEFT JOIN conversations conv ON cs.conversation_id = conv.id
            WHERE cs.organization_id = $1
        `;
        const params = [organization_id];
        let idx = 2;

        if (start_date) {
            query += ` AND cs.created_at >= $${idx++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND cs.created_at <= $${idx++}`;
            params.push(end_date);
        }

        query += ` ORDER BY cs.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);

        // Get total count
        const countRes = await pool.query(
            `SELECT COUNT(*) FROM csat_surveys WHERE organization_id = $1`,
            [organization_id]
        );

        const totalCount = parseInt(countRes.rows[0].count) || 0;

        res.json({
            data: result.rows,
            meta: {
                total: totalCount,
                page: parseInt(page),
                last_page: Math.ceil(totalCount / limit)
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    const { days = 30 } = req.query;
    const daysNum = parseInt(days) || 30;

    try {
        // Average rating
        const avgRes = await pool.query(
            `SELECT AVG(rating)::DECIMAL(3,2) as avg_rating, COUNT(*) as total_responses
             FROM csat_surveys
             WHERE organization_id = $1 AND rating IS NOT NULL
             AND created_at >= NOW() - INTERVAL '${daysNum} days'`,
            [organization_id]
        );

        // Rating distribution
        const distRes = await pool.query(
            `SELECT rating, COUNT(*) as count
             FROM csat_surveys
             WHERE organization_id = $1 AND rating IS NOT NULL
             AND created_at >= NOW() - INTERVAL '${daysNum} days'
             GROUP BY rating
             ORDER BY rating`,
            [organization_id]
        );

        // Response rate
        const totalConvRes = await pool.query(
            `SELECT COUNT(*) as total FROM conversations
             WHERE organization_id = $1 AND status = 'resolved'
             AND updated_at >= NOW() - INTERVAL '${daysNum} days'`,
            [organization_id]
        );

        const totalSurvRes = await pool.query(
            `SELECT COUNT(*) as total FROM csat_surveys
             WHERE organization_id = $1
             AND created_at >= NOW() - INTERVAL '${daysNum} days'`,
            [organization_id]
        );

        const totalConv = parseInt(totalConvRes.rows[0].total) || 0;
        const totalSurv = parseInt(totalSurvRes.rows[0].total) || 0;
        const responseRate = totalConv > 0 ? (totalSurv / totalConv) * 100 : 0;

        // NPS calculation
        const promoters = await pool.query(
            `SELECT COUNT(*) FROM csat_surveys WHERE organization_id = $1 AND rating >= 9 AND created_at >= NOW() - INTERVAL '${daysNum} days'`,
            [organization_id]
        );
        const detractors = await pool.query(
            `SELECT COUNT(*) FROM csat_surveys WHERE organization_id = $1 AND rating <= 6 AND created_at >= NOW() - INTERVAL '${daysNum} days'`,
            [organization_id]
        );

        const p = parseInt(promoters.rows[0].count) || 0;
        const d = parseInt(detractors.rows[0].count) || 0;
        const n = totalSurv > 0 ? ((p - d) / totalSurv) * 100 : 0;

        res.json({
            avgRating: parseFloat(avgRes.rows[0].avg_rating) || 0,
            totalResponses: parseInt(avgRes.rows[0].total_responses) || 0,
            responseRate: Math.round(responseRate * 10) / 10,
            nps: Math.round(n * 10) / 10,
            ratingDistribution: distRes.rows,
            period: `${daysNum} days`
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- Trigger Survey ---

export const triggerSurvey = async (req, res) => {
    const { organization_id } = req.user;
    const { conversationId } = req.params;

    try {
        // Check if CSAT is enabled
        const orgRes = await pool.query(
            `SELECT csat_enabled FROM organizations WHERE id = $1`,
            [organization_id]
        );

        if (!orgRes.rows[0]?.csat_enabled) {
            return res.status(400).json({ error: 'CSAT survey is not enabled' });
        }

        // Get conversation info
        const convRes = await pool.query(
            `SELECT c.*, co.contact_name, co.phone_number
             FROM conversations c
             JOIN contacts co ON c.contact_id = co.id
             WHERE c.id = $1 AND c.organization_id = $2`,
            [conversationId, organization_id]
        );

        if (convRes.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const conv = convRes.rows[0];

        // Generate unique token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create survey link
        await pool.query(
            `INSERT INTO csat_survey_links (organization_id, conversation_id, token, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [organization_id, conversationId, token, expiresAt]
        );

        // Emit socket event for frontend to send the survey link
        if (req.io) {
            req.io.to(`org_${organization_id}`).emit('csat_survey_ready', {
                conversationId,
                surveyLink: `/rating/${token}`,
                contactName: conv.contact_name
            });
        }

        res.json({
            success: true,
            surveyLink: `/rating/${token}`,
            token
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// --- Public Survey Submission ---

export const getSurveyForm = async (req, res) => {
    const { token } = req.params;

    try {
        const linkRes = await pool.query(
            `SELECT csl.*, o.csat_questions, o.csat_enabled
             FROM csat_survey_links csl
             JOIN organizations o ON csl.organization_id = o.id
             WHERE csl.token = $1`,
            [token]
        );

        if (linkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        const survey = linkRes.rows[0];

        if (survey.used) {
            return res.status(400).json({ error: 'Survey already completed' });
        }

        if (new Date(survey.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Survey has expired' });
        }

        res.json({
            token,
            questions: survey.csat_questions || [],
            organizationId: survey.organization_id
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export const submitSurvey = async (req, res) => {
    const { token } = req.params;
    const { rating, feedback } = req.body;

    try {
        // Get survey link
        const linkRes = await pool.query(
            `SELECT * FROM csat_survey_links WHERE token = $1`,
            [token]
        );

        if (linkRes.rows.length === 0) {
            return res.status(404).json({ error: 'Survey not found' });
        }

        const survey = linkRes.rows[0];

        if (survey.used) {
            return res.status(400).json({ error: 'Survey already completed' });
        }

        // Create survey response
        await pool.query(
            `INSERT INTO csat_surveys (organization_id, conversation_id, contact_id, rating, feedback, responded_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [survey.organization_id, survey.conversation_id, survey.contact_id, rating, feedback]
        );

        // Mark link as used
        await pool.query(
            `UPDATE csat_survey_links SET used = true WHERE id = $1`,
            [survey.id]
        );

        res.json({ success: true, message: 'Thank you for your feedback!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
