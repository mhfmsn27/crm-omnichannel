import pool from '../config/db.js';

// ── URGENCY ─────────────────────────────────────────────────────────────────
const URGENCY_KEYWORDS_ID = ['urgent', 'darurat', 'tolong', 'bantuan', 'segera', 'cepat',
    'tidak bisa', 'gabisa', 'error', 'rusak', 'gagal', 'mati', 'hilang', 'masalah', 'bahaya'];
const URGENCY_KEYWORDS_EN = ['urgent', 'asap', 'help', 'emergency', 'problem', 'broken',
    'not working', 'issue', 'critical', 'immediately', 'stuck'];

// ── SENTIMENT ────────────────────────────────────────────────────────────────
const POSITIVE_WORDS = ['terima kasih', 'makasih', 'bagus', 'mantap', 'ok', 'baik', 'sip',
    'oke', 'keren', 'hebat', 'thanks', 'great', 'good', 'perfect', 'excellent', 'happy', 'love'];
const NEGATIVE_WORDS = ['kecewa', 'buruk', 'jelek', 'lambat', 'tidak puas', 'payah',
    'mengecewakan', 'disappointed', 'bad', 'poor', 'terrible', 'awful', 'slow', 'worst'];
const ANGRY_WORDS = ['marah', 'kesal', 'gak becus', 'brengsek', 'bodoh', 'parah',
    'sangat kecewa', 'sangat buruk', 'idiot', 'stupid', 'useless', 'scam'];

/**
 * Analyze a single incoming message for urgency and sentiment.
 * Layer 1 (rule-based): Always runs, no API key needed.
 * Layer 2 (AI-enhanced): Runs if org has Gemini/OpenAI key configured.
 * Returns: { urgency: { isUrgent, score, reason }, sentiment: { label, score } }
 */
export const analyzeMessage = async (content, organizationId) => {
    const text = (content || '').toLowerCase();

    // ── Rule-based urgency
    let urgencyScore = 0;
    const matchedKeywords = [];
    [...URGENCY_KEYWORDS_ID, ...URGENCY_KEYWORDS_EN].forEach(kw => {
        if (text.includes(kw)) { urgencyScore += 20; matchedKeywords.push(kw); }
    });
    urgencyScore = Math.min(urgencyScore, 100);
    const isUrgent = urgencyScore >= 60;

    // ── Rule-based sentiment
    let sentimentLabel = 'neutral';
    let sentimentScore = 0.5;

    const angryCount = ANGRY_WORDS.filter(w => text.includes(w)).length;
    const negCount = NEGATIVE_WORDS.filter(w => text.includes(w)).length;
    const posCount = POSITIVE_WORDS.filter(w => text.includes(w)).length;

    if (angryCount > 0) { sentimentLabel = 'angry'; sentimentScore = 0.1; }
    else if (negCount > posCount) { sentimentLabel = 'negative'; sentimentScore = 0.25; }
    else if (posCount > negCount) { sentimentLabel = 'positive'; sentimentScore = 0.85; }

    // ── AI-enhanced (if API key available — future enhancement)
    // When org has gemini_api_key or openai_api_key, we can call Gemini for deeper analysis.
    // For now, rule-based is the primary layer.

    return {
        urgency: {
            isUrgent,
            score: urgencyScore,
            reason: matchedKeywords.length > 0 ? `Keywords: ${matchedKeywords.slice(0, 3).join(', ')}` : null
        },
        sentiment: {
            label: sentimentLabel,
            score: sentimentScore
        }
    };
};

/**
 * Persist urgency flags and sentiment to DB.
 * Called after saving a message.
 */
export const persistAnalysis = async (conversationId, messageId, analysis, organizationId) => {
    const { urgency, sentiment } = analysis;

    try {
        // Update message sentiment
        if (messageId) {
            await pool.query(
                `UPDATE messages SET sentiment = $1, sentiment_score = $2 WHERE id = $3`,
                [sentiment.label, sentiment.score, messageId]
            );
        }

        // Update conversation urgency + sentiment summary
        const updates = [];
        const params = [];
        let idx = 1;

        if (urgency.isUrgent) {
            updates.push(`is_urgent = true, urgency_score = $${idx++}, urgency_reason = $${idx++}, urgency_flagged_at = NOW()`);
            params.push(urgency.score, urgency.reason);
        }

        updates.push(`last_sentiment = $${idx++}, sentiment_updated_at = NOW()`);
        params.push(sentiment.label);

        params.push(conversationId, organizationId);
        await pool.query(
            `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${idx++} AND organization_id = $${idx}`,
            params
        );
    } catch (err) {
        console.error('[MessageAnalysis] persistAnalysis error:', err.message);
    }
};

/**
 * Lead qualification scoring — rule-based, no API key needed.
 * Called periodically or after N messages in a conversation.
 */
export const qualifyLead = async (contactId, organizationId) => {
    try {
        // Get contact info + recent conversation messages
        const contactRes = await pool.query(
            'SELECT * FROM contacts WHERE id = $1 AND organization_id = $2',
            [contactId, organizationId]
        );
        if (contactRes.rows.length === 0) return;
        const contact = contactRes.rows[0];

        const msgRes = await pool.query(
            `SELECT m.content FROM messages m
             JOIN conversations c ON c.id = m.conversation_id
             WHERE c.contact_id = $1 AND c.organization_id = $2
               AND m.from_me = false
             ORDER BY m.created_at DESC LIMIT 50`,
            [contactId, organizationId]
        );
        const allText = msgRes.rows.map(r => (r.content || '').toLowerCase()).join(' ');

        let score = 0;

        // Signal: message volume
        if (msgRes.rows.length >= 10) score += 20;
        else if (msgRes.rows.length >= 5) score += 10;

        // Signal: buying intent keywords
        const buyKeywords = ['harga', 'berapa', 'price', 'cost', 'beli', 'order', 'pesan',
            'bayar', 'payment', 'buy', 'purchase', 'diskon', 'discount', 'promo'];
        const buyMatches = buyKeywords.filter(k => allText.includes(k)).length;
        score += Math.min(buyMatches * 10, 30);

        // Signal: product interest
        const productKeywords = ['paket', 'produk', 'layanan', 'fitur', 'package', 'service', 'plan', 'feature'];
        if (productKeywords.some(k => allText.includes(k))) score += 20;

        // Signal: contact completeness
        if (contact.email) score += 5;
        if (contact.name && contact.name !== contact.phone_number) score += 5;

        score = Math.min(score, 100);

        let status = 'cold';
        if (score >= 61) status = 'hot';
        else if (score >= 31) status = 'warm';

        await pool.query(
            `UPDATE contacts SET lead_score = $1, lead_status = $2, lead_qualified_at = NOW()
             WHERE id = $3 AND organization_id = $4`,
            [score, status, contactId, organizationId]
        );

        return { score, status };
    } catch (err) {
        console.error('[MessageAnalysis] qualifyLead error:', err.message);
        return null;
    }
};
