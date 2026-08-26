/**
 * Multi-Language AI Service
 * Language detection and multi-language chatbot support
 */

import pool from '../config/db.js';
import { generateResponse } from './aiService.js';

/**
 * Supported languages configuration
 */
const SUPPORTED_LANGUAGES = {
    id: { name: 'Indonesian', code: 'id', flag: '🇮🇩' },
    en: { name: 'English', code: 'en', flag: '🇺🇸' },
    zh: { name: 'Chinese', code: 'zh', flag: '🇨🇳' },
    ms: { name: 'Malay', code: 'ms', flag: '🇲🇾' },
    ar: { name: 'Arabic', code: 'ar', flag: '🇸🇦' },
    ja: { name: 'Japanese', code: 'ja', flag: '🇯🇵' },
    ko: { name: 'Korean', code: 'ko', flag: '🇰🇷' },
    th: { name: 'Thai', code: 'th', flag: '🇹🇭' },
    vi: { name: 'Vietnamese', code: 'vi', flag: '🇻🇳' },
    pt: { name: 'Portuguese', code: 'pt', flag: '🇧🇷' }
};

/**
 * Language names map for display
 */
const LANGUAGE_NAMES = {
    id: 'Indonesian',
    en: 'English',
    zh: 'Chinese',
    ms: 'Malay',
    ar: 'Arabic',
    ja: 'Japanese',
    ko: 'Korean',
    th: 'Thai',
    vi: 'Vietnamese',
    pt: 'Portuguese'
};

/**
 * Detect language from text
 * Simple heuristic-based detection (can be enhanced with external API)
 */
export const detectLanguage = (text) => {
    if (!text) return 'id';

    const lowerText = text.toLowerCase();

    // Common Indonesian words
    const indonesianWords = [
        'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk', 'pada',
        'adalah', 'akan', 'sudah', 'ada', 'tidak', 'saya', 'kami', 'kamu', 'nya',
        'terima', 'kasih', 'silakan', 'maaf', 'halo', 'terima kasih', 'bagaimana',
        'berapa', 'dimana', 'kapan', 'siapa', 'kenapa', 'apa', 'bisa', 'mau', 'ingin',
        'harga', 'order', 'beli', 'jual', 'kirim', 'produk', 'barang', 'pesanan',
        'terima', 'barang', 'sudah', 'dapat', 'belum', 'lagi', 'sedang'
    ];

    // Common English words
    const englishWords = [
        'the', 'is', 'are', 'and', 'to', 'in', 'it', 'you', 'that', 'was',
        'for', 'on', 'with', 'as', 'have', 'this', 'be', 'at', 'or', 'one',
        'by', 'from', 'they', 'we', 'she', 'he', 'will', 'can', 'would', 'there',
        'what', 'how', 'when', 'where', 'who', 'why', 'which', 'please', 'thank',
        'hello', 'hi', 'order', 'price', 'buy', 'product', 'shipping', 'payment'
    ];

    // Count matches
    let idCount = 0;
    let enCount = 0;

    const words = lowerText.split(/\s+/);

    for (const word of words) {
        if (indonesianWords.includes(word)) idCount++;
        if (englishWords.includes(word)) enCount++;
    }

    // Calculate confidence
    const totalWords = words.length;
    const idRatio = idCount / totalWords;
    const enRatio = enCount / totalWords;

    // Decision logic
    if (idRatio > 0.1 && idRatio > enRatio) {
        return { language: 'id', confidence: Math.min(0.95, idRatio + 0.3) };
    }
    if (enRatio > 0.08) {
        return { language: 'en', confidence: Math.min(0.95, enRatio + 0.4) };
    }

    // Default to Indonesian for Indonesian context
    return { language: 'id', confidence: 0.6 };
};

/**
 * Get language settings for organization
 */
export const getLanguageSettings = async (organizationId) => {
    try {
        const existing = await pool.query(
            'SELECT * FROM language_settings WHERE organization_id = $1',
            [organizationId]
        );

        if (existing.rows.length > 0) {
            return existing.rows[0];
        }

        // Create default settings
        const result = await pool.query(
            `INSERT INTO language_settings (organization_id)
             VALUES ($1)
             RETURNING *`,
            [organizationId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[Language] Error getting settings:', error);
        return null;
    }
};

/**
 * Update language settings
 */
export const updateLanguageSettings = async (organizationId, settings) => {
    const {
        defaultLanguage,
        supportedLanguages,
        autoDetect,
        languageConfigs,
        fallbackToEnglish
    } = settings;

    try {
        const result = await pool.query(
            `UPDATE language_settings SET
             default_language = COALESCE($2, default_language),
             supported_languages = COALESCE($3, supported_languages),
             auto_detect = COALESCE($4, auto_detect),
             language_configs = COALESCE($5, language_configs),
             fallback_to_english = COALESCE($6, fallback_to_english),
             updated_at = NOW()
             WHERE organization_id = $1
             RETURNING *`,
            [organizationId, defaultLanguage, supportedLanguages, autoDetect, languageConfigs, fallbackToEnglish]
        );

        return result.rows[0];
    } catch (error) {
        console.error('[Language] Error updating settings:', error);
        return null;
    }
};

/**
 * Get AI response in detected language
 */
export const getMultiLingualResponse = async (organizationId, userMessage, chatHistory, botConfig, extraContext, contactInfo) => {
    try {
        // Get language settings
        const settings = await getLanguageSettings(organizationId);
        const defaultLang = settings?.default_language || 'id';
        const supportedLangs = settings?.supported_languages || ['id', 'en'];
        const autoDetect = settings?.auto_detect !== false;
        const fallbackToEnglish = settings?.fallback_to_english !== false;

        // Detect language if enabled
        let detectedLang = defaultLang;
        let detectedConfidence = 1;

        if (autoDetect && userMessage) {
            const detection = detectLanguage(userMessage);
            detectedLang = detection.language;
            detectedConfidence = detection.confidence;
        }

        // Check if detected language is supported
        if (!supportedLangs.includes(detectedLang)) {
            detectedLang = fallbackToEnglish ? 'en' : defaultLang;
        }

        // Update contact's preferred language
        if (contactInfo?.contactId) {
            await pool.query(
                'UPDATE contacts SET preferred_language = $3 WHERE id = $1 AND organization_id = $2',
                [contactInfo.contactId, organizationId, detectedLang]
            ).catch(() => { });
        }

        // Log detection for analytics
        logLanguageDetection(organizationId, contactInfo?.contactId, detectedLang, detectedConfidence, userMessage).catch(() => { });

        // Build language-specific prompt
        const langPrompt = buildLanguagePrompt(detectedLang);

        // Get AI response
        const response = await generateResponse(
            organizationId,
            langPrompt + '\n\n' + userMessage,
            chatHistory,
            botConfig,
            extraContext,
            { ...contactInfo, language: detectedLang }
        );

        return {
            response,
            detectedLanguage: detectedLang,
            confidence: detectedConfidence
        };
    } catch (error) {
        console.error('[Language] Error getting multilingual response:', error);
        return {
            response: await generateResponse(organizationId, userMessage, chatHistory, botConfig, extraContext, contactInfo),
            detectedLanguage: 'id',
            confidence: 0
        };
    }
};

/**
 * Build language-specific system prompt
 */
const buildLanguagePrompt = (language) => {
    const prompts = {
        id: `Kamu adalah asisten CS yang berkomunikasi dalam Bahasa Indonesia yang baik dan sopan. Gunakan bahasa yang ramah dan profesional. Respon harus dalam Bahasa Indonesia.`,
        en: `You are a customer service assistant communicating in English. Use friendly and professional language. Respond in English.`,
        zh: `You are a customer service assistant. Please respond in Chinese (Mandarin). Use friendly and professional tone.`,
        ms: `Anda adalah pembantu khidmat pelanggan yang berkomunikasi dalam Bahasa Melayu. Gunakan bahasa yang mesra dan profesional.`,
        ar: `You are a customer service assistant. Please respond in Arabic. Use friendly and professional language.`,
        ja: `あなたはカスタマーサービスアシスタントです。日本語で友好的かつ専門的にお手伝いします。`,
        ko: `당신은 고객 서비스 어시스턴트입니다. 한국어로 친절하고 전문적으로 응답해 주세요.`,
        th: `คุณเป็นผู้ช่วยบริการลูกค้า กรุณาตอบเป็นภาษาไทย พูดอย่างเป็นมิตรและเป็นมืออาชีพ`,
        vi: `Bạn là trợ lý chăm sóc khách hàng. Vui lòng trả lời bằng tiếng Việt. Sử dụng ngôn ngữ thân thiện và chuyên nghiệp.`,
        pt: `Você é um assistente de atendimento ao cliente. Por favor, responda em português. Use linguagem amigável e profissional.`
    };

    return prompts[language] || prompts.id;
};

/**
 * Log language detection for analytics
 */
const logLanguageDetection = async (organizationId, contactId, language, confidence, messagePreview) => {
    try {
        await pool.query(
            `INSERT INTO language_detection_logs
             (organization_id, contact_id, detected_language, confidence_score, message_preview)
             VALUES ($1, $2, $3, $4, $5)`,
            [organizationId, contactId, language, confidence, messagePreview?.substring(0, 100)]
        );
    } catch (error) {
        console.error('[Language] Logging error:', error);
    }
};

/**
 * Get language analytics
 */
export const getLanguageAnalytics = async (organizationId) => {
    try {
        // Language distribution
        const langDist = await pool.query(`
            SELECT
                detected_language,
                COUNT(*) as count,
                AVG(confidence_score) as avg_confidence
            FROM language_detection_logs
            WHERE organization_id = $1
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY detected_language
            ORDER BY count DESC
        `, [organizationId]);

        // Trend over time
        const langTrend = await pool.query(`
            SELECT
                DATE(created_at) as date,
                detected_language,
                COUNT(*) as count
            FROM language_detection_logs
            WHERE organization_id = $1
            AND created_at >= NOW() - INTERVAL '14 days'
            GROUP BY DATE(created_at), detected_language
            ORDER BY date DESC
        `, [organizationId]);

        return {
            distribution: langDist.rows,
            trend: langTrend.rows
        };
    } catch (error) {
        console.error('[Language] Analytics error:', error);
        return { distribution: [], trend: [] };
    }
};

/**
 * Get supported languages list
 */
export const getSupportedLanguages = () => {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
        code,
        ...info
    }));
};

/**
 * Translate text using AI
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @param {string} organizationId - Organization ID for AI service
 */
export const translateText = async (text, sourceLang, targetLang, organizationId) => {
    if (!text || sourceLang === targetLang) {
        return { translatedText: text, sourceLang, targetLang };
    }

    try {
        const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
        const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;

        const prompt = `Translate the following text from ${sourceName} to ${targetName}.

Text to translate:
${text}

Requirements:
- Translate accurately and naturally
- Maintain the tone (formal/informal) of the original text
- Keep any names, numbers, or specific terms as they are
- Only output the translated text, nothing else`;

        const botConfig = {
            name: 'Translator',
            system_prompt: `You are a professional translator. Translate the given text accurately while preserving meaning, tone, and formatting. Only output the translated text without any explanations or quotes.`,
            escalation_keywords: '',
            use_global_kb: false,
            session_id: null,
        };

        const translatedText = await generateResponse(
            organizationId,
            prompt,
            [],
            botConfig,
            '',
            {}
        );

        return {
            translatedText: translatedText?.trim() || text,
            sourceLang,
            targetLang,
            success: true
        };
    } catch (error) {
        console.error('[Translate] Translation error:', error);
        return {
            translatedText: text,
            sourceLang,
            targetLang,
            success: false,
            error: error.message
        };
    }
};

/**
 * Auto-translate incoming message for organization
 * @param {string} messageId - Message ID to translate
 * @param {string} organizationId - Organization ID
 * @param {string} targetLang - Target language (usually org's default)
 */
export const autoTranslateIncomingMessage = async (messageId, organizationId, targetLang = 'id') => {
    try {
        // Get message
        const msgRes = await pool.query(
            `SELECT m.*, c.preferred_language, o.auto_translate_incoming
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             JOIN organizations o ON c.organization_id = o.id
             WHERE m.id = $1`,
            [messageId]
        );

        if (msgRes.rows.length === 0) {
            return { success: false, error: 'Message not found' };
        }

        const message = msgRes.rows[0];

        // Check if auto-translate is enabled
        if (!message.auto_translate_incoming) {
            return { success: false, error: 'Auto-translate disabled' };
        }

        // Skip if already translated
        if (message.translated_content) {
            return { success: true, translated: false };
        }

        // Detect source language
        const detection = detectLanguage(message.content);
        const sourceLang = detection.language;

        // Skip if same language as target
        if (sourceLang === targetLang) {
            return { success: true, translated: false, sourceLang };
        }

        // Translate
        const result = await translateText(message.content, sourceLang, targetLang, organizationId);

        if (result.success && result.translatedText !== message.content) {
            // Update message with translation
            await pool.query(
                `UPDATE messages SET
                 original_language = $2,
                 original_content = content,
                 translated_content = $3,
                 translation_provider = 'ai',
                 updated_at = NOW()
                 WHERE id = $1`,
                [messageId, sourceLang, result.translatedText]
            );

            return {
                success: true,
                translated: true,
                sourceLang,
                targetLang,
                originalContent: message.content,
                translatedContent: result.translatedText
            };
        }

        return { success: true, translated: false, sourceLang };
    } catch (error) {
        console.error('[Translate] Auto-translate error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Translate message for outgoing (agent to customer)
 * @param {string} messageId - Message ID
 * @param {string} organizationId - Organization ID
 * @param {string} contactPreferredLang - Contact's preferred language
 */
export const autoTranslateOutgoingMessage = async (messageId, organizationId, contactPreferredLang) => {
    try {
        // Get message and conversation info
        const msgRes = await pool.query(
            `SELECT m.*, c.contact_id
             FROM messages m
             JOIN conversations c ON m.conversation_id = c.id
             WHERE m.id = $1 AND c.organization_id = $2`,
            [messageId, organizationId]
        );

        if (msgRes.rows.length === 0) {
            return { success: false, error: 'Message not found' };
        }

        const message = msgRes.rows[0];

        // Skip if already translated
        if (message.translated_content) {
            return { success: true, translated: false };
        }

        // Get organization's default language
        const orgRes = await pool.query(
            `SELECT ls.default_language
             FROM language_settings ls
             WHERE ls.organization_id = $1`,
            [organizationId]
        );
        const defaultLang = orgRes.rows[0]?.default_language || 'id';

        // Skip if contact prefers same language as default
        if (contactPreferredLang === defaultLang) {
            return { success: true, translated: false };
        }

        // Translate to contact's preferred language
        const result = await translateText(
            message.content,
            defaultLang,
            contactPreferredLang,
            organizationId
        );

        if (result.success && result.translatedText !== message.content) {
            // Store original and add translation
            await pool.query(
                `UPDATE messages SET
                 original_language = $2,
                 original_content = content,
                 translated_content = $3,
                 translation_provider = 'ai',
                 content = $3,
                 updated_at = NOW()
                 WHERE id = $1`,
                [messageId, defaultLang, result.translatedText]
            );

            return {
                success: true,
                translated: true,
                sourceLang: defaultLang,
                targetLang: contactPreferredLang,
                originalContent: message.content,
                translatedContent: result.translatedText
            };
        }

        return { success: true, translated: false };
    } catch (error) {
        console.error('[Translate] Outgoing translate error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get translation settings for organization
 */
export const getTranslationSettings = async (organizationId) => {
    try {
        const orgRes = await pool.query(
            `SELECT auto_translate_incoming, auto_translate_outgoing, translation_api_provider
             FROM organizations WHERE id = $1`,
            [organizationId]
        );

        if (orgRes.rows.length === 0) {
            return null;
        }

        return {
            autoTranslateIncoming: orgRes.rows[0].auto_translate_incoming || false,
            autoTranslateOutgoing: orgRes.rows[0].auto_translate_outgoing || false,
            translationApiProvider: orgRes.rows[0].translation_api_provider || 'ai'
        };
    } catch (error) {
        console.error('[Translate] Get settings error:', error);
        return null;
    }
};

/**
 * Update translation settings
 */
export const updateTranslationSettings = async (organizationId, settings) => {
    const { autoTranslateIncoming, autoTranslateOutgoing, translationApiProvider } = settings;

    try {
        await pool.query(
            `UPDATE organizations SET
             auto_translate_incoming = COALESCE($2, auto_translate_incoming),
             auto_translate_outgoing = COALESCE($3, auto_translate_outgoing),
             translation_api_provider = COALESCE($4, translation_api_provider)
             WHERE id = $1`,
            [organizationId, autoTranslateIncoming, autoTranslateOutgoing, translationApiProvider]
        );

        return { success: true };
    } catch (error) {
        console.error('[Translate] Update settings error:', error);
        return { success: false, error: error.message };
    }
};