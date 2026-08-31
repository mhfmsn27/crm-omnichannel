import express from 'express';
import * as gamificationController from '../controllers/gamificationController.js';

const router = express.Router();

router.get('/settings', gamificationController.getSettings);
router.put('/settings', gamificationController.updateSettings);
router.get('/leaderboard', gamificationController.getLeaderboard);
router.get('/me', gamificationController.getAgentStats);
router.post('/award', gamificationController.awardPoints);
router.post('/streak', gamificationController.updateStreak);

export default router;
