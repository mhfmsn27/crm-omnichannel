import pool from '../config/db.js';
import { generateResponse } from './aiService.js';

// Generate multiple reply suggestions using AI
export const generateSuggestions = async (organizationId, conversationId, options = {}) => {
    const { limit = 3, temperature = 0.7 } = options;

    try {
        // Get recent messages for context
        const msgRes = await pool.query(
            `SELECT content, from_me FROM messages
             WHERE conversation_id = $1 AND content IS NOT NULL AND content != ''
             ORDER BY created_at DESC LIMIT 15`,
            [conversationId]
        );

        const messages = msgRes.rows.reverse();
        if (messages.length === 0) return [];

        const lastMsg = messages[messages.length - 1];

        // Only generate suggestions for customer messages
        if (lastMsg.from_me) return [];

        const chatHistory = messages.slice(0, -1);
        const customerMessage = lastMsg.content;

        // Detect customer language and sentiment
        const sentiment = await detectSentiment(customerMessage);
        const language = detectLanguage(customerMessage);

        // Generate multiple suggestions based on conversation context
        const suggestions = [];

        // 1. Polite acknowledgment / greeting response
        const greetingPrompt = `Pelanggan mengirim: "${customerMessage}"

Berdasarkan pesan pelanggan di atas, berikan 1 variasi jawaban singkat (1-2 kalimat) yang sopan dan profesional dalam bahasa ${language === 'id' ? 'Indonesia' : 'English'}.

Contoh gaya yang diharapkan:
- "Terima kasih atas informasinya, saya akan segera proses."
- "Siap, akan saya bantu segera."

Jawaban:`;

        const greetingSuggestion = await generateResponse(
            organizationId,
            greetingPrompt,
            chatHistory.slice(-3),
            {
                name: 'AI Copilot',
                system_prompt: 'Kamu adalah agen customer service profesional. Berikan jawaban singkat (1-2 kalimat), sopan, dan langsung ke inti. Gunakan bahasa yang sama dengan pelanggan. Jawab hanya dengan jawaban itu sendiri, tanpa kutip atau penjelasan tambahan.',
                escalation_keywords: '',
                use_global_kb: false,
                session_id: null,
            },
            '',
            { temperature }
        );

        if (greetingSuggestion && !greetingSuggestion.includes('[ESCALATE]')) {
            suggestions.push({
                type: 'acknowledge',
                text: greetingSuggestion.trim(),
                confidence: 0.85,
                reason: 'Sopan & profesional'
            });
        }

        // 2. Informative response (if customer asks a question)
        if (customerMessage.includes('?') || customerMessage.toLowerCase().includes('apa') ||
            customerMessage.toLowerCase().includes('how') || customerMessage.toLowerCase().includes('bisa')) {

            const infoPrompt = `Pelanggan bertanya: "${customerMessage}"

Buatkan 1 jawaban informatif yang jelas dan lengkap dalam bahasa ${language === 'id' ? 'Indonesia' : 'English'}.
Contoh: "Berikut informasinya: ..."

Jawaban:`;

            const infoSuggestion = await generateResponse(
                organizationId,
                infoPrompt,
                chatHistory.slice(-3),
                {
                    name: 'AI Copilot',
                    system_prompt: 'Kamu adalah agen customer service yang informatif. Berikan jawaban yang jelas, lengkap, dan mudah dipahami (2-3 kalimat). Langsung ke inti jawaban tanpa basa-basi. Gunakan bahasa yang sama dengan pelanggan.',
                    escalation_keywords: '',
                    use_global_kb: false,
                    session_id: null,
                },
                '',
                { temperature }
            );

            if (infoSuggestion && !infoSuggestion.includes('[ESCALATE]')) {
                suggestions.push({
                    type: 'informative',
                    text: infoSuggestion.trim(),
                    confidence: 0.78,
                    reason: 'Jawaban informatif'
                });
            }
        }

        // 3. Action-oriented response (for orders, requests)
        const actionKeywords = ['pesan', 'order', 'buy', 'book', 'reservasi', 'Daftar', 'register', 'join', 'beli', 'checkout'];
        const hasActionIntent = actionKeywords.some(k => customerMessage.toLowerCase().includes(k));

        if (hasActionIntent) {
            const actionPrompt = `Pelanggan ingin: "${customerMessage}"

Buatkan 1 konfirmasi aksi yang jelas dan meyakinkan dalam bahasa ${language === 'id' ? 'Indonesia' : 'English'}.
Contoh: "Baik, saya akan langsung proses [permintaan] Anda. Estimasi..."

Jawaban:`;

            const actionSuggestion = await generateResponse(
                organizationId,
                actionPrompt,
                chatHistory.slice(-3),
                {
                    name: 'AI Copilot',
                    system_prompt: 'Kamu adalah agen customer service yang proaktif. Konfirmasi aksi yang diminta pelanggan dengan jelas dan sampaikan langkah selanjutnya (1-2 kalimat). Gunakan bahasa yang sama dengan pelanggan.',
                    escalation_keywords: '',
                    use_global_kb: false,
                    session_id: null,
                },
                '',
                { temperature }
            );

            if (actionSuggestion && !actionSuggestion.includes('[ESCALATE]')) {
                suggestions.push({
                    type: 'action',
                    text: actionSuggestion.trim(),
                    confidence: 0.82,
                    reason: 'Konfirmasi aksi'
                });
            }
        }

        // 4. Escalation/warm handoff (for complaints, urgent issues)
        if (sentiment === 'negative' || customerMessage.toLowerCase().includes('komplain') ||
            customerMessage.toLowerCase().includes('keluhan') || customerMessage.toLowerCase().includes('urgent')) {

            const escalatePrompt = `Pelanggan terlihat tidak puas: "${customerMessage}"

Buatkan 1 respons empatik yang menunjukkan perhatian dan keinginan menyelesaikan masalah dalam bahasa ${language === 'id' ? 'Indonesia' : 'English'}.
Contoh: "Kami sangat apologize atas ketidaknyamanan ini. Saya akan segera..."

Jawaban:`;

            const escalateSuggestion = await generateResponse(
                organizationId,
                escalatePrompt,
                chatHistory.slice(-3),
                {
                    name: 'AI Copilot',
                    system_prompt: 'Kamu adalah agen customer service yang empatik. Tunjukkan pengertian atas keluhan pelanggan dan pastikan masalah akan diselesaikan. Gunakan bahasa yang sama dengan pelanggan.',
                    escalation_keywords: '',
                    use_global_kb: false,
                    session_id: null,
                },
                '',
                { temperature }
            );

            if (escalateSuggestion && !escalateSuggestion.includes('[ESCALATE]')) {
                suggestions.push({
                    type: 'empathetic',
                    text: escalateSuggestion.trim(),
                    confidence: 0.80,
                    reason: 'Empati & perhatian'
                });
            }
        }

        // 5. Quick reply (short acknowledgment) - always add
        const quickReplies = await pool.query(
            `SELECT content FROM quick_replies
             WHERE organization_id = $1
             LIMIT 5`,
            [organizationId]
        );

        // Add a template-based quick reply if available
        if (quickReplies.rows.length > 0) {
            const template = quickReplies.rows[Math.floor(Math.random() * Math.min(3, quickReplies.rows.length))];
            if (template.content) {
                suggestions.push({
                    type: 'template',
                    text: template.content,
                    confidence: 0.70,
                    reason: 'Quick reply template'
                });
            }
        }

        // Sort by confidence and limit
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, limit);

    } catch (err) {
        console.error('[SmartReply] generateSuggestions error:', err.message);
        return [];
    }
};

// Save suggestions to conversation
export const saveSuggestions = async (conversationId, suggestions) => {
    try {
        await pool.query(
            `UPDATE conversations
             SET ai_suggestions = $1, ai_suggestions_generated_at = NOW()
             WHERE id = $2`,
            [JSON.stringify(suggestions), conversationId]
        );
    } catch (err) {
        console.error('[SmartReply] saveSuggestions error:', err.message);
    }
};

// Get stored suggestions
export const getStoredSuggestions = async (conversationId) => {
    try {
        const result = await pool.query(
            `SELECT ai_suggestions, ai_suggestions_generated_at
             FROM conversations WHERE id = $1`,
            [conversationId]
        );

        if (result.rows.length === 0) return null;

        const { ai_suggestions, ai_suggestions_generated_at } = result.rows[0];

        // Check if suggestions are still fresh (less than 5 minutes old)
        if (!ai_suggestions_generated_at) return null;

        const ageMinutes = (Date.now() - new Date(ai_suggestions_generated_at).getTime()) / 60000;
        if (ageMinutes > 5) return null; // Stale

        return ai_suggestions || null;
    } catch (err) {
        console.error('[SmartReply] getStoredSuggestions error:', err.message);
        return null;
    }
};

// Track suggestion usage
export const trackSuggestionUsage = async (conversationId, suggestionText, organizationId) => {
    try {
        // Log usage for analytics
        await pool.query(
            `INSERT INTO ai_suggestion_logs (conversation_id, organization_id, suggestion_text, used_at)
             VALUES ($1, $2, $3, NOW())`,
            [conversationId, organizationId, suggestionText]
        );

        // Update conversation with used suggestion
        await pool.query(
            `UPDATE conversations SET last_ai_suggestion_used = $1 WHERE id = $2`,
            [suggestionText, conversationId]
        );
    } catch (err) {
        console.error('[SmartReply] trackUsage error:', err.message);
    }
};

// Simple sentiment detection
const detectSentiment = async (text) => {
    const negativeWords = ['kesal', 'marah', 'kecewa', 'tidak puas', 'komplain', 'keluhan', 'buruk', 'jelek', 'bad', 'angry', 'disappointed', 'frustrated', 'urgent', 'penting', 'segera'];
    const positiveWords = ['terima kasih', 'thanks', 'bagus', 'good', 'satisfied', 'senang', 'happy', 'great', 'mantap', 'oke', 'ok'];

    const lowerText = text.toLowerCase();

    for (const word of negativeWords) {
        if (lowerText.includes(word)) return 'negative';
    }

    for (const word of positiveWords) {
        if (lowerText.includes(word)) return 'positive';
    }

    return 'neutral';
};

// Simple language detection
const detectLanguage = (text) => {
    const indonesianIndicators = ['yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'pada', 'adalah', 'ini', 'itu', 'anda', 'kami', 'saya', 'terima kasih', 'mohon', 'silakan'];
    const englishIndicators = ['the', 'and', 'to', 'of', 'in', 'is', 'it', 'for', 'you', 'we', 'please', 'thank', 'would'];

    const words = text.toLowerCase().split(/\s+/);
    let idCount = 0, enCount = 0;

    for (const word of words.slice(0, 20)) {
        if (indonesianIndicators.includes(word)) idCount++;
        if (englishIndicators.includes(word)) enCount++;
    }

    return idCount > enCount ? 'id' : 'en';
};
