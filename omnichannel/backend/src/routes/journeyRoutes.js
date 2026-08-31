import express from 'express';
import * as journeyController from '../controllers/journeyController.js';

const router = express.Router();

router.get('/:contactId/timeline', journeyController.getTimeline);
router.get('/:contactId', journeyController.getJourney);
router.post('/:contactId/touchpoint', journeyController.recordTouchpoint);
router.get('/:contactId/score', journeyController.getLeadScore);

export default router;
