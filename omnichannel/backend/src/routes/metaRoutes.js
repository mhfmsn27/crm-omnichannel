import express from 'express';
import * as metaAuthController from '../controllers/metaAuthController.js';
import * as metaTemplateController from '../controllers/metaTemplateController.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Meta Official WhatsApp Auth & Stats
router.get('/stats', metaAuthController.getStats);
router.post('/auth', metaAuthController.authenticate);

// Meta Template Management
router.get('/templates', metaTemplateController.getTemplates);
router.post('/templates', metaTemplateController.createTemplate);
router.put('/templates/sync', metaTemplateController.syncTemplates);
router.post('/templates/sync', metaTemplateController.syncTemplates);
router.delete('/templates/:name', metaTemplateController.deleteTemplate);
router.post('/upload', robustUpload, metaTemplateController.uploadMediaHandle);

export default router;
