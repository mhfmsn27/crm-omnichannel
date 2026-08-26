import express from 'express';
import pool from '../config/db.js';
import * as waGatewayService from '../services/waGatewayService.js';
import * as inboxController from '../controllers/inboxController.js';
import * as aiCopilotController from '../controllers/aiCopilotController.js';
import * as paymentLinkController from '../controllers/paymentLinkController.js';
import * as whatsappFlowController from '../controllers/whatsappFlowController.js';
import * as followupController from '../controllers/followupController.js';
import * as ticketController from '../controllers/ticketController.js';
import * as inboxSettingsController from '../controllers/inboxSettingsController.js';
import * as inboxIsolationController from '../controllers/inboxIsolationController.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';
import { requireActiveSubscription } from '../middleware/planMiddleware.js';
import { checkSystemFlag } from '../services/systemGateService.js';

const router = express.Router();

// Apply System Flag check if required
router.use(checkSystemFlag('mod_inbox'));

// --- Conversations CRUD & Listing ---
router.get('/conversations', inboxController.getConversations);
router.get('/count', inboxController.getUnreadCount);
router.post('/conversations', requireActiveSubscription, inboxController.createConversation);
router.post('/conversations/bulk-action', inboxController.bulkActionConversations);
router.get('/conversations/:id', inboxController.getConversationDetail);
router.get('/conversations/:id/messages', inboxController.getMessages);
router.get('/banners', inboxController.getInboxBanners);

// --- Message Sending & Types ---
router.post('/conversations/:id/send', requireActiveSubscription, inboxController.sendMessage);
router.post('/conversations/:id/structured', requireActiveSubscription, inboxController.sendStructuredMessage);
router.post('/conversations/:id/rich-media', requireActiveSubscription, inboxController.sendRichMedia);
router.post('/conversations/:id/interactive', requireActiveSubscription, inboxController.sendInteractive);
router.post('/upload', robustUpload, inboxController.uploadMedia);

// --- Conversation Actions ---
router.put('/conversations/:id/read', inboxController.markAsRead);
router.post('/conversations/:id/assign', inboxController.assignConversation);
router.get('/conversations/:id/ratings', inboxController.getRatings);
router.post('/conversations/:id/resolve', inboxController.resolveConversation);
router.post('/conversations/:id/toggle-bot', inboxController.toggleChatbot);
router.post('/conversations/:id/status', inboxController.updateConversationStatus);
router.post('/conversations/:id/reopen', inboxController.reopenConversation);
router.post('/conversations/:id/stop-flow', inboxController.stopActiveFlow);
router.post('/conversations/:id/archive', inboxController.toggleArchive);
router.post('/conversations/:id/pin', inboxController.togglePin);
router.post('/conversations/:id/unread', inboxController.toggleUnread);
router.post('/conversations/:id/mute', inboxController.toggleMuteConversation);
router.delete('/conversations/:id/messages', inboxController.clearChat);
router.delete('/conversations/:id', inboxController.deleteConversation);
router.post('/conversations/:id/labels', inboxController.updateLabels);
router.get('/conversations/:id/media', inboxController.getMediaGallery);

// --- Message Level Actions ---
router.delete('/messages/:id', inboxController.deleteMessage);
router.put('/messages/:id', inboxController.editMessage);
router.post('/messages/:id/star', inboxController.toggleStarMessage);
router.post('/messages/:id/pin', inboxController.togglePinMessage);
router.post('/messages/:id/retry', inboxController.retryMessage);
router.get('/starred', inboxController.getStarredMessages);

// --- Contact Blocking in Inbox ---
router.post('/contacts/:id/block', inboxController.toggleBlockContact);

// --- Typing Indicator ---
router.post('/conversations/:id/typing', async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { isTyping } = req.body;
    try {
        const convRes = await pool.query(
            'SELECT whatsapp_session_id, contact_id FROM conversations WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (convRes.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
        const { whatsapp_session_id } = convRes.rows[0];
        if (whatsapp_session_id) {
            const sessionRes = await pool.query('SELECT session_id FROM whatsapp_sessions WHERE id = $1', [whatsapp_session_id]);
            if (sessionRes.rows.length > 0) {
                const contactRes = await pool.query('SELECT phone_number FROM contacts WHERE id = $1', [convRes.rows[0].contact_id]);
                const phone = contactRes.rows[0]?.phone_number;
                if (phone) {
                    waGatewayService.sendTyping(sessionRes.rows[0].session_id, phone, isTyping !== false);
                }
            }
        }
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- AI Copilot & Suggestions ---
router.post('/conversations/:id/ai-suggest', aiCopilotController.suggestReply);
router.post('/conversations/:id/summarize', aiCopilotController.summarizeConversation);

// --- Payment Links in Inbox ---
router.post('/conversations/:id/create-payment-link', paymentLinkController.createPaymentLink);
router.get('/conversations/:id/payment-links', paymentLinkController.getPaymentLinks);

// --- WhatsApp Flows ---
router.get('/conversations/:id/wa-flows', whatsappFlowController.listFlows);
router.post('/conversations/:id/send-flow', whatsappFlowController.sendFlow);

// --- Auto Follow-up ---
router.post('/conversations/:conversationId/followup/start', followupController.startFollowup);
router.post('/conversations/:conversationId/followup/stop', followupController.stopFollowup);
router.get('/conversations/:conversationId/followup/status', followupController.getFollowupStatus);

// --- Priority ---
router.patch('/conversations/:id/priority', ticketController.updateConversationPriority);

// --- Assignment Settings ---
router.get('/settings/assignment', inboxSettingsController.getAssignmentSettings);
router.put('/settings/assignment', inboxSettingsController.updateAssignmentSettings);

export default router;
