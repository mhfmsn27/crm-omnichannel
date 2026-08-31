import pool from '../config/db.js';
import { generateEmbedding, toSqlVector } from '../services/embeddingService.js';
import { generateResponse } from '../services/aiService.js';
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from 'openai';
import { checkFeatureAccess } from '../services/featureGateService.js';
import { AI_SKILL_PRESETS } from '../services/aiSkillPresets.js';

// Self-healing schema for AI Provider columns in organizations table
export const ensureAiColumns = async () => {
    try {
        await pool.query(`
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS openrouter_api_key TEXT;
            ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(50) DEFAULT 'gemini';
        `);
    } catch (e) {
        console.error('[Chatbot] ensureAiColumns error:', e.message);
    }
};
ensureAiColumns().catch(() => {});

// Get Gemini key (used for embeddings regardless of chat provider)
const getOrgKey = async (organization_id) => {
    await ensureAiColumns();
    const res = await pool.query('SELECT gemini_api_key FROM organizations WHERE id = $1', [organization_id]);
    if (res.rows.length === 0) return null;
    return res.rows[0].gemini_api_key;
};

// Get full AI config for the organization
const getOrgAIConfig = async (organization_id) => {
    await ensureAiColumns();
    const res = await pool.query(
        'SELECT gemini_api_key, openai_api_key, openrouter_api_key, ai_provider FROM organizations WHERE id = $1',
        [organization_id]
    );
    if (res.rows.length === 0) return null;
    return {
        gemini_api_key: res.rows[0].gemini_api_key || '',
        openai_api_key: res.rows[0].openai_api_key || '',
        openrouter_api_key: res.rows[0].openrouter_api_key || '',
        ai_provider: res.rows[0].ai_provider || 'gemini'
    };
};

// --- AI CONFIGURATION MANAGEMENT ---
export const getApiKey = async (req, res) => {
    const { organization_id } = req.user;
    try {
        await ensureAiColumns();
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) return res.status(403).json({ error: access.message, locked: true });

        const result = await pool.query(
            'SELECT gemini_api_key, openai_api_key, openrouter_api_key, ai_provider FROM organizations WHERE id = $1',
            [organization_id]
        );
        res.json({
            // Legacy field kept for backward compat
            api_key: result.rows[0]?.gemini_api_key || '',
            gemini_api_key: result.rows[0]?.gemini_api_key || '',
            openai_api_key: result.rows[0]?.openai_api_key || '',
            openrouter_api_key: result.rows[0]?.openrouter_api_key || '',
            ai_provider: result.rows[0]?.ai_provider || 'gemini'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateApiKey = async (req, res) => {
    const { organization_id } = req.user;
    // Support both legacy { api_key } and new { gemini_api_key, openai_api_key, openrouter_api_key, ai_provider }
    const geminiKey = req.body.gemini_api_key ?? req.body.api_key ?? undefined;
    const { openai_api_key, openrouter_api_key, ai_provider } = req.body;
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) return res.status(403).json({ error: access.message, locked: true });

        const fields = [];
        const values = [];
        let idx = 1;

        if (geminiKey !== undefined) { fields.push(`gemini_api_key = $${idx++}`); values.push(geminiKey); }
        if (openai_api_key !== undefined) { fields.push(`openai_api_key = $${idx++}`); values.push(openai_api_key); }
        if (openrouter_api_key !== undefined) { fields.push(`openrouter_api_key = $${idx++}`); values.push(openrouter_api_key); }
        if (ai_provider !== undefined) { fields.push(`ai_provider = $${idx++}`); values.push(ai_provider); }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

        values.push(organization_id);
        await pool.query(
            `UPDATE organizations SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
        res.json({ message: 'AI configuration updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- SETTINGS (SINGLE GLOBAL BOT PATTERN) ---
export const getSettings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');

        const orgRes = await pool.query('SELECT gemini_api_key, openai_api_key, openrouter_api_key, ai_provider FROM organizations WHERE id = $1', [organization_id]);
        // Find Global Bot (session_id IS NULL)
        let botRes = await pool.query('SELECT * FROM chatbot_settings WHERE organization_id = $1 AND session_id IS NULL', [organization_id]);

        let bot = botRes.rows[0];
        if (!bot) {
            // Create Default Global Bot if missing
            const newBot = await pool.query(
                `INSERT INTO chatbot_settings (organization_id, name, is_active, session_id) VALUES ($1, 'Global Assistant', false, NULL) RETURNING *`,
                [organization_id]
            );
            bot = newBot.rows[0];
        }

        const qaRes = await pool.query('SELECT id, question, answer FROM knowledge_base_qa WHERE organization_id = $1 ORDER BY created_at DESC', [organization_id]);
        const assetsRes = await pool.query('SELECT id, file_url, description, mime_type FROM knowledge_base_assets WHERE organization_id = $1 ORDER BY created_at DESC', [organization_id]);

        res.json({
            settings: {
                ...bot,
                gemini_api_key: orgRes.rows[0]?.gemini_api_key || '',
                openai_api_key: orgRes.rows[0]?.openai_api_key || '',
                openrouter_api_key: orgRes.rows[0]?.openrouter_api_key || '',
                ai_provider: orgRes.rows[0]?.ai_provider || 'gemini'
            },
            qa: qaRes.rows,
            assets: assetsRes.rows,
            access
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateSettings = async (req, res) => {
    const { organization_id } = req.user;
    const { is_active, system_prompt, escalation_keywords, gemini_api_key, openai_api_key, openrouter_api_key, ai_provider, queue_mode_enabled } = req.body;

    try {
        // 1. Update AI provider config
        const orgFields = [];
        const orgValues = [];
        let oidx = 1;
        if (gemini_api_key !== undefined) { orgFields.push(`gemini_api_key = $${oidx++}`); orgValues.push(gemini_api_key); }
        if (openai_api_key !== undefined) { orgFields.push(`openai_api_key = $${oidx++}`); orgValues.push(openai_api_key); }
        if (openrouter_api_key !== undefined) { orgFields.push(`openrouter_api_key = $${oidx++}`); orgValues.push(openrouter_api_key); }
        if (ai_provider !== undefined) { orgFields.push(`ai_provider = $${oidx++}`); orgValues.push(ai_provider); }
        if (orgFields.length > 0) {
            orgValues.push(organization_id);
            await pool.query(`UPDATE organizations SET ${orgFields.join(', ')} WHERE id = $${oidx}`, orgValues);
        }

        // 2. Update Bot Settings
        // Fetch current config to merge queue_mode
        const currentBot = await pool.query('SELECT * FROM chatbot_settings WHERE organization_id = $1 AND session_id IS NULL', [organization_id]);
        let config = currentBot.rows[0]?.auto_reply_config || {};

        // Merge Queue Mode
        if (queue_mode_enabled !== undefined) {
            config.queue_mode = { ...(config.queue_mode || {}), enabled: queue_mode_enabled };
        }

        await pool.query(
            `UPDATE chatbot_settings 
             SET is_active = $1, system_prompt = $2, escalation_keywords = $3, auto_reply_config = $4, updated_at = NOW()
             WHERE organization_id = $5 AND session_id IS NULL`,
            [is_active, system_prompt, escalation_keywords, config, organization_id]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- BOT MANAGEMENT ---

// NEW: GET /api/app/chatbot/stats
export const getStats = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // Check if AI Chatbot feature is unlocked
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');

        res.json({
            allowed: access.allowed,
            locked: !access.allowed,
            message: access.message
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/chatbot/bots
export const getBots = async (req, res) => {
    const { organization_id } = req.user;
    try {
        // Feature Gate Check
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) {
            return res.status(403).json({ error: access.message, locked: true });
        }

        const result = await pool.query(`
            SELECT b.*, 
            COALESCE(ws.name, mp.page_name, ia.username, tb.username) as device_name,
            ws.whatsapp_number
            FROM chatbot_settings b
            LEFT JOIN whatsapp_sessions ws ON b.session_id = ws.session_id
            LEFT JOIN messenger_pages mp ON b.session_id = mp.page_id
            LEFT JOIN instagram_accounts ia ON b.session_id = ia.ig_id
            LEFT JOIN telegram_bots tb ON b.session_id = tb.bot_token
            WHERE b.organization_id = $1
            ORDER BY b.updated_at DESC
        `, [organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/chatbot/bots
export const createBot = async (req, res) => {
    const { organization_id } = req.user;
    const { name, session_id } = req.body;

    // 1. CHECK FEATURE ACCESS
    try {
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) {
            return res.status(403).json({
                error: access.message,
                code: 'FEATURE_LOCKED',
                upsell: true
            });
        }
    } catch (err) {
        return res.status(500).json({ error: "Feature Check Failed: " + err.message });
    }

    try {
        // Declare deviceName outside if block to avoid scope error
        let deviceName = null;

        // Verify ownership across all channels if session_id provided
        if (session_id) {
            // Check WhatsApp
            const waCheck = await pool.query('SELECT id, status FROM whatsapp_sessions WHERE session_id = $1 AND organization_id = $2', [session_id, organization_id]);
            if (waCheck.rows.length > 0 && waCheck.rows[0].status === 'terblokir') {
                return res.status(400).json({ error: "Device Terblokir. Tidak dapat digunakan untuk chatbot." });
            }
            // Check Messenger
            const msgCheck = await pool.query('SELECT id FROM messenger_pages WHERE page_id = $1 AND organization_id = $2', [session_id, organization_id]);
            // Check Instagram
            const igCheck = await pool.query('SELECT id FROM instagram_accounts WHERE ig_id = $1 AND organization_id = $2', [session_id, organization_id]);
            // Check Telegram
            const tgCheck = await pool.query('SELECT id FROM telegram_bots WHERE bot_token = $1 AND organization_id = $2', [session_id, organization_id]);

            // Check Webchat (NEW)
            // FIX: Ensure session_id is a valid UUID before querying webchat_configs (which uses UUID column)
            let webCheck = { rows: [] };
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            if (uuidRegex.test(session_id)) {
                webCheck = await pool.query('SELECT id FROM webchat_configs WHERE widget_uid = $1 AND organization_id = $2', [session_id, organization_id]);
            }

            if (waCheck.rows.length === 0 && msgCheck.rows.length === 0 && igCheck.rows.length === 0 && tgCheck.rows.length === 0 && webCheck.rows.length === 0) {
                return res.status(400).json({ error: "Invalid device/channel session ID" });
            }

            // Check if bot already exists for this device
            const existCheck = await pool.query('SELECT id FROM chatbot_settings WHERE session_id = $1', [session_id]);
            if (existCheck.rows.length > 0) return res.status(400).json({ error: "Bot already exists for this device" });

            // Fetch device name to cache
            if (waCheck.rows.length > 0) {
                const details = await pool.query('SELECT name, whatsapp_number FROM whatsapp_sessions WHERE session_id = $1', [session_id]);
                deviceName = details.rows[0]?.name || details.rows[0]?.whatsapp_number;
            } else if (msgCheck.rows.length > 0) {
                const details = await pool.query('SELECT page_name FROM messenger_pages WHERE page_id = $1', [session_id]);
                deviceName = details.rows[0]?.page_name;
            } else if (igCheck.rows.length > 0) {
                const details = await pool.query('SELECT username FROM instagram_accounts WHERE ig_id = $1', [session_id]);
                deviceName = details.rows[0]?.username ? '@' + details.rows[0].username : null;
            } else if (tgCheck.rows.length > 0) {
                const details = await pool.query('SELECT username FROM telegram_bots WHERE bot_token = $1', [session_id]);
                deviceName = details.rows[0]?.username ? '@' + details.rows[0].username : null;
            } else if (webCheck.rows.length > 0) {
                const details = await pool.query('SELECT name FROM webchat_configs WHERE widget_uid = $1', [session_id]);
                deviceName = details.rows[0]?.name;
            }
        }

        const result = await pool.query(
            `INSERT INTO chatbot_settings (organization_id, name, session_id, is_active, cached_device_name)
             VALUES ($1, $2, $3, true, $4) RETURNING *`,
            [organization_id, name, session_id || null, deviceName]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET /api/app/chatbot/bots/:id
export const getBotDetail = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const result = await pool.query('SELECT * FROM chatbot_settings WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Bot not found" });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PUT /api/app/chatbot/bots/:id
export const updateBot = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { name, is_active, system_prompt, escalation_keywords, use_global_kb, auto_reply_config, ai_model } = req.body;

    try {
        // If enabling, check access again
        if (is_active) {
            const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
            if (!access.allowed) {
                // Allow update but force inactive? No, prevent update if locked.
                return res.status(403).json({ error: access.message, upsell: true });
            }
        }

        const result = await pool.query(
            `UPDATE chatbot_settings 
             SET name = $1, is_active = $2, system_prompt = $3, escalation_keywords = $4, 
                 use_global_kb = $5, auto_reply_config = $6, ai_model = $9, updated_at = NOW()
             WHERE id = $7 AND organization_id = $8 RETURNING *`,
            [name, is_active, system_prompt, escalation_keywords, use_global_kb, auto_reply_config, id, organization_id, ai_model]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// PATCH /api/app/chatbot/bots/:id/device
export const updateBotDevice = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { session_id } = req.body;

    try {
        // 1. Verify bot ownership
        const botRes = await pool.query(
            'SELECT * FROM chatbot_settings WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (botRes.rows.length === 0) {
            return res.status(404).json({ error: "Bot not found" });
        }

        // 2. Verify NEW device ownership (if session_id provided)
        let deviceName = null;
        if (session_id) {
            // Check WhatsApp
            const waCheck = await pool.query(
                'SELECT id, status FROM whatsapp_sessions WHERE session_id = $1 AND organization_id = $2',
                [session_id, organization_id]
            );
            if (waCheck.rows.length > 0 && waCheck.rows[0].status === 'terblokir') {
                return res.status(400).json({ error: "Device Terblokir. Tidak dapat digunakan untuk chatbot." });
            }

            // Check Messenger
            const msgCheck = await pool.query(
                'SELECT id FROM messenger_pages WHERE page_id = $1 AND organization_id = $2',
                [session_id, organization_id]
            );

            // Check Instagram
            const igCheck = await pool.query(
                'SELECT id FROM instagram_accounts WHERE ig_id = $1 AND organization_id = $2',
                [session_id, organization_id]
            );

            // Check Telegram
            const tgCheck = await pool.query(
                'SELECT id FROM telegram_bots WHERE bot_token = $1 AND organization_id = $2',
                [session_id, organization_id]
            );

            // Check Webchat
            let webCheck = { rows: [] };
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(session_id)) {
                webCheck = await pool.query(
                    'SELECT id FROM webchat_configs WHERE widget_uid = $1 AND organization_id = $2',
                    [session_id, organization_id]
                );
            }

            if (waCheck.rows.length === 0 && msgCheck.rows.length === 0 &&
                igCheck.rows.length === 0 && tgCheck.rows.length === 0 &&
                webCheck.rows.length === 0) {
                return res.status(400).json({ error: "Invalid device/channel session ID" });
            }

            // 3. Check if another bot already uses this device
            const existCheck = await pool.query(
                'SELECT id FROM chatbot_settings WHERE session_id = $1 AND id != $2',
                [session_id, id]
            );
            if (existCheck.rows.length > 0) {
                return res.status(400).json({ error: "Device already used by another bot" });
            }

            // Fetch device name to cache
            if (waCheck.rows.length > 0) {
                const details = await pool.query('SELECT name, whatsapp_number FROM whatsapp_sessions WHERE session_id = $1', [session_id]);
                deviceName = details.rows[0]?.name || details.rows[0]?.whatsapp_number;
            } else if (msgCheck.rows.length > 0) {
                const details = await pool.query('SELECT page_name FROM messenger_pages WHERE page_id = $1', [session_id]);
                deviceName = details.rows[0]?.page_name;
            } else if (igCheck.rows.length > 0) {
                const details = await pool.query('SELECT username FROM instagram_accounts WHERE ig_id = $1', [session_id]);
                deviceName = details.rows[0]?.username ? '@' + details.rows[0].username : null;
            } else if (tgCheck.rows.length > 0) {
                const details = await pool.query('SELECT username FROM telegram_bots WHERE bot_token = $1', [session_id]);
                deviceName = details.rows[0]?.username ? '@' + details.rows[0].username : null;
            } else if (webCheck.rows.length > 0) {
                const details = await pool.query('SELECT name FROM webchat_configs WHERE widget_uid = $1', [session_id]);
                deviceName = details.rows[0]?.name;
            }
        }

        // 4. Update session_id and cached name
        const result = await pool.query(
            'UPDATE chatbot_settings SET session_id = $1, cached_device_name = $2, updated_at = NOW() WHERE id = $3 AND organization_id = $4 RETURNING *',
            [session_id || null, deviceName, id, organization_id]
        );

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/chatbot/bots/:id
export const deleteBot = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        await pool.query('DELETE FROM chatbot_settings WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: "Bot deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// --- KNOWLEDGE BASE MANAGEMENT (GLOBAL & CUSTOM) ---

// GET /api/app/chatbot/kb
export const getKB = async (req, res) => {
    const { organization_id } = req.user;
    const { session_id } = req.query;

    try {
        // Feature Gate Check
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) {
            return res.status(403).json({ error: access.message, locked: true });
        }

        const whereClause = session_id
            ? 'organization_id = $1 AND session_id = $2'
            : 'organization_id = $1 AND session_id IS NULL';

        const params = session_id ? [organization_id, session_id] : [organization_id];

        // UPDATED: Added 'source' column to selection
        const qaRes = await pool.query(`SELECT id, question, answer, source, created_at FROM knowledge_base_qa WHERE ${whereClause} ORDER BY created_at DESC`, params);
        const assetsRes = await pool.query(`SELECT id, file_url, mime_type, description, created_at FROM knowledge_base_assets WHERE ${whereClause} ORDER BY created_at DESC`, params);

        res.json({ qa: qaRes.rows, assets: assetsRes.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/chatbot/kb/qa
export const addQA = async (req, res) => {
    const { organization_id } = req.user;
    const { question, answer, session_id } = req.body;

    try {
        // Feature Gate
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

        const apiKey = await getOrgKey(organization_id);
        let sqlVector = null;
        if (apiKey) {
            const textToEmbed = `Q: ${question}\nA: ${answer}`;
            const embeddingVector = await generateEmbedding(textToEmbed, apiKey);
            if (embeddingVector) sqlVector = toSqlVector(embeddingVector);
        }

        const result = await pool.query(
            `INSERT INTO knowledge_base_qa (organization_id, session_id, question, answer, embedding)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [organization_id, session_id || null, question, answer, sqlVector]
        );
        res.json({ ...result.rows[0], embedding_status: sqlVector ? 'embedded' : 'no_api_key' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/chatbot/kb/qa/:id
export const deleteQA = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        await pool.query('DELETE FROM knowledge_base_qa WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/chatbot/kb/upload
export const uploadAsset = async (req, res) => {
    const { organization_id } = req.user;
    const { description, session_id } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "File required" });

    try {
        // Feature Gate
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

        const apiKey = await getOrgKey(organization_id);
        const fileUrl = `/uploads/${file.filename}`;
        const textToEmbed = description || file.originalname;
        let sqlVector = null;
        if (apiKey) {
            const embeddingVector = await generateEmbedding(textToEmbed, apiKey);
            if (embeddingVector) sqlVector = toSqlVector(embeddingVector);
        }

        const result = await pool.query(
            `INSERT INTO knowledge_base_assets (organization_id, session_id, file_url, mime_type, description, embedding) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [organization_id, session_id || null, fileUrl, file.mimetype, textToEmbed, sqlVector]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE /api/app/chatbot/assets/:id
export const deleteAsset = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        await pool.query('DELETE FROM knowledge_base_assets WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/chatbot/sandbox
export const runSandbox = async (req, res) => {
    const { organization_id } = req.user;
    const { bot_id, message, history } = req.body;

    try {
        // 1. Fetch Bot Configuration
        const botRes = await pool.query('SELECT * FROM chatbot_settings WHERE id = $1 AND organization_id = $2', [bot_id, organization_id]);
        if (botRes.rows.length === 0) {
            return res.status(404).json({ error: "Bot not found" });
        }
        const botConfig = botRes.rows[0];

        // 2. Generate Response using the actual config
        const response = await generateResponse(organization_id, message, history || [], botConfig);

        res.json({ response });
    } catch (err) {
        console.error("[Sandbox Error]", err);
        res.status(500).json({ error: err.message });
    }
};

// --- AI LEARNING: AUTO-SUMMARIZE Q&A ---

// POST /api/app/knowledge/generate-from-chat
export const generateQAFromChat = async (req, res) => {
    const { organization_id } = req.user;
    const { conversation_id, limit = 20 } = req.body;

    if (!conversation_id) return res.status(400).json({ error: "Conversation ID required" });

    try {
        // Feature Gate
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

        // 1. Get AI Config
        const aiConfig = await getOrgAIConfig(organization_id);
        const activeKey = aiConfig?.ai_provider === 'openai' ? aiConfig.openai_api_key : aiConfig?.gemini_api_key;
        if (!activeKey) return res.status(400).json({ error: "API Key is missing. Please configure in Chatbot > API Settings." });

        // 2. Fetch Chat History
        const historyRes = await pool.query(
            `SELECT from_me, content, type 
             FROM messages 
             WHERE conversation_id = $1 AND organization_id = $2 AND type = 'text'
             ORDER BY created_at DESC 
             LIMIT $3`,
            [conversation_id, organization_id, limit]
        );

        if (historyRes.rows.length === 0) {
            return res.status(400).json({ error: "Not enough chat history to analyze." });
        }

        const messages = historyRes.rows.reverse(); // Oldest first

        // 3. Format Transcript
        const transcript = messages.map(m =>
            `${m.from_me ? 'Agent' : 'Customer'}: ${m.content}`
        ).join('\n');

        // 4. Construct Prompt
        const prompt = `
        Analisis transkrip percakapan berikut antara Customer Service (Agent) dan Pelanggan (Customer).
        Tugasmu adalah mengekstrak inti masalah dan solusinya menjadi format Q&A (Tanya Jawab) yang umum dan baku.

        ATURAN PENTING:
        1. Identifikasi satu pertanyaan utama yang diajukan Customer.
        2. Identifikasi jawaban lengkap dan solutif yang diberikan Agent.
        3. Buang semua basa-basi (salam, sapaan, emoji berlebih, obrolan santai).
        4. Generalisasi kontennya (jangan sebut nama user spesifik, nomor pesanan spesifik, atau data pribadi).
        5. Gunakan Bahasa Indonesia yang baku, sopan, dan profesional.
        6. OUTPUT MUST BE IN VALID JSON FORMAT EXACTLY LIKE THIS:
        { "question": "...", "answer": "..." }
        
        TRANSKRIP PERCAKAPAN:
        ${transcript}
        `;

        // 5. Call AI (Gemini or OpenAI depending on org setting)
        let qaData;
        if (aiConfig.ai_provider === 'openai') {
            const client = new OpenAI({ apiKey: aiConfig.openai_api_key });
            const completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            });
            qaData = JSON.parse(completion.choices[0].message.content);
        } else {
            const ai = new GoogleGenAI({ apiKey: aiConfig.gemini_api_key });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            answer: { type: Type.STRING }
                        },
                        required: ["question", "answer"]
                    }
                }
            });
            try {
                qaData = JSON.parse(response.text);
            } catch (e) {
                const cleanedText = response.text.replace(/```json|```/g, '').trim();
                qaData = JSON.parse(cleanedText);
            }
        }

        // Return Draft (Not saved yet)
        res.json({ data: qaData });

    } catch (err) {
        console.error("[Generate QA Error]", err);
        res.status(500).json({ error: err.message });
    }
};

// POST /api/app/knowledge/save-generated
export const saveGeneratedQA = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { question, answer, scope, session_id } = req.body; // scope: 'global' | 'device'

    if (!question || !answer) return res.status(400).json({ error: "Question and Answer required" });

    try {
        const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
        if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

        const apiKey = await getOrgKey(organization_id);
        if (!apiKey) return res.status(400).json({ error: "Google Gemini API Key is required for Knowledge Base embeddings. Please add it in Chatbot > API Settings." });

        // Embed
        const textToEmbed = `Q: ${question}\nA: ${answer}`;
        const embeddingVector = await generateEmbedding(textToEmbed, apiKey);
        if (!embeddingVector) return res.status(500).json({ error: "Embedding failed" });
        const sqlVector = toSqlVector(embeddingVector);

        // Determine Session ID based on Scope
        const sessionIdToSave = (scope === 'device' && session_id) ? session_id : null;

        const result = await pool.query(
            `INSERT INTO knowledge_base_qa (organization_id, session_id, question, answer, embedding, source, created_by_agent_id) 
             VALUES ($1, $2, $3, $4, $5, 'ai_generated', $6) RETURNING id`,
            [organization_id, sessionIdToSave, question, answer, sqlVector, userId]
        );

        res.json({ success: true, id: result.rows[0].id });

    } catch (err) {
        console.error("[Save Generated QA Error]", err);
        res.status(500).json({ error: err.message });
    }
};

// --- AI SKILL PRESETS & 1-CLICK DEPLOYMENT ---
export const getSkillPresets = async (req, res) => {
    try {
        res.json({
            success: true,
            data: AI_SKILL_PRESETS
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const applySkillPreset = async (req, res) => {
    const { id } = req.params;
    const { skillId, seedSampleQa } = req.body;
    const { organization_id, id: userId } = req.user;

    try {
        const preset = AI_SKILL_PRESETS.find(s => s.id === skillId);
        if (!preset) return res.status(404).json({ error: 'Skill preset not found' });

        const auto_reply_config = {
            welcome: {
                enabled: true,
                message: preset.welcome_message
            }
        };

        const updateResult = await pool.query(
            `UPDATE bot_configs 
             SET system_prompt = $1, 
                 escalation_keywords = $2, 
                 auto_reply_config = $3,
                 double_text_enabled = $4,
                 double_text_delay_minutes = $5,
                 updated_at = NOW()
             WHERE id = $6 AND organization_id = $7
             RETURNING *`,
            [
                preset.system_prompt,
                preset.escalation_keywords,
                JSON.stringify(auto_reply_config),
                preset.double_text_enabled,
                preset.double_text_delay_minutes,
                id,
                organization_id
            ]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        // Seed sample Q&A if requested
        if (seedSampleQa && preset.sample_qa && preset.sample_qa.length > 0) {
            const apiKey = await getOrgKey(organization_id);
            for (const qa of preset.sample_qa) {
                let sqlVector = null;
                if (apiKey) {
                    try {
                        const embedding = await generateEmbedding(`Q: ${qa.question}\nA: ${qa.answer}`, apiKey);
                        if (embedding) sqlVector = toSqlVector(embedding);
                    } catch (e) {
                        console.warn('[Skill Seed QA Embedding Warning]', e.message);
                    }
                }
                await pool.query(
                    `INSERT INTO knowledge_base_qa (organization_id, session_id, question, answer, embedding, source, created_by_agent_id)
                     VALUES ($1, $2, $3, $4, $5, 'skill_preset', $6)`,
                    [organization_id, id, qa.question, qa.answer, sqlVector, userId]
                );
            }
        }

        res.json({
            success: true,
            message: `Skill '${preset.name}' applied successfully`,
            bot: updateResult.rows[0],
            preset
        });
    } catch (err) {
        console.error('[Apply Skill Error]', err);
        res.status(500).json({ error: err.message });
    }
};

