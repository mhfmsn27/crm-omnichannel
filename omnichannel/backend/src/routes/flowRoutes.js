import express from 'express';
import * as flowController from '../controllers/flowController.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/', checkPlanFeature('feat_flowbuilder'), flowController.getFlows);
router.get('/:id', checkPlanFeature('feat_flowbuilder'), flowController.getFlowById);
router.post('/', checkPlanFeature('feat_flowbuilder'), flowController.createFlow);
router.put('/:id', checkPlanFeature('feat_flowbuilder'), flowController.updateFlow);
router.delete('/:id', checkPlanFeature('feat_flowbuilder'), flowController.deleteFlow);

export default router;
