import express from 'express';
import * as autoLabelController from '../controllers/autoLabelController.js';

const router = express.Router();

// Auto Label Rules & Stats
router.get('/rules', autoLabelController.getRules);
router.post('/rules', autoLabelController.createRule);
router.put('/rules/:id', autoLabelController.updateRule);
router.delete('/rules/:id', autoLabelController.deleteRule);
router.patch('/rules/:id/toggle', autoLabelController.toggleRule);
router.post('/rules/:id/toggle', autoLabelController.toggleRule);
router.get('/stats', autoLabelController.getStats);
router.get('/logs', autoLabelController.getLogs);
router.get('/channels', autoLabelController.getChannels);

export default router;
