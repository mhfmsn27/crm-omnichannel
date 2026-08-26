import axios from 'axios';
import pool from '../config/db.js';
import fs from 'fs';
import FormData from 'form-data';

const GRAPH_API_VERSION = process.env.WA_API_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class MetaService {

    // --- COEX / EMBEDDED SIGNUP METHODS ---
    async exchangeCodeForToken(code, initialRedirectUri) {
        // Fetch Meta Config from DB
        const settingsRes = await pool.query(
            "SELECT key, value FROM system_settings WHERE group_name = 'meta_config'"
        );
        const config = {};
        settingsRes.rows.forEach(r => config[r.key] = r.value);

        const appId = config.wa_app_id || process.env.WA_APP_ID;
        const appSecret = config.wa_secret || process.env.WA_SECRET;

        if (!appId || !appSecret) {
            throw new Error("[MetaService] Missing WA_APP_ID or WA_SECRET in env");
        }

        const candidates = [
            initialRedirectUri,
            'postmessage',
            '',
            'https://www.facebook.com/connect/login_success.html',
            initialRedirectUri ? new URL(initialRedirectUri).origin + '/' : null,
            initialRedirectUri ? new URL(initialRedirectUri).origin : null
        ];

        const uniqueCandidates = [...new Set(candidates.filter(c => c !== undefined && c !== null))];
        let lastError = null;

        for (const uri of uniqueCandidates) {
            try {
                const response = await axios.get(`${BASE_URL}/oauth/access_token`, {
                    params: {
                        client_id: appId,
                        client_secret: appSecret,
                        code: code,
                        redirect_uri: uri
                    }
                });

                const token = response.data.access_token;

                // DEBUG: Check what scopes we actually got
                try {
                    const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
                        params: {
                            input_token: token,
                            input_token: token,
                            access_token: `${appId}|${appSecret}`
                        }
                    });
                    console.log(`[MetaService] Token Scopes:`, debugRes.data.data.scopes);

                    if (!debugRes.data.data.scopes.includes('whatsapp_business_messaging')) {
                        console.error("[MetaService] WARNING: Token missing 'whatsapp_business_messaging' scope.");
                    }
                } catch (e) { console.warn("[MetaService] Could not debug token scopes"); }

                console.log(`[MetaService] Token exchange successful using redirect_uri: '${uri}'`);
                return token;

            } catch (error) {
                lastError = error;
                const errorData = error.response?.data?.error || {};
                if (errorData.code === 100) throw new Error(`Invalid Code: ${errorData.message}`);
            }
        }

        const finalErrorData = lastError?.response?.data?.error || {};
        console.error("[MetaService] All token exchange strategies failed.", finalErrorData);
        throw new Error(`Token Exchange Failed: ${finalErrorData.message || lastError.message}`);
    }

    async getPhonesFromWaba(accessToken, wabaId) {
        try {
            let targetWabaId = wabaId;

            if (!targetWabaId) {
                const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
                    params: {
                        input_token: accessToken,
                        input_token: accessToken,
                        access_token: `${(await this.getMetaConfig()).wa_app_id}|${(await this.getMetaConfig()).wa_secret}`
                    }
                });

                const granularScopes = debugRes.data.data.granular_scopes || [];
                const whatsappScope = granularScopes.find(s => s.scope === 'whatsapp_business_management');

                if (whatsappScope && whatsappScope.target_ids && whatsappScope.target_ids.length > 0) {
                    targetWabaId = whatsappScope.target_ids[0];
                }

                if (!targetWabaId) throw new Error("WABA ID missing and could not be resolved from token.");
            }

            let allPhones = [];
            let nextUrl = `${BASE_URL}/${targetWabaId}/phone_numbers`;
            let params = {
                access_token: accessToken,
                fields: 'id,display_phone_number,verified_name,quality_rating,name_status,code_verification_status,permissions'
            };

            while (nextUrl) {
                try {
                    const response = await axios.get(nextUrl, { params });
                    if (response.data.data) allPhones = [...allPhones, ...response.data.data];
                    if (response.data.paging && response.data.paging.next) {
                        nextUrl = response.data.paging.next;
                        params = {};
                    } else {
                        nextUrl = null;
                    }
                } catch (err) {
                    console.error("[MetaService] Pagination Error:", err.message);
                    break;
                }
            }

            return { data: allPhones, waba_id: targetWabaId };
        } catch (error) {
            console.error("[MetaService] Get Phones Error:", error.response?.data || error.message);
            throw new Error(`Failed to fetch phone numbers: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async validateCredentials(accessToken, phoneId) {
        try {
            const response = await axios.get(`${BASE_URL}/${phoneId}`, {
                params: {
                    fields: 'id,verified_name,display_phone_number,quality_rating',
                    access_token: accessToken
                }
            });
            if (response.data.id !== phoneId) throw new Error("Token does not match Phone ID");
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.error?.message || error.message;
            throw new Error(`Validation Failed: ${msg}`);
        }
    }

    async subscribeApp(accessToken, wabaId) {
        if (!wabaId) return;
        try {
            await axios.post(`${BASE_URL}/${wabaId}/subscribed_apps`, {}, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
        } catch (error) {
            console.error("[Meta] Subscribe Warning:", error.response?.data || error.message);
        }
    }

    async getTemplates(accessToken, wabaId) {
        try {
            const response = await axios.get(`${BASE_URL}/${wabaId}/message_templates`, {
                params: { access_token: accessToken, limit: 100 }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to fetch templates: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async getMediaUrl(accessToken, mediaId) {
        try {
            const response = await axios.get(`${BASE_URL}/${mediaId}`, {
                params: { access_token: accessToken }
            });
            return response.data.url; // This URL requires Auth to download
        } catch (error) {
            console.error("[MetaService] Get Media URL Error:", error.response?.data || error.message);
            return null;
        }
    }

    async sendMessage(session, to, type, content, mediaUrl = null) {
        const { access_token, phone_number_id } = session;

        if (!access_token || !phone_number_id) {
            throw new Error("Missing Meta Credentials");
        }

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: type
        };

        if (type === 'text') {
            payload.text = { body: content };
        } else if (['image', 'video', 'document', 'audio'].includes(type)) {
            payload[type] = { link: mediaUrl };
            if (content && type !== 'audio') payload[type].caption = content;
        } else if (type === 'template') {
            if (typeof content === 'object') payload.template = content;
            else payload.template = { name: content, language: { code: "id" } };
        }

        try {
            const response = await axios.post(`${BASE_URL}/${phone_number_id}/messages`, payload, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error("[MetaService] Send Message Error Details:", JSON.stringify(error.response?.data || error.message));
            throw new Error(`Meta API Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async getContactProfile(accessToken, phoneNumberId, contactPhone) {
        // NOTE: Meta WhatsApp Cloud API does NOT support fetching contact profile pictures
        // via Graph API for privacy reasons. Profile pictures can ONLY come from:
        // 1. Webhook payload (if Meta decides to send it - rare)
        // 2. WhatsApp Web/Baileys (unofficial APIs that act as WhatsApp clients)
        //
        // This function is kept for future compatibility in case Meta adds this feature,
        // but currently it will always return null.

        console.log(`[MetaService] ⚠️  Meta Cloud API does not support fetching contact profile pictures`);
        console.log(`[MetaService] Contact ${contactPhone} can only get profile pic from webhook payload`);

        // For documentation purposes, the theoretical endpoint would be:
        // However, this does NOT exist in Meta's WhatsApp Cloud API
        // Only business profile photos can be fetched via:
        // GET /{phone_number_id}/whatsapp_business_profile?fields=profile_picture_url

        return null;
    }

    async getBusinessProfile(accessToken, phoneId) {
        try {
            const response = await axios.get(`${BASE_URL}/${phoneId}/whatsapp_business_profile`, {
                params: {
                    fields: 'profile_picture_url,about,address,description,email,websites,vertical',
                    access_token: accessToken
                }
            });
            return response.data.data[0];
        } catch (error) {
            return null;
        }
    }

    async getAppId(accessToken) {
        try {
            const debugRes = await axios.get(`https://graph.facebook.com/debug_token`, {
                params: {
                    input_token: accessToken,
                    input_token: accessToken,
                    access_token: `${(await this.getMetaConfig()).wa_app_id}|${(await this.getMetaConfig()).wa_secret}`
                    // Note: We use our own app credentials to debug ANY token (even BYOK ones), 
                    // providing our App has permission or is just checking a public token structure. 
                    // Actually, to debug a token, you need an app access token. 
                    // If the user is BYOK, we might not be able to debug their token using OUR app credentials if they are completely separate?
                    // Actually, yes we can debug valid tokens usually.
                    // If this fails, we might just assume WA_APP_ID for CoEx.
                }
            });
            return debugRes.data.data.app_id;
        } catch (error) {
            console.warn("[MetaService] Failed to debug token for App ID, defaulting to env:", error.message);
            console.warn("[MetaService] Failed to debug token for App ID, defaulting to env:", error.message);
            return (await this.getMetaConfig()).wa_app_id;
        }
    }

    // Helper to fetch config (cached or fresh)
    async getMetaConfig() {
        try {
            const settingsRes = await pool.query(
                "SELECT key, value FROM system_settings WHERE group_name = 'meta_config'"
            );
            const config = {};
            settingsRes.rows.forEach(r => config[r.key] = r.value);
            return {
                wa_app_id: config.wa_app_id || process.env.WA_APP_ID,
                wa_secret: config.wa_secret || process.env.WA_SECRET
            };
        } catch (e) {
            console.error("Failed to fetch meta config:", e);
            return { wa_app_id: process.env.WA_APP_ID, wa_secret: process.env.WA_SECRET };
        }
    }

    // --- TEMPLATE MANAGEMENT ---

    // --- MEDIA UPLOAD FOR TEMPLATES (Resumable API) ---
    async uploadMediaForTemplate(accessToken, appId, filePath, fileType) {
        try {
            const stats = fs.statSync(filePath);
            const fileSize = stats.size;

            // 1. Initiate Upload Session
            // Note: We use the APP ID, not the Phone ID for template assets usually, but actually for Resumable Uploads
            // generic endpoint: /{app_id}/uploads
            console.log(`[MetaService] Starting upload session for App: ${appId}, Size: ${fileSize}, Type: ${fileType}`);

            const initResponse = await axios.post(`${BASE_URL}/${appId}/uploads`, null, {
                params: {
                    file_length: fileSize,
                    file_type: fileType,
                    access_token: accessToken
                }
            });

            const uploadSessionId = initResponse.data.id;
            console.log(`[MetaService] Upload Session ID: ${uploadSessionId}`);

            // 2. Upload File Content
            const fileStream = fs.createReadStream(filePath);

            const uploadResponse = await axios.post(`${BASE_URL}/${uploadSessionId}`, fileStream, {
                headers: {
                    'Authorization': `OAuth ${accessToken}`,
                    'file_offset': 0,
                    'Content-Type': 'application/octet-stream' // Binary upload
                }
            });

            // Result contains 'h' (handle)
            console.log(`[MetaService] Upload Complete. Handle: ${uploadResponse.data.h}`);
            return uploadResponse.data.h;

        } catch (error) {
            console.error("[MetaService] Upload Media Error:", JSON.stringify(error.response?.data || error.message));
            throw new Error(`Upload Failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async createTemplate(accessToken, wabaId, templateData) {
        try {
            const response = await axios.post(`${BASE_URL}/${wabaId}/message_templates`, templateData, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return response.data;
        } catch (error) {
            console.error("[Meta] Create Template Error:", JSON.stringify(error.response?.data || error.message));
            throw new Error(`Create Failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    async deleteTemplate(accessToken, wabaId, templateName) {
        try {
            // Need ID or Name? Meta allows deleting by name via query param usually, 
            // but strict API maps name as query parameter `name` to DELETE endpoint on WABA?
            // Actually, endpoint is DELETE /{waba_id}/message_templates?name=hello_world
            await axios.delete(`${BASE_URL}/${wabaId}/message_templates`, {
                params: {
                    name: templateName,
                    access_token: accessToken
                }
            });
            return true;
        } catch (error) {
            console.error("[Meta] Delete Template Error:", JSON.stringify(error.response?.data || error.message));
            throw new Error(`Delete Failed: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}

export default new MetaService();