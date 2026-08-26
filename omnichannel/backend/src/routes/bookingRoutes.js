import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getBookings, createBooking, updateBooking, deleteBooking } from '../controllers/bookingController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getBookings);
router.post('/', createBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

export default router;
