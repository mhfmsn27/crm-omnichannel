import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import * as systemHealthController from '../controllers/systemHealthController.js';

const router = express.Router();

// Apply auth middleware to all system routes
router.use(authenticateToken);

// Real-time telemetry: OS, Postgres, Redis, Storage, and Queues
router.get('/health', systemHealthController.getSystemHealth);

// 1-Click Database Disaster Recovery Backup (.sql stream)
router.get('/backup-db', systemHealthController.downloadDatabaseBackup);

export default router;
