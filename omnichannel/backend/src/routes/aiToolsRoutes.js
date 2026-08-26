import express from 'express';
import { getTools, createTool, deleteTool } from '../controllers/aiToolsController.js';

const router = express.Router();

router.get('/', getTools);
router.post('/', createTool);
router.delete('/:id', deleteTool);

export default router;
