import express from 'express';
import { getAnalytics } from '../controllers/aiLogsController.js';

const router = express.Router();

router.get('/analytics', getAnalytics);

export default router;
