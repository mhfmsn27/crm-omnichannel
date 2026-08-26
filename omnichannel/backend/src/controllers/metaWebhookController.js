import pool from '../config/db.js';
import MetaService from '../services/MetaService.js';
import { generateResponse } from '../services/aiService.js';
import { checkFeatureAccess } from '../services/featureGateService.js';
import redisConnection from '../config/redis.js';
import crypto from 'crypto';
import * as formService from '../services/formService.js';
import * as AutoReplyService from '../services/AutoReplyService.js'; // Added Import
import { dispatchToApps, dispatchOrgEvent } from '../services/webhookDispatcher.js';
import { downloadMedia } from '../utils/mediaDownloader.js';
import { autoAssignConversation, getInboxIdForDevice } from './inboxSettingsController.js';
import { initTicket } from './ticketController.js';
import { isWithinWorkingHours } from './workingHoursController.js';
import { analyzeMessage, persistAnalysis, qualifyLead } from '../services/messageAnalysisService.js';

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'reply_saas_verify';

// GET /webhook/meta (Verification)
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// POST /webhook/meta (Incoming Events)
export const handleWebhook = async (req, res) => {
    try {
        const body = req.body;

        // VERBOSE LOGGING FOR DEBUGGING
        // console.log(`[Meta Webhook] Received payload:`, JSON.stringify(body, null, 2));

        // Check if this is an event from a page subscription
        if (body.object === 'whatsapp_business_account') {

            // [META-DEBUG-LOG]
            console.log('[META-DEBUG] Webhook Hit');
            try { console.log('[META-DEBUG] Payload:', JSON.stringify(body).slice(0, 1000)); } catch (e) { }

            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value) {
                const change = body.entry[0].changes[0].value;
                const metadata = change.metadata; // { display_phone_number, phone_number_id }

                if (!metadata) {
                    // Some events might not have metadata directly at root value, but messages usually do.
                    // If it's a status update, it might be different. 
                    // Log warning but return 200 to acknowledge receipt.
                    // console.warn("[Meta Webhook] Missing metadata in payload", JSON.stringify(change));
                    return res.sendStatus(200);
                }

                // Find the session in our DB (Select ALL columns to get type, waba_id etc for AutoReply)
                // Force cast param to string to avoid BigInt/Int mismatches
                const sessionRes = await pool.query(
                    'SELECT * FROM whatsapp_sessions WHERE CAST(phone_number_id AS VARCHAR) = CAST($1 AS VARCHAR)',
                    [metadata.phone_number_id]
                );

                console.log(`[META-DEBUG] Lookup ID: ${metadata.phone_number_id} -> Found: ${sessionRes.rows.length} rows`);

                if (sessionRes.rows.length === 0) {
                    // This is normal if the user has multiple numbers in WABA but only connected one to CRMHub.
                    console.log(`[Meta Webhook] Ignored event for Phone ID: ${metadata.phone_number_id} (Not connected to this instance).`);
                    return res.sendStatus(200);
                }

                const sessionData = sessionRes.rows[0];
                const { id: dbSessionId, organization_id, session_id: sessionUuid } = sessionData;
                const io = req.io;

                // --- HANDLE MESSAGES ---
                if (change.messages && change.messages.length > 0) {
                    const message = change.messages[0];
                    const from = message.from; // User Phone
                    const timestamp = message.timestamp;
                    const waMessageId = message.id;
                    const type = message.type;

                    // Extract CTWA referral (Click-to-WhatsApp Ads) if present
                    const referral = message.referral || null;
                    const ctwaData = referral ? {
                        ctwa_ad_id: referral.source_id || null,
                        ctwa_source_type: referral.source_type || null,
                        ctwa_headline: referral.headline || null,
                        ctwa_source_url: referral.source_url || null,
                        ctwa_clid: referral.ctwa_clid || null,
                    } : null;

                    console.log(`[Meta Webhook] Processing message from ${from} (Type: ${type})`);

                    let content = '';
                    let mediaUrl = null;
                    let msgType = 'text';
                    let mimetype = null;

                    console.log(`[META-DEBUG] Processing Message. From: ${from}, Type: ${type}`);

                    // Robust parsing for different message types
                    if (type === 'text') {
                        content = message.text?.body || '';
                    } else if (type === 'image') {
                        msgType = 'image';
                        content = message.image?.caption || '';
                        mediaUrl = message.image?.id;
                        mimetype = message.image?.mime_type;
                    } else if (type === 'video') {
                        msgType = 'video';
                        content = message.video?.caption || '';
                        mediaUrl = message.video?.id;
                        mimetype = message.video?.mime_type;
                    } else if (type === 'document') {
                        msgType = 'document';
                        content = message.document?.caption || message.document?.filename || 'Document';
                        mediaUrl = message.document?.id;
                        mimetype = message.document?.mime_type;
                    } else if (type === 'audio') {
                        msgType = 'audio';
                        mediaUrl = message.audio?.id;
                        mimetype = message.audio?.mime_type;
                    } else if (type === 'button') {
                        content = message.button?.text || '';
                    } else if (type === 'interactive') {
                        if (message.interactive?.type === 'button_reply') {
                            content = message.interactive.button_reply?.title || '';
                        } else if (message.interactive?.type === 'list_reply') {
                            content = message.interactive.list_reply?.title || '';
                        } else if (message.interactive?.type === 'nfm_reply') {
                            // WA Flow response
                            const flowResponse = message.interactive.nfm_reply?.response_json;
                            try {
                                const parsed = flowResponse ? JSON.parse(flowResponse) : {};
                                const entries = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(', ');
                                content = `[WA Form Diisi] ${entries || flowResponse}`;
                            } catch {
                                content = `[WA Form Diisi] ${flowResponse || ''}`;
                            }
                        } else {
                            content = '[Interactive Message]';
                        }
                    } else {
                        content = `[${type.toUpperCase()}]`;
                    }

                    // 1. Upsert Contact & Update Last Inbound
                    let contactId;
                    const contactRes = await pool.query(
                        'SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2',
                        [organization_id, from]
                    );

                    let profilePicUrl = null;

                    // DEBUG: Log the contacts payload to inspect what Meta/CoEx sends
                    if (change.contacts) {
                        try {
                            console.log(`[Meta Webhook] Contacts Payload for ${from}:`, JSON.stringify(change.contacts, null, 2));
                        } catch (e) { }
                    }

                    // Check if payload has profile info (rare but possible in some API versions/contexts)
                    if (change.contacts && change.contacts[0]) {
                        const c = change.contacts[0];
                        // Some providers might send photo link, though standard Cloud API usually doesn't for privacy
                        // But if CoEx does, it might be here.
                        if (c.profile?.photo?.link) profilePicUrl = c.profile.photo.link;
                        else if (c.profile_pic) profilePicUrl = c.profile_pic;
                        else if (c.profile_picture) profilePicUrl = c.profile_picture;
                        else if (c.avatar) profilePicUrl = c.avatar;
                        else if (c.profile?.profile_pic_url) profilePicUrl = c.profile.profile_pic_url;
                    }

                    if (contactRes.rows.length > 0) {
                        contactId = contactRes.rows[0].id;
                        let updateSql = `UPDATE contacts SET last_inbound_at = NOW()`;
                        const params = [contactId];

                        if (profilePicUrl) {
                            updateSql += `, profile_pic_url = $2`;
                            params.push(profilePicUrl);
                            console.log(`[Meta Webhook] âœ… Profile pic from webhook for ${from}`);
                        } else {
                            console.log(`[Meta Webhook] â„¹ï¸  No profile pic in webhook for ${from} (Meta API limitation)`);
                        }

                        updateSql += ` WHERE id = $1`;
                        await pool.query(updateSql, params);
                    } else {
                        const profileName = change.contacts?.[0]?.profile?.name || from;
                        const newContact = await pool.query(
                            `INSERT INTO contacts (organization_id, name, phone_number, source, last_inbound_at, profile_pic_url) 
                             VALUES ($1, $2, $3, 'inbox', NOW(), $4) RETURNING id`,
                            [organization_id, profileName, from, profilePicUrl]
                        );
                        contactId = newContact.rows[0].id;
                        dispatchOrgEvent(organization_id, 'contact.created', { contactId, name: profileName, phone: from, channel: 'whatsapp' }).catch(() => {});

                        if (profilePicUrl) {
                            console.log(`[Meta Webhook] âœ… New contact with profile pic: ${from}`);
                        } else {
                            console.log(`[Meta Webhook] â„¹ï¸  New contact without profile pic: ${from} (uses fallback avatar)`);
                        }
                    }

                    // NOTE: Meta WhatsApp Cloud API does NOT support fetching contact profile pictures
                    // Profile pictures can ONLY be obtained if Meta includes them in webhook payload (rare)
                    // This is different from unofficial WhatsApp (Baileys) which can fetch profile pics
                    // Frontend will use fallback avatars (ui-avatars.com) for contacts without profile pics

                    // --- MEDIA DOWNLOAD LOGIC ---
                    if (mediaUrl) {
                        try {
                            const accessToken = sessionData.access_token;
                            if (accessToken) {
                                // 1. Get Real URL
                                const realUrl = await MetaService.getMediaUrl(accessToken, mediaUrl);
                                if (realUrl) {
                                    // 2. Download with Auth Header
                                    const downloadedPath = await downloadMedia(realUrl, 'whatsapp_official', {
                                        'Authorization': `Bearer ${accessToken}`
                                    });
                                    if (downloadedPath) {
                                        mediaUrl = downloadedPath; // Update ID to Local Path
                                        console.log(`[Meta Webhook] Media downloaded: ${mediaUrl}`);
                                    }
                                }
                            }
                        } catch (mediaErr) {
                            console.error("[Meta Webhook] Failed to download media:", mediaErr.message);
                            // Leave mediaUrl as ID so at least we have the reference
                        }
                    }

                    let skipAutoReply = false;

                    // NEW: DISPATCH TO DEVELOPER APP WEBHOOK
                    if (!message.from_me) {
                        try {
                            // sessionUuid is available from sessionData
                            dispatchToApps(sessionUuid, 'message.received', {
                                from: from,
                                text: content,
                                type: msgType,
                                mediaUrl: mediaUrl, // Note: This is Media ID for official API
                                waMessageId: waMessageId,
                                channel: 'whatsapp'
                            });
                        } catch (dispatchErr) {
                            console.error("[Meta Webhook] Dispatch Error:", dispatchErr);
                        }
                    }

                    // --- CHECK CHAT FORM (OFFICIAL SUPPORT) ---
                    // Allow text AND media (image/document) to trigger/continue form
                    if ((type === 'text' && content) || (type === 'image' || type === 'document' || type === 'video')) {
                        try {
                            const formResult = await formService.handleIncomingMessage(
                                organization_id,
                                contactId,
                                dbSessionId,
                                sessionUuid,
                                content || `[${msgType}]`, // Fallback text for media if no caption 
                                from,
                                'whatsapp',
                                {}, // Context
                                mediaUrl, // Media ID/URL
                                mimetype
                            );
                            if (formResult && formResult.handled) {
                                skipAutoReply = true;
                                console.log(`[Meta Webhook] Message handled by Chat Form for contact ${contactId}`);
                            }
                        } catch (e) {
                            console.error("[Meta Webhook] Form Handler Error:", e);
                        }
                    }

                    // --- 3. AUTO REPLY SERVICE (NEW) ---
                    if (!message.from_me && !skipAutoReply) {
                        if (type === 'text' && content) {
                            try {
                                const replyResult = await AutoReplyService.processIncomingMessage(
                                    sessionData, // Pass full session object (includes type='official')
                                    contactId,
                                    content,
                                    from
                                );

                                if (replyResult.handled) {
                                    skipAutoReply = true;
                                    console.log(`[Meta Webhook] Handled by AutoReply (${replyResult.type})`);
                                }
                            } catch (e) {
                                console.error("[Meta Webhook] AutoReply Error:", e);
                            }
                        }
                    }

                    // 2. Upsert Conversation
                    let conversationId;
                    let isChatbotActive = true;

                    // First, try Strict Match (Same Session)
                    const convRes = await pool.query(
                        'SELECT id, is_chatbot_active, status, whatsapp_session_id FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND whatsapp_session_id = $3',
                        [organization_id, contactId, dbSessionId]
                    );

                    if (convRes.rows.length > 0) {
                        conversationId = convRes.rows[0].id;
                        isChatbotActive = convRes.rows[0].is_chatbot_active;
                    } else {
                        // SMART MERGE: Check if there is an existing conversation for this contact 
                        // that belongs to a DELETED session or SAME NUMBER but different ID (Re-install/Re-connect)
                        const orphanCheck = await pool.query(
                            `SELECT c.id, c.is_chatbot_active, c.status, s.whatsapp_number as old_number, s.id as old_session_exists
                             FROM conversations c
                             LEFT JOIN whatsapp_sessions s ON c.whatsapp_session_id = s.id
                             WHERE c.organization_id = $1 AND c.contact_id = $2
                             ORDER BY c.last_message_at DESC LIMIT 1`,
                            [organization_id, contactId]
                        );

                        if (orphanCheck.rows.length > 0) {
                            const orphan = orphanCheck.rows[0];
                            const currentNumber = sessionData.whatsapp_number;

                            // Merge if:
                            // 1. Old session is deleted (old_session_exists is null)
                            // 2. OR Old session number matches current session number
                            if (!orphan.old_session_exists || (orphan.old_number && orphan.old_number === currentNumber)) {
                                console.log(`[Meta Webhook] Merging conversation ${orphan.id} to new session ${dbSessionId}`);
                                await pool.query('UPDATE conversations SET whatsapp_session_id = $1 WHERE id = $2', [dbSessionId, orphan.id]);
                                conversationId = orphan.id;
                                isChatbotActive = orphan.is_chatbot_active;
                            }
                        }
                    }

                    if (conversationId) {
                        // Existing (or Merged) Logic ...
                        // Need to refetch status if not available in scope
                        const statusRes = await pool.query('SELECT status FROM conversations WHERE id = $1', [conversationId]);
                        const status = statusRes.rows[0]?.status || 'open';

                        let unassignSql = "";
                        if (status === 'resolved') {
                            unassignSql = ", assigned_to_agent_id = NULL";
                            if (req.io) {
                                req.io.to(`org_${organization_id}`).emit('conversation_status_update', {
                                    conversationId,
                                    status: 'open',
                                    assigned_to_agent_id: null
                                });
                            }
                        }

                        await pool.query(
                            `UPDATE conversations SET last_message = $1, last_message_at = NOW(), unread_count = unread_count + 1, status = 'open' ${unassignSql} WHERE id = $2`,
                            [content, conversationId]
                        );
                    } else {
                        // Get inbox_id based on device for inbox isolation
                        const inboxId = await getInboxIdForDevice(dbSessionId, 'whatsapp');

                        let newConv;
                        if (ctwaData && ctwaData.ctwa_ad_id) {
                            newConv = await pool.query(
                                `INSERT INTO conversations (organization_id, contact_id, whatsapp_session_id, inbox_id, last_message, unread_count, status, is_chatbot_active, ctwa_ad_id, ctwa_source_type, ctwa_headline, ctwa_source_url, ctwa_clid)
                                 VALUES ($1, $2, $3, $4, $5, 1, 'open', true, $6, $7, $8, $9, $10) RETURNING id`,
                                [organization_id, contactId, dbSessionId, inboxId, content, ctwaData.ctwa_ad_id, ctwaData.ctwa_source_type, ctwaData.ctwa_headline, ctwaData.ctwa_source_url, ctwaData.ctwa_clid]
                            );
                            console.log(`[Meta Webhook] CTWA conversation created. Ad ID: ${ctwaData.ctwa_ad_id}`);
                        } else {
                            newConv = await pool.query(
                                `INSERT INTO conversations (organization_id, contact_id, whatsapp_session_id, inbox_id, last_message, unread_count, status, is_chatbot_active)
                                 VALUES ($1, $2, $3, $4, $5, 1, 'open', true) RETURNING id`,
                                [organization_id, contactId, dbSessionId, inboxId, content]
                            );
                        }
                        conversationId = newConv.rows[0].id;
                        autoAssignConversation(organization_id, conversationId, io, 'CS', 'whatsapp', inboxId).catch(err => console.error('[MetaWebhook] autoAssign failed:', err.message));
                        initTicket(organization_id, conversationId).catch(err => console.error('[MetaWebhook] initTicket failed:', err.message));
                        dispatchOrgEvent(organization_id, 'conversation.created', { conversationId, contactId, channel: 'whatsapp', inbox_id: inboxId }).catch(() => {});
                    }

                    // 3. Insert Message
                    // Note: mediaUrl here is actually the Meta Media ID. The frontend might need to fetch the actual URL using this ID + Token if not pre-fetched.
                    // For now we store the ID.
                    const msgRes = await pool.query(
                        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, wa_message_id, status, created_at)
                         VALUES ($1, $2, false, $3, $4, $5, $6, 'received', to_timestamp($7)) 
                         ON CONFLICT (wa_message_id) DO NOTHING
                         RETURNING *`,
                        [conversationId, organization_id, msgType, content, mediaUrl, waMessageId, timestamp]
                    );

                    console.log(`[META-DEBUG] Insert Attempt. Result Rows: ${msgRes.rows.length}`);

                    if (msgRes.rows.length > 0) {
                        console.log(`[Meta Webhook] Message saved to DB (ID: ${msgRes.rows[0].id})`);
                        // 4. Realtime Emit
                        if (io) {
                            io.to(`org_${organization_id}`).emit('new_message', {
                                conversationId,
                                message: msgRes.rows[0]
                            });
                        }

                        // Dispatch to org outbound webhooks (Zapier/Make compatible)
                        dispatchOrgEvent(organization_id, 'message.received', {
                            conversationId,
                            message: { id: msgRes.rows[0].id, type: msgType, content, from_me: false },
                            contact: { id: contactId, phone: from },
                            channel: 'whatsapp',
                        }).catch(() => {});

                        // [ANALYSIS] Urgency + Sentiment for incoming messages (fire-and-forget)
                        if (type === 'text' && content) {
                            (async () => {
                                try {
                                    const analysis = await analyzeMessage(content, organization_id);
                                    await persistAnalysis(conversationId, msgRes.rows[0].id, analysis, organization_id);
                                    if (analysis.urgency.isUrgent && io) {
                                        io.to(`org_${organization_id}`).emit('conversation_urgent', {
                                            conversationId,
                                            urgencyScore: analysis.urgency.score,
                                            reason: analysis.urgency.reason
                                        });
                                    }
                                    if (contactId) {
                                        const countRes = await pool.query(
                                            `SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND from_me = false`,
                                            [conversationId]
                                        );
                                        if (parseInt(countRes.rows[0].count) % 5 === 0) {
                                            await qualifyLead(contactId, organization_id);
                                        }
                                    }
                                } catch (e) { /* non-fatal */ }
                            })();
                        }

                        // ============================================================
                        // 5. OFFICIAL CHATBOT LOGIC
                        // ============================================================
                        if (isChatbotActive && type === 'text' && !skipAutoReply) {
                            (async () => {
                                // Simple dedupe lock for bot
                                const botLockKey = `bot_lock_meta:${waMessageId}`;
                                const lockAcquired = await redisConnection.set(botLockKey, '1', 'NX', 'EX', 60);
                                if (!lockAcquired) return;

                                try {
                                    const { withinHours, outsideMode, offlineMessage } = await isWithinWorkingHours(organization_id);
                                    if (!withinHours && outsideMode !== 'ai') {
                                        if (outsideMode === 'message' && offlineMessage) {
                                            await MetaService.sendMessage(sessionData, from, 'text', offlineMessage);
                                            await pool.query(
                                                'INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                                                [conversationId, organization_id, 'text', offlineMessage, 'sent', `offline.${crypto.randomUUID()}`]
                                            );
                                        }
                                        return;
                                    }

                                    // Check Feature
                                    const access = await checkFeatureAccess(organization_id, 'feat_chatbot');
                                    if (!access.allowed) return;

                                    // Fetch Bot Settings for this session
                                    const botRes = await pool.query(
                                        'SELECT * FROM chatbot_settings WHERE session_id = $1 AND is_active = true',
                                        [sessionUuid]
                                    );

                                    if (botRes.rows.length === 0) return;
                                    const bot = botRes.rows[0];

                                    // Retrieve History
                                    const historyRes = await pool.query('SELECT from_me, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 10', [conversationId]);
                                    const chatHistory = historyRes.rows.reverse();

                                    // Generate Response
                                    const aiResponse = await generateResponse(organization_id, content, chatHistory, bot);

                                    if (aiResponse === "[ESCALATE]") {
                                        // Turn off bot
                                        await pool.query("UPDATE conversations SET is_chatbot_active = false, status = 'needs_agent' WHERE id = $1", [conversationId]);

                                        // Emit Alert
                                        if (io) io.to(`org_${organization_id}`).emit('bot_escalated', { conversationId, alert: true });

                                        // Send Fallback
                                        const fallbackText = "Mohon tunggu sebentar, saya sambungkan dengan staf admin kami.";
                                        await MetaService.sendMessage(sessionData, from, 'text', fallbackText);

                                        // Log outgoing
                                        await pool.query('INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6)',
                                            [conversationId, organization_id, 'text', fallbackText, 'sent', `bot.esc.meta.${crypto.randomUUID()}`]
                                        );

                                    } else if (aiResponse) {
                                        // Send AI Response
                                        await MetaService.sendMessage(sessionData, from, 'text', aiResponse);

                                        // Log outgoing
                                        const botMsgId = `bot.res.meta.${crypto.randomUUID()}`;
                                        const aiMsg = await pool.query('INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id) VALUES ($1, $2, true, $3, $4, $5, $6) RETURNING *',
                                            [conversationId, organization_id, 'text', aiResponse, 'sent', botMsgId]
                                        );

                                        if (io) {
                                            io.to(`org_${organization_id}`).emit('new_message', { conversationId, message: aiMsg.rows[0] });
                                        }
                                    }

                                } catch (botErr) {
                                    console.error("[Meta Bot Error]", botErr);
                                }
                            })();
                        }

                    } else {
                        console.log(`[Meta Webhook] Message skipped (Duplicate ID: ${waMessageId})`);
                    }
                }

                // --- HANDLE STATUSES (Sent, Delivered, Read, Failed) ---
                if (change.statuses && change.statuses.length > 0) {
                    const statusObj = change.statuses[0];
                    const waMessageId = statusObj.id;
                    const status = statusObj.status; // sent, delivered, read, failed

                    if (status === 'failed') {
                        console.error(`[Meta Webhook] Message FAILED (${waMessageId}):`, JSON.stringify(statusObj.errors || 'Unknown Reason', null, 2));
                    } else {
                        console.log(`[Meta Webhook] Status Update: ${status} for MsgID: ${waMessageId}`);
                    }

                    const updateRes = await pool.query(
                        `UPDATE messages SET status = $1 WHERE wa_message_id = $2 RETURNING conversation_id`,
                        [status, waMessageId]
                    );

                    if (updateRes.rows.length > 0) {
                        const convId = updateRes.rows[0].conversation_id;
                        if (io) {
                            io.to(`org_${organization_id}`).emit('message_status_update', {
                                conversationId: convId,
                                waMessageId,
                                status
                            });
                        }
                        // NEW: NOTIFY APPS
                        if (sessionUuid) {
                            try {
                                dispatchToApps(sessionUuid, 'message.status', { id: waMessageId, status });
                            } catch (e) { console.error("Dispatch Status Error", e); }
                        }
                    }
                }
            }
            res.sendStatus(200);
        } else if (body.object === 'user') {
            // Handle Facebook Login user events (e.g. permissions revoked, de-auth)
            // Just acknowledge to prevent retries
            console.log(`[Meta Webhook] Received User Event (likely permissions/de-auth):`, JSON.stringify(body.entry));
            res.sendStatus(200);
        } else {
            // Not a whatsapp business account event
            console.log(`[Meta Webhook] Received unknown object type: ${body.object}`);
            res.sendStatus(404);
        }
    } catch (err) {
        console.error("[Meta Webhook] Error:", err);
        res.sendStatus(500);
    }
};