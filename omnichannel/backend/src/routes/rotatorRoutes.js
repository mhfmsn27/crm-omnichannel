import express from 'express';
import * as deviceController from '../controllers/deviceController.js';
import * as broadcastController from '../controllers/broadcastController.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/stats', deviceController.getRotatorStats);
router.get('/', broadcastController.getRotatorGroups);
router.post('/', checkPlanFeature('feat_rotator'), deviceController.createRotator);
router.put('/:id', checkPlanFeature('feat_rotator'), deviceController.updateRotator);
router.delete('/:id', checkPlanFeature('feat_rotator'), deviceController.deleteRotator);
router.post('/:id/test', checkPlanFeature('feat_rotator'), deviceController.sendTestMessage);

export default router;
