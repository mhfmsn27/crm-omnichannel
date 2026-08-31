import express from 'express';
import * as telegramBotController from '../controllers/telegram/botController.js';

const router = express.Router();

router.get('/stats', telegramBotController.getStats);
router.get('/bots', telegramBotController.getBots);
router.post('/connect', telegramBotController.connectBot);
router.post('/bots', telegramBotController.connectBot); // Alias
router.delete('/bots/:id', telegramBotController.deleteBot);
router.delete('/:id', telegramBotController.deleteBot); // Alias
router.patch('/bots/:id/toggle-ai', telegramBotController.toggleAi);
router.patch('/:id/toggle-ai', telegramBotController.toggleAi); // Alias

export default router;
