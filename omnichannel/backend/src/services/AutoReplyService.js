import pool from '../config/db.js';
import redisConnection from '../config/redis.js';
import * as waService from './waGatewayService.js';
import MetaService from './MetaService.js';
import MessengerService from './MessengerService.js';
import InstagramService from './InstagramService.js';
import TelegramService from './TelegramService.js';
import * as QueueService from './QueueService.js';
import crypto from 'crypto';

// Session TTL in seconds (e.g. 30 minutes)
const SESSION_TTL = 1800;

// HELPER: Bot Message Fingerprinting to prevent overwriting 'last_message' in Inbox
export const registerBotMessage = async (orgId, contactId, text) => {
    if (!text) return;
    try {
        const hash = crypto.createHash('md5').update(text.trim()).digest('hex');
        const key = `bot_msg:${orgId}:${contactId}:${hash}`;
        await redisConnection.set(key, '1', 'EX', 60); // 60s expiration
    } catch (e) { console.error("Redis Error", e); }
};

export const checkIsBotMessage = async (orgId, phone, text) => {
    if (!text || !phone) return false;
    try {
        const hash = crypto.createHash('md5').update(text.trim()).digest('hex');
        const key = `bot_msg:${orgId}:${phone}:${hash}`;
        const exists = await redisConnection.get(key);
        if (exists) {
            await redisConnection.del(key);
            return true;
        }
        return false;
    } catch (e) { return false; }
};

/**
 * Replace variables in queue message template
 * @param {string} template - Message template with variables
 * @param {Object} data - Data object with customerName, queuePosition, division, whatsappNumber
 * @returns {string} - Message with variables replaced
 */
export const replaceQueueVariables = (template, data) => {
    if (!template) return template;
    return template
        .replace(/\{\{\s*customer_name\s*\}\}/gi, data.customerName || 'Customer')
        .replace(/\{\{\s*queue_position\s*\}\}/gi, String(data.queuePosition || '?'))
        .replace(/\{\{\s*division\s*\}\}/gi, data.division || 'General')
        .replace(/\{\{\s*whatsapp_number\s*\}\}/gi, data.whatsappNumber || '');
};

/**
 * Check if text contains escalation keywords
 * @param {string} text - User message
 * @param {string} escalationKeywords - Comma-separated keywords
 * @returns {boolean} - True if escalation detected
 */
export const checkEscalation = (text, escalationKeywords) => {
    if (!escalationKeywords || !text) return false;
    const keywords = escalationKeywords.split(',').map(k => k.trim().toLowerCase());
    const lowerText = text.toLowerCase();
    return keywords.some(kw => lowerText.includes(kw));
};

/**
 * Process Incoming Message for Auto Reply, Chatbot, and Queue Mode
 * @param {Object} session - Session object containing organization_id, session_id, type, etc.
 * @param {string|number} contactId - Contact ID in DB
 * @param {string} text - Message content
 * @param {string} senderIdentifier - Phone number (WA), PSID (Messenger), IGSID (IG), ChatID (Telegram), or VisitorID (Webchat)
 * @param {string} [channel='whatsapp'] - Channel type: 'whatsapp', 'messenger', 'instagram', 'telegram', 'webchat'
 * @param {Object} [extraData={}] - Extra data like conversationId, or specific channel tokens
 */
export const processIncomingMessage = async (session, contactId, text, senderIdentifier, channel = 'whatsapp', extraData = {}) => {
    if (!text) return { handled: false };
    const cleanText = text.trim();
    const orgId = session.organization_id;
    // Unique session key per channel per user
    const sessionKey = `menu_session:${orgId}:${channel}:${senderIdentifier}`;
    const conversationId = extraData.conversationId || null;

    try {
        // --- PRIORITY 0: CHECK IF IN QUEUE MODE ---
        // If customer is in queue mode, only allow queue position check
        const queueActiveKey = `queue_active:${orgId}:${contactId}`;
        const isInQueueMode = await redisConnection.get(queueActiveKey);

        if (isInQueueMode) {
            console.log(`[AutoReply] Contact ${contactId} is IN QUEUE MODE - Limited responses`);

            // Allow queue position check with #
            if (cleanText === '#') {
                const pos = await QueueService.getPosition(orgId, contactId);
                if (pos !== null) {
                    const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contactId]);
                    const contact = contactRes.rows[0] || {};

                    const generalConfig = await getAutoReplyConfig(orgId, session.session_id);
                    const queueTemplate = generalConfig?.queue_mode?.welcome_message || 'Anda antrian ke {{queue_position}}. Mohon tunggu sebentar.';

                    const msg = replaceQueueVariables(queueTemplate, {
                        customerName: contact.name,
                        queuePosition: pos,
                        division: '',
                        whatsappNumber: contact.phone_number
                    });

                    await sendReply(session, senderIdentifier, msg, null, channel, extraData);
                    return { handled: true, type: 'queue_check_only' };
                }
            }

            // Allow division selection (1, 2, 3...)
            const generalConfig = await getAutoReplyConfig(orgId, session.session_id);
            if (generalConfig?.queue_mode?.enabled) {
                const divisions = await getOrgDivisions(orgId);
                const input = cleanText.toLowerCase();
                let selectedDiv = null;

                // Check by Index (1-based)
                const index = parseInt(input);
                if (!isNaN(index) && index > 0 && index <= divisions.length && input === String(index)) {
                    selectedDiv = divisions[index - 1];
                }
                // Check by Name
                else {
                    selectedDiv = divisions.find(d => d.toLowerCase() === input);
                }

                if (selectedDiv) {
                    // Enqueue
                    const pos = await QueueService.enqueue(orgId, contactId, selectedDiv);

                    const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contactId]);
                    const contact = contactRes.rows[0] || {};

                    const generalConfig = await getAutoReplyConfig(orgId, session.session_id);
                    const queueTemplate = generalConfig?.queue_mode?.welcome_message || 'Silahkan tunggu kak {{customer_name}}, Anda antrian ke {{queue_position}}. Divisi: {{division}}.';

                    const msg = replaceQueueVariables(queueTemplate, {
                        customerName: contact.name,
                        queuePosition: pos,
                        division: selectedDiv,
                        whatsappNumber: contact.phone_number
                    }) + '\n(Tekan # untuk cek posisi antrian)';

                    await sendReply(session, senderIdentifier, msg, null, channel, extraData);
                    return { handled: true, type: 'queue_enqueue' };
                }
            }

            // All other messages are silently ignored while in queue
            return { handled: true, type: 'queue_waiting_silent' };
        }

        // Declare variables for keyword matching
        let matchedRule = null;
        let matchType = 'none';

        // [OLD QUEUE MODE LOGIC REMOVED - Now handled with queue_active flag at top]

        // 1. KEYWORD REPLY (Highest Priority) --- 0. QUEUE MODE INTERCEPTION ---
        // Check if Queue Mode is enabled for this org
        // For non-whatsapp channels, session.session_id might be Page ID or Bot Token. All map to 'session_id' in chatbot_settings or handled by getAutoReplyConfig
        const generalConfig = await getAutoReplyConfig(orgId, session.session_id);

        if (generalConfig?.queue_mode?.enabled) {

            // Check if user is already in a conversation (excluding resolved)
            // If they have an open conversation, we do NOT intercept (let them talk to agent)
            const activeConv = await pool.query(
                "SELECT id, assigned_to_agent_id, status FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND status != 'resolved'",
                [orgId, contactId]
            );

            // If NO active conversation, OR they are in 'waiting' status (technically no assignee)
            const input = cleanText.toLowerCase();

            console.log(`[AutoReply-${channel}] Contact ${contactId} ActiveConv:`, activeConv.rows);

            if (activeConv.rows.length > 0) {
                // SPECIAL LOGIC: USER IS WAITING IN QUEUE
                // Requirement: "Jika joko chat apapun system akan reply anda antrian ke 1"
                // If status is 'waiting', OR they are 'open' but unassigned (which effectively means waiting in our new logic)
                const isWaiting = activeConv.rows[0].status === 'waiting';
                const isOpenUnassigned = activeConv.rows[0].status === 'open' && !activeConv.rows[0].assigned_to_agent_id;

                if (isWaiting || isOpenUnassigned) {
                    const pos = await QueueService.getPosition(orgId, contactId);
                    if (pos !== null) {
                        // Get contact info and custom message template
                        const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contactId]);
                        const contact = contactRes.rows[0] || {};

                        const generalConfig = await getAutoReplyConfig(orgId, session.session_id);
                        const queueTemplate = generalConfig?.queue_mode?.welcome_message || 'Anda antrian ke {{queue_position}}. Mohon tunggu sebentar.';

                        const msg = replaceQueueVariables(queueTemplate, {
                            customerName: contact.name,
                            queuePosition: pos,
                            division: '',
                            whatsappNumber: contact.phone_number
                        }) + '\n(Tekan # untuk cek posisi antrian)';

                        await sendReply(session, senderIdentifier, msg, null, channel, extraData);
                        return { handled: true, type: 'queue_update', position: pos };
                    }
                }
            }

            if (activeConv.rows.length === 0 || activeConv.rows[0].status === 'waiting' || (activeConv.rows[0].status === 'open' && !activeConv.rows[0].assigned_to_agent_id)) {
                // Check if they selected a division (Input is 1, 2, 3... or Division Name)
                const divisions = await getOrgDivisions(orgId); // Helper to get ['SALES', 'SUPPORT', 'UMUM']
                const input = cleanText.toLowerCase();
                let selectedDiv = null;

                // Check by Index (1-based) - STRICT CHECK
                const index = parseInt(input);
                if (!isNaN(index) && index > 0 && index <= divisions.length && input === String(index)) {
                    selectedDiv = divisions[index - 1];
                }
                // Check by Name
                else {
                    selectedDiv = divisions.find(d => d.toLowerCase() === input);
                }

                if (selectedDiv) {
                    // ROUTING LOGIC
                    // 1. ALWAYS ENQUEUE FIRST (User Requirement: Everyone gets Queue Number)
                    const pos = await QueueService.enqueue(orgId, contactId, selectedDiv);

                    // Get contact info and custom message template
                    const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contactId]);
                    const contact = contactRes.rows[0] || {};

                    const generalConfig = await getAutoReplyConfig(orgId, session.session_id);
                    const queueTemplate = generalConfig?.queue_mode?.welcome_message || 'Silahkan tunggu kak {{customer_name}}, Anda antrian ke {{queue_position}}. Divisi: {{division}}.';

                    // Reply with Queue Number using custom template
                    const msg = replaceQueueVariables(queueTemplate, {
                        customerName: contact.name,
                        queuePosition: pos,
                        division: selectedDiv,
                        whatsappNumber: contact.phone_number
                    }) + '\n(Tekan # untuk cek posisi antrian)';

                    await sendReply(session, senderIdentifier, msg, null, channel, extraData);

                    return { handled: true, type: 'queue_wait', position: pos };
                }


                // If NOT selected division, and NO active session (or just started), SEND MENU
                // But wait, if they typed "Hello", we send menu.
                // If they are in queue, they might type "#".
                if (input === '#') {
                    const qRes = await pool.query(
                        `SELECT division, queue_number, created_at FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting'`,
                        [orgId, contactId]
                    );

                    if (qRes.rows.length > 0) {
                        // Calc position
                        const qItem = qRes.rows[0];
                        const countRes = await pool.query(`SELECT COUNT(*) FROM queues WHERE organization_id=$1 AND division=$2 AND status='waiting' AND created_at <= $3`, [orgId, qItem.division, qItem.created_at]);
                        const pos = countRes.rows[0].count;
                        await sendReply(session, senderIdentifier, `Anda masih dalam antrian ke ${pos}. mohon menunggu`, null, channel, extraData);
                        return { handled: true, type: 'queue_check' };
                    }
                }

                // If not selecting div and not checking queue, SEND MENU
                // Only if they are NOT currently in a queue? 
                // If they are in queue, maybe ignore or remind?
                // Check if they are in queue
                const inQueue = await pool.query("SELECT * FROM queues WHERE organization_id = $1 AND contact_id = $2 AND status = 'waiting'", [orgId, contactId]);
                let isRealQueue = false;

                console.log(`[AutoReply-${channel}] InQueue Check: Found ${inQueue.rows.length} rows`);

                if (inQueue.rows.length > 0) {
                    const qItem = inQueue.rows[0];

                    // CHECK STALE: Is there a resolved conversation NEWER than this queue item?
                    // This handles cases where agent resolved chat without picking from queue.
                    // Use closed_at for resolution time
                    const lastResolved = await pool.query(
                        "SELECT closed_at FROM conversations WHERE organization_id = $1 AND contact_id = $2 AND status = 'resolved' ORDER BY closed_at DESC LIMIT 1",
                        [orgId, contactId]
                    );

                    let isStale = false;
                    if (lastResolved.rows.length > 0) {
                        const closedAtRaw = lastResolved.rows[0].closed_at;
                        const createdAtRaw = qItem.created_at;

                        const resolvedTime = new Date(closedAtRaw).getTime();
                        const queueTime = new Date(createdAtRaw).getTime();

                        if (resolvedTime > queueTime) {
                            isStale = true;
                            // Mark Queue as Cancelled/Stale -> DELETE to avoid unique constraint error
                            await pool.query("DELETE FROM queues WHERE id = $1", [qItem.id]);
                        }
                    }

                    if (!isStale) {
                        // Genuine Queue Item
                        isRealQueue = true;
                        console.log(`[AutoReply] Sending Queue Position Feedback...`);
                        const countRes = await pool.query(`SELECT COUNT(*) FROM queues WHERE organization_id=$1 AND division=$2 AND status='waiting' AND created_at <= $3`, [orgId, qItem.division, qItem.created_at]);
                        const pos = countRes.rows[0].count;

                        // Get contact info and custom message
                        const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contactId]);
                        const contact = contactRes.rows[0] || {};

                        const generalConfig = await getAutoReplyConfig(orgId, session.session_id);
                        const queueTemplate = generalConfig?.queue_mode?.welcome_message || 'Silahkan tunggu kak {{customer_name}}, Anda antrian ke {{queue_position}}. Divisi: {{division}}.';

                        const msg = replaceQueueVariables(queueTemplate, {
                            customerName: contact.name,
                            queuePosition: pos,
                            division: qItem.division,
                            whatsappNumber: contact.phone_number
                        }) + '\nTekan # untuk cek antrian';

                        await sendReply(session, senderIdentifier, msg, null, channel, extraData);
                        return { handled: true, type: 'queue_waiting_active' };
                    }
                }

                if (!isRealQueue) {
                    // Send Menu with Variable Substitution
                    const contactRes = await pool.query('SELECT name, phone_number FROM contacts WHERE id = $1', [contactId]);
                    const contact = contactRes.rows[0] || {};

                    const queueTemplate = generalConfig?.queue_mode?.welcome_message || "Selamat datang di toko kami, silahkan pilih agen yang anda tuju";

                    const menuHeader = replaceQueueVariables(queueTemplate, {
                        customerName: contact.name,
                        queuePosition: '-',
                        division: '-',
                        whatsappNumber: contact.phone_number
                    });

                    let menu = menuHeader + "\n";
                    divisions.forEach((d, i) => {
                        menu += `${i + 1}. ${d}\n`;
                    });
                    await sendReply(session, senderIdentifier, menu, null, channel, extraData);
                    return { handled: true, type: 'queue_menu' };
                }
            }
        }


        // 1. KEYWORD REPLY (Highest Priority)
        // Check if user is inside a menu flow
        const currentParentId = await redisConnection.get(sessionKey);

        if (currentParentId) {
            // Search children of current node
            matchedRule = await findMatchingRule(orgId, currentParentId, cleanText);
        }

        // If no match in children (or no session), search ROOT rules
        if (!matchedRule) {
            matchedRule = await findMatchingRule(orgId, null, cleanText);
            // If found root match, it resets the previous session
            if (matchedRule) await redisConnection.del(sessionKey);
        }

        if (matchedRule) {
            // Log Hit Count
            await pool.query('UPDATE keyword_replies SET hit_count = hit_count + 1 WHERE id = $1', [matchedRule.id]);

            // Send Response
            await sendReply(session, senderIdentifier, matchedRule.response_content, matchedRule.media_url, channel, extraData);

            // Check if this rule has children (Sub-menu)
            const hasChildren = await checkHasChildren(matchedRule.id);

            if (hasChildren) {
                // Set session to this rule ID
                await redisConnection.set(sessionKey, matchedRule.id, 'EX', SESSION_TTL);
            } else {
                // End of flow
                await redisConnection.del(sessionKey);
            }

            matchType = matchedRule.match_type;

            // Log Interaction
            await logChatbotInteraction(orgId, contactId, conversationId, text, matchedRule.id, matchType, true, false);

            return { handled: true, type: 'keyword' };
        }

        // 2. GENERAL AUTO-REPLY CONFIG (Business Hours & Welcome)
        // Fetch config from chatbot_settings (Prioritize Device specific, then Global)
        // session.session_id corresponds to the identifier in chatbot_settings
        const config = await getAutoReplyConfig(orgId, session.session_id);

        if (config) {
            // A. Business Hours
            if (config.business_hours?.enabled) {
                try {
                    const isOpen = isBusinessOpen(config.business_hours.schedule);
                    if (!isOpen) {
                        // CLOSED
                        await logChatbotInteraction(orgId, contactId, conversationId, text, null, 'closed_silent', true, false);
                        return { handled: true, type: 'business_hours' };
                    }
                } catch (bhErr) {
                    console.error("Business Hours Check Failed:", bhErr);
                    // Fail safe: Assume CLOSED to prevent AI spam
                    await logChatbotInteraction(orgId, contactId, conversationId, text, null, 'closed_error_silent', true, false);
                    return { handled: true, type: 'business_hours_error' };
                }
            }

            // B. Welcome Message
            if (config.welcome?.enabled) {
                // Determine if we should send a welcome message.
                // We send it if there is NO active conversation, OR if the active conversation has been idle for > 24 hours.
                const activeRecentConv = await pool.query(
                    `SELECT id FROM conversations 
                     WHERE organization_id = $1 AND contact_id = $2 
                     AND status != 'resolved' 
                     AND last_message_at > NOW() - INTERVAL '24 HOURS'
                     LIMIT 1`,
                    [orgId, contactId]
                );

                if (activeRecentConv.rows.length === 0) {
                    await sendReply(session, senderIdentifier, config.welcome.message || "Welcome!", null, channel, extraData);
                    await logChatbotInteraction(orgId, contactId, conversationId, text, null, 'welcome', true, false);
                    // Welcome message usually doesn't stop flow, but prompt says priority.
                    return { handled: true, type: 'welcome' };
                }
            }
        }

        // FALLBACK LOGGING (Failed to match anything)
        await logChatbotInteraction(orgId, contactId, conversationId, text, null, 'none', false, true);

        return { handled: false };

    } catch (err) {
        console.error("[AutoReplyService] Error:", err);
        return { handled: false };
    }
};

const logChatbotInteraction = async (orgId, contactId, conversationId, text, ruleId, matchType, isHandled, isFallback) => {
    try {
        // conversationId might be missing if invoked before conversation creation (unlikely in this flow but possible)
        // Ensure conversationId is passed or handled gracefully
        const safeConvId = conversationId || null;

        await pool.query(
            `INSERT INTO chatbot_logs 
            (organization_id, contact_id, conversation_id, message_content, matched_rule_id, match_type, is_handled, is_fallback, confidence_score) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [orgId, contactId, safeConvId, text, ruleId, matchType, isHandled, isFallback, isHandled ? 1.0 : 0.0]
        );
    } catch (e) { console.error("Failed to log chatbot interaction:", e); }
};

// --- HELPERS ---

const findMatchingRule = async (orgId, parentId, text) => {
    const query = parentId
        ? `SELECT * FROM keyword_replies WHERE organization_id = $1 AND parent_id = $2 AND is_active = true`
        : `SELECT * FROM keyword_replies WHERE organization_id = $1 AND parent_id IS NULL AND is_active = true`;

    const params = parentId ? [orgId, parentId] : [orgId];
    const res = await pool.query(query, params);
    const rules = res.rows;

    // 1. Exact Match (Case Insensitive)
    let match = rules.find(r => r.match_type === 'exact' && r.keyword.toLowerCase() === text.toLowerCase());

    // 2. Contains Match (if no exact match)
    if (!match) {
        match = rules.find(r => r.match_type === 'contains' && text.toLowerCase().includes(r.keyword.toLowerCase()));
    }

    return match;
};

const checkHasChildren = async (ruleId) => {
    const res = await pool.query('SELECT id FROM keyword_replies WHERE parent_id = $1 LIMIT 1', [ruleId]);
    return res.rows.length > 0;
};

const sendReply = async (session, to, text, mediaUrl, channel = 'whatsapp', extraData = {}) => {
    // REGISTER BOT MESSAGE to prevent Inbox 'last_message' overwrite
    try {
        if (session.organization_id && to && text) {
            const hash = crypto.createHash('md5').update(text.trim()).digest('hex');
            const key = `bot_msg:${session.organization_id}:${to}:${hash}`;
            await redisConnection.set(key, '1', 'EX', 60);
        }
    } catch (e) { }

    console.log(`[AutoReply-Debug] Sending Reply via ${channel}. To: ${to}, Text: ${text}, Session: ${JSON.stringify(session)}`);

    try {
        const orgId = session.organization_id;

        if (channel === 'whatsapp') {
            if (session.type === 'official') {
                // Official API
                let msgType = 'text';
                if (mediaUrl) {
                    const ext = mediaUrl.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(ext)) msgType = 'image';
                    else if (['mp4'].includes(ext)) msgType = 'video';
                    else if (['pdf', 'doc', 'docx'].includes(ext)) msgType = 'document';
                    else msgType = 'image'; // Fallback
                }
                console.log(`[AutoReply-Debug] Calling MetaService.sendMessage...`);
                await MetaService.sendMessage(session, to, msgType, text, mediaUrl);
                console.log(`[AutoReply-Debug] MetaService.sendMessage success.`);
            } else {
                // Unofficial Gateway
                if (mediaUrl) {
                    await waService.sendMedia(session.session_id, to, mediaUrl, text);
                } else {
                    await waService.sendText(session.session_id, to, text);
                }
            }
        }
        else if (channel === 'messenger') {
            const { pageAccessToken } = extraData;
            await MessengerService.sendMessage(pageAccessToken, to, text);
        }
        else if (channel === 'instagram') {
            const { accessToken } = extraData;
            await InstagramService.sendMessage(accessToken, to, text);
        }
        else if (channel === 'telegram') {
            const { botToken } = extraData;
            await TelegramService.sendMessage(botToken, to, text);
        }
        else if (channel === 'webchat') {
            // Webchat specific logic: Insert message and Emit Socket
            // extraData should contain { visitorId, io, ... }
            const { conversationId, io, visitorId } = extraData;
            if (conversationId && io) {
                const botMsg = await pool.query(
                    `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, status, wa_message_id, created_at)
                     VALUES ($1, $2, true, 'text', $3, 'sent', $4, NOW()) RETURNING *`,
                    [conversationId, orgId, text, `bot-auto-${Date.now()}`]
                );
                const message = botMsg.rows[0];

                // Emit to visitor and org
                if (visitorId) io.to(`visitor_${visitorId}`).emit('new_message', message);
                io.to(`org_${orgId}`).emit('new_message', { conversationId, message });

                // Update conversation last message
                await pool.query("UPDATE conversations SET last_message = $1, last_message_at = NOW() WHERE id = $2", [text, conversationId]);
            }
        }

    } catch (e) {
        console.warn(`[AutoReply] Failed to send reply to ${to} on ${channel}: ${e.message}`);
        console.error(e);
    }
};

export const getAutoReplyConfig = async (orgId, sessionId) => {
    // Try to find specific bot settings for this session
    // For non-whatsapp, sessionId might be page_id etc. which matches session_id in chatbot_settings
    
    // Only convert to string if sessionId is not null/undefined to avoid querying for literal string "null"
    const sid = sessionId != null ? String(sessionId) : null;

    let res = await pool.query(
        'SELECT auto_reply_config FROM chatbot_settings WHERE organization_id = $1 AND session_id = $2',
        [orgId, sid]
    );

    // If not found, try to find Global Bot (session_id is NULL) or first available
    if (res.rows.length === 0) {
        res = await pool.query(
            'SELECT auto_reply_config FROM chatbot_settings WHERE organization_id = $1 AND session_id IS NULL LIMIT 1',
            [orgId]
        );
    }

    if (res.rows.length > 0) {
        return res.rows[0].auto_reply_config;
    }
    return null;
};

const getMessageCount = async (orgId, contactId) => {
    const res = await pool.query(
        'SELECT count(*) FROM messages WHERE organization_id = $1 AND conversation_id IN (SELECT id FROM conversations WHERE contact_id = $2)',
        [orgId, contactId]
    );
    return parseInt(res.rows[0].count);
};

const isBusinessOpen = (schedule) => {
    if (!schedule) return true; // Default open if no schedule

    const timeZone = 'Asia/Jakarta';
    const now = new Date();

    // Get current day in Jakarta
    const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone });
    const dayKey = dayFormatter.format(now).toLowerCase();

    // Check for Indonesian mapping just in case
    const dayMap = {
        'sunday': 'minggu', 'monday': 'senin', 'tuesday': 'selasa', 'wednesday': 'rabu',
        'thursday': 'kamis', 'friday': 'jumat', 'saturday': 'sabtu'
    };

    // Try English key first, then Indonesian key
    let dayConfig = schedule[dayKey];
    if (!dayConfig) dayConfig = schedule[dayMap[dayKey]];

    if (!dayConfig || !dayConfig.isOpen) return false;

    // Get current time in Jakarta (HH:MM)
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        timeZone
    });

    const parts = new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        timeZone
    }).formatToParts(now);

    const currentH = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const currentM = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const currentTime = currentH * 60 + currentM;

    // Handle both : and . separators
    const [openH, openM] = dayConfig.open.split(/[:.]/).map(Number);
    const [closeH, closeM] = dayConfig.close.split(/[:.]/).map(Number);

    const openTime = openH * 60 + openM;
    const closeTime = closeH * 60 + closeM;

    console.log(`[BusinessHours] Day: ${dayKey}, Current: ${currentTime}, Open: ${openTime}, Close: ${closeTime}`);

    if (closeTime < openTime) {
        // Cross-day schedule (e.g. 21:00 - 01:00)
        return currentTime >= openTime || currentTime < closeTime;
    } else {
        // Normal day schedule
        return currentTime >= openTime && currentTime < closeTime;
    }
};

export const getOrgDivisions = async (orgId) => {
    // Determine divisions from Supervisors (role_level >= 10 and division is set)
    const res = await pool.query(
        "SELECT DISTINCT division FROM users WHERE organization_id = $1 AND role_level >= 10 AND division IS NOT NULL AND division != ''",
        [orgId]
    );
    return res.rows.map(r => r.division);
};

const getLeastBusyAgent = async (orgId, division) => {
    // Select online agent with FEWEST active conversations (status='open')
    // LIMIT: Unlimited (User removed Max 2 constraint)
    // RULE: Only Super Agents (Role >= 10) are auto-assigned (Passive Regular Agents)
    const res = await pool.query(
        `SELECT u.id, u.name, COUNT(c.id) as active_count
         FROM users u
         LEFT JOIN conversations c ON u.id = c.assigned_to_agent_id AND c.status = 'open'
         WHERE u.organization_id = $1 
           AND u.division = $2 
           AND u.is_online = true
           AND u.role_level >= 10
         GROUP BY u.id
         HAVING COUNT(c.id) < 1
         ORDER BY active_count ASC, RANDOM()
         LIMIT 1`,
        [orgId, division]
    );
    return res.rows[0];
};