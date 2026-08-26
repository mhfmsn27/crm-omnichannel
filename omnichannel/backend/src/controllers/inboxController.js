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

// Schema Ensure for internal_note
const ensureSchema = async () => {
    try {
        await pool.query('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_note TEXT');
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
    bulkActionConversations
} from './inbox/conversationActionController.js';

// Message CRUD & Operations Exports
export {
    getMessages,
    sendMessage,
    sendStructuredMessage,
    sendRichMedia,
    sendInteractive,
    uploadMedia,
    deleteMessage,
    editMessage,
    toggleStarMessage,
    togglePinMessage,
    getStarredMessages,
    retryMessage
} from './inbox/messageController.js';
