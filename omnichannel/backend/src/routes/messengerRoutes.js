import express from 'express';
import * as messengerAuthController from '../controllers/messenger/authController.js';

const router = express.Router();

router.get('/stats', messengerAuthController.getStats);
router.get('/pages', messengerAuthController.getPages);
router.post('/callback', messengerAuthController.handleCallback);
router.delete('/pages/:id', messengerAuthController.disconnectPage);
router.post('/pages/:id/resubscribe', messengerAuthController.resubscribePage);
router.patch('/pages/:id/toggle-ai', messengerAuthController.toggleAi);

export default router;
