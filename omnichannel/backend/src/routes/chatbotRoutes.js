import express from 'express';
import * as chatbotController from '../controllers/chatbotController.js';
import * as chatbotReportController from '../controllers/reports/chatbotReportController.js';
import * as chatbotTrainingController from '../controllers/chatbotTrainingController.js';
import * as flowController from '../controllers/flowController.js';
import aiToolsRoutes from './aiToolsRoutes.js';
import aiLogsRoutes from './aiLogsRoutes.js';
import aiTestRoutes from './aiTestRoutes.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';
import { checkSystemFlag } from '../services/systemGateService.js';

const router = express.Router();

// --- Reporting ---
router.get('/report/summary', checkSystemFlag('mod_chatbot'), chatbotReportController.getChatbotSummary);
router.get('/report/kb-performance', checkSystemFlag('mod_chatbot'), chatbotReportController.getKnowledgeBaseStats);
router.get('/report/trends', checkSystemFlag('mod_chatbot'), chatbotReportController.getTimeSeriesStats);

// --- Bot CRUD ---
router.get('/bots', checkSystemFlag('mod_chatbot'), chatbotController.getBots);
router.post('/bots', checkSystemFlag('mod_chatbot'), chatbotController.createBot);
router.get('/bots/:id', checkSystemFlag('mod_chatbot'), chatbotController.getBotDetail);
router.put('/bots/:id', checkSystemFlag('mod_chatbot'), chatbotController.updateBot);
router.patch('/bots/:id/device', checkSystemFlag('mod_chatbot'), chatbotController.updateBotDevice);
router.delete('/bots/:id', checkSystemFlag('mod_chatbot'), chatbotController.deleteBot);

// --- Knowledge Base ---
router.get('/kb', checkSystemFlag('mod_chatbot'), chatbotController.getKB);
router.post('/kb/qa', checkSystemFlag('mod_chatbot'), chatbotController.addQA);
router.delete('/kb/qa/:id', checkSystemFlag('mod_chatbot'), chatbotController.deleteQA);
router.post('/kb/upload', checkSystemFlag('mod_chatbot'), robustUpload, chatbotController.uploadAsset);
router.delete('/kb/assets/:id', checkSystemFlag('mod_chatbot'), chatbotController.deleteAsset);
router.post('/knowledge/generate-from-chat', checkSystemFlag('mod_chatbot'), chatbotController.generateQAFromChat);
router.post('/knowledge/save-generated', checkSystemFlag('mod_chatbot'), chatbotController.saveGeneratedQA);

// --- API Key & Sandbox ---
router.get('/api-key', checkSystemFlag('mod_chatbot'), chatbotController.getApiKey);
router.put('/api-key', checkSystemFlag('mod_chatbot'), chatbotController.updateApiKey);
router.post('/sandbox', checkSystemFlag('mod_chatbot'), chatbotController.runSandbox);

// --- AI CS Skills Presets ---
router.get('/skills', checkSystemFlag('mod_chatbot'), chatbotController.getSkillPresets);
router.post('/skills/apply/:id', checkSystemFlag('mod_chatbot'), chatbotController.applySkillPreset);

// --- Chatbot Training Data ---
router.get('/training', chatbotTrainingController.getTrainingData);
router.post('/training', chatbotTrainingController.addTrainingData);
router.put('/training/:id', chatbotTrainingController.updateTrainingData);
router.delete('/training/:id', chatbotTrainingController.deleteTrainingData);
router.get('/training/stats', chatbotTrainingController.getStats);
router.post('/training/import', chatbotTrainingController.bulkImport);

// --- AI Tools, Logs, Test Sub-Routers ---
router.use('/tools', aiToolsRoutes);
router.use('/logs', aiLogsRoutes);
router.use('/simulate', aiTestRoutes);

// --- Visual Flows ---
router.get('/flows', checkPlanFeature('feat_flowbuilder'), flowController.getFlows);
router.get('/flows/:id', checkPlanFeature('feat_flowbuilder'), flowController.getFlowById);
router.post('/flows', checkPlanFeature('feat_flowbuilder'), flowController.createFlow);
router.put('/flows/:id', checkPlanFeature('feat_flowbuilder'), flowController.updateFlow);
router.delete('/flows/:id', checkPlanFeature('feat_flowbuilder'), flowController.deleteFlow);

export default router;
