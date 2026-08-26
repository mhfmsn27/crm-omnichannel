import pool from '../config/db.js';
import { generateResponse } from '../services/aiService.js';
import * as smartReplyService from '../services/smartReplyService.js';

// POST /api/app/inbox/conversations/:id/ai-suggest or POST /api/app/ai/suggest
// Returns an AI-generated reply suggestion based on the last customer message with optional tone customization
export const suggestReply = async (req, res) => {
    const conversationId = req.params.id || req.body.conversationId;
    const { tone } = req.body || {};
    const { organization_id } = req.user;

    if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
    }

    try {
        const convCheck = await pool.query(
            'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2',
            [conversationId, organization_id]
        );
        if (convCheck.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        // Get last 15 messages for context (most recent first, then reverse for chronological)
        const msgRes = await pool.query(
            `SELECT content, from_me FROM messages
             WHERE conversation_id = $1 AND content IS NOT NULL AND content != ''
             ORDER BY created_at DESC LIMIT 15`,
            [conversationId]
        );

        const messages = msgRes.rows.reverse();
        if (messages.length === 0) return res.json({ suggestion: '' });

        const lastMsg = messages[messages.length - 1];

        // Find last customer message if available
        const lastCustomerMsg = [...messages].reverse().find(m => !m.from_me) || lastMsg;

        const chatHistory = messages.slice(0, -1);

        let toneInstruction = 'singkat, ramah, dan solutif (maksimal 2-3 kalimat)';
        if (tone === 'professional') {
            toneInstruction = 'formal, profesional, dan sopan';
        } else if (tone === 'friendly') {
            toneInstruction = 'sangat ramah, hangat, menggunakan emoji yang relevan, dan membantu';
        } else if (tone === 'concise') {
            toneInstruction = 'sangat singkat, padat, to-the-point, maksimal 1-2 kalimat';
        } else if (tone === 'persuasive') {
            toneInstruction = 'persuasif, meyakinkan pelanggan untuk mengambil aksi/pembelian dengan sopan';
        }

        const botConfig = {
            name: 'AI Copilot',
            system_prompt: `Kamu adalah asisten customer service profesional. Tugas kamu adalah membalas pesan pelanggan dengan gaya ${toneInstruction}. Gunakan bahasa yang sama dengan pelanggan. Jangan tambahkan salam pembuka/penutup panjang atau kata pengantar seperti 'Tentu, ini balasannya' — langsung ke inti jawaban yang siap dikirim.`,
            escalation_keywords: '',
            use_global_kb: true,
            session_id: null,
        };

        const suggestion = await generateResponse(
            organization_id,
            lastCustomerMsg.content,
            chatHistory,
            botConfig,
            '',
            {}
        );

        if (!suggestion || suggestion.includes('[ESCALATE]')) {
            return res.json({ suggestion: '' });
        }

        res.json({ suggestion: suggestion.trim() });
    } catch (err) {
        console.error('[AI Copilot] suggestReply error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/ai/suggestions/:conversationId
// Get multiple AI reply suggestions for a conversation
export const getSuggestions = async (req, res) => {
    const { conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        // Check if conversation exists and user has access
        const convCheck = await pool.query(
            'SELECT id, ai_suggestions, ai_suggestions_generated_at FROM conversations WHERE id = $1 AND organization_id = $2',
            [conversationId, organization_id]
        );
        if (convCheck.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        // Check if we have fresh stored suggestions
        const storedSuggestions = await smartReplyService.getStoredSuggestions(conversationId);
        if (storedSuggestions && storedSuggestions.length > 0) {
            return res.json({
                suggestions: storedSuggestions,
                fresh: true,
                generatedAt: convCheck.rows[0].ai_suggestions_generated_at
            });
        }

        // Generate new suggestions
        const suggestions = await smartReplyService.generateSuggestions(organization_id, conversationId, { limit: 3 });

        // Save to conversation
        await smartReplyService.saveSuggestions(conversationId, suggestions);

        res.json({
            suggestions,
            fresh: true,
            generatedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('[AI] getSuggestions error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/ai/suggestions/:conversationId/refresh
// Force regenerate suggestions
export const refreshSuggestions = async (req, res) => {
    const { conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        const convCheck = await pool.query(
            'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2',
            [conversationId, organization_id]
        );
        if (convCheck.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        // Generate new suggestions
        const suggestions = await smartReplyService.generateSuggestions(organization_id, conversationId, { limit: 3 });

        // Save to conversation
        await smartReplyService.saveSuggestions(conversationId, suggestions);

        res.json({
            suggestions,
            generatedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('[AI] refreshSuggestions error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/ai/suggestions/:conversationId/use
// Track when agent uses a suggestion
export const useSuggestion = async (req, res) => {
    const { conversationId } = req.params;
    const { suggestion, suggestionText } = req.body;
    const { organization_id } = req.user;

    try {
        await smartReplyService.trackSuggestionUsage(
            conversationId,
            suggestion || suggestionText || '',
            organization_id
        );

        res.json({ success: true });
    } catch (err) {
        console.error('[AI] useSuggestion error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/inbox/conversations/:id/summarize
// Returns an AI-generated bullet-point summary of the conversation
export const summarizeConversation = async (req, res) => {
    const { id: conversationId } = req.params;
    const { organization_id } = req.user;

    try {
        const convCheck = await pool.query(
            'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2',
            [conversationId, organization_id]
        );
        if (convCheck.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        const msgRes = await pool.query(
            `SELECT content, from_me FROM messages
             WHERE conversation_id = $1 AND content IS NOT NULL AND content != ''
             ORDER BY created_at ASC LIMIT 50`,
            [conversationId]
        );

        if (msgRes.rows.length === 0) {
            return res.json({ summary: 'Belum ada pesan untuk dirangkum.' });
        }

        const transcript = msgRes.rows
            .map(m => `${m.from_me ? '[Agent]' : '[Pelanggan]'}: ${m.content}`)
            .join('\n');

        const prompt = `Tolong rangkum percakapan berikut dalam format poin-poin singkat (3-5 poin utama). Gunakan bahasa yang sama dengan percakapan.\n\nPercakapan:\n${transcript}`;

        const botConfig = {
            name: 'Summarizer',
            system_prompt: 'Kamu adalah asisten yang merangkum percakapan customer service. Berikan ringkasan singkat dalam format poin-poin. Jangan tambahkan hal di luar percakapan yang diberikan.',
            escalation_keywords: '',
            use_global_kb: false,
            session_id: null,
        };

        const summary = await generateResponse(
            organization_id,
            prompt,
            [],
            botConfig,
            '',
            {}
        );

        if (!summary || summary.includes('[ESCALATE]')) {
            return res.json({ summary: 'Gagal merangkum percakapan. Pastikan AI API key sudah dikonfigurasi.' });
        }

        res.json({ summary });
    } catch (err) {
        console.error('[AI Summarize] error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/ai/rewrite
// Returns an AI-rewritten version of the provided text based on tone
export const rewriteMessage = async (req, res) => {
    const { text, tone } = req.body;
    const { organization_id } = req.user;

    if (!text || !tone) {
        return res.status(400).json({ error: 'Text and tone are required' });
    }

    try {
        let tonePrompt = '';
        switch (tone) {
            case 'professional':
                tonePrompt = 'Ubah teks berikut menjadi lebih profesional, formal, elegan, dan sopan untuk komunikasi bisnis/B2B.';
                break;
            case 'friendly':
                tonePrompt = 'Ubah teks berikut menjadi sangat ramah, hangat, antusias, dan menyisipkan 1-2 emoji yang relevan.';
                break;
            case 'shorter':
            case 'concise':
                tonePrompt = 'Buat teks berikut menjadi sangat singkat, padat, to-the-point, tanpa basa-basi namun tetap sopan.';
                break;
            case 'persuasive':
                tonePrompt = 'Ubah teks berikut menjadi copywriting yang persuasif, menggugah minat beli pelanggan, dan mendorong aksi/closing sales secara elegan.';
                break;
            case 'translate_en':
                tonePrompt = 'Terjemahkan teks berikut ke dalam Bahasa Inggris (English) dengan tata bahasa alami dan profesional.';
                break;
            case 'translate_id':
                tonePrompt = 'Terjemahkan teks berikut ke dalam Bahasa Indonesia yang alami, sopan, dan jelas.';
                break;
            case 'grammar':
            default:
                tonePrompt = 'Perbaiki tata bahasa, ejaan (typo), tanda baca, dan susunan kalimat teks berikut agar sempurna.';
        }

        const prompt = `${tonePrompt}\n\nTeks asli: "${text}"\n\nHanya kembalikan teks hasil revisi tanpa kutipan atau penjelasan tambahan.`;

        const botConfig = {
            name: 'Rewriter',
            system_prompt: 'Kamu adalah asisten copywriter yang membantu menulis ulang pesan. Kembalikan HANYA teks hasil revisi tanpa pengantar apapun.',
            escalation_keywords: '',
            use_global_kb: false,
            session_id: null,
        };

        const rewrittenText = await generateResponse(
            organization_id,
            prompt,
            [],
            botConfig,
            '',
            {}
        );

        res.json({ rewrittenText });
    } catch (err) {
        console.error('[AI Rewrite] error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/ai/transcribe-audio
// Transcribes voice note audio into Indonesian text using multimodal Gemini
export const transcribeAudio = async (req, res) => {
    const { audioUrl, messageId } = req.body;
    const { organization_id } = req.user;

    try {
        let targetAudio = audioUrl;

        // If messageId provided, fetch media_url from DB
        if (!targetAudio && messageId) {
            const msgRes = await pool.query(
                `SELECT media_url, content FROM messages WHERE id = $1 AND organization_id = $2`,
                [messageId, organization_id]
            );
            if (msgRes.rows.length > 0) {
                targetAudio = msgRes.rows[0].media_url || msgRes.rows[0].content;
            }
        }

        if (!targetAudio) {
            return res.status(400).json({ error: 'Audio URL atau Message ID wajib disediakan' });
        }

        // Get API key from organization
        const orgRes = await pool.query(
            `SELECT gemini_api_key, openai_api_key FROM organizations WHERE id = $1`,
            [organization_id]
        );
        const apiKey = orgRes.rows[0]?.gemini_api_key;

        if (!apiKey) {
            return res.status(400).json({ error: 'Gemini API Key belum diatur di Pengaturan Organisasi' });
        }

        // Load audio buffer (either from local filesystem or via http)
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        let audioBuffer = null;
        let mimeType = 'audio/ogg';

        if (targetAudio.endsWith('.mp3')) mimeType = 'audio/mp3';
        else if (targetAudio.endsWith('.wav')) mimeType = 'audio/wav';
        else if (targetAudio.endsWith('.m4a') || targetAudio.endsWith('.aac')) mimeType = 'audio/m4a';
        else if (targetAudio.endsWith('.opus') || targetAudio.endsWith('.ogg')) mimeType = 'audio/ogg';

        // Check if local file path
        const cleanedPath = targetAudio.replace(/^\/+/, '');
        const localPath = path.resolve(__dirname, '../../', cleanedPath);

        if (fs.existsSync(localPath)) {
            audioBuffer = await fs.promises.readFile(localPath);
        } else if (targetAudio.startsWith('http://') || targetAudio.startsWith('https://')) {
            const axios = (await import('axios')).default;
            const resp = await axios.get(targetAudio, { responseType: 'arraybuffer', timeout: 15000 });
            audioBuffer = Buffer.from(resp.data);
            const contentType = resp.headers['content-type'];
            if (contentType) mimeType = contentType.split(';')[0];
        }

        if (!audioBuffer) {
            return res.status(404).json({ error: 'File audio tidak ditemukan atau gagal diunduh' });
        }

        // Use GoogleGenAI
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const base64Data = audioBuffer.toString('base64');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        },
                        {
                            text: 'Tolong transkripsikan rekaman suara / voice note audio ini ke dalam teks bahasa Indonesia yang jelas, akurat, dan rapi. Kembalikan HANYA teks hasil transkripsinya tanpa tanda kutip pembuka atau kalimat pengantar.'
                        }
                    ]
                }
            ]
        });

        const transcription = response.text ? response.text.trim() : '';

        // Optional: Save transcribed text to message content if applicable
        if (messageId && transcription) {
            await pool.query(
                `UPDATE messages SET translated_content = $1 WHERE id = $2 AND organization_id = $3`,
                [`[Transkripsi Suara]: ${transcription}`, messageId, organization_id]
            ).catch(() => {});
        }

        res.json({
            success: true,
            text: transcription,
            messageId: messageId || null
        });

    } catch (err) {
        console.error('[AI TranscribeAudio] Error:', err.message);
        res.status(500).json({ error: `Gagal mentranskripsikan audio: ${err.message}` });
    }
};

