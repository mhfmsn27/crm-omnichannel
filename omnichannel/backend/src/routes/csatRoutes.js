import express from 'express';
import * as csatController from '../controllers/csatController.js';

const router = express.Router();

router.get('/settings', csatController.getSettings);
router.put('/settings', csatController.updateSettings);
router.get('/surveys', csatController.getSurveys);
router.get('/stats', csatController.getStats);
router.post('/trigger/:conversationId', csatController.triggerSurvey);

export default router;
