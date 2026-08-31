import express from 'express';
import * as warmerController from '../controllers/warmerController.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/', warmerController.getWarmers);
router.post('/', checkPlanFeature('tool_warmer'), warmerController.createWarmer);
router.put('/:id', checkPlanFeature('tool_warmer'), warmerController.updateWarmer);
router.patch('/:id/toggle', checkPlanFeature('tool_warmer'), warmerController.toggleWarmer);
router.post('/:id/reset', checkPlanFeature('tool_warmer'), warmerController.resetWarmer);
router.delete('/:id', checkPlanFeature('tool_warmer'), warmerController.deleteWarmer);
router.get('/:id/report', warmerController.getReport);

export default router;
