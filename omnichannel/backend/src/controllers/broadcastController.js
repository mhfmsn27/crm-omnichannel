import pool from '../config/db.js';
import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { checkFeatureAccess } from '../services/featureGateService.js';
import * as ShortLinkService from '../services/ShortLinkService.js';
import * as toolService from '../services/toolService.js';
import * as broadcastTelegramService from '../services/broadcastTelegramService.js';
import { sendBroadcastTelegramReport } from '../services/broadcastTelegramService.js';
import * as broadcastEmailService from '../services/broadcastEmailService.js';
import { sendBroadcastEmailReport } from '../services/broadcastEmailService.js';

const broadcastQueue = new Queue('broadcast-queue', { connection: redisConnection });

// ============================================================
// QUIET HOURS SETTINGS HELPER
// ============================================================

/**
 * Get quiet hours settings for an organization
 * @param {number} organizationId - Organization ID
 * @returns {Promise<{enabled: boolean, start: number, end: number}>}
 */
const getQuietHoursSettings = async (organizationId) => {
    try {
        const result = await pool.query(
            `SELECT broadcast_quiet_hours_enabled, quiet_hours_start, quiet_hours_end
             FROM organizations WHERE id = $1`,
            [organizationId]
        );

        if (result.rows.length === 0) {
            // Default settings if organization not found
            return { enabled: false, start: 4, end: 23 };
        }

        const row = result.rows[0];
        return {
            enabled: row.broadcast_quiet_hours_enabled === true, // Default FALSE if NULL
            start: row.quiet_hours_start ?? 4,  // Default 04:00 WIB
            end: row.quiet_hours_end ?? 23      // Default 23:00 WIB
        };
    } catch (error) {
        console.warn('[getQuietHoursSettings] Error:', error.message);
        // Return defaults on error
        return { enabled: false, start: 4, end: 23 };
    }
};

/**
 * Calculate next available send time based on quiet hours settings
 * @param {number} currentExecTime - Current execution timestamp
 * @param {Object} quietHours - { enabled, start, end }
 * @returns {number} - Adjusted execution timestamp
 */
const calculateNextAvailableTime = (currentExecTime, quietHours) => {
    const { enabled, start, end } = quietHours;

    if (!enabled) {
        // Quiet hours disabled - send immediately
        return currentExecTime;
    }

    // Get current hour in WIB (UTC+7)
    const date = new Date(currentExecTime);
    const hourWIB = (date.getUTCHours() + 7) % 24;

    // Check if current time is within active hours (not quiet hours)
    // Active hours: start <= hour < end (e.g., 05:00 - 22:00 means active from 05:00 to 21:59)
    const isWithinActiveHours = hourWIB >= start && hourWIB < end;

    if (isWithinActiveHours) {
        // We're within active hours - no adjustment needed
        return currentExecTime;
    }

    // We're in quiet hours - schedule for next active period
    if (hourWIB < start) {
        // Before quiet hours start (e.g., 03:00) - wait until start time
        date.setUTCHours(start - 7, Math.floor(Math.random() * 59), 0, 0);
    } else {
        // After quiet hours end (e.g., 23:00) - schedule for next day's start time
        date.setUTCDate(date.getUTCDate() + 1);
        date.setUTCHours(start - 7, Math.floor(Math.random() * 59), 0, 0);
    }

    return date.getTime();
};

// Helper to detect and replace URLs with Tracking Links (Generic for Campaign)
const processMessageLinks = async (message, orgId, broadcastId, baseUrl, dbClient) => {
    if (!message) return message;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);

    if (!urls) return message;

    let newMessage = message;
    // Deduplicate URLs to avoid processing same link twice
    const uniqueUrls = [...new Set(urls)];

    for (const originalUrl of uniqueUrls) {
        // Skip if it looks like a variable placeholder (e.g. {invoice_link})
        if (originalUrl.includes('{') || originalUrl.includes('}')) continue;

        // Pass dbClient to service to ensure it uses the active transaction
        const slug = await ShortLinkService.createTrackingLink(orgId, broadcastId, null, originalUrl, dbClient);
        const shortUrl = `${baseUrl}/r/${slug}`;
        newMessage = newMessage.replaceAll(originalUrl, shortUrl);
    }
    return newMessage;
};

export const createCampaign = async (req, res) => {
    const client = await pool.connect();
    console.log(`[BroadcastController] Starting campaign creation: ${req.body.name}`);

    try {
        const { name, message, rotatorGroupId: rawRotatorId, deviceId: rawDeviceId, targetType, targetValue, scheduleAt, delaySettings: delaySettingsJson, includeUnsubscribe, disableLinkTracking, mediaUrl, isRecurring, recurrenceType, flowId, assignedAgentId } = req.body;
        const { organization_id } = req.user;

        const mediaFile = req.files && req.files['media'] ? req.files['media'][0] : null;
        const targetFile = req.files && req.files['file'] ? req.files['file'][0] : null;

        const APP_URL = process.env.APP_URL;

        // Sanitize IDs
        const rotatorGroupId = (rawRotatorId && rawRotatorId !== 'null' && rawRotatorId !== '') ? parseInt(rawRotatorId) : null;
        const deviceId = (rawDeviceId && rawDeviceId !== 'null' && rawDeviceId !== '') ? parseInt(rawDeviceId) : null;

        console.log(`[BroadcastController] Inputs - Rotator: ${rotatorGroupId}, Device: ${deviceId}, Target: ${targetType}`);

        if (!rotatorGroupId && !deviceId) {
            return res.status(400).json({ error: "Broadcast requires either a Rotator Group or a Specific Device." });
        }

        // 1b. Check Device Status & Determine Channel Type
        let channelType = 'whatsapp'; // Default, especially for rotator groups
        if (deviceId) {
            const devCheck = await pool.query('SELECT status, type FROM whatsapp_sessions WHERE id = $1', [deviceId]);
            if (devCheck.rows.length > 0) {
                if (devCheck.rows[0].status === 'terblokir') {
                    return res.status(400).json({ error: "Device Terblokir. Tidak dapat digunakan untuk broadcast." });
                }
                const t = devCheck.rows[0].type;
                if (['messenger', 'instagram', 'telegram', 'tiktok'].includes(t)) {
                    channelType = t;
                }
            }
        }

        // Build source filter to ensure we don't mix WA numbers with FB/IG IDs
        // channelType is already validated from database, but we double-check for safety
        const validChannelTypes = ['whatsapp', 'messenger', 'instagram', 'telegram', 'tiktok'];
        const safeChannelType = validChannelTypes.includes(channelType) ? channelType : 'whatsapp';

        let sourceFilter = "";
        let sourceFilterParams = [];
        if (safeChannelType === 'whatsapp') {
            sourceFilter = " AND c.source NOT IN ('messenger', 'instagram', 'telegram', 'tiktok') ";
        } else {
            // Use parameterized query for safety
            sourceFilter = " AND c.source = $2 ";
            sourceFilterParams = [safeChannelType];
        }

        // Parse & Validate delay settings
        let delaySettings = {
            msgEnabled: true, msgMin: 30, msgMax: 90,
            batchEnabled: true, batchSize: 20, batchMin: 60, batchMax: 60
        };

        if (delaySettingsJson) {
            try {
                const parsed = JSON.parse(delaySettingsJson);
                delaySettings = { ...delaySettings, ...parsed };

                // SMART ANTI-BAN: Enforce strict minimums to prevent 24h bans
                if (delaySettings.msgEnabled === false) {
                    delaySettings.msgEnabled = true; // Force enabled
                }
                
                delaySettings.msgMin = Math.max(30, parseInt(delaySettings.msgMin) || 30);
                delaySettings.msgMax = Math.max(delaySettings.msgMin + 10, parseInt(delaySettings.msgMax) || 90);
                
                if (delaySettings.batchEnabled === false) {
                    delaySettings.batchEnabled = true;
                }
                delaySettings.batchSize = Math.max(5, parseInt(delaySettings.batchSize) || 20);
                delaySettings.batchMin = Math.max(60, parseInt(delaySettings.batchMin) || 60);
                delaySettings.batchMax = Math.max(delaySettings.batchMin, parseInt(delaySettings.batchMax) || 60);

            } catch (e) {
                console.warn("Invalid delaySettings JSON", e);
            }
        }

        // 1. Check Feature Gate & Quota
        const access = await checkFeatureAccess(organization_id, 'feat_broadcast');
        if (!access.allowed) return res.status(403).json({ error: access.message, upsell: true });

        await client.query('BEGIN');

        // Determine Final Media URL (File upload takes precedence over Template URL)
        const finalMediaUrl = mediaFile ? `/uploads/${mediaFile.filename}` : (mediaUrl || null);

        // 2. Create Broadcast Record
        const isRecur = isRecurring === 'true' || isRecurring === true;
        const recurType = isRecur ? (recurrenceType || 'daily') : 'none';
        
        // Force WIB (GMT+7) for next_run_at calculation if scheduled
        let baseDelayTime = 0;
        let nextRunAt = null;
        if (scheduleAt) {
            let scheduleStr = scheduleAt;
            if (!scheduleStr.includes('Z') && !scheduleStr.includes('+')) {
                scheduleStr += '+07:00';
            }
            const schedDate = new Date(scheduleStr);
            baseDelayTime = schedDate.getTime() - Date.now();
            
            if (isRecur) {
                // Calculate next run date based on type
                const nextDate = new Date(schedDate);
                if (recurType === 'daily') nextDate.setDate(nextDate.getDate() + 1);
                else if (recurType === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
                else if (recurType === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
                nextRunAt = nextDate.toISOString();
            }
        } else if (isRecur) {
            // If recurring but run now, set next run from now
            const nextDate = new Date();
            if (recurType === 'daily') nextDate.setDate(nextDate.getDate() + 1);
            else if (recurType === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
            else if (recurType === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            nextRunAt = nextDate.toISOString();
        }

        const broadcastRes = await client.query(
            `INSERT INTO broadcasts 
       (organization_id, name, message_template, media_url, target_type, target_value, rotator_group_id, device_id, status, scheduled_at, delay_settings, is_recurring, recurrence_type, next_run_at, flow_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
            [
                organization_id,
                name,
                message,
                finalMediaUrl,
                targetType,
                targetValue,
                rotatorGroupId,
                deviceId,
                'processing',
                scheduleAt || null,
                JSON.stringify(delaySettings),
                isRecur,
                recurType,
                nextRunAt,
                flowId ? parseInt(flowId) : null
            ]
        );
        const broadcastId = broadcastRes.rows[0].id;
        console.log(`[BroadcastController] Campaign created with ID: ${broadcastId}`);

        // 3. Process Message Content (Link Tracking & Unsubscribe Injection)
        let finalMessage = message;
        // If disableLinkTracking is NOT true, we run link tracking (original default behavior)
        if (disableLinkTracking !== 'true' && disableLinkTracking !== true) {
            finalMessage = await processMessageLinks(message, organization_id, broadcastId, APP_URL, client);
        }

        if (includeUnsubscribe === 'true' || includeUnsubscribe === true) {
            finalMessage += "Klik link di bawah untuk tidak menerima broadcast lagi: {unsubscribe_url}";
        }

        let parsedTelegramSettings = null;
        const rawTg = req.body.telegramSettings || req.body.telegram_settings;
        if (rawTg) {
            try {
                parsedTelegramSettings = typeof rawTg === 'string' ? JSON.parse(rawTg) : rawTg;
            } catch (e) {
                console.warn('[BroadcastController] Failed to parse telegram_settings:', e.message);
            }
        }
        if (parsedTelegramSettings) {
            await client.query('UPDATE broadcasts SET telegram_settings = $1 WHERE id = $2', [JSON.stringify(parsedTelegramSettings), broadcastId]).catch(() => {});
        }

        let parsedEmailSettings = null;
        const rawEmail = req.body.emailSettings || req.body.email_settings;
        if (rawEmail) {
            try {
                parsedEmailSettings = typeof rawEmail === 'string' ? JSON.parse(rawEmail) : rawEmail;
            } catch (e) {
                console.warn('[BroadcastController] Failed to parse email_settings:', e.message);
            }
        }
        if (parsedEmailSettings) {
            await client.query('UPDATE broadcasts SET email_settings = $1 WHERE id = $2', [JSON.stringify(parsedEmailSettings), broadcastId]).catch(() => {});
        }

        // 4. Process Targets
        let recipients = [];

        if (targetType === 'file' && targetFile) {
            const workbook = XLSX.readFile(targetFile.path);
            const sheetName = workbook.SheetNames[0];

            // Read as raw array of arrays to handle both header and headerless
            const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

            if (rawData && rawData.length > 0) {
                // Header Detection
                const firstRow = rawData[0];
                const headerMap = {};
                let hasHeader = false;

                if (Array.isArray(firstRow)) {
                    firstRow.forEach((cell, index) => {
                        if (typeof cell === 'string') {
                            const val = cell.toLowerCase().trim();
                            if (['phone', 'mobile', 'no hp', 'wa', 'number', 'whatsapp'].includes(val)) {
                                headerMap['phone'] = index;
                                hasHeader = true;
                            } else if (['name', 'nama', 'contact'].includes(val)) {
                                headerMap['name'] = index;
                            } else {
                                // Save custom variable headers
                                headerMap[cell.trim()] = index;
                            }
                        }
                    });
                }

                // Fallback: Default to Col 0 = Phone, Col 1 = Name
                if (!hasHeader) {
                    headerMap['phone'] = 0;
                    headerMap['name'] = 1;
                }

                recipients = rawData.slice(hasHeader ? 1 : 0).map(row => {
                    const rawPhone = row[headerMap['phone']];
                    const rawName = row[headerMap['name']] || '';

                    if (!rawPhone) return null;

                    let phone = String(rawPhone).replace(/[^0-9]/g, '');
                    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
                    if (phone.startsWith('8')) phone = '62' + phone;

                    const name = typeof rawName === 'string' ? rawName.trim() : String(rawName);

                    const customVars = {};
                    if (hasHeader) {
                        for (const key in headerMap) {
                            if (key !== 'phone' && key !== 'name') {
                                customVars[key] = row[headerMap[key]] || '';
                            }
                        }
                    }

                    return { name, phone, custom_vars: Object.keys(customVars).length > 0 ? customVars : null };
                }).filter(r => r && r.phone.length > 6);
            }

        } else if (targetType === 'all') {
            // Build query params - include sourceFilterParam if not whatsapp
            const queryParams = sourceFilterParams.length > 0
                ? [organization_id, ...sourceFilterParams]
                : [organization_id];
            const query = `SELECT c.name, c.phone_number FROM contacts c WHERE c.organization_id = $1 AND c.is_subscribed = true ${sourceFilter} LIMIT 100000`;
            const contactsRes = await client.query(query, queryParams);
            recipients = contactsRes.rows.map(c => ({ name: c.name, phone: c.phone_number }));

        } else if (targetType === 'device') {
            // Target contacts by device(s) - contacts who had conversations via specific device(s)
            let deviceIds;
            try { deviceIds = JSON.parse(targetValue || '[]'); } catch { return res.status(400).json({ error: 'Invalid device filter format' }); }

            if (!deviceIds || deviceIds.length === 0) {
                return res.status(400).json({ error: 'Please select at least one device' });
            }

            // Build params array with deviceIds and sourceFilterParam
            const queryParams = sourceFilterParams.length > 0
                ? [organization_id, deviceIds, ...sourceFilterParams]
                : [organization_id, deviceIds];
            const query = `
                SELECT DISTINCT c.name, c.phone_number
                FROM contacts c
                JOIN conversations conv ON conv.contact_id = c.id AND conv.whatsapp_session_id = ANY($2::int[])
                WHERE c.organization_id = $1
                AND c.is_subscribed = true
                AND c.phone_number IS NOT NULL
                AND LENGTH(c.phone_number) > 8
                ${sourceFilter}
            `;
            const contactsRes = await client.query(query, queryParams);
            recipients = contactsRes.rows.map(c => ({ name: c.name, phone: c.phone_number }));

        } else if (targetType === 'label') {
            let labelIds;
            try { labelIds = JSON.parse(targetValue || '[]'); } catch { return res.status(400).json({ error: 'Invalid label filter format' }); }
            if (labelIds.length > 0) {
                // Build params array with labelIds and sourceFilterParam
                const queryParams = sourceFilterParams.length > 0
                    ? [organization_id, labelIds, ...sourceFilterParams]
                    : [organization_id, labelIds];
                const query = `
                SELECT DISTINCT c.name, c.phone_number
                FROM contacts c
                JOIN contact_labels cl ON c.id = cl.contact_id
                WHERE c.organization_id = $1 AND cl.label_id = ANY($2::int[]) AND c.is_subscribed = true ${sourceFilter}
            `;
                const contactsRes = await client.query(query, queryParams);
                recipients = contactsRes.rows.map(c => ({ name: c.name, phone: c.phone_number }));
            }
        } else if (targetType === 'group') {
            let selectedGroups;
            try { selectedGroups = JSON.parse(targetValue || '[]'); } catch { return res.status(400).json({ error: 'Invalid group filter format' }); }
            recipients = selectedGroups.map(g => ({
                name: g.name,
                phone: g.id,
                isGroup: true
            }));
        } else if (targetType === 'segmented') {
            let filters;
            try { filters = JSON.parse(targetValue || '{}'); } catch { return res.status(400).json({ error: 'Invalid segment filter format' }); }
            let sql = `SELECT DISTINCT c.name, c.phone_number FROM contacts c`;
            const joins = [];
            const params = [organization_id];
            let i = 2;

            if (filters.has_conversation) {
                joins.push(`JOIN conversations conv ON conv.contact_id = c.id`);
            }
            if (filters.label_id) {
                joins.push(`JOIN contact_labels cl ON cl.contact_id = c.id`);
            }

            let where = `c.organization_id = $1`;
            if (filters.lead_status) { where += ` AND c.lead_status = $${i++}`; params.push(filters.lead_status); }
            if (filters.min_score) { where += ` AND COALESCE(c.lead_score, 0) >= $${i++}`; params.push(filters.min_score); }
            if (filters.active_days) { where += ` AND conv.last_message_at >= NOW() - ($${i++} * INTERVAL '1 day')`; params.push(parseInt(filters.active_days) || 1); }
            if (filters.label_id) { where += ` AND cl.label_id = $${i++}`; params.push(filters.label_id); }
            if (filters.subscribed) { where += ` AND c.is_subscribed = true`; }
            if (filters.has_conversation) { where += ` AND EXISTS (SELECT 1 FROM conversations conv2 WHERE conv2.contact_id = c.id)`; }
            if (filters.has_phone !== false) { where += ` AND c.phone_number IS NOT NULL AND LENGTH(c.phone_number) > 8`; }
            where += sourceFilter;

            const contactsRes = await client.query(
                `SELECT DISTINCT c.name, c.phone_number FROM contacts c ${joins.join(' ')} WHERE ${where}`,
                params
            );
            recipients = contactsRes.rows.map(c => ({ name: c.name, phone: c.phone_number }));
        }

        // Deduplicate recipients by phone to prevent spamming
        const uniqueRecipients = [];
        const seenPhones = new Set();
        for (const r of recipients) {
            if (r && r.phone && !seenPhones.has(r.phone)) {
                seenPhones.add(r.phone);
                uniqueRecipients.push(r);
            }
        }
        recipients = uniqueRecipients;

        console.log(`[BroadcastController] Found ${recipients.length} unique recipients after deduplication.`);

        if (recipients.length === 0) {
            throw new Error("Silakan pilih label atau target yang valid.");
        }

        // Check Global Queue for Throttling
        const queuedRes = await client.query(`
            SELECT COUNT(*) as count FROM broadcast_recipients br 
            JOIN broadcasts b ON br.broadcast_id = b.id 
            WHERE b.organization_id = $1 AND br.status = 'queued'
        `, [organization_id]);
        
        const globalQueued = parseInt(queuedRes.rows[0].count) || 0;
        let isThrottled = false;
        
        if (delaySettings.gradualEnabled && globalQueued >= 800) {
            isThrottled = true;
            delaySettings.gradualStart = Math.max(1, Math.floor(delaySettings.gradualStart / 2));
            delaySettings.gradualInc = Math.max(1, Math.floor(delaySettings.gradualInc / 2));
        }
        delaySettings.isThrottled = isThrottled;

        // Fetch Quiet Hours Settings for this organization
        const quietHoursSettings = await getQuietHoursSettings(organization_id);

        // 5. Queue Jobs
        const jobs = [];

        const safeBaseDelay = baseDelayTime > 0 ? baseDelayTime : 0;
        let currentExecTime = Date.now() + safeBaseDelay;
        let currentDayVolume = delaySettings.gradualEnabled ? (parseInt(delaySettings.gradualStart) || 100) : recipients.length;
        let contactsSentToday = 0;

        // BATCH PROCESSING TO PREVENT TIMEOUT
        const BATCH_SIZE = 1000;
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const chunk = recipients.slice(i, i + BATCH_SIZE);
            
            // 1. Bulk Insert Contacts (Ignore if exists)
            const contactValues = [];
            let contactParamIdx = 1;
            const contactParams = [];
            
            chunk.forEach(r => {
                if (!r.isGroup) {
                    contactValues.push(`($${contactParamIdx++}, $${contactParamIdx++}, $${contactParamIdx++}, 'broadcast_auto', true)`);
                    const safeName = typeof r.name === 'string' ? r.name.substring(0, 255) : r.name;
                    contactParams.push(organization_id, safeName, r.phone);
                }
            });

            if (contactValues.length > 0) {
                await client.query(`
                    INSERT INTO contacts (organization_id, name, phone_number, source, is_subscribed)
                    VALUES ${contactValues.join(',')}
                    ON CONFLICT (organization_id, phone_number) DO NOTHING
                `, contactParams);
            }

            // 2. Fetch all relevant contact IDs
            const phones = chunk.filter(r => !r.isGroup).map(r => r.phone);
            let contactIdMap = {};
            if (phones.length > 0) {
                const cRes = await client.query(
                    'SELECT id, phone_number FROM contacts WHERE organization_id = $1 AND phone_number = ANY($2::text[])',
                    [organization_id, phones]
                );
                cRes.rows.forEach(row => { contactIdMap[row.phone_number] = row.id; });
            }

            // 3. Bulk Insert Broadcast Recipients
            const brValues = [];
            const brParams = [];
            let brParamIdx = 1;

            chunk.forEach(r => {
                brValues.push(`($${brParamIdx++}, $${brParamIdx++}, $${brParamIdx++}, 'queued', $${brParamIdx++}, $${brParamIdx++})`);
                brParams.push(
                    broadcastId,
                    r.phone,
                    typeof r.name === 'string' ? r.name.substring(0, 100) : r.name,
                    r.isGroup && typeof r.name === 'string' ? r.name.substring(0, 255) : null,
                    r.custom_vars ? JSON.stringify(r.custom_vars) : null
                );
            });

            const brRes = await client.query(`
                INSERT INTO broadcast_recipients (broadcast_id, phone_number, name, status, group_name, custom_vars)
                VALUES ${brValues.join(',')}
                RETURNING id, phone_number
            `, brParams);

            // 4. Queue Jobs for Chunk
            for (let j = 0; j < chunk.length; j++) {
                const r = chunk[j];
                const globalIndex = i + j;
                const recId = brRes.rows.find(row => row.phone_number === r.phone)?.id;
                const contactId = !r.isGroup ? contactIdMap[r.phone] : null;

                if (!recId) continue;

                // Increment Delay
                if (globalIndex > 0) {
                    if (delaySettings.msgEnabled) {
                        const msgDelay = Math.floor(Math.random() * (delaySettings.msgMax - delaySettings.msgMin + 1) + delaySettings.msgMin) * 1000;
                        currentExecTime += msgDelay;
                    }
                    if (delaySettings.batchEnabled && globalIndex % delaySettings.batchSize === 0) {
                        const batchDelay = Math.floor(Math.random() * (delaySettings.batchMax - delaySettings.batchMin + 1) + delaySettings.batchMin) * 1000;
                        currentExecTime += batchDelay;
                    }
                }

                // Gradual Scaling - Use quiet hours start time
                if (delaySettings.gradualEnabled) {
                    if (contactsSentToday >= currentDayVolume) {
                        // Schedule for next day's quiet hours start
                        const nextDayTime = new Date(currentExecTime);
                        nextDayTime.setUTCDate(nextDayTime.getUTCDate() + 1);
                        nextDayTime.setUTCHours(quietHoursSettings.start - 7, Math.floor(Math.random() * 59), 0, 0);
                        currentExecTime = nextDayTime.getTime();
                        currentDayVolume += parseInt(delaySettings.gradualInc) || 100;
                        contactsSentToday = 0;
                    }
                }

                // Apply Quiet Hours logic (configurable per organization)
                currentExecTime = calculateNextAvailableTime(currentExecTime, quietHoursSettings);

                const finalJobDelay = Math.max(0, currentExecTime - Date.now());

                jobs.push({
                    name: 'send-message',
                    data: {
                        broadcastId,
                        recipientId: recId,
                        contactId,
                        messageTemplate: finalMessage,
                        mediaUrl: finalMediaUrl,
                        rotatorGroupId: rotatorGroupId,
                        deviceId: deviceId,
                        orgId: organization_id,
                        isGroup: r.isGroup,
                        customVars: r.custom_vars,
                        showInHistory: req.body.showInHistory === 'true',
                        // Parse assignedAgentId to integer to ensure proper DB type
                        assignedAgentId: assignedAgentId ? parseInt(assignedAgentId) : null
                    },
                    opts: {
                        delay: finalJobDelay,
                        removeOnComplete: true,
                        removeOnFail: false
                    }
                });
                contactsSentToday++;
            }
        }

        console.log(`[BroadcastController] Adding ${jobs.length} jobs to queue...`);
        await broadcastQueue.addBulk(jobs);
        console.log(`[BroadcastController] Jobs added successfully.`);

        await client.query('COMMIT');

        if (targetFile) fs.unlinkSync(targetFile.path);

        res.status(201).json({
            message: 'Campaign created successfully',
            broadcastId,
            recipient_count: recipients.length,
            estimated_time: Math.round(Math.max(0, currentExecTime - Date.now()) / 1000 / 60) + " minutes"
        });

    } catch (err) {
        await client.query('ROLLBACK');
        if (req.files) {
            try { if (req.files['media']?.[0]?.path) fs.unlinkSync(req.files['media'][0].path); } catch (_) {}
            try { if (req.files['file']?.[0]?.path) fs.unlinkSync(req.files['file'][0].path); } catch (_) {}
        }
        console.error("[BroadcastController] Error:", err);

        const validationKeywords = ['No subscribed recipients', 'Quota exceeded', 'Broadcast requires', 'Batch ID is missing'];
        const isValidation = validationKeywords.some(k => err.message.includes(k));

        if (isValidation) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const getDeviceGroups = async (req, res) => {
    const { deviceId } = req.params;
    const { organization_id } = req.user;

    try {
        // Verify device ownership
        const devRes = await pool.query(
            'SELECT id FROM whatsapp_sessions WHERE id = $1 AND organization_id = $2',
            [deviceId, organization_id]
        );
        if (devRes.rows.length === 0) return res.status(404).json({ error: "Device not found" });

        // Use toolService to reuse logic
        const groups = await toolService.fetchGroups(deviceId);
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getRotatorGroups = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT rg.*,
             COUNT(rgs.id) as device_count,
             COALESCE(json_agg(rgs.whatsapp_session_id) FILTER (WHERE rgs.id IS NOT NULL), '[]') as session_ids
             FROM rotator_groups rg
             LEFT JOIN rotator_group_sessions rgs ON rg.id = rgs.rotator_group_id
             WHERE rg.organization_id = $1
             GROUP BY rg.id
             ORDER BY rg.created_at DESC`,
            [req.user.organization_id]
        );

        // Enhance with device health stats
        const enhancedGroups = await Promise.all(result.rows.map(async (group) => {
            try {
                // Get message stats from broadcast_recipients for this rotator group
                const statsRes = await pool.query(`
                    SELECT
                        COUNT(*) as total_messages,
                        COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) as delivered,
                        COUNT(*) FILTER (WHERE status = 'failed') as failed
                    FROM broadcast_recipients br
                    JOIN broadcasts b ON br.broadcast_id = b.id
                    WHERE b.rotator_group_id = $1
                    AND br.sent_at >= NOW() - INTERVAL '30 days'
                `, [group.id]);

                const stats = statsRes.rows[0];
                const total = parseInt(stats.total_messages) || 0;
                const delivered = parseInt(stats.delivered) || 0;
                const successRate = total > 0 ? (delivered / total * 100) : 100;

                // Get device health for all devices in this rotator
                const deviceHealthRes = await pool.query(`
                    SELECT
                        COALESCE(AVG(
                            CASE
                                WHEN COALESCE(msg_stats.sent, 0) > 0
                                THEN (COALESCE(msg_stats.delivered, 0)::numeric / COALESCE(msg_stats.sent, 0) * 100)
                                ELSE 85
                            END
                        ), 85) as avg_health
                    FROM rotator_group_sessions rgs
                    LEFT JOIN whatsapp_sessions ws ON rgs.whatsapp_session_id = ws.id
                    LEFT JOIN (
                        SELECT
                            c.whatsapp_session_id,
                            COUNT(*) FILTER (WHERE m.from_me = true) as sent,
                            COUNT(*) FILTER (WHERE m.from_me = true AND m.status IN ('delivered', 'read')) as delivered
                        FROM messages m
                        JOIN conversations c ON m.conversation_id = c.id
                        WHERE m.organization_id = $1
                        AND m.from_me = true
                        AND m.created_at >= NOW() - INTERVAL '30 days'
                        GROUP BY c.whatsapp_session_id
                    ) msg_stats ON ws.id = msg_stats.whatsapp_session_id
                    WHERE rgs.rotator_group_id = $2
                `, [req.user.organization_id, group.id]);

                const avgHealth = parseFloat(deviceHealthRes.rows[0]?.avg_health) || 85;

                return {
                    ...group,
                    total_messages: total,
                    avg_health: avgHealth
                };
            } catch (e) {
                return {
                    ...group,
                    total_messages: 0,
                    avg_health: 85
                };
            }
        }));

        res.json(enhancedGroups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getCampaigns = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(`
            SELECT b.id, b.name, b.created_at, b.status, b.scheduled_at, b.device_id, b.rotator_group_id, b.delay_settings,
            COALESCE(ws.name, ws.whatsapp_number) as device_name,
            rg.name as rotator_name,
            (SELECT count(*) FROM broadcast_recipients br WHERE br.broadcast_id = b.id) as total,
            (SELECT count(*) FROM broadcast_recipients br WHERE br.broadcast_id = b.id AND br.status IN ('sent', 'delivered', 'read')) as sent,
            (SELECT count(*) FROM broadcast_recipients br WHERE br.broadcast_id = b.id AND br.status = 'failed') as failed,
            (SELECT count(*) FROM broadcast_recipients br WHERE br.broadcast_id = b.id AND br.status = 'read') as read
            FROM broadcasts b
            LEFT JOIN whatsapp_sessions ws ON b.device_id = ws.id
            LEFT JOIN rotator_groups rg ON b.rotator_group_id = rg.id
            WHERE b.organization_id = $1
            ORDER BY b.created_at DESC
        `, [organization_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getCampaignDetails = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    try {
        const result = await pool.query(`
            SELECT
                br.id,
                COALESCE(c.phone_number, br.phone_number) as phone_number,
                COALESCE(c.name, br.group_name, br.name) as name,
                br.status,
                br.sent_at,
                br.error_log,
                ws.name as device_name
            FROM broadcast_recipients br
            LEFT JOIN whatsapp_sessions ws ON br.used_session_id = ws.id
            LEFT JOIN contacts c ON (
                (c.phone_number = br.phone_number OR c.phone_number = regexp_replace(br.phone_number, '@.*$', ''))
                AND c.organization_id = $2
            )
            JOIN broadcasts b ON br.broadcast_id = b.id
            WHERE br.broadcast_id = $1 AND b.organization_id = $2
            ORDER BY br.id ASC
        `, [id, organization_id]);

        const statsRes = await pool.query(`
            SELECT
                COALESCE(SUM(click_count), 0) as total_clicks,
                COUNT(CASE WHEN type = 'unsubscribe' AND click_count > 0 THEN 1 END) as total_unsubscribes,
                (
                    SELECT COUNT(*) FROM broadcast_recipients
                    WHERE broadcast_id = $1 AND status = 'read'
                ) as total_read
            FROM short_links
            WHERE broadcast_id = $1 AND organization_id = $2
        `, [id, organization_id]);

        const stats = statsRes.rows[0] || { total_clicks: 0, total_unsubscribes: 0, total_read: '0' };

        res.json({
            recipients: result.rows,
            stats: {
                clicks: parseInt(stats.total_clicks),
                unsubscribes: parseInt(stats.total_unsubscribes),
                read: parseInt(stats.total_read)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const controlCampaign = async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    const { organization_id } = req.user;

    if (!['pause', 'resume', 'cancel'].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
    }

    try {
        const check = await pool.query('SELECT status FROM broadcasts WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });

        let newStatus = 'processing';
        if (action === 'pause') newStatus = 'paused';
        if (action === 'cancel') newStatus = 'cancelled';

        if (action === 'resume') {
            newStatus = 'processing';
            
            // 1. Fetch Campaign Details
            const campRes = await pool.query('SELECT message_template, media_url, rotator_group_id, device_id, delay_settings, show_in_history FROM broadcasts WHERE id = $1', [id]);
            const camp = campRes.rows[0];
            
            let delaySettings = {
                msgEnabled: true, msgMin: 5, msgMax: 15,
                batchEnabled: true, batchSize: 10, batchMin: 30, batchMax: 60
            };
            if (camp.delay_settings) {
                if (typeof camp.delay_settings === 'string') {
                    try { delaySettings = { ...delaySettings, ...JSON.parse(camp.delay_settings) }; } catch (e) {}
                } else {
                    delaySettings = { ...delaySettings, ...camp.delay_settings };
                }
                
                // SMART ANTI-BAN
                if (delaySettings.msgEnabled === false) delaySettings.msgEnabled = true;
                delaySettings.msgMin = Math.max(60, parseInt(delaySettings.msgMin) || 60);
                delaySettings.msgMax = Math.max(delaySettings.msgMin + 100, parseInt(delaySettings.msgMax) || 160);
                if (delaySettings.batchEnabled === false) delaySettings.batchEnabled = true;
                delaySettings.batchSize = Math.max(25, parseInt(delaySettings.batchSize) || 25);
                delaySettings.batchMin = Math.max(120, parseInt(delaySettings.batchMin) || 120);
                delaySettings.batchMax = Math.max(delaySettings.batchMin + 180, parseInt(delaySettings.batchMax) || 300);

                // Clear pausedAt if it exists
                delete delaySettings.pausedAt;
            }
            
            // Clear the failure counter in Redis to prevent immediate auto-pause after resume
            try { await redisConnection.del(`broadcast_fail:${id}`); } catch(e) {}

            // 2. Fetch Queued Recipients
            const recRes = await pool.query(`
                SELECT br.id as recipient_id, br.phone_number, br.name, br.group_name, br.custom_vars, c.id as contact_id
                FROM broadcast_recipients br
                LEFT JOIN contacts c ON c.phone_number = br.phone_number AND c.organization_id = $2
                WHERE br.broadcast_id = $1 AND br.status = 'queued'
            `, [id, organization_id]);

            if (recRes.rows.length > 0) {
                // Fetch Quiet Hours Settings for this organization
                const quietHoursSettings = await getQuietHoursSettings(organization_id);

                const jobs = [];
                let currentExecTime = Date.now();
                let currentDayVolume = delaySettings.gradualEnabled ? (parseInt(delaySettings.gradualStart) || 100) : recRes.rows.length;
                let contactsSentToday = 0;

                for (let i = 0; i < recRes.rows.length; i++) {
                    const r = recRes.rows[i];

                    if (i > 0) {
                        if (delaySettings.msgEnabled) {
                            const msgDelay = Math.floor(Math.random() * (delaySettings.msgMax - delaySettings.msgMin + 1) + delaySettings.msgMin) * 1000;
                            currentExecTime += msgDelay;
                        }
                        if (delaySettings.batchEnabled && (i) % delaySettings.batchSize === 0) {
                            const batchDelay = Math.floor(Math.random() * (delaySettings.batchMax - delaySettings.batchMin + 1) + delaySettings.batchMin) * 1000;
                            currentExecTime += batchDelay;
                        }
                    }

                    // Gradual Scaling - Use quiet hours start time
                    if (delaySettings.gradualEnabled) {
                        if (contactsSentToday >= currentDayVolume) {
                            const nextDayTime = new Date(currentExecTime);
                            nextDayTime.setUTCDate(nextDayTime.getUTCDate() + 1);
                            nextDayTime.setUTCHours(quietHoursSettings.start - 7, Math.floor(Math.random() * 59), 0, 0);
                            currentExecTime = nextDayTime.getTime();

                            currentDayVolume += parseInt(delaySettings.gradualInc) || 100;
                            contactsSentToday = 0;
                        }
                    }

                    // Apply Quiet Hours logic (configurable per organization)
                    currentExecTime = calculateNextAvailableTime(currentExecTime, quietHoursSettings);

                    const finalJobDelay = Math.max(0, currentExecTime - Date.now());

                    jobs.push({
                        name: 'send-message',
                        data: {
                            broadcastId: parseInt(id),
                            recipientId: r.recipient_id,
                            contactId: r.contact_id,
                            messageTemplate: camp.message_template,
                            mediaUrl: camp.media_url,
                            rotatorGroupId: camp.rotator_group_id,
                            deviceId: camp.device_id,
                            orgId: organization_id,
                            isGroup: !!r.group_name,
                            customVars: r.custom_vars,
                            showInHistory: camp.show_in_history === true
                        },
                        opts: {
                            delay: finalJobDelay,
                            removeOnComplete: true,
                            removeOnFail: false
                        }
                    });
                    
                    contactsSentToday++;
                }
                
                console.log(`[BroadcastController] Resuming campaign ${id}. Re-queueing ${jobs.length} jobs.`);
                await broadcastQueue.addBulk(jobs);
            }
        }

        if (action === 'cancel') {
            try {
                await redisConnection.set(`broadcast_cancelled:${id}`, '1', 'EX', 86400);
                await redisConnection.del(`broadcast_paused:${id}`);
            } catch (e) {
                console.error("[controlCampaign] Failed to set Redis cancel flag:", e);
            }
            try {
                const jobs = await broadcastQueue.getJobs(['waiting', 'delayed']);
                for (const j of jobs) {
                    if (j.data && j.data.broadcastId === parseInt(id)) {
                        await j.remove().catch(() => {});
                    }
                }
            } catch (e) {
                console.error("[controlCampaign] Failed to clear queue jobs on cancel:", e);
            }
            await pool.query("UPDATE broadcast_recipients SET status = 'cancelled' WHERE broadcast_id = $1 AND status IN ('queued', 'processing')", [id]);

            // Trigger Telegram & Email Cancel Notification
            sendBroadcastTelegramReport({
                broadcastId: id,
                eventType: 'cancelled',
                reason: 'Dibatalkan secara manual oleh admin.',
                orgId: req.user.organization_id
            }).catch(e => console.error('[controlCampaign Telegram Cancel Error]', e.message));

            sendBroadcastEmailReport({
                broadcastId: id,
                eventType: 'cancelled',
                reason: 'Dibatalkan secara manual oleh admin.',
                orgId: req.user.organization_id
            }).catch(e => console.error('[controlCampaign Email Cancel Error]', e.message));
        }

        if (action === 'pause') {
            try {
                await redisConnection.set(`broadcast_paused:${id}`, '1', 'EX', 86400);
                await redisConnection.del(`broadcast_cancelled:${id}`);
            } catch (e) {
                console.error("[controlCampaign] Failed to set Redis pause flag:", e);
            }
            try {
                const jobs = await broadcastQueue.getJobs(['waiting', 'delayed']);
                for (const j of jobs) {
                    if (j.data && j.data.broadcastId === parseInt(id)) {
                        await j.remove().catch(() => {});
                    }
                }
            } catch (e) {
                console.error("[controlCampaign] Failed to clear queue jobs on pause:", e);
            }
            await pool.query("UPDATE broadcast_recipients SET status = 'queued' WHERE broadcast_id = $1 AND status = 'processing'", [id]);

            // Trigger Telegram & Email Pause Notification
            sendBroadcastTelegramReport({
                broadcastId: id,
                eventType: 'paused',
                reason: 'Dijeda secara manual oleh admin.',
                orgId: req.user.organization_id
            }).catch(e => console.error('[controlCampaign Telegram Pause Error]', e.message));

            sendBroadcastEmailReport({
                broadcastId: id,
                eventType: 'paused',
                reason: 'Dijeda secara manual oleh admin.',
                orgId: req.user.organization_id
            }).catch(e => console.error('[controlCampaign Email Pause Error]', e.message));
        }

        if (action === 'resume') {
            try {
                await redisConnection.del(`broadcast_cancelled:${id}`);
                await redisConnection.del(`broadcast_paused:${id}`);
            } catch (e) {}
        }

        await pool.query('UPDATE broadcasts SET status = $1 WHERE id = $2', [newStatus, id]);

        res.json({ message: `Campaign ${action}d successfully` });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteCampaign = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const result = await pool.query('DELETE FROM broadcasts WHERE id = $1 AND organization_id = $2 RETURNING id', [id, organization_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Campaign not found" });
        res.json({ message: "Campaign deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Retry failed broadcast recipients
// Only retryable errors (not invalid number / number not registered)
export const retryFailedRecipients = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    // Non-retryable error patterns (invalid numbers, number not registered, etc.)
    const NON_RETRYABLE_PATTERNS = [
        'not registered',
        'tidak terdaftar',
        'invalid number',
        'nomor tidak valid',
        'number blocked',
        'nomor diblokir',
        'cannot send to',
        'fail send',
        'phone number',
        'nomor hp',
        'wa.id',
        '@s.whatsapp',
        '不存在',
        'does not exist'
    ];

    try {
        // Verify campaign ownership and get campaign details
        const campRes = await pool.query(
            'SELECT id, status, message_template, media_url, rotator_group_id, device_id, delay_settings, show_in_history FROM broadcasts WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );

        if (campRes.rows.length === 0) {
            return res.status(404).json({ error: "Campaign not found" });
        }

        const campaign = campRes.rows[0];

        // Get failed recipients with retryable errors
        const failedRes = await pool.query(`
            SELECT br.id as recipient_id, br.phone_number, br.name, br.group_name, br.custom_vars, br.error_log,
                   c.id as contact_id
            FROM broadcast_recipients br
            LEFT JOIN contacts c ON c.phone_number = br.phone_number AND c.organization_id = $2
            WHERE br.broadcast_id = $1
            AND br.status = 'failed'
            ORDER BY br.id ASC
        `, [id, organization_id]);

        if (failedRes.rows.length === 0) {
            return res.json({ message: 'No failed recipients to retry', count: 0 });
        }

        // Filter out non-retryable errors
        const retryableRecipients = [];
        const skippedRecipients = [];

        for (const row of failedRes.rows) {
            const errorLog = (row.error_log || '').toLowerCase();
            const isRetryable = !NON_RETRYABLE_PATTERNS.some(pattern =>
                errorLog.includes(pattern.toLowerCase())
            );

            if (isRetryable) {
                retryableRecipients.push(row);
            } else {
                skippedRecipients.push({
                    phone: row.phone_number,
                    reason: row.error_log
                });
            }
        }

        if (retryableRecipients.length === 0) {
            return res.json({
                message: 'No retryable recipients found',
                count: 0,
                skipped: skippedRecipients.length,
                skipped_reasons: skippedRecipients
            });
        }

        // Parse delay settings
        let delaySettings = {
            msgEnabled: true, msgMin: 30, msgMax: 90,
            batchEnabled: true, batchSize: 20, batchMin: 60, batchMax: 60
        };
        if (campaign.delay_settings) {
            try {
                const parsed = typeof campaign.delay_settings === 'string'
                    ? JSON.parse(campaign.delay_settings)
                    : campaign.delay_settings;
                delaySettings = { ...delaySettings, ...parsed };
            } catch (e) {}
        }

        // Fetch Quiet Hours Settings
        const quietHoursSettings = await getQuietHoursSettings(organization_id);

        // Re-queue retryable jobs
        const jobs = [];
        let currentExecTime = Date.now();
        let currentDayVolume = delaySettings.gradualEnabled ? (parseInt(delaySettings.gradualStart) || 100) : retryableRecipients.length;
        let contactsSentToday = 0;

        for (let i = 0; i < retryableRecipients.length; i++) {
            const r = retryableRecipients[i];

            if (i > 0) {
                if (delaySettings.msgEnabled) {
                    const msgDelay = Math.floor(Math.random() * (delaySettings.msgMax - delaySettings.msgMin + 1) + delaySettings.msgMin) * 1000;
                    currentExecTime += msgDelay;
                }
                if (delaySettings.batchEnabled && (i) % delaySettings.batchSize === 0) {
                    const batchDelay = Math.floor(Math.random() * (delaySettings.batchMax - delaySettings.batchMin + 1) + delaySettings.batchMin) * 1000;
                    currentExecTime += batchDelay;
                }
            }

            // Gradual Scaling
            if (delaySettings.gradualEnabled) {
                if (contactsSentToday >= currentDayVolume) {
                    const nextDayTime = new Date(currentExecTime);
                    nextDayTime.setUTCDate(nextDayTime.getUTCDate() + 1);
                    nextDayTime.setUTCHours(quietHoursSettings.start - 7, Math.floor(Math.random() * 59), 0, 0);
                    currentExecTime = nextDayTime.getTime();
                    currentDayVolume += parseInt(delaySettings.gradualInc) || 100;
                    contactsSentToday = 0;
                }
            }

            // Apply Quiet Hours
            currentExecTime = calculateNextAvailableTime(currentExecTime, quietHoursSettings);

            const finalJobDelay = Math.max(0, currentExecTime - Date.now());

            jobs.push({
                name: 'send-message',
                data: {
                    broadcastId: parseInt(id),
                    recipientId: r.recipient_id,
                    contactId: r.contact_id,
                    messageTemplate: campaign.message_template,
                    mediaUrl: campaign.media_url,
                    rotatorGroupId: campaign.rotator_group_id,
                    deviceId: campaign.device_id,
                    orgId: organization_id,
                    isGroup: !!r.group_name,
                    customVars: r.custom_vars,
                    showInHistory: campaign.show_in_history === true
                },
                opts: {
                    delay: finalJobDelay,
                    removeOnComplete: true,
                    removeOnFail: false
                }
            });

            contactsSentToday++;
        }

        // Update campaign status back to processing
        await pool.query("UPDATE broadcasts SET status = 'processing' WHERE id = $1", [id]);

        // Clear failure counter in Redis
        try {
            await redisConnection.del(`broadcast_fail:${id}`);
        } catch (e) {}

        // Add jobs to queue
        await broadcastQueue.addBulk(jobs);

        res.json({
            message: `Re-queued ${jobs.length} failed messages for retry`,
            count: jobs.length,
            skipped: skippedRecipients.length,
            skipped_reasons: skippedRecipients.length > 0 ? `${skippedRecipients.length} recipients skipped (invalid numbers)` : undefined
        });

    } catch (err) {
        console.error("[BroadcastController] Retry error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Retry single failed recipient
export const retrySingleRecipient = async (req, res) => {
    const { id, recipientId } = req.params;
    const { organization_id } = req.user;

    // Non-retryable error patterns
    const NON_RETRYABLE_PATTERNS = [
        'not registered', 'tidak terdaftar', 'invalid number', 'nomor tidak valid',
        'number blocked', 'nomor diblokir', 'cannot send to', 'fail send',
        'phone number', 'nomor hp', 'wa.id', '@s.whatsapp', 'does not exist', '不存在'
    ];

    try {
        // Verify campaign ownership
        const campRes = await pool.query(
            'SELECT id, status, message_template, media_url, rotator_group_id, device_id, delay_settings, show_in_history FROM broadcasts WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );

        if (campRes.rows.length === 0) {
            return res.status(404).json({ error: "Campaign not found" });
        }

        const campaign = campRes.rows[0];

        // Get specific recipient
        const recRes = await pool.query(`
            SELECT br.id, br.phone_number, br.name, br.group_name, br.custom_vars, br.error_log, br.status,
                   c.id as contact_id
            FROM broadcast_recipients br
            LEFT JOIN contacts c ON c.phone_number = br.phone_number AND c.organization_id = $2
            WHERE br.id = $3 AND br.broadcast_id = $1
        `, [id, organization_id, recipientId]);

        if (recRes.rows.length === 0) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        const recipient = recRes.rows[0];

        // Check if recipient is failed
        if (recipient.status !== 'failed') {
            return res.status(400).json({ error: "Recipient is not in failed status" });
        }

        // Check if error is retryable
        const errorLog = (recipient.error_log || '').toLowerCase();
        const isRetryable = !NON_RETRYABLE_PATTERNS.some(pattern =>
            errorLog.includes(pattern.toLowerCase())
        );

        if (!isRetryable) {
            return res.status(400).json({
                error: "Cannot retry: invalid number or non-retryable error",
                error_log: recipient.error_log
            });
        }

        // Get delay settings
        let delaySettings = {
            msgEnabled: true, msgMin: 30, msgMax: 90,
            batchEnabled: true, batchSize: 20, batchMin: 60, batchMax: 60
        };
        if (campaign.delay_settings) {
            try {
                const parsed = typeof campaign.delay_settings === 'string'
                    ? JSON.parse(campaign.delay_settings)
                    : campaign.delay_settings;
                delaySettings = { ...delaySettings, ...parsed };
            } catch (e) {}
        }

        // Calculate delay (with some randomness to avoid clustering)
        const msgDelay = Math.floor(Math.random() * (delaySettings.msgMax - delaySettings.msgMin + 1) + delaySettings.msgMin) * 1000;
        const jobDelay = Math.max(0, msgDelay);

        // Queue the job
        await broadcastQueue.add('send-message', {
            broadcastId: parseInt(id),
            recipientId: parseInt(recipientId),
            contactId: recipient.contact_id,
            messageTemplate: campaign.message_template,
            mediaUrl: campaign.media_url,
            rotatorGroupId: campaign.rotator_group_id,
            deviceId: campaign.device_id,
            orgId: organization_id,
            isGroup: !!recipient.group_name,
            customVars: recipient.custom_vars,
            showInHistory: campaign.show_in_history === true
        }, {
            delay: jobDelay,
            removeOnComplete: true,
            removeOnFail: false
        });

        // Update recipient status back to queued
        await pool.query(
            "UPDATE broadcast_recipients SET status = 'queued', error_log = NULL WHERE id = $1",
            [recipientId]
        );

        // Update campaign status to processing
        await pool.query("UPDATE broadcasts SET status = 'processing' WHERE id = $1 AND status != 'processing'", [id]);

        // Clear failure counter
        try {
            await redisConnection.del(`broadcast_fail:${id}`);
        } catch (e) {}

        res.json({
            message: `Message to ${recipient.phone_number} queued for retry`,
            phone: recipient.phone_number,
            delay_seconds: Math.round(jobDelay / 1000)
        });

    } catch (err) {
        console.error("[BroadcastController] Retry single error:", err);
        res.status(500).json({ error: err.message });
    }
};

export const exportReport = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const result = await pool.query(`
            SELECT
                COALESCE(c.phone_number, br.phone_number) as "Phone/JID",
                COALESCE(c.name, br.group_name, br.name) as "Name/Group",
                br.status as "Status",
                CASE WHEN br.status = 'read' THEN 'Yes' ELSE 'No' END as "Is Read",
                br.sent_at as "Sent Time",
                br.error_log as "Error Log",
                ws.name as "Device"
            FROM broadcast_recipients br
            LEFT JOIN whatsapp_sessions ws ON br.used_session_id = ws.id
            LEFT JOIN contacts c ON (
                (c.phone_number = br.phone_number OR c.phone_number = regexp_replace(br.phone_number, '@.*$', ''))
                AND c.organization_id = $2
            )
            JOIN broadcasts b ON br.broadcast_id = b.id
            WHERE br.broadcast_id = $1 AND b.organization_id = $2
            ORDER BY br.id ASC
        `, [id, organization_id]);

        if (result.rows.length === 0) return res.status(404).json({ error: "No data" });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(result.rows);
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="report-${id}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const triggerAutoRecovery = async () => {
    try {
        const orgsRes = await pool.query(`SELECT DISTINCT organization_id FROM broadcasts WHERE status IN ('processing', 'paused')`);
        
        for (const orgRow of orgsRes.rows) {
            const orgId = orgRow.organization_id;
            
            const globalQRes = await pool.query(`
                SELECT COUNT(*) as count FROM broadcast_recipients br 
                JOIN broadcasts b ON br.broadcast_id = b.id 
                WHERE b.organization_id = $1 AND br.status = 'queued'
            `, [orgId]);
            
            const globalQueued = parseInt(globalQRes.rows[0].count) || 0;
            if (globalQueued >= 500) continue; // Still clogged for this org

            const throttledRes = await pool.query(`
                SELECT id, delay_settings, message_template, media_url, rotator_group_id, device_id, show_in_history
                FROM broadcasts
                WHERE organization_id = $1 AND status IN ('processing', 'paused')
            `, [orgId]);

        for (const b of throttledRes.rows) {
            let delaySettings = {};
            if (typeof b.delay_settings === 'string') {
                try { delaySettings = JSON.parse(b.delay_settings); } catch (e) {}
            } else if (b.delay_settings) {
                delaySettings = b.delay_settings;
            }

            // Check if paused and auto-resume timeout exceeded (20 minutes)
            const isAutoResumeTarget = b.status === 'paused' && delaySettings.pausedAt && (Date.now() - delaySettings.pausedAt > 20 * 60 * 1000);

            if (delaySettings.isThrottled || isAutoResumeTarget) {
                console.log(`[AutoRecovery] Recovering campaign ${b.id}`);
                
                if (delaySettings.isThrottled) {
                    delaySettings.isThrottled = false;
                    if (delaySettings.gradualStart) delaySettings.gradualStart *= 2;
                    if (delaySettings.gradualInc) delaySettings.gradualInc *= 2;
                }

                if (isAutoResumeTarget) {
                    delete delaySettings.pausedAt;
                    try { await redisConnection.del(`broadcast_fail:${b.id}`); } catch(e) {}
                }
                
                await pool.query(`UPDATE broadcasts SET status = 'processing', delay_settings = $1 WHERE id = $2`, [JSON.stringify(delaySettings), b.id]);

                const delayedJobs = await broadcastQueue.getDelayed();
                for (const djob of delayedJobs) {
                    if (djob.data && djob.data.broadcastId === b.id) {
                        await djob.remove();
                    }
                }
                
                const recRes = await pool.query(`
                    SELECT br.id as recipient_id, br.phone_number, br.name, br.group_name, br.custom_vars, c.id as contact_id
                    FROM broadcast_recipients br
                    LEFT JOIN contacts c ON c.phone_number = br.phone_number AND c.organization_id = $2
                    WHERE br.broadcast_id = $1 AND br.status = 'queued'
                `, [b.id, orgId]);

                if (recRes.rows.length > 0) {
                    // Fetch Quiet Hours Settings for this organization
                    const quietHoursSettings = await getQuietHoursSettings(orgId);

                    const jobs = [];
                    let currentExecTime = Date.now();
                    let currentDayVolume = delaySettings.gradualEnabled ? (parseInt(delaySettings.gradualStart) || 100) : recRes.rows.length;
                    let contactsSentToday = 0;

                    for (let i = 0; i < recRes.rows.length; i++) {
                        const r = recRes.rows[i];

                        if (i > 0) {
                            if (delaySettings.msgEnabled) {
                                const msgDelay = Math.floor(Math.random() * (delaySettings.msgMax - delaySettings.msgMin + 1) + delaySettings.msgMin) * 1000;
                                currentExecTime += msgDelay;
                            }
                            if (delaySettings.batchEnabled && (i) % delaySettings.batchSize === 0) {
                                const batchDelay = Math.floor(Math.random() * (delaySettings.batchMax - delaySettings.batchMin + 1) + delaySettings.batchMin) * 1000;
                                currentExecTime += batchDelay;
                            }
                        }

                        // Gradual Scaling - Use quiet hours start time
                        if (delaySettings.gradualEnabled) {
                            if (contactsSentToday >= currentDayVolume) {
                                const nextDayTime = new Date(currentExecTime);
                                nextDayTime.setUTCDate(nextDayTime.getUTCDate() + 1);
                                nextDayTime.setUTCHours(quietHoursSettings.start - 7, Math.floor(Math.random() * 59), 0, 0);
                                currentExecTime = nextDayTime.getTime();

                                currentDayVolume += parseInt(delaySettings.gradualInc) || 100;
                                contactsSentToday = 0;
                            }
                        }

                        // Apply Quiet Hours logic (configurable per organization)
                        currentExecTime = calculateNextAvailableTime(currentExecTime, quietHoursSettings);

                        const finalJobDelay = Math.max(0, currentExecTime - Date.now());

                        jobs.push({
                            name: 'send-message',
                            data: {
                                broadcastId: b.id,
                                recipientId: r.recipient_id,
                                contactId: r.contact_id,
                                messageTemplate: b.message_template,
                                mediaUrl: b.media_url,
                                rotatorGroupId: b.rotator_group_id,
                                deviceId: b.device_id,
                                orgId: orgId,
                                isGroup: !!r.group_name,
                                customVars: r.custom_vars,
                                showInHistory: b.show_in_history === true 
                            },
                            opts: {
                                delay: finalJobDelay,
                                removeOnComplete: true,
                                removeOnFail: false
                            }
                        });
                        contactsSentToday++;
                    }
                    
                    await broadcastQueue.addBulk(jobs);
                    console.log(`[AutoRecovery] Re-queued ${jobs.length} jobs for campaign ${b.id}`);
                }
                }
            }
        }
    } catch (e) {
        console.error("[AutoRecovery Error]", e);
    }
};

// --- BROADCAST TELEGRAM & EMAIL SETTINGS ---

export const getBroadcastSettings = async (req, res) => {
    const { organization_id } = req.user;
    try {
        const result = await pool.query(
            `SELECT telegram_bot_token, telegram_chat_id, 
                    telegram_notify_on_complete, telegram_notify_on_pause, telegram_notify_on_cancel,
                    email_recipient, email_notify_on_complete, email_notify_on_pause, email_notify_on_cancel
             FROM broadcast_settings WHERE organization_id = $1`,
            [organization_id]
        );
        if (result.rows.length === 0) {
            return res.json({
                telegram_bot_token: '',
                telegram_chat_id: '',
                telegram_notify_on_complete: true,
                telegram_notify_on_pause: true,
                telegram_notify_on_cancel: true,
                email_recipient: '',
                email_notify_on_complete: true,
                email_notify_on_pause: true,
                email_notify_on_cancel: true
            });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('[getBroadcastSettings] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const updateBroadcastSettings = async (req, res) => {
    const { organization_id } = req.user;
    const {
        telegram_bot_token,
        telegram_chat_id,
        telegram_notify_on_complete,
        telegram_notify_on_pause,
        telegram_notify_on_cancel,
        email_recipient,
        email_notify_on_complete,
        email_notify_on_pause,
        email_notify_on_cancel
    } = req.body;

    try {
        const result = await pool.query(`
            INSERT INTO broadcast_settings 
                (organization_id, telegram_bot_token, telegram_chat_id, 
                 telegram_notify_on_complete, telegram_notify_on_pause, telegram_notify_on_cancel,
                 email_recipient, email_notify_on_complete, email_notify_on_pause, email_notify_on_cancel, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
            ON CONFLICT (organization_id) DO UPDATE SET
                telegram_bot_token = EXCLUDED.telegram_bot_token,
                telegram_chat_id = EXCLUDED.telegram_chat_id,
                telegram_notify_on_complete = EXCLUDED.telegram_notify_on_complete,
                telegram_notify_on_pause = EXCLUDED.telegram_notify_on_pause,
                telegram_notify_on_cancel = EXCLUDED.telegram_notify_on_cancel,
                email_recipient = EXCLUDED.email_recipient,
                email_notify_on_complete = EXCLUDED.email_notify_on_complete,
                email_notify_on_pause = EXCLUDED.email_notify_on_pause,
                email_notify_on_cancel = EXCLUDED.email_notify_on_cancel,
                updated_at = NOW()
            RETURNING *
        `, [
            organization_id,
            telegram_bot_token ? telegram_bot_token.trim() : null,
            telegram_chat_id ? String(telegram_chat_id).trim() : null,
            telegram_notify_on_complete !== false,
            telegram_notify_on_pause !== false,
            telegram_notify_on_cancel !== false,
            email_recipient ? email_recipient.trim() : null,
            email_notify_on_complete !== false,
            email_notify_on_pause !== false,
            email_notify_on_cancel !== false
        ]);

        res.json({ success: true, settings: result.rows[0] });
    } catch (err) {
        console.error('[updateBroadcastSettings] Error:', err);
        res.status(500).json({ error: err.message });
    }
};

export const testTelegramNotification = async (req, res) => {
    const { bot_token, chat_id } = req.body;
    try {
        const result = await broadcastTelegramService.testTelegramNotification({
            botToken: bot_token,
            chatId: chat_id
        });
        res.json({ success: true, message: 'Pesan tes berhasil dikirim ke Telegram!', result });
    } catch (err) {
        console.error('[testTelegramNotification] Error:', err);
        res.status(400).json({ error: err.message });
    }
};

export const testEmailNotification = async (req, res) => {
    const { email_recipient } = req.body;
    try {
        const result = await broadcastEmailService.testEmailNotification({
            recipientEmail: email_recipient
        });
        res.json({ success: true, message: 'Pesan tes berhasil dikirim ke Email!', result });
    } catch (err) {
        console.error('[testEmailNotification] Error:', err);
        res.status(400).json({ error: err.message });
    }
};
