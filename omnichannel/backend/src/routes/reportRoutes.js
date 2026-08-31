import express from 'express';
import * as salesReportController from '../controllers/reports/salesReportController.js';

const router = express.Router();

router.get('/pipeline-stats', salesReportController.getPipelineStats);

export default router;
