import express from 'express';
import * as instagramAuthController from '../controllers/instagram/authController.js';

const router = express.Router();

router.get('/stats', instagramAuthController.getStats);
router.get('/accounts', instagramAuthController.getAccounts);
router.post('/callback', instagramAuthController.handleCallback);
router.delete('/accounts/:id', instagramAuthController.disconnectAccount);
router.post('/accounts/:id/resubscribe', instagramAuthController.resubscribeAccount);
router.patch('/accounts/:id/toggle-ai', instagramAuthController.toggleAi);

export default router;
