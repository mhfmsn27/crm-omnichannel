import express from 'express';
import * as aiCopilotController from '../controllers/aiCopilotController.js';

const router = express.Router();

// AI Smart Reply Suggestions
router.get('/suggestions/:conversationId', aiCopilotController.getSuggestions);
router.post('/suggestions/:conversationId/refresh', aiCopilotController.refreshSuggestions);
router.post('/suggestions/:conversationId/use', aiCopilotController.useSuggestion);

// AI Single-Click Suggest & Tone Rewriter
router.post('/suggest', aiCopilotController.suggestReply);
router.post('/rewrite', aiCopilotController.rewriteMessage);
router.post('/summarize/:id', aiCopilotController.summarizeConversation);
router.post('/transcribe-audio', aiCopilotController.transcribeAudio);

export default router;
