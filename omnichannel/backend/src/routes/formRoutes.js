import express from 'express';
import * as formController from '../controllers/formController.js';
import { checkPlanFeature } from '../middleware/planMiddleware.js';

const router = express.Router();

router.get('/', formController.getForms);
router.post('/', checkPlanFeature('tool_chat_forms'), formController.createForm);
router.put('/:id', checkPlanFeature('tool_chat_forms'), formController.updateForm);
router.delete('/:id', checkPlanFeature('tool_chat_forms'), formController.deleteForm);
router.get('/:id/submissions', formController.getSubmissions);
router.get('/:id/export', formController.exportSubmissions);

export default router;
