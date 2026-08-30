import express from 'express';
import * as saDashboardController from '../controllers/sa/dashboardController.js';
import * as saMemberController from '../controllers/sa/memberController.js';
import * as saPlanController from '../controllers/sa/planController.js';
import * as saOrderController from '../controllers/sa/orderController.js';
import * as saAddonController from '../controllers/sa/addonController.js';
import * as saPromoCodeController from '../controllers/sa/promoCodeController.js';
import * as saPaymentChannelController from '../controllers/sa/paymentChannelController.js';
import * as saNotificationController from '../controllers/sa/notificationController.js';
import * as saSettingController from '../controllers/sa/settingController.js';
import * as saFeatureFlagController from '../controllers/sa/featureFlagController.js';
import * as saAnnouncementController from '../controllers/sa/announcementController.js';
import * as cmsController from '../controllers/cmsController.js';
import * as affiliateController from '../controllers/affiliateController.js';
import * as healthController from '../controllers/healthController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Require superadmin role for all SA routes
router.use(authenticateToken);
router.use(requireRole(['superadmin', 'super_admin']));

// --- Dashboard & Monitoring ---
router.get('/dashboard', saDashboardController.getDashboardData);
router.get('/queues/stats', healthController.getQueueStats);

// --- Subscription Plans ---
router.get('/plans', saPlanController.getPlans);
router.get('/plans/:id', saPlanController.getPlanById);
router.post('/plans', saPlanController.createPlan);
router.put('/plans/:id', saPlanController.updatePlan);
router.delete('/plans/:id', saPlanController.deletePlan);

// --- Members ---
router.get('/members', saMemberController.getMembers);
router.post('/members', saMemberController.createMember);
router.get('/members/:id', saMemberController.getMemberById);
router.delete('/members/:id', saMemberController.deleteMember);
router.put('/members/:id/status', saMemberController.toggleStatus);
router.get('/members/:id/reports', saMemberController.getMemberReports);
router.get('/members/:id/channels', saMemberController.getMemberChannels);
router.delete('/members/:id/channels/:type/:channelId', saMemberController.forceDeleteChannel);
router.post('/members/:id/manual-override', saMemberController.manualOverride);
router.post('/members/:id/webhook', saMemberController.updateWebhook);

// --- Orders & Billing ---
router.get('/orders', saOrderController.getOrders);
router.post('/orders/:id/approve', saOrderController.approveOrder);
router.post('/orders/:id/reject', saOrderController.rejectOrder);

// --- Add-ons ---
router.get('/addons', saAddonController.getAddons);
router.post('/addons', saAddonController.createAddon);
router.put('/addons/:id', saAddonController.updateAddon);
router.delete('/addons/:id', saAddonController.deleteAddon);

// --- Promo Codes ---
router.get('/promo-codes', saPromoCodeController.getPromoCodes);
router.post('/promo-codes', saPromoCodeController.createPromoCode);
router.delete('/promo-codes/:id', saPromoCodeController.deletePromoCode);
router.put('/promo-codes/:id/toggle', saPromoCodeController.togglePromoCode);

// --- Payment Channels ---
router.get('/payment-channels', saPaymentChannelController.getChannels);
router.post('/payment-channels', saPaymentChannelController.createChannel);
router.put('/payment-channels/:id', saPaymentChannelController.updateChannel);
router.delete('/payment-channels/:id', saPaymentChannelController.deleteChannel);

// --- CMS Landing & Pages ---
router.get('/cms/landing', cmsController.getLandingSections);
router.put('/cms/landing/:sectionKey', cmsController.updateLandingSection);
router.post('/cms/landing/upload', robustUpload, cmsController.uploadLandingImage);

router.get('/cms/pages', cmsController.getPages);
router.post('/cms/pages', cmsController.createPage);
router.get('/cms/pages/:id', cmsController.getPageById);
router.put('/cms/pages/:id', cmsController.updatePage);
router.delete('/cms/pages/:id', cmsController.deletePage);

router.get('/cms/tutorials', (req, res) => cmsController.getPages(req, res));
router.post('/cms/tutorials', (req, res) => cmsController.createPage(req, res));
router.delete('/cms/tutorials/:id', (req, res) => cmsController.deletePage(req, res));

// --- Announcements ---
router.get('/announcements', saAnnouncementController.getAnnouncements);
router.post('/announcements', saAnnouncementController.createAnnouncement);
router.delete('/announcements/:id', saAnnouncementController.deleteAnnouncement);
router.post('/announcements/:id/toggle', saAnnouncementController.toggleStatus);

// --- Notification Center ---
router.get('/notifications/device', saNotificationController.getAdminDevices);
router.post('/notifications/device', saNotificationController.connectAdminDevice);
router.delete('/notifications/device/:id', saNotificationController.deleteAdminDevice);
router.get('/notifications/templates', saNotificationController.getTemplates);
router.post('/notifications/templates', saNotificationController.createTemplate);
router.delete('/notifications/templates/:id', saNotificationController.deleteTemplate);
router.put('/notifications/templates/:id', saNotificationController.updateTemplate);
router.post('/notifications/broadcast', saNotificationController.sendManualBroadcast);

// --- Platform Settings ---
router.get('/settings', saSettingController.getAllSettings);
router.post('/settings', saSettingController.updateSettings);
router.post('/settings/upload', robustUpload, saSettingController.uploadAsset);
router.post('/settings/test-smtp', saSettingController.testSmtp);

// --- Feature Flags ---
router.get('/features', saFeatureFlagController.getFlags);
router.put('/features/:key', saFeatureFlagController.updateFlag);

// --- Affiliate Admin ---
router.get('/affiliate/payouts', (req, res) => affiliateController.getAdminPayoutRequests(req, res));
router.put('/affiliate/payouts/:id', (req, res) => affiliateController.updatePayoutStatus(req, res));

export default router;
