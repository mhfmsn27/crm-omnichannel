import express from 'express';
import * as contactController from '../controllers/contactController.js';
import * as customFieldController from '../controllers/customFieldController.js';
import * as labelController from '../controllers/labelController.js';
import * as autoLabelController from '../controllers/autoLabelController.js';
import * as shortLinkController from '../controllers/shortLinkController.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// --- Custom Contact Fields ---
router.get('/custom-fields', customFieldController.getFields);
router.post('/custom-fields', customFieldController.createField);
router.put('/custom-fields/reorder', customFieldController.reorderFields);
router.put('/custom-fields/:id', customFieldController.updateField);
router.delete('/custom-fields/:id', customFieldController.deleteField);
router.get('/:contactId/field-values', customFieldController.getContactFieldValues);
router.post('/:contactId/field-values', customFieldController.saveContactFieldValues);

// --- Specific Contact Query Routes (Must precede /:id) ---
router.get('/device-counts', contactController.getContactCountsByDevice);
router.get('/segment-count', contactController.getContactSegmentCount);
router.get('/by-device', contactController.getContactsByDevice);
router.get('/export', contactController.exportContacts);
router.get('/sync/vcf', async (req, res) => {
    try {
        const { generateVCardStream } = await import('../services/contactSyncService.js');
        const vcf = await generateVCardStream(req.user.organization_id);
        res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="crmhub_contacts.vcf"');
        res.send(vcf);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post('/bulk-delete', contactController.bulkDelete);
router.post('/bulk-label', contactController.bulkAssignLabel);
router.post('/import', robustUpload, contactController.importContacts);
router.get('/unsubscribe-logs', contactController.getUnsubscribeLogs);

// --- Contact CRUD ---
router.get('/', contactController.getContacts);
router.post('/', contactController.createContact);
router.get('/:id', contactController.getContact);
router.get('/:id/ltv', contactController.getContactLTV);
router.get('/:id/activity', contactController.getContactActivity);
router.get('/:contactId/source-history', shortLinkController.getContactSourceHistory);
router.put('/:id', contactController.updateContact);
router.put('/:id/note', contactController.updateContactNote);
router.delete('/:id', contactController.deleteContact);

// --- Contact Labels ---
router.post('/:id/labels', contactController.assignLabel);
router.delete('/:id/labels/:labelId', contactController.removeLabel);

// --- Subscription Status ---
router.post('/:id/resubscribe', contactController.resubscribeContact);
router.post('/:id/unsubscribe', contactController.unsubscribeContact);

export default router;
