import express from 'express';
import * as upsellingController from '../controllers/upsellingController.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/', checkPlanFeature('feat_upselling'), upsellingController.getUpsellings);
router.post('/', checkPlanFeature('feat_upselling'), upsellingController.createUpselling);
router.put('/:id', checkPlanFeature('feat_upselling'), upsellingController.updateUpselling);
router.delete('/:id', checkPlanFeature('feat_upselling'), upsellingController.deleteUpselling);

export default router;
