import express from 'express';
import * as authController from '../controllers/authController.js';
import * as tokenService from '../services/tokenService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authLimiter, forgotPasswordLimiter, generalLimiter } from '../middleware/rateLimiter.js';
import { robustUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/google', authLimiter, authController.googleAuth);
router.post('/google/callback', authLimiter, authController.googleCallback);
router.post('/facebook', authLimiter, authController.facebookAuth);
router.post('/facebook/callback', authLimiter, authController.facebookCallback);

// Protected User Profile Endpoints
router.get('/me', authenticateToken, generalLimiter, authController.getMe);
router.post('/refresh', authenticateToken, generalLimiter, tokenService.refreshToken);
router.put('/profile', authenticateToken, generalLimiter, authController.updateProfile);
router.delete('/profile', authenticateToken, generalLimiter, authController.deleteAccount);
router.post('/profile-pic', authenticateToken, generalLimiter, robustUpload, authController.uploadProfilePic);
router.post('/toggle-online', authenticateToken, generalLimiter, authController.toggleOnlineStatus);
router.post('/fcm-token', authenticateToken, generalLimiter, authController.updateFcmToken);

export default router;
