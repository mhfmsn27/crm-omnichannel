import express from 'express';
import * as broadcastController from '../controllers/broadcastController.js';
import * as broadcastScheduleController from '../controllers/broadcastScheduleController.js';
import * as upsellingController from '../controllers/upsellingController.js';
import * as warmerController from '../controllers/warmerController.js';
import { broadcastLimiter } from '../middleware/rateLimiter.js';
import { multerUpload } from '../middleware/uploadMiddleware.js';
import { requireActiveSubscription, checkPlanFeature } from '../middleware/planMiddleware.js';
import { checkSystemFlag } from '../services/systemGateService.js';

const router = express.Router();

// --- Broadcast Campaigns ---
router.post('/create', checkSystemFlag('mod_broadcast'), requireActiveSubscription, broadcastLimiter, multerUpload.fields([{ name: 'media', maxCount: 1 }, { name: 'file', maxCount: 1 }]), broadcastController.createCampaign);
router.get('/campaigns', checkSystemFlag('mod_broadcast'), broadcastController.getCampaigns);
router.get('/campaigns/:id', checkSystemFlag('mod_broadcast'), broadcastController.getCampaignDetails);
router.post('/campaigns/:id/action', checkSystemFlag('mod_broadcast'), broadcastController.controlCampaign);
router.get('/campaigns/:id/export', checkSystemFlag('mod_broadcast'), broadcastController.exportReport);
router.get('/groups', checkSystemFlag('mod_broadcast'), broadcastController.getRotatorGroups);
router.get('/device/:deviceId/groups', checkSystemFlag('mod_broadcast'), broadcastController.getDeviceGroups);
router.delete('/campaigns/:id', checkSystemFlag('mod_broadcast'), broadcastController.deleteCampaign);
router.post('/campaigns/:id/retry', checkSystemFlag('mod_broadcast'), broadcastController.retryFailedRecipients);
router.post('/campaigns/:id/recipients/:recipientId/retry', checkSystemFlag('mod_broadcast'), broadcastController.retrySingleRecipient);

// --- Broadcast Global Settings (Telegram Bot & Email) ---
router.get('/settings', checkSystemFlag('mod_broadcast'), broadcastController.getBroadcastSettings);
router.put('/settings', checkSystemFlag('mod_broadcast'), broadcastController.updateBroadcastSettings);
router.post('/settings/telegram/test', checkSystemFlag('mod_broadcast'), broadcastController.testTelegramNotification);
router.post('/settings/email/test', checkSystemFlag('mod_broadcast'), broadcastController.testEmailNotification);

// --- Scheduled Broadcasts ---
router.get('/scheduled', checkSystemFlag('mod_broadcast'), broadcastScheduleController.getScheduled);
router.post('/scheduled', checkSystemFlag('mod_broadcast'), broadcastScheduleController.createScheduled);
router.put('/scheduled/:id', checkSystemFlag('mod_broadcast'), broadcastScheduleController.updateScheduled);
router.put('/scheduled/:id/cancel', checkSystemFlag('mod_broadcast'), broadcastScheduleController.cancelScheduled);

// --- Warmer Circle ---
router.get('/warmer', warmerController.getWarmers);
router.post('/warmer', warmerController.createWarmer);
router.put('/warmer/:id', warmerController.updateWarmer);
router.patch('/warmer/:id/toggle', warmerController.toggleWarmer);
router.post('/warmer/:id/reset', warmerController.resetWarmer);
router.delete('/warmer/:id', warmerController.deleteWarmer);
router.get('/warmer/:id/report', warmerController.getReport);

// --- Upselling Module ---
router.get('/upselling', checkPlanFeature('feat_upselling'), upsellingController.getUpsellings);
router.post('/upselling', checkPlanFeature('feat_upselling'), upsellingController.createUpselling);
router.put('/upselling/:id', checkPlanFeature('feat_upselling'), upsellingController.updateUpselling);
router.delete('/upselling/:id', checkPlanFeature('feat_upselling'), upsellingController.deleteUpselling);

export default router;
