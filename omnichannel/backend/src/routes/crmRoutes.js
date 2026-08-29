import express from 'express';
import * as pipelineController from '../controllers/pipelineController.js';
import * as taskController from '../controllers/taskController.js';
import * as ticketController from '../controllers/ticketController.js';
import * as csatController from '../controllers/csatController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as salesReportController from '../controllers/reports/salesReportController.js';
import * as gamificationController from '../controllers/gamificationController.js';
import * as salesVisitController from '../controllers/salesVisitController.js';
import * as auditLogController from '../services/auditLogService.js';

const router = express.Router();

// --- Pipelines & Stages ---
router.get('/pipelines', pipelineController.getPipelines);
router.post('/pipelines', pipelineController.createPipeline);
router.get('/pipelines/:id', pipelineController.getPipelineDetail);
router.get('/pipelines/:id/export', pipelineController.exportPipelineData);
router.put('/pipelines/:id', pipelineController.updatePipeline);
router.delete('/pipelines/:id', pipelineController.deletePipeline);
router.get('/pipelines/:pipelineId/board', pipelineController.getBoardData);

router.post('/pipelines/:pipelineId/stages', pipelineController.addStage);
router.put('/stages/:id', pipelineController.updateStage);
router.delete('/stages/:id', pipelineController.deleteStage);

// --- Conversation Pipeline / Deal Actions ---
router.post('/conversations/:conversationId/pipeline', pipelineController.setConversationStage);
router.patch('/conversations/:conversationId/deal', pipelineController.updateDealDetails);

// --- Tasks & Reminders ---
router.get('/tasks/stats', taskController.getTaskStats);
router.get('/tasks', taskController.getTasks);
router.post('/tasks', taskController.createTask);
router.put('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);

// --- CSAT Surveys ---
router.get('/csat/settings', csatController.getSettings);
router.put('/csat/settings', csatController.updateSettings);
router.get('/csat/surveys', csatController.getSurveys);
router.get('/csat/stats', csatController.getStats);
router.post('/csat/trigger/:conversationId', csatController.triggerSurvey);

// --- Analytics & Reports ---
router.get('/analytics/export', analyticsController.exportGeneralAnalytics);
router.get('/analytics/export/agents', analyticsController.exportAgentPerformance);
router.get('/analytics/export/sla', analyticsController.exportAgentPerformance);
router.get('/analytics/export/history', analyticsController.exportResponderHistory);
router.get('/analytics', analyticsController.getAnalytics);
router.get('/analytics/responder-history', analyticsController.getResponderHistory);
router.get('/reports/pipeline-stats', salesReportController.getPipelineStats);

// --- Sales Visits (GPS Check-In Field Sales) ---
router.get('/sales-visits', salesVisitController.getSalesVisits);
router.post('/sales-visits', salesVisitController.recordSalesVisit);

import * as wallboardController from '../controllers/wallboardController.js';
import * as callLogController from '../controllers/callLogController.js';

// --- Live Wallboard & TV Display ---
router.get('/analytics/live-wallboard', wallboardController.getLiveWallboardMetrics);

// --- Click-to-Call & Telephony Logs ---
router.post('/calls/log', callLogController.recordCallLog);
router.get('/calls/history/:contact_id', callLogController.getCallHistory);

// --- Gamification ---
router.get('/gamification/leaderboard', gamificationController.getLeaderboard);
router.get('/gamification/me', gamificationController.getAgentStats);
router.post('/gamification/award', gamificationController.awardPoints);
router.post('/gamification/streak', gamificationController.updateStreak);

export default router;
