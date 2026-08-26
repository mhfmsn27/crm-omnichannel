import axios from 'axios';
import pool from '../config/db.js';

const GRAPH_API_VERSION = process.env.MESSENGER_API_VERSION || 'v24.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class MessengerService {

    // 1. Exchange Short-Lived Token for Long-Lived Token
    async exchangeToken(shortToken) {
        // Fetch Config from DB
        const settingsRes = await pool.query(
            "SELECT key, value FROM system_settings WHERE group_name = 'meta_config' AND key IN ('messenger_app_id', 'messenger_secret')"
        );
        const config = {};
        settingsRes.rows.forEach(r => config[r.key] = r.value);

        const appId = config.messenger_app_id || process.env.MESSENGER_APP_ID;
        const appSecret = config.messenger_secret || process.env.MESSENGER_SECRET;

        if (!appId || !appSecret) {
            throw new Error("MESSENGER_APP_ID or MESSENGER_SECRET is not configured in System Settings or .env.");
        }

        try {
            const response = await axios.get(`${BASE_URL}/oauth/access_token`, {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: appId,
                    client_secret: appSecret,
                    fb_exchange_token: shortToken
                }
            });
            return response.data.access_token;
        } catch (error) {
            console.error("Messenger Token Exchange Error:", JSON.stringify(error.response?.data || error.message, null, 2));
            throw new Error(`Failed to exchange token: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async getAccounts(accessToken) {
        try {
            console.log("[MessengerService] Fetching accounts from Meta...");
            const response = await axios.get(`${BASE_URL}/me/accounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,picture.type(large),access_token'
                }
            });

            // LOGGING: Check what Meta actually returns
            console.log("[MessengerService] Raw Response:", JSON.stringify(response.data, null, 2));

            return response.data.data;
        } catch (error) {
            console.error("[MessengerService] Get Accounts Error:", error.response?.data || error.message);
            throw new Error("Failed to fetch pages");
        }
    }

    async subscribeApp(pageId, pageAccessToken) {
        try {
            await axios.post(`${BASE_URL}/${pageId}/subscribed_apps`, {
                subscribed_fields: ['messages', 'messaging_postbacks', 'message_echoes']
            }, {
                params: { access_token: pageAccessToken }
            });
            return { success: true };
        } catch (error) {
            const errMsg = error.response?.data?.error?.message || error.message;
            console.error(`[Messenger] Failed to subscribe page ${pageId}:`, errMsg);
            return { success: false, error: errMsg };
        }
    }

    async unsubscribeApp(pageId, pageAccessToken) {
        try {
            await axios.delete(`${BASE_URL}/${pageId}/subscribed_apps`, {
                params: { access_token: pageAccessToken }
            });
            return { success: true };
        } catch (error) {
            const errMsg = error.response?.data?.error?.message || error.message;
            console.error(`[Messenger] Failed to unsubscribe page ${pageId}:`, errMsg);
            return { success: false, error: errMsg };
        }
    }

    async getUserProfile(psid, pageAccessToken) {
        try {
            const response = await axios.get(`${BASE_URL}/${psid}`, {
                params: {
                    fields: 'first_name,last_name,profile_pic',
                    access_token: pageAccessToken
                }
            });
            return response.data;
        } catch (error) {
            console.warn(`[Messenger] Failed to get profile for ${psid}:`, error.response?.data?.error?.message);
            return { first_name: 'Facebook', last_name: 'User', profile_pic: '' };
        }
    }

    // 6. Send Message (Text or Media)
    async sendMessage(pageAccessToken, recipientId, messageContent, mediaUrl = null, mediaType = 'image') {
        try {
            const payload = {
                recipient: { id: recipientId }
            };

            if (mediaUrl) {
                let metaType = 'file';
                if (mediaType === 'image') metaType = 'image';
                else if (mediaType === 'video') metaType = 'video';
                else if (mediaType === 'audio') metaType = 'audio';

                payload.message = {
                    attachment: {
                        type: metaType,
                        payload: {
                            url: mediaUrl,
                            is_reusable: true
                        }
                    }
                };
            } else {
                payload.message = { text: messageContent };
            }

            payload.messaging_type = 'RESPONSE';

            const response = await axios.post(`${BASE_URL}/me/messages`, payload, {
                params: { access_token: pageAccessToken }
            });

            return response.data;
        } catch (error) {
            throw new Error(`Messenger Send Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

export default new MessengerService();