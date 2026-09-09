/**
 * Inbox Controller — Multi-Channel Omnichannel Inbox Hub
 *
 * Modularized into focused sub-controllers:
 * - ./inbox/inboxCache.js (Redis caching for unread counts & lists)
 * - ./inbox/conversationController.js (Queries, details, create, banners, media gallery, delete)
 * - ./inbox/conversationActionController.js (Read, assign, resolve, chatbot toggle, status, archive, pin, unread, mute, block, ratings)
 * - ./inbox/messageController.js (Get messages, send, rich media, structured, interactive, upload, delete, edit, star, retry)
 */

import pool from '../config/db.js';

// Schema Ensure for internal_note and agent_mentions
const ensureSchema = async () => {
    try {
        await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_note TEXT');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS agent_mentions (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL,
                conversation_id INTEGER NOT NULL,
                message_id INTEGER,
                mentioned_user_id INTEGER NOT NULL,
                created_by INTEGER NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_agent_mentions_user ON agent_mentions(organization_id, mentioned_user_id, is_read);
        `);
    } catch (e) {
        console.warn("Schema check warning:", e.message);
    }
};
ensureSchema();

// Cache Exports
export * from './inbox/inboxCache.js';

// Conversation Queries & CRUD Exports
export {
    getUnreadCount,
    getInboxBanners,
    createConversation,
    getConversations,
    getConversationDetail,
    updateLabels,
    getMediaGallery,
    deleteConversation,
    clearChat
} from './inbox/conversationController.js';

// Conversation Actions & Lifecycle Exports
export {
    markAsRead,
    assignConversation,
    resolveConversation,
    submitRating,
    getRatings,
    toggleChatbot,
    updateConversationStatus,
    reopenConversation,
    stopActiveFlow,
    toggleArchive,
    togglePin,
    toggleUnread,
    toggleMuteConversation,
    toggleBlockContact,
    bulkActionConversations,
    snoozeConversation,
    unsnoozeConversation
} from './inbox/conversationActionController.js';

// Message CRUD & Operations Exports
export {
    getMessages,
    sendMessage,
    sendStructuredMessage,
    sendRichMedia,
    sendInteractive,
    sendListMessage,
    getAgentMentions,
    markMentionRead,
    uploadMedia,
    deleteMessage,
    editMessage,
    toggleStarMessage,
    togglePinMessage,
    getStarredMessages,
    retryMessage
} from './inbox/messageController.js';
