import express from 'express';
import * as followupController from '../controllers/followupController.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/sequences', followupController.getSequences);
router.get('/sequences/:id/report', followupController.getSequenceReport);
router.post('/sequences', checkPlanFeature('manage_followup'), followupController.createSequence);
router.put('/sequences/:id', checkPlanFeature('manage_followup'), followupController.updateSequence);
router.delete('/sequences/:id', checkPlanFeature('manage_followup'), followupController.deleteSequence);
router.delete('/instances/:id', followupController.deleteInstance);

export default router;
