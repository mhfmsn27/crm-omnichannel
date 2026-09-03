import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import * as advancedAnalyticsController from '../controllers/advancedAnalyticsController.js';
import * as wallboardController from '../controllers/wallboardController.js';

const router = express.Router();

// General & Export Analytics
router.get('/export/agents', analyticsController.exportAgentPerformance);
router.get('/export/sla', analyticsController.exportAgentPerformance);
router.get('/export/history', analyticsController.exportResponderHistory);
router.get('/export', analyticsController.exportGeneralAnalytics);
router.get('/responder-history', analyticsController.getResponderHistory);
router.get('/live-wallboard', wallboardController.getLiveWallboardMetrics);

// Advanced Analytics Dashboards
router.get('/overview', advancedAnalyticsController.getOverview);
router.get('/conversations', advancedAnalyticsController.getConversationAnalytics);
router.get('/response-time', advancedAnalyticsController.getResponseTimeAnalytics);
router.get('/csat', advancedAnalyticsController.getCsatAnalytics);
router.get('/channels', advancedAnalyticsController.getChannelAnalytics);
router.get('/peak-hours', advancedAnalyticsController.getPeakHours);
router.get('/realtime', advancedAnalyticsController.getRealtimeAnalytics);

// Default analytics
router.get('/', analyticsController.getAnalytics);

export default router;
