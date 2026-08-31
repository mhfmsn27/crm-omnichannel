import express from 'express';
import * as ticketController from '../controllers/ticketController.js';

const router = express.Router();

router.get('/stats', ticketController.getTicketStats);
router.get('/sla-policies', ticketController.getSLAPolicies);
router.put('/sla-policies', ticketController.updateSLAPolicies);
router.patch('/conversations/:id/priority', ticketController.updateConversationPriority);
router.get('/', ticketController.getTickets);

export default router;
