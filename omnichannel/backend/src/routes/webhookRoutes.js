import express from 'express';
import * as webhookController from '../controllers/webhookController.js';
import * as xenditCallbackController from '../controllers/xenditCallbackController.js';
import * as invoiceWebhookController from '../controllers/invoiceWebhookController.js';
import * as metaWebhookController from '../controllers/metaWebhookController.js';
import * as messengerWebhookController from '../controllers/messenger/webhookController.js';
import * as instagramWebhookController from '../controllers/instagram/webhookController.js';
import * as telegramWebhookController from '../controllers/telegram/webhookController.js';
import * as tiktokWebhookController from '../controllers/tiktok/webhookController.js';
import * as emailWebhookController from '../controllers/email/webhookController.js';
import * as lineWebhookController from '../controllers/line/webhookController.js';
import * as shopeeWebhookController from '../controllers/shopee/webhookController.js';
import * as tokopediaWebhookController from '../controllers/tokopedia/webhookController.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';
import { verifyWebhookSignature, verifyTelegramWebhook, verifyTikTokWebhook, verifyXenditWebhook } from '../middleware/webhookSecurity.js';

const router = express.Router();

// Apply webhook rate limiter
router.use(webhookLimiter);

// WhatsApp Gateway
router.post('/wa-gateway', verifyWebhookSignature('wa-gateway'), webhookController.handleWAWebhook);

// Payment Gateways
router.post('/xendit/payment', verifyXenditWebhook, xenditCallbackController.handleXenditCallback);
router.post('/invoice-payment/:gateway_type', invoiceWebhookController.handleInvoicePaymentWebhook);

// Meta Cloud API
router.get('/meta', metaWebhookController.verifyWebhook);
router.post('/meta', metaWebhookController.handleWebhook);

// Messenger
router.get('/messenger', messengerWebhookController.verifyWebhook);
router.post('/messenger', messengerWebhookController.handleWebhook);

// Instagram
router.get('/instagram', instagramWebhookController.verifyWebhook);
router.post('/instagram', instagramWebhookController.handleWebhook);

// Telegram
router.post('/telegram/:token', verifyTelegramWebhook, telegramWebhookController.handleWebhook);

// TikTok
router.post('/tiktok', verifyTikTokWebhook, tiktokWebhookController.handleWebhook);

// Email Two-Way Inbound
router.post('/email', emailWebhookController.handleInboundEmailWebhook);

// LINE Official Account
router.post('/line', lineWebhookController.handleLineWebhook);

// Shopee Seller Chat
router.post('/shopee', shopeeWebhookController.handleShopeeWebhook);

// Tokopedia Seller Chat
router.post('/tokopedia', tokopediaWebhookController.handleTokopediaWebhook);

export default router;
