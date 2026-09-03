import express from 'express';
import * as deviceController from '../controllers/deviceController.js';
import * as webchatController from '../controllers/webchatController.js';
import * as multiLanguageController from '../controllers/multiLanguageController.js';
import * as workflowController from '../controllers/workflowController.js';
import * as scheduledMessageController from '../controllers/scheduledMessageController.js';
import * as ecommerceController from '../controllers/ecommerceController.js';
import * as messageArchiveController from '../controllers/messageArchiveController.js';
import * as formController from '../controllers/formController.js';
import * as developerAppController from '../controllers/developerAppController.js';
import * as organizationController from '../controllers/organizationController.js';
import * as teamController from '../controllers/teamController.js';
import * as rolesController from '../controllers/rolesController.js';
import * as divisionsController from '../controllers/divisionsController.js';
import * as quickReplyController from '../controllers/quickReplyController.js';
import * as quickReplyGlobalController from '../controllers/quickReplyGlobalController.js';
import * as agentNotesController from '../controllers/agentNotesController.js';
import * as autoReplyController from '../controllers/autoReplyController.js';
import * as toolController from '../controllers/toolController.js';
import * as contactImportController from '../controllers/contactImportController.js';
import * as waTemplateController from '../controllers/waTemplateController.js';
import * as workingHoursController from '../controllers/workingHoursController.js';
import * as emailController from '../controllers/emailController.js';
import * as autoArchiveController from '../controllers/autoArchiveController.js';
import * as inboxIsolationController from '../controllers/inboxIsolationController.js';
import * as settingsController from '../controllers/settingsController.js';
import * as orgWebhookController from '../controllers/orgWebhookController.js';
import * as inboxSettingsController from '../controllers/inboxSettingsController.js';
import * as licenseController from '../controllers/licenseController.js';
import * as channelIntegrationController from '../controllers/channelIntegrationController.js';
import * as queueController from '../controllers/queueController.js';
import * as affiliateController from '../controllers/affiliateController.js';
import * as messageTemplatesController from '../controllers/messageTemplatesController.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// --- Devices & Channels ---
router.get('/devices/health/stats', deviceController.getDeviceHealthStats);
router.get('/devices/health/optimal-times', deviceController.getOptimalTimes);
router.get('/devices/health', deviceController.getDeviceHealth);
router.get('/devices/stats', deviceController.getDeviceStats);
router.get('/devices', deviceController.getDevices);
router.post('/devices', deviceController.addDevice);
router.get('/devices/:id/qr', deviceController.getDeviceQrCode);
router.get('/devices/:id/report', deviceController.getDeviceReport);
router.post('/devices/:id/retry', deviceController.retryDevice);
router.post('/devices/:id/test', deviceController.sendTestMessage);
router.post('/devices/:id/test-message', deviceController.sendTestMessage);
router.post('/devices/:id/resolve-lids', deviceController.resolveAllLidContacts);
router.get('/devices/:id/count-lids', deviceController.countLidContacts);
router.put('/devices/:id', deviceController.updateDevice);
router.delete('/devices/:id', deviceController.deleteDevice);

// --- Webchat Config ---
router.get('/webchat', webchatController.getConfigs);
router.get('/webchat/stats', webchatController.getStats);
router.post('/webchat', webchatController.createConfig);
router.put('/webchat/:id', webchatController.updateConfig);
router.delete('/webchat/:id', webchatController.deleteConfig);
router.post('/webchat/upload', robustUpload, webchatController.uploadLogo);

// --- Multi-Language & Translation ---
router.get('/language/settings', multiLanguageController.getSettings);
router.put('/language/settings', multiLanguageController.updateSettings);
router.get('/language/detect', multiLanguageController.detectLanguage);
router.get('/language/supported', multiLanguageController.getLanguages);
router.get('/language/analytics', multiLanguageController.getAnalytics);

router.post('/translate', multiLanguageController.translate);
router.get('/translate/settings', multiLanguageController.getTranslationSettings);
router.put('/translate/settings', multiLanguageController.updateTranslationSettings);
router.post('/translate/messages/:messageId/:targetLang?', multiLanguageController.translateMessage);

// --- Workflow Rules ---
router.get('/workflow/rules', workflowController.getRules);
router.post('/workflow/rules', workflowController.createRule);
router.put('/workflow/rules/:id', workflowController.updateRule);
router.delete('/workflow/rules/:id', workflowController.deleteRule);
router.post('/workflow/rules/:id/toggle', workflowController.toggleRule);
router.get('/workflow/rules/:id/logs', workflowController.getRuleLogs);
router.post('/workflow/test', workflowController.testRule);

// --- Scheduled Messages ---
router.get('/scheduled-messages', scheduledMessageController.getScheduledMessages);
router.post('/scheduled-messages', scheduledMessageController.createScheduledMessage);
router.put('/scheduled-messages/:id', scheduledMessageController.updateScheduledMessage);
router.delete('/scheduled-messages/:id', scheduledMessageController.deleteScheduledMessage);
router.get('/conversations/:id/scheduled-messages', scheduledMessageController.getConversationScheduledMessages);

// --- E-Commerce & Integrations ---
router.get('/ecommerce/connections', ecommerceController.getConnections);
router.post('/ecommerce/connections', ecommerceController.saveConnection);
router.put('/ecommerce/connections/:id', ecommerceController.saveConnection);
router.post('/ecommerce/connect', ecommerceController.saveConnection);
router.delete('/ecommerce/connections/:id', ecommerceController.deleteConnection);
router.post('/ecommerce/connections/:id/test', ecommerceController.testConnection);
router.get('/ecommerce/products', ecommerceController.getProducts);
router.get('/ecommerce/orders', ecommerceController.getOrders);
router.post('/ecommerce/orders/:orderId/link', ecommerceController.linkOrder);
router.get('/ecommerce/catalog', ecommerceController.getCatalog);
router.post('/ecommerce/sync/:connectionId', ecommerceController.syncProducts);
router.get('/ecommerce/platforms', ecommerceController.getPlatforms);
router.get('/ecommerce/stats', ecommerceController.getOrderStats);

// --- Outgoing Webhooks ---
router.get('/webhooks', orgWebhookController.getWebhooks);
router.post('/webhooks', orgWebhookController.createWebhook);
router.get('/webhooks/event-catalog', orgWebhookController.getEventCatalog);
router.get('/webhooks/:id/logs', orgWebhookController.getWebhookLogs);
router.post('/webhooks/:id/test', orgWebhookController.testWebhook);
router.put('/webhooks/:id', orgWebhookController.updateWebhook);
router.delete('/webhooks/:id', orgWebhookController.deleteWebhook);

// --- Message Archival ---
router.get('/archive/stats', messageArchiveController.getStats);
router.post('/archive/conversations/:conversationId/archive', messageArchiveController.archiveConversation);
router.get('/archive/conversations/:conversationId/messages', messageArchiveController.getArchived);
router.post('/archive/conversations/:conversationId/restore', messageArchiveController.restoreArchived);
router.post('/archive/run', messageArchiveController.runAutoArchive);

// --- Forms ---
router.get('/forms', formController.getForms);
router.post('/forms', formController.createForm);
router.put('/forms/:id', formController.updateForm);
router.delete('/forms/:id', formController.deleteForm);
router.get('/forms/:id/submissions', formController.getSubmissions);
router.get('/forms/:id/export', formController.exportSubmissions);

// --- Developer API Apps ---
router.get('/developer/stats', developerAppController.getStats);
router.get('/developer/apps', developerAppController.getApps);
router.get('/developer/apps/:id', developerAppController.getAppDetail);
router.post('/developer/apps', developerAppController.createApp);
router.put('/developer/apps/:id', developerAppController.updateApp);
router.delete('/developer/apps/:id', developerAppController.deleteApp);
router.post('/developer/apps/:id/regenerate-key', developerAppController.regenerateKey);
router.get('/developer/logs', developerAppController.getLogs);
router.post('/developer/verify-webhook', developerAppController.verifyWebhook);

// --- Organization, Settings & Team ---
router.get('/organization', organizationController.getOrgDetails);
router.put('/organization/webhook', organizationController.updateWebhook);
router.post('/organization/logo', robustUpload, organizationController.uploadLogo);
router.put('/organization/broadcast-settings', organizationController.updateBroadcastSettings);

router.get('/quick-replies', quickReplyController.getQuickReplies);
router.post('/quick-replies', quickReplyController.createQuickReply);
router.put('/quick-replies/:id', quickReplyController.updateQuickReply);
router.delete('/quick-replies/:id', quickReplyController.deleteQuickReply);
router.get('/quick-replies/global', quickReplyGlobalController.getReplies);
router.post('/quick-replies/global', quickReplyGlobalController.createGlobal);
router.put('/quick-replies/global/:id', quickReplyGlobalController.updateReply);
router.delete('/quick-replies/global/:id', quickReplyGlobalController.deleteReply);
router.get('/quick-replies/search', quickReplyGlobalController.searchReplies);

router.get('/team/stats', teamController.getTeamStats);
router.get('/team', teamController.getTeam);
router.post('/team', teamController.addMember);
router.put('/team/:id', teamController.updateMember);
router.delete('/team/:id', teamController.removeMember);

router.get('/settings/device-data-hide', settingsController.getHideDeviceDataSetting);
router.put('/settings/device-data-hide', settingsController.updateHideDeviceDataSetting);
router.get('/settings/hidden-devices', settingsController.getHiddenDevices);
router.post('/settings/restore-device/:id', settingsController.restoreDevice);

router.get('/roles/permissions', rolesController.getPermissions);
router.get('/roles', requireRole(['admin_member', 'agent']), rolesController.getRoles);
router.post('/roles', requireRole(['admin_member']), rolesController.createRole);
router.put('/roles/:id', requireRole(['admin_member']), rolesController.updateRole);
router.delete('/roles/:id', requireRole(['admin_member']), rolesController.deleteRole);

router.get('/divisions', requireRole(['admin_member']), divisionsController.getDivisions);
router.post('/divisions', requireRole(['admin_member']), divisionsController.createDivision);
router.put('/divisions/:id', requireRole(['admin_member']), divisionsController.updateDivision);
router.delete('/divisions/:id', requireRole(['admin_member']), divisionsController.deleteDivision);
router.get('/divisions/:id/staff', requireRole(['admin_member', 'agent']), divisionsController.getDivisionStaff);

// --- Inbox Isolation & Working Hours ---
router.get('/inboxes/settings', inboxIsolationController.getInboxSettings);
router.put('/inboxes/settings', inboxIsolationController.updateInboxSettings);
router.get('/inboxes', inboxIsolationController.getInboxes);
router.get('/inboxes/accessible', inboxIsolationController.getAccessibleInboxes);
router.get('/inboxes/:id', inboxIsolationController.getInboxById);
router.post('/inboxes', inboxIsolationController.createInbox);
router.put('/inboxes/:id', inboxIsolationController.updateInbox);
router.delete('/inboxes/:id', inboxIsolationController.deleteInbox);
router.post('/inboxes/:id/users', inboxIsolationController.assignUsersToInbox);
router.get('/inboxes/:id/users', inboxIsolationController.getInboxUsers);

// Assignment Settings (also mounted at /inbox/settings/assignment)
router.get('/settings/assignment', inboxSettingsController.getAssignmentSettings);
router.put('/settings/assignment', inboxSettingsController.updateAssignmentSettings);

router.get('/settings/working-hours', workingHoursController.getWorkingHours);
router.put('/settings/working-hours', workingHoursController.updateWorkingHours);

router.get('/settings/email', emailController.getEmailSettings);
router.put('/settings/email', emailController.saveEmailSettings);
router.post('/settings/email/test', emailController.testEmailSettings);
router.post('/email/send', emailController.sendEmailToContact);
router.post('/email/send-draft', emailController.sendEmailCustom);
router.get('/email/logs', emailController.getEmailLogs);

router.get('/settings/auto-archive', autoArchiveController.getSettings);
router.put('/settings/auto-archive', autoArchiveController.updateSettings);
router.post('/auto-archive/run', autoArchiveController.runAutoArchive);

// --- License Endpoints ---
router.get('/license/status', licenseController.getStatus);
router.get('/license/check', licenseController.checkLicense);
router.post('/license/refresh', licenseController.refreshLicense);
router.get('/license/setup', licenseController.getSetupInfo);

// --- Tools & Auto Replies ---
router.get('/tools/stats', toolController.getToolStats);
router.post('/tools/check-number/start', robustUpload, toolController.startCheck);
router.get('/tools/check-number/history', toolController.getHistory);
router.get('/tools/check-number/:id', toolController.getBatchDetail);
router.get('/tools/check-number/:id/export', toolController.exportResult);
router.post('/tools/check-number/:id/save-contacts', toolController.saveContacts);

router.get('/tools/groups', toolController.getGroups);
router.post('/tools/groups/extract', toolController.extractGroup);
router.post('/tools/groups/save', toolController.saveGroupContacts);

router.get('/tools/scraper/autocomplete', toolController.proxyAutocomplete);
router.post('/tools/scraper/config', toolController.saveScraperConfig);
router.get('/tools/scraper/config', toolController.getScraperConfig);
router.post('/tools/scraper/search', toolController.searchLeads);
router.get('/tools/scraper/history', toolController.getScraperHistory);
router.get('/tools/scraper/history/:id', toolController.getScraperHistoryDetail);
router.post('/tools/scraper/save', toolController.saveLeads);

router.get('/auto-reply/rules', autoReplyController.getRules);
router.post('/auto-reply/rules', autoReplyController.createRule);
router.put('/auto-reply/rules/:id', autoReplyController.updateRule);
router.delete('/auto-reply/rules/:id', autoReplyController.deleteRule);
router.get('/auto-reply/general', autoReplyController.getGeneralConfig);
router.put('/auto-reply/general', autoReplyController.updateGeneralConfig);

router.get('/notes/:conversationId', agentNotesController.getNotes);
router.post('/notes/:conversationId', agentNotesController.addNote);
router.put('/notes/:noteId', agentNotesController.updateNote);
router.post('/notes/:noteId/resolve', agentNotesController.resolveNote);
router.delete('/notes/:noteId', agentNotesController.deleteNote);
router.get('/contacts/:contactId/notes', agentNotesController.getNotes);

router.post('/contacts/import', contactImportController.importContacts);
router.get('/contacts/import/history', contactImportController.getHistory);
router.get('/contacts/import/template', contactImportController.getTemplate);

router.get('/wa-templates', waTemplateController.getTemplates);
router.post('/wa-templates', waTemplateController.createTemplate);
router.put('/wa-templates/:id', waTemplateController.updateTemplate);
router.delete('/wa-templates/:id', waTemplateController.deleteTemplate);
router.post('/wa-templates/:id/use', waTemplateController.useTemplate);
router.get('/wa-templates/categories', waTemplateController.getCategories);

// --- Channel Integrations (Email, TikTok, LINE) ---
router.get('/integrations/channels', channelIntegrationController.getChannelIntegrations);
router.post('/integrations/channels', channelIntegrationController.saveChannelIntegration);
router.post('/integrations/channels/:id/test', channelIntegrationController.testChannelConnection);
router.delete('/integrations/channels/:id', channelIntegrationController.deleteChannelIntegration);

// --- Queue Endpoints ---
router.post('/queue/pickup', queueController.pickupQueue);
router.get('/queue/status', queueController.getQueueStatus);
router.get('/queue/check/:contactId', queueController.checkPosition);

// --- Affiliate Endpoints ---
router.get('/affiliate/stats', affiliateController.getPartnerStats);
router.get('/affiliate/commissions', affiliateController.getCommissionHistory);
router.get('/affiliate/payouts', affiliateController.getPayoutHistory);
router.post('/affiliate/request-payout', affiliateController.requestPayout);

// --- Message Templates Endpoints ---
router.get('/templates', messageTemplatesController.getTemplates);
router.post('/templates', messageTemplatesController.createTemplate);
router.put('/templates/:id', messageTemplatesController.updateTemplate);
router.delete('/templates/:id', messageTemplatesController.deleteTemplate);
router.get('/templates/types', messageTemplatesController.getTemplateTypes);

export default router;
