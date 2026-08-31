import express from 'express';
import * as labelController from '../controllers/labelController.js';

const router = express.Router();

// Label CRUD Endpoints
router.get('/', labelController.getLabels);
router.post('/', labelController.createLabel);
router.put('/:id', labelController.updateLabel);
router.delete('/:id', labelController.deleteLabel);

export default router;
