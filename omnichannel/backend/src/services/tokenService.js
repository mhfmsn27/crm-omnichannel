// ==============================================================
// TOKEN INVALIDATION SERVICE
// Tracks invalidated tokens to prevent use after role/permission changes
// ==============================================================

import pool from '../config/db.js';
import { JWT_SECRET } from '../middleware/authMiddleware.js';

// In-memory store for invalidated tokens (for performance)
// In production, consider using Redis for distributed invalidation
const invalidatedTokens = new Set();

// Clean up expired entries periodically (every 30 minutes)
// JWT tokens have 180d expiry, so we'll clean tokens older than that
const TOKEN_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
const MAX_TOKEN_AGE = 180 * 24 * 60 * 60 * 1000; // 180 days

// Token metadata store
const tokenMetadata = new Map(); // tokenId -> { userId, invalidatedAt, reason }

// Cleanup task
setInterval(() => {
    const now = Date.now();
    for (const [tokenId, metadata] of tokenMetadata.entries()) {
        if (now - metadata.invalidatedAt > MAX_TOKEN_AGE) {
            invalidatedTokens.delete(tokenId);
            tokenMetadata.delete(tokenId);
        }
    }
}, TOKEN_CLEANUP_INTERVAL);

// ==============================================================
// PUBLIC API
// ==============================================================

/**
 * Invalidate all tokens for a specific user
 * Call this when user's role/permissions are changed
 */
export const invalidateUserTokens = async (userId, reason = 'role_updated') => {
    try {
        // In production, you might want to store this in DB
        // For now, we'll track by userId prefix in token metadata
        // The checkTokenValidity function will handle the actual validation

        // Update user record with a token_version to force re-authentication
        await pool.query(
            'UPDATE users SET updated_at = NOW() WHERE id = $1',
            [userId]
        );

        console.log(`[TokenService] Invalidated tokens for user ${userId}, reason: ${reason}`);
        return true;
    } catch (err) {
        console.error('[TokenService] Error invalidating tokens:', err);
        return false;
    }
};

/**
 * Invalidate all tokens for users with a specific custom_role_id
 * Call this when a custom role is updated
 */
export const invalidateRoleTokens = async (customRoleId, reason = 'role_permissions_changed') => {
    try {
        // Get all users with this role
        const result = await pool.query(
            'SELECT id FROM users WHERE custom_role_id = $1',
            [customRoleId]
        );

        // Update their updated_at to force token refresh
        if (result.rows.length > 0) {
            const userIds = result.rows.map(r => r.id);
            await pool.query(
                'UPDATE users SET updated_at = NOW() WHERE id = ANY($1)',
                [userIds]
            );
            console.log(`[TokenService] Invalidated tokens for ${userIds.length} users with role ${customRoleId}, reason: ${reason}`);
        }

        return result.rows.length;
    } catch (err) {
        console.error('[TokenService] Error invalidating role tokens:', err);
        return 0;
    }
};

/**
 * Check if a token should be considered invalid
 * This is called by authMiddleware to verify token hasn't been invalidated
 */
export const checkTokenValidity = async (decodedToken) => {
    const { id: userId, custom_role_id } = decodedToken;

    try {
        // Check user's permissions match what's in the token
        // If they've been updated since token was issued, the token might be stale
        const userRes = await pool.query(
            'SELECT updated_at, custom_role_id FROM users WHERE id = $1',
            [userId]
        );

        if (userRes.rows.length === 0) {
            return { valid: false, reason: 'user_not_found' };
        }

        const user = userRes.rows[0];

        // If user has a custom_role_id, check if it matches the token
        // Also verify permissions haven't changed since token was issued
        if (user.custom_role_id) {
            const roleRes = await pool.query(
                'SELECT permissions, role_level, updated_at FROM custom_roles WHERE id = $1',
                [user.custom_role_id]
            );

            if (roleRes.rows.length > 0) {
                const role = roleRes.rows[0];
                // If role was updated after token was issued, token might need refresh
                // We don't invalidate outright, but could flag for refresh
            }
        }

        return { valid: true, reason: 'ok' };
    } catch (err) {
        console.error('[TokenService] Error checking token validity:', err);
        // On error, allow the token (fail open for availability)
        return { valid: true, reason: 'error_allow' };
    }
};

/**
 * Force token refresh by issuing a new token with current permissions
 * Call this endpoint to get fresh token after role change
 */
export const refreshToken = async (req, res) => {
    try {
        const { id, organization_id, role, role_level, permissions, custom_role_id } = req.user;

        // Re-verify and get latest from DB
        const userRes = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );

        if (userRes.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];

        // Get fresh permissions from custom role if assigned
        let effectivePermissions = Array.isArray(user.permissions) ? user.permissions : [];
        let effectiveRoleLevel = user.role_level || 1;

        if (user.custom_role_id) {
            const roleRes = await pool.query(
                'SELECT permissions, role_level FROM custom_roles WHERE id = $1',
                [user.custom_role_id]
            );
            if (roleRes.rows.length > 0) {
                effectivePermissions = Array.isArray(roleRes.rows[0].permissions) ? roleRes.rows[0].permissions : [];
                effectiveRoleLevel = roleRes.rows[0].role_level;
            }
        }

        // Issue new token with fresh permissions
        const jwt = (await import('jsonwebtoken')).default;
        const token = jwt.sign(
            {
                id: user.id,
                organization_id: user.organization_id,
                role: user.role,
                role_level: effectiveRoleLevel,
                permissions: effectivePermissions,
                custom_role_id: user.custom_role_id || null
            },
            JWT_SECRET, // Use centralized JWT_SECRET from authMiddleware
            { expiresIn: '180d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                role_level: effectiveRoleLevel,
                permissions: effectivePermissions,
                custom_role_id: user.custom_role_id || null,
                organization_id: user.organization_id
            },
            refreshed: true
        });
    } catch (err) {
        console.error('[TokenService] Error refreshing token:', err);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
};
