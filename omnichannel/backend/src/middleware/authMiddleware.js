import 'dotenv/config';
import jwt from 'jsonwebtoken';

// SECURE: JWT Secret MUST be set via environment variable
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error('[Security] FATAL: JWT_SECRET environment variable is not set!');
        console.error('[Security] Please set JWT_SECRET before starting the server.');
        // In production, crash immediately. In dev, use a warning only.
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
        console.warn('[Security] WARNING: Using insecure fallback secret in development mode only!');
        return 'dev_only_insecure_secret_do_not_use_in_production';
    }
    return secret;
};

export const JWT_SECRET = getJwtSecret();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};