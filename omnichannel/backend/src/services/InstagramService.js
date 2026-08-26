import axios from 'axios';
import pool from '../config/db.js';

const GRAPH_API_VERSION = process.env.INSTAGRAM_API_VERSION || 'v24.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class InstagramService {

    // 1. Exchange Short-Lived Token for Long-Lived Token
    async exchangeToken(shortToken) {
        // Fetch Config from DB (Use Messenger App ID/Secret as Instagram uses the same for Messaging API usually)
        const settingsRes = await pool.query(
            "SELECT key, value FROM system_settings WHERE group_name = 'meta_config' AND key IN ('messenger_app_id', 'messenger_secret')"
        );
        const config = {};
        settingsRes.rows.forEach(r => config[r.key] = r.value);

        const appId = config.messenger_app_id || process.env.MESSENGER_APP_ID;
        const appSecret = config.messenger_secret || process.env.MESSENGER_SECRET;

        if (!appId || !appSecret) {
            throw new Error("MESSENGER_APP_ID (for IG) is not configured in System Settings or .env.");
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
            console.error("Instagram Token Exchange Error:", JSON.stringify(error.response?.data || error.message, null, 2));
            throw new Error(`Failed to exchange token: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    // 2. Get IG Accounts
    async getAccounts(accessToken) {
        try {
            console.log("[InstagramService] Fetching linked accounts...");
            // We fetch pages first, then the connected IG account on that page
            const response = await axios.get(`${BASE_URL}/me/accounts`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}'
                }
            });

            // LOGGING: Critical to see if instagram_business_account is present
            console.log("[InstagramService] Raw Response:", JSON.stringify(response.data, null, 2));

            const pages = response.data.data;
            const igAccounts = [];

            for (const page of pages) {
                if (page.instagram_business_account) {
                    igAccounts.push({
                        ig_id: page.instagram_business_account.id,
                        username: page.instagram_business_account.username,
                        profile_picture_url: page.instagram_business_account.profile_picture_url,
                        fb_page_id: page.id,
                        fb_page_name: page.name,
                        access_token: page.access_token
                    });
                } else {
                    console.log(`[InstagramService] Page '${page.name}' (ID: ${page.id}) has NO connected Instagram Business Account.`);
                }
            }
            return igAccounts;
        } catch (error) {
            console.error("[InstagramService] Get Accounts Error:", error.response?.data || error.message);
            throw new Error("Failed to fetch Instagram accounts");
        }
    }

    // 3. Subscribe Webhook
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
            console.error(`[Instagram] Failed to subscribe page ${pageId}:`, errMsg);
            return { success: false, error: errMsg };
        }
    }

    // 4. Get User Profile
    async getUserProfile(igsid, pageAccessToken) {
        try {
            const response = await axios.get(`${BASE_URL}/${igsid}`, {
                params: {
                    fields: 'id,username,profile_pic,name',
                    access_token: pageAccessToken
                }
            });

            const data = response.data;
            return {
                username: data.username,
                name: data.name,
                profile_picture_url: data.profile_pic
            };
        } catch (error) {
            return { username: 'Instagram User', profile_picture_url: '' };
        }
    }

    // 5. Send Message (Text or Media)
    async sendMessage(pageAccessToken, recipientId, messageContent, mediaUrl = null, mediaType = 'image') {
        try {
            const payload = {
                recipient: { id: recipientId }
            };

            if (mediaUrl) {
                let metaType = 'image';
                if (mediaType === 'video') metaType = 'video';

                payload.message = {
                    attachment: {
                        type: metaType,
                        payload: {
                            url: mediaUrl,
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
            throw new Error(`Instagram Send Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

export default new InstagramService();