import express from 'express';
import { testChat } from '../controllers/aiTestController.js';

const router = express.Router();

router.post('/test', testChat);

export default router;
