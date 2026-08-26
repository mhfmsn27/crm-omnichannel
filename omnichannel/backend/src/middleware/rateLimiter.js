
import rateLimit from 'express-rate-limit';

// 1. Auth Limiter (Strict) - Prevent Brute Force
// 20 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 20,
	message: { error: 'Too many login attempts, please try again after 15 minutes' },
	standardHeaders: true,
	legacyHeaders: false,
});

// 2. General API Limiter (Moderate) - Prevent Abuse/DoS
// 300 requests per minute per IP
export const generalLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 300,
	message: { error: 'Too many requests, please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Broadcast Limiter - Prevent Queue Flooding
// 30 campaign creations per hour
export const broadcastLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    message: { error: 'Broadcast creation limit reached. Please wait a while.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 4. Webhook Limiter - Prevent Webhook Abuse (Stricter)
// 100 requests per minute per IP
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: { error: 'Too many webhook requests.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 5. Public API Limiter - For public endpoints
// 60 requests per minute per IP
export const publicApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Too many requests to public API.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// 6. Forgot Password Limiter - Prevent Email Enumeration
// 5 attempts per 15 minutes per IP
export const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many password reset attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
