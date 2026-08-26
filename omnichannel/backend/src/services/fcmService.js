import pool from '../config/db.js';
import { admin, isFirebaseInitialized } from '../config/firebase.js';

export const fcmService = {
    /**
     * Register or Update FCM Token for a User
     */
    registerToken: async (userId, token, platform, deviceId) => {
        try {
            await pool.query(
                `INSERT INTO user_fcm_tokens (user_id, fcm_token, platform, device_id, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (fcm_token) 
                 DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW(), device_id = EXCLUDED.device_id`,
                [userId, token, platform, deviceId]
            );
            return { success: true };
        } catch (error) {
            console.error('[FCM] Register Token Error:', error);
            throw error;
        }
    },

    /**
     * Remove FCM Token (Logout)
     */
    removeToken: async (token) => {
        try {
            await pool.query('DELETE FROM user_fcm_tokens WHERE fcm_token = $1', [token]);
        } catch (error) {
            console.error('[FCM] Remove Token Error:', error);
        }
    },

    /**
     * Send Multicast Notification
     */
    sendMulticast: async (tokens, title, body, data = {}) => {
        if (!isFirebaseInitialized || tokens.length === 0) return;

        const message = {
            notification: { title, body },
            data: data,
            tokens: tokens
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            // console.log(`[FCM] Sent: ${response.successCount}, Failed: ${response.failureCount}`);

            // Cleanup invalid tokens
            if (response.failureCount > 0) {
                const failedTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        // error codes: messaging/registration-token-not-registered
                        failedTokens.push(tokens[idx]);
                    }
                });
                if (failedTokens.length > 0) {
                    // Optionally delete invalid tokens
                    // await pool.query('DELETE FROM user_fcm_tokens WHERE fcm_token = ANY($1)', [failedTokens]);
                }
            }
        } catch (error) {
            console.error('[FCM] Send Error:', error);
        }
    },

    /**
     * Send New Message Notification
     * Logic:
     * 1. If assigned_to is set -> Notify that Agent
     * 2. If unassigned -> Notify ALL Agents in Organization (or specific role if needed)
     */
    sendNewMessageNotification: async (orgId, agentId, conversationId, senderName, messagePreview, mediaUrl) => {
        if (!isFirebaseInitialized) return;

        try {
            let tokens = [];

            if (agentId) {
                // Get token for specific agent
                const res = await pool.query('SELECT fcm_token FROM user_fcm_tokens WHERE user_id = $1', [agentId]);
                tokens = res.rows.map(r => r.fcm_token);
            } else {
                // Get tokens for ALL users in Org (Broadcast to team)
                const res = await pool.query(
                    `SELECT t.fcm_token FROM user_fcm_tokens t
                     JOIN users u ON u.id = t.user_id
                     WHERE u.organization_id = $1`,
                    [orgId]
                );
                tokens = res.rows.map(r => r.fcm_token);
            }

            if (tokens.length === 0) return;

            // Simplify body
            const body = messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview;
            const title = `New message from ${senderName}`;

            const payload = {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                type: 'new_message',
                conversation_id: conversationId.toString(),
                sender_name: senderName
            };

            // Add image if available
            // Note: notification.image support depends on platform

            await fcmService.sendMulticast(tokens, title, body, payload);
            console.log(`[FCM] Notification sent to ${tokens.length} devices for msg in conv ${conversationId}`);

        } catch (error) {
            console.error('[FCM] Notification Logic Error:', error);
        }
    }
};
