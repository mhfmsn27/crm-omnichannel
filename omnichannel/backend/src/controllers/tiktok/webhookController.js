/**
 * TikTok Webhook Controller
 * Enhanced: Auto-reply, auto-label, conversation management
 */

import pool from '../../config/db.js';
import crypto from 'crypto';
import { processAndApplyAutoLabels, isContactFirstMessage } from '../../services/autoLabelService.js';
import { autoAssignConversation } from '../inboxSettingsController.js';
import { initTicket } from '../ticketController.js';
import * as AutoReplyService from '../../services/AutoReplyService.js';

export const handleWebhook = async (req, res) => {
    const body = req.body;

    // TikTok webhook verification
    if (req.query.verify_token) {
        const VERIFY_TOKEN = process.env.TIKTOK_VERIFY_TOKEN || 'tiktok_verify';
        if (req.query.verify_token === VERIFY_TOKEN) {
            return res.status(200).send(req.query.challenge);
        }
        return res.status(403).send('Invalid token');
    }

    try {
        console.log("[TikTok Webhook] Received:", JSON.stringify(body, null, 2));

        const eventType = body.event;
        const eventData = body.data || body;

        switch (eventType) {
            case 'conversation_started':
                await handleNewConversation(req, eventData);
                break;
            case 'conversation_message_create':
                await handleIncomingMessage(req, eventData);
                break;
            default:
                console.log("[TikTok Webhook] Unhandled event type:", eventType);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error("[TikTok Webhook] Error:", error);
        res.status(500).send('Internal Server Error');
    }
};

const handleNewConversation = async (req, eventData) => {
    try {
        const { open_id, channel_id } = eventData;
        const io = req.io;

        // Find TikTok account config
        const accountRes = await pool.query(
            'SELECT * FROM tiktok_accounts WHERE account_id = $1 AND is_active = true',
            [channel_id]
        );

        if (accountRes.rows.length === 0) {
            console.warn('[TikTok] Account not found:', channel_id);
            return;
        }

        const account = accountRes.rows[0];
        const { organization_id, ai_auto_reply } = account;

        // Upsert contact
        let contactId;
        const contactCheck = await pool.query(
            'SELECT id FROM contacts WHERE organization_id = $1 AND tiktok_id = $2',
            [organization_id, open_id]
        );

        if (contactCheck.rows.length > 0) {
            contactId = contactCheck.rows[0].id;
        } else {
            const newContact = await pool.query(
                `INSERT INTO contacts (organization_id, tiktok_id, name, source)
                 VALUES ($1, $2, $3, 'tiktok') RETURNING id`,
                [organization_id, open_id, 'TikTok User ' + (open_id ? open_id.substring(0, 6) : 'Unknown')]
            );
            contactId = newContact.rows[0].id;
        }

        // Create conversation
        const convCheck = await pool.query(
            'SELECT id FROM conversations WHERE organization_id = $1 AND tiktok_user_id = $2',
            [organization_id, open_id]
        );

        if (convCheck.rows.length === 0) {
            await pool.query(
                `INSERT INTO conversations (organization_id, contact_id, tiktok_user_id, channel, status, is_chatbot_active)
                 VALUES ($1, $2, $3, 'tiktok', 'open', $4)`,
                [organization_id, contactId, open_id, ai_auto_reply || false]
            );
        }

        console.log('[TikTok] New conversation processed for:', open_id);

    } catch (error) {
        console.error('[TikTok] Error handling new conversation:', error);
    }
};

const handleIncomingMessage = async (req, eventData) => {
    try {
        const { open_id, channel_id, message } = eventData;
        const io = req.io;

        // Find TikTok account
        const accountRes = await pool.query(
            'SELECT * FROM tiktok_accounts WHERE account_id = $1 AND is_active = true',
            [channel_id]
        );

        if (accountRes.rows.length === 0) return;
        const account = accountRes.rows[0];
        const { organization_id, ai_auto_reply } = account;

        // Get contact
        const contactRes = await pool.query(
            'SELECT id FROM contacts WHERE organization_id = $1 AND tiktok_id = $2',
            [organization_id, open_id]
        );

        if (contactRes.rows.length === 0) return;
        const contactId = contactRes.rows[0].id;

        // Get conversation
        const convRes = await pool.query(
            `SELECT id, is_chatbot_active FROM conversations
             WHERE organization_id = $1 AND tiktok_user_id = $2 AND channel = 'tiktok'
             ORDER BY created_at DESC LIMIT 1`,
            [organization_id, open_id]
        );

        if (convRes.rows.length === 0) return;
        const conversationId = convRes.rows[0].id;
        const isChatbotActive = convRes.rows[0].is_chatbot_active;

        // Extract message content
        const text = message?.text || '';
        const msgType = message?.msg_type || 'text';
        const msgId = message?.msg_id || 'tiktok-' + Date.now();

        // Save message
        await pool.query(
            `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id)
             VALUES ($1, $2, false, $3, $4, 'received', $5)
             ON CONFLICT (wa_message_id) DO NOTHING`,
            [conversationId, organization_id, msgType, text, msgId]
        );

        // Update conversation
        await pool.query(
            `UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, status = 'open'
             WHERE id = $2`,
            [text || '[' + msgType + ']', conversationId]
        );

        // Emit socket
        io.to('org_' + organization_id).emit('new_message', { conversationId });

        // AUTO-LABEL: Process and apply labels
        const isFirst = await isContactFirstMessage(organization_id, contactId);
        processAndApplyAutoLabels(organization_id, contactId, conversationId, 'tiktok', text, isFirst).catch(e =>
            console.error('[AutoLabel] TikTok Error:', e)
        );

        // Auto-reply / Keyword matching
        if (text && isChatbotActive && ai_auto_reply) {
            try {
                const autoReplyResult = await AutoReplyService.processIncomingMessage(
                    { organization_id: organization_id, session_id: channel_id },
                    contactId,
                    text,
                    open_id,
                    'tiktok',
                    {}
                );

                if (autoReplyResult && autoReplyResult.handled) {
                    console.log('[TikTok] Handled by AutoReply (' + autoReplyResult.type + ')');
                }
            } catch (e) {
                console.error('[TikTok] AutoReply error:', e);
            }
        }

        console.log('[TikTok] Message processed:', text.substring(0, 50));

    } catch (error) {
        console.error('[TikTok] Error handling message:', error);
    }
};

// ==========================================
// SCHEMA: Ensure TikTok tables exist
// ==========================================

export const ensureTikTokSchema = async () => {
    try {
        // Add TikTok columns to existing tables
        await pool.query(
            "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tiktok_id VARCHAR(100)"
        );
        await pool.query(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tiktok_user_id VARCHAR(100)"
        );
        await pool.query(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tiktok_account_id BIGINT"
        );
        await pool.query(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp'"
        );

        // Create TikTok accounts table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tiktok_accounts (
                id SERIAL PRIMARY KEY,
                organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                account_id VARCHAR(100),
                username VARCHAR(100),
                access_token TEXT,
                refresh_token TEXT,
                webhook_url TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                auto_reply_comments BOOLEAN DEFAULT FALSE,
                ai_auto_reply BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await pool.query("CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_org ON tiktok_accounts(organization_id)");

        console.log('[TikTok] Schema ensured');
    } catch (e) {
        console.warn('[TikTok] Schema warning:', e.message);
    }
};

// Run schema check
ensureTikTokSchema();