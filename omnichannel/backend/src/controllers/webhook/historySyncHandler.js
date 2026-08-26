import pool from '../../config/db.js';
import * as waService from '../../services/waGatewayService.js';
import { normalizeWhatsappPhone } from '../../utils/phoneHelper.js';
import { handleLidResolved } from './lidResolver.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const debugLog = (msg) => {
    try {
        if (process.env.DEBUG_WEBHOOK === 'true') {
            fs.appendFileSync(path.join(__dirname, '../../../webhook-debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
        }
    } catch (e) { }
};

export const handleHistorySync = async (req, res, sessionId, messages) => {
    if (res && !res.headersSent) res.status(200).send('ok');

    const sessionRes = await pool.query('SELECT * FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
    if (sessionRes.rows.length === 0) {
        console.warn(`[HistorySync] Process aborted. Session ${sessionId} not found.`);
        return;
    }
    const { id: dbSessionId, organization_id, device_info } = sessionRes.rows[0];

    if (req.io) {
        req.io.to(`org_${organization_id}`).emit('history_sync_started', { sessionId });
    }

    debugLog(`[HistorySync] Received ${messages.length} messages.`);

    if (device_info && device_info.is_warmer_only === true) {
        console.log(`[HistorySync] Skipped sync for session ${sessionId} because it is a Warmer Only device.`);
        return;
    }

    console.log(`[HistorySync] Processing ${messages.length} historical messages for session ${sessionId}...`);
    debugLog(`[HistorySync] START: Processing ${messages.length} messages for session ${sessionId}`);

    const phoneNumbers = [];
    const processedMessages = [];

    // PHASE 1: Scan messages to build LID -> Real Phone mapping
    const lidToRealPhone = new Map();
    const lidToName = new Map();

    for (const msg of messages) {
        try {
            const key = msg.key;
            if (!key) continue;
            const remoteJid = key.remoteJid;
            if (!remoteJid || !remoteJid.includes('@lid')) continue;

            const possibleJid = key.participant || msg.participant || msg.sender || key.participantAlt || key.remoteJidAlt;
            if (possibleJid && !possibleJid.includes('@lid') && !possibleJid.includes('@g.us')) {
                let realPhone = String(possibleJid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                if (realPhone.startsWith('0')) realPhone = '62' + realPhone.slice(1);
                else if (realPhone.startsWith('8')) realPhone = '62' + realPhone;
                if (realPhone) {
                    lidToRealPhone.set(remoteJid, realPhone);
                    const baseLid = remoteJid.split(':')[0] + '@lid';
                    if (baseLid !== remoteJid) lidToRealPhone.set(baseLid, realPhone);
                }
            }
            if (msg.pushName && msg.pushName.trim()) {
                lidToName.set(remoteJid, msg.pushName.trim());
            }
        } catch (e) { /* skip */ }
    }

    if (lidToRealPhone.size > 0) {
        console.log(`[HistorySync] Pre-scan found ${lidToRealPhone.size} LID→RealPhone mappings.`);
        const mappingsToResolve = [];
        for (const [lid, realPhone] of lidToRealPhone) {
            mappingsToResolve.push({ lid, pn: realPhone, name: lidToName.get(lid) || null });
        }
        handleLidResolved(req, res, sessionId, mappingsToResolve).catch(() => {});
    }

    // Resolve remaining LIDs from database
    const unresolvedLids = new Set();
    for (const msg of messages) {
        try {
            const key = msg.key;
            if (key && key.remoteJid && key.remoteJid.includes('@lid')) {
                const baseLid = key.remoteJid.split(':')[0] + '@lid';
                if (!lidToRealPhone.has(key.remoteJid) && !lidToRealPhone.has(baseLid)) {
                    unresolvedLids.add(baseLid);
                }
            }
        } catch (e) {}
    }

    if (unresolvedLids.size > 0) {
        try {
            const lidArray = Array.from(unresolvedLids);
            const dbLids = await pool.query(
                `SELECT whatsapp_lid, phone_number FROM contacts 
                 WHERE organization_id = $1 AND whatsapp_lid = ANY($2)`,
                [organization_id, lidArray]
            );
            for (const row of dbLids.rows) {
                lidToRealPhone.set(row.whatsapp_lid, row.phone_number);
                console.log(`[HistorySync] Resolved LID from DB: ${row.whatsapp_lid} -> ${row.phone_number}`);
                unresolvedLids.delete(row.whatsapp_lid);
            }
        } catch (e) {
            console.error('[HistorySync] DB LID resolution error:', e.message);
        }

        if (unresolvedLids.size > 0) {
            console.log(`[HistorySync] Fetching ${unresolvedLids.size} unresolved LIDs from Gateway...`);
            try {
                const waResult = await waService.resolveAllLids(sessionId);
                const mappings = waResult?.mappings || [];
                for (const lid of unresolvedLids) {
                    const foundMapping = mappings.find(m => m.lid === lid || m.lid.includes(lid.split('@')[0]));
                    if (foundMapping && foundMapping.pn) {
                        lidToRealPhone.set(lid, foundMapping.pn);
                        console.log(`[HistorySync] Resolved LID from Gateway: ${lid} -> ${foundMapping.pn}`);
                        if (foundMapping.name) lidToName.set(lid, foundMapping.name);
                    }
                }
            } catch (e) {
                console.error('[HistorySync] Gateway LID resolution error:', e.message);
            }
        }
    }

    // PHASE 2: Process messages using the LID→RealPhone map
    for (const msg of messages) {
        try {
            const key = msg.key;
            const messageObj = msg.message;
            if (!key || !messageObj) continue;

            const isFromMe = key.fromMe === true;
            const waMessageId = key.id;
            const timestamp = msg.messageTimestamp || Math.floor(Date.now() / 1000);
            const remoteJid = key.remoteJid;

            if (remoteJid === 'status@broadcast') continue;

            let rawFrom = remoteJid;
            if (remoteJid && remoteJid.includes('@lid')) {
                const resolved = lidToRealPhone.get(remoteJid) || lidToRealPhone.get(remoteJid.split(':')[0] + '@lid');
                if (resolved) {
                    rawFrom = resolved;
                } else {
                    const possibleJid = key.participant || msg.participant || msg.sender || key.participantAlt || key.remoteJidAlt;
                    if (possibleJid && !possibleJid.includes('@lid') && !possibleJid.includes('@g.us')) {
                        rawFrom = possibleJid;
                    }
                }
            }

            const from = normalizeWhatsappPhone(rawFrom);
            if (!from) continue;

            let text = '';
            let msgType = 'text';
            let extraData = null;

            if (messageObj.conversation) text = messageObj.conversation;
            else if (messageObj.extendedTextMessage) text = messageObj.extendedTextMessage.text;
            else if (messageObj.imageMessage) { msgType = 'image'; text = messageObj.imageMessage.caption || ""; }
            else if (messageObj.videoMessage) { msgType = 'video'; text = messageObj.videoMessage.caption || ""; }
            else if (messageObj.documentMessage) { msgType = 'document'; text = messageObj.documentMessage.caption || messageObj.documentMessage.fileName || "Document"; }
            else if (messageObj.audioMessage) { msgType = 'audio'; }
            else if (messageObj.stickerMessage) { msgType = 'image'; }
            else if (messageObj.contactMessage) {
                msgType = 'contact';
                text = `[Contact] ${messageObj.contactMessage.displayName || 'Unknown'}`;
                extraData = JSON.stringify({
                    name: messageObj.contactMessage.displayName || 'Unknown',
                    phone: messageObj.contactMessage.vcard?.match(/TEL[^:]+:([^+]+)/)?.[1] || '',
                    vcard: messageObj.contactMessage.vcard || null
                });
            }
            else if (messageObj.locationMessage) {
                msgType = 'location';
                text = '[Location] Shared a location';
                extraData = JSON.stringify({
                    latitude: messageObj.locationMessage.degreesLatitude || messageObj.locationMessage.latitude,
                    longitude: messageObj.locationMessage.degreesLongitude || messageObj.locationMessage.longitude,
                    name: messageObj.locationMessage.name || null,
                    address: messageObj.locationMessage.address || null
                });
            }
            else if (messageObj.pollCreationMessage) {
                msgType = 'poll';
                const poll = messageObj.pollCreationMessage;
                text = `[Poll] ${poll.title || 'Poll'}`;
                extraData = JSON.stringify({
                    title: poll.title || 'Poll',
                    options: poll.options?.map(opt => ({ optionName: opt.optionName || opt.displayText || '', pollName: opt.pollName || '' })) || [],
                    isMultiSelect: poll.isMultiSelect || false
                });
            }
            else if (messageObj.eventCreationMessage) {
                msgType = 'event';
                const event = messageObj.eventCreationMessage;
                text = `[Event] ${event.name || 'Event'}`;
                extraData = JSON.stringify({
                    name: event.name || 'Event',
                    description: event.description || null,
                    location: event.location || null,
                    startTime: event.startTime || null,
                    endTime: event.endTime || null
                });
            }
            else if (messageObj.eventNotificationMessage) {
                msgType = 'event';
                const eventNotif = messageObj.eventNotificationMessage;
                text = `[Event Update] ${eventNotif.eventName || 'Event'}`;
                extraData = JSON.stringify({
                    name: eventNotif.eventName || 'Event',
                    description: eventNotif.description || null,
                    location: eventNotif.location || null,
                    action: eventNotif.subtype || 'notification'
                });
            }

            let pushName = msg.pushName || null;
            if (!pushName || /^\d{12,}/.test(pushName)) {
                if (remoteJid && lidToName.has(remoteJid)) {
                    pushName = lidToName.get(remoteJid);
                }
            }
            if (!pushName) pushName = from;

            let messageTime;
            try {
                messageTime = new Date(timestamp * 1000).toISOString();
            } catch (timeErr) {
                messageTime = new Date().toISOString();
            }

            phoneNumbers.push(from);
            processedMessages.push({
                from,
                pushName,
                isFromMe,
                waMessageId,
                text,
                msgType,
                extraData,
                messageTime
            });
        } catch (msgErr) {
            console.error('[HistorySync] Message extraction error:', msgErr.message);
        }
    }

    if (processedMessages.length === 0) {
        debugLog(`[HistorySync] No valid messages to process.`);
        return;
    }

    const uniquePhones = [...new Set(phoneNumbers)];
    const existingContacts = new Map();
    const existingConversations = new Map();

    const CHUNK_SIZE = 500;
    for (let i = 0; i < uniquePhones.length; i += CHUNK_SIZE) {
        const chunk = uniquePhones.slice(i, i + CHUNK_SIZE);
        const contactRes = await pool.query(
            `SELECT id, phone_number FROM contacts
             WHERE organization_id = $1 AND phone_number = ANY($2)`,
            [organization_id, chunk]
        );
        contactRes.rows.forEach(c => existingContacts.set(c.phone_number, c.id));
    }

    const missingPhones = uniquePhones.filter(p => !existingContacts.has(p));
    if (missingPhones.length > 0) {
        const contactInsertValues = [];
        const contactParams = [organization_id];
        let pIdx = 2;

        for (const phone of missingPhones) {
            const sampleMsg = processedMessages.find(m => m.from === phone);
            const name = sampleMsg ? sampleMsg.pushName : phone;
            contactInsertValues.push(`($1, $${pIdx}, $${pIdx + 1}, NOW())`);
            contactParams.push(phone, name);
            pIdx += 2;
        }

        const insertRes = await pool.query(
            `INSERT INTO contacts (organization_id, phone_number, name, updated_at)
             VALUES ${contactInsertValues.join(', ')}
             ON CONFLICT (organization_id, phone_number) DO UPDATE SET updated_at = NOW()
             RETURNING id, phone_number`,
            contactParams
        );
        insertRes.rows.forEach(c => existingContacts.set(c.phone_number, c.id));
    }

    const allContactIds = Array.from(existingContacts.values());
    for (let i = 0; i < allContactIds.length; i += CHUNK_SIZE) {
        const chunk = allContactIds.slice(i, i + CHUNK_SIZE);
        const convRes = await pool.query(
            `SELECT id, contact_id FROM conversations
             WHERE organization_id = $1 AND whatsapp_session_id = $2 AND contact_id = ANY($3)`,
            [organization_id, dbSessionId, chunk]
        );
        convRes.rows.forEach(cv => existingConversations.set(cv.contact_id, cv.id));
    }

    const missingConvContactIds = allContactIds.filter(id => !existingConversations.has(id));
    if (missingConvContactIds.length > 0) {
        for (let i = 0; i < missingConvContactIds.length; i += CHUNK_SIZE) {
            const chunk = missingConvContactIds.slice(i, i + CHUNK_SIZE);
            const convValues = [];
            const convParams = [organization_id, dbSessionId];
            let pIdx = 3;

            for (const contactId of chunk) {
                convValues.push(`($1, $2, $${pIdx}, 'open', 'whatsapp', NOW())`);
                convParams.push(contactId);
                pIdx++;
            }

            const convInsertRes = await pool.query(
                `INSERT INTO conversations (organization_id, whatsapp_session_id, contact_id, status, channel, updated_at)
                 VALUES ${convValues.join(', ')}
                 ON CONFLICT (organization_id, whatsapp_session_id, contact_id) DO NOTHING
                 RETURNING id, contact_id`,
                convParams
            );
            convInsertRes.rows.forEach(row => {
                existingConversations.set(row.contact_id, row.id);
            });
        }
    }

    let newMessagesCount = 0;
    const conversationUpdates = new Map();
    const validMessagesToInsert = [];

    for (let i = 0; i < processedMessages.length; i++) {
        const msg = processedMessages[i];
        const contactId = existingContacts.get(msg.from);
        const conversationId = existingConversations.get(contactId);

        if (!contactId || !conversationId) continue;

        validMessagesToInsert.push({
            conversationId,
            organizationId: organization_id,
            fromMe: msg.isFromMe,
            msgType: msg.msgType,
            text: msg.text || '',
            mediaUrl: msg.extraData || null,
            status: msg.isFromMe ? 'pending' : 'received',
            waMessageId: msg.waMessageId,
            messageTime: msg.messageTime
        });

        const currentLatest = conversationUpdates.get(conversationId);
        if (!currentLatest || msg.messageTime > currentLatest.messageTime) {
            const snippetRaw = msg.text || (msg.msgType !== 'text' ? `[${msg.msgType}]` : '[Message]');
            const snippet = snippetRaw.substring(0, 255);
            conversationUpdates.set(conversationId, {
                snippet,
                messageTime: msg.messageTime
            });
        }
    }

    const MSG_CHUNK_SIZE = 100;
    for (let b = 0; b < validMessagesToInsert.length; b += MSG_CHUNK_SIZE) {
        const chunk = validMessagesToInsert.slice(b, b + MSG_CHUNK_SIZE);
        const valuesClauses = [];
        const params = [];
        let pIdx = 1;

        for (const item of chunk) {
            valuesClauses.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7}, $${pIdx + 8}, NULL, false)`);
            params.push(
                item.conversationId,
                item.organizationId,
                item.fromMe,
                item.msgType,
                item.text,
                item.mediaUrl,
                item.status,
                item.waMessageId,
                item.messageTime
            );
            pIdx += 9;
        }

        try {
            const insertBatchRes = await pool.query(
                `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at, quoted_message, is_forwarded)
                 VALUES ${valuesClauses.join(', ')}
                 ON CONFLICT (wa_message_id) DO UPDATE SET created_at = EXCLUDED.created_at
                 RETURNING id`,
                params
            );
            newMessagesCount += insertBatchRes.rowCount || insertBatchRes.rows.length;
        } catch (batchErr) {
            debugLog(`[HistorySync] Batch insert error, falling back to individual inserts: ${batchErr.message}`);
            for (const item of chunk) {
                try {
                    await pool.query(
                        `INSERT INTO messages (conversation_id, organization_id, from_me, type, content, media_url, status, wa_message_id, created_at, quoted_message, is_forwarded)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, false)
                         ON CONFLICT (wa_message_id) DO UPDATE SET created_at = EXCLUDED.created_at`,
                        [item.conversationId, item.organizationId, item.fromMe, item.msgType, item.text, item.mediaUrl, item.status, item.waMessageId, item.messageTime]
                    );
                    newMessagesCount++;
                } catch (singleErr) {
                    debugLog(`[HistorySync] Fallback single insert failed for ${item.waMessageId}: ${singleErr.message}`);
                }
            }
        }

        if (b + MSG_CHUNK_SIZE < validMessagesToInsert.length) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }

    if (conversationUpdates.size > 0) {
        const updateEntries = Array.from(conversationUpdates.entries());
        const CONV_CHUNK_SIZE = 100;
        for (let u = 0; u < updateEntries.length; u += CONV_CHUNK_SIZE) {
            const uChunk = updateEntries.slice(u, u + CONV_CHUNK_SIZE);
            const valueTuples = [];
            const uParams = [];
            let uIdx = 1;

            for (const [convId, update] of uChunk) {
                valueTuples.push(`($${uIdx}::bigint, $${uIdx + 1}::text, $${uIdx + 2}::timestamptz)`);
                uParams.push(convId, update.snippet, update.messageTime);
                uIdx += 3;
            }

            try {
                await pool.query(
                    `UPDATE conversations AS c
                     SET last_message = v.snippet,
                         last_message_at = v.msg_time
                     FROM (VALUES ${valueTuples.join(', ')}) AS v(conv_id, snippet, msg_time)
                     WHERE c.id = v.conv_id AND (c.last_message_at IS NULL OR v.msg_time >= c.last_message_at)`,
                    uParams
                );
            } catch (e) {
                debugLog(`[HistorySync] Batch conversation update failed, falling back: ${e.message}`);
                for (const [convId, update] of uChunk) {
                    try {
                        await pool.query(
                            `UPDATE conversations
                             SET last_message = $1, last_message_at = $2
                             WHERE id = $3 AND (last_message_at IS NULL OR $2 >= last_message_at)`,
                            [update.snippet, update.messageTime, convId]
                        );
                    } catch (singleErr) {
                        debugLog(`[HistorySync] Fallback conversation update failed: ${singleErr.message}`);
                    }
                }
            }
        }
    }

    debugLog(`[HistorySync] DONE. newMessagesCount=${newMessagesCount}`);

    try {
        const lidContactsRes = await pool.query(
            `SELECT id, phone_number FROM contacts WHERE organization_id = $1 AND phone_number LIKE '%@lid'`,
            [organization_id]
        );
        if (lidContactsRes.rows.length > 0) {
            console.log(`[HistorySync] Found ${lidContactsRes.rows.length} contacts with @lid phone numbers. Attempting bulk gateway resolution...`);
            try {
                const waResult = await waService.resolveAllLids(sessionId);
                const mappings = waResult?.mappings || [];
                if (mappings.length > 0) {
                    const stats = await resolveLidMappings({
                        pool,
                        dbSessionId,
                        organizationId: organization_id,
                        mappings,
                        io: req.io || null
                    });
                    console.log(`[HistorySync] Post-sync LID bulk resolution: resolved=${stats.resolved}, merged=${stats.merged}, updated=${stats.updated}`);
                }
            } catch (lidErr) {
                console.warn(`[HistorySync] Post-sync LID resolution failed:`, lidErr.message);
            }
        }
    } catch (e) {
        console.warn(`[HistorySync] LID check query failed:`, e.message);
    }

    if (newMessagesCount > 0 && req.io) {
        req.io.to(`org_${organization_id}`).emit('history_sync_completed', {
            sessionId: sessionId,
            count: newMessagesCount
        });
        console.log(`[HistorySync] Synced ${newMessagesCount} new messages for session ${sessionId}. Emitted completion event.`);
    }

    console.log(`[HistorySync] Done processing. Imported ${newMessagesCount} historical messages into DB.`);
};
