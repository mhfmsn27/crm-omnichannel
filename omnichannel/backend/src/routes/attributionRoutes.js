import express from 'express';
import * as shortLinkController from '../controllers/shortLinkController.js';

const router = express.Router();

router.get('/stats', shortLinkController.getAttributionStats);
router.get('/options', shortLinkController.getTrackingOptions);
router.get('/contact/:contactId', shortLinkController.getContactSourceHistory);

export default router;
