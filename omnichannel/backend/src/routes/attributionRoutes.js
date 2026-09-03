import express from 'express';
import * as shortLinkController from '../controllers/shortLinkController.js';

const router = express.Router();

// --- Short Links CRUD ---
router.get('/', shortLinkController.getShortLinks);
router.post('/', shortLinkController.createShortLink);
router.get('/:id/stats', shortLinkController.getShortLinkStats);
router.put('/:id', shortLinkController.updateShortLink);
router.delete('/:id', shortLinkController.deleteShortLink);

// --- Attribution & Tracking ---
router.get('/stats', shortLinkController.getAttributionStats);
router.get('/options', shortLinkController.getTrackingOptions);
router.get('/contact/:contactId', shortLinkController.getContactSourceHistory);

export default router;
