import express from 'express';
import * as saSettingController from '../controllers/sa/settingController.js';
import * as cmsController from '../controllers/cmsController.js';
import * as invoiceController from '../controllers/invoiceController.js';
import * as inboxController from '../controllers/inboxController.js';
import * as webchatController from '../controllers/webchatController.js';
import * as csatController from '../controllers/csatController.js';
import * as publicApiController from '../controllers/publicApiController.js';
import { publicApiLimiter } from '../middleware/rateLimiter.js';
import { publicApiAuth, validateChannelAccess } from '../middleware/publicApiAuth.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';

import * as billingController from '../controllers/billingController.js';
import * as saPlanController from '../controllers/sa/planController.js';

const router = express.Router();

// Apply public rate limiter
router.use(publicApiLimiter);

// --- Public Plans & Checkout ---
router.get('/plans', billingController.getPublicPlans);
router.get('/plans/:id', saPlanController.getPublicPlanById);
router.get('/payment-channels', billingController.getPaymentChannels);

// --- Public Settings & CMS ---
router.get('/settings', saSettingController.getPublicSettings);
router.get('/landing', cmsController.getPublicLanding);
router.get('/pages/:slug', cmsController.getPublicPage);

// --- Public Invoicing ---
router.get('/invoices/:token', invoiceController.getPublicInvoice);
router.get('/invoices/:token/download', invoiceController.publicDownloadPdf);
router.post('/invoices/:token/pay', invoiceController.publicPayInvoice);

// --- Public CSAT & Rating ---
router.post('/rating/:token', inboxController.submitRating);
router.get('/csat/survey/:token', csatController.getSurveyForm);
router.post('/csat/submit/:token', csatController.submitSurvey);

// --- Public Webchat ---
router.get('/webchat/config/:uid', webchatController.getPublicConfig);
router.post('/webchat/session', webchatController.startSession);
router.post('/webchat/message', webchatController.sendPublicMessage);
router.get('/webchat/messages', webchatController.getMessages);
router.post('/webchat/upload', robustUpload, webchatController.uploadPublicMedia);

// --- Developer API v1 ---
const devRouter = express.Router();
devRouter.use(publicApiAuth);
devRouter.post('/messages', validateChannelAccess, publicApiController.sendMessage);

router.use('/v1', devRouter);

export default router;
