import pool from '../../config/db.js';
import { autoAssignConversation } from '../inboxSettingsController.js';
import { initTicket } from '../ticketController.js';
import { dispatchOrgEvent } from '../../services/webhookDispatcher.js';
import { cacheGet, cacheSet, getUnreadCacheKey } from './inboxCache.js';

export const getUnreadCount = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    try {
        const orgSettingRes = await pool.query(`
            SELECT inbox_isolation_enabled FROM organizations WHERE id = $1
        `, [organization_id]);
        const inboxIsolationEnabled = orgSettingRes.rows[0]?.inbox_isolation_enabled === true;

        let inboxIds = null;
        let whereClause = `organization_id = $1 AND unread_count > 0 AND status != 'resolved' AND is_archived = false`;
        const params = [organization_id];

        if (inboxIsolationEnabled) {
            const inboxAccessRes = await pool.query(`
                SELECT COUNT(*) as count FROM user_inbox_access WHERE user_id = $1
            `, [userId]);

            if (parseInt(inboxAccessRes.rows[0].count) > 0) {
                const allowedInboxes = await pool.query(`
                    SELECT inbox_id FROM user_inbox_access WHERE user_id = $1
                `, [userId]);
                inboxIds = allowedInboxes.rows.map(r => r.inbox_id);
                whereClause += ` AND (inbox_id = ANY($2::int[]) OR inbox_id IS NULL)`;
                params.push(inboxIds);
            }
        }

        const cacheKey = getUnreadCacheKey(organization_id, userId, inboxIds);
        const cached = await cacheGet(cacheKey);
        if (cached) {
            return res.json({ count: cached, cached: true });
        }

        const result = await pool.query(
            `SELECT COUNT(*) FROM conversations WHERE ${whereClause}`,
            params
        );

        const count = parseInt(result.rows[0].count);
        await cacheSet(cacheKey, count, 30);

        res.json({ count, cached: false });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getInboxBanners = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, title, content, type, image_url, link_url FROM announcements WHERE is_active = true AND placement = 'inbox' ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createConversation = async (req, res) => {
    const { organization_id, id: userId } = req.user;
    const { contact_id, phone_number, session_id } = req.body;

    if (!contact_id && !phone_number) return res.status(400).json({ error: "contact_id or phone_number is required" });

    let inboxId = null;
    try {
        const inboxIsolationEnabled = await pool.query(
            'SELECT inbox_isolation_enabled FROM organizations WHERE id = $1'
        );
        if (inboxIsolationEnabled.rows[0]?.inbox_isolation_enabled && session_id) {
            const inboxRes = await pool.query(
                'SELECT inbox_id FROM inbox_device_mapping WHERE device_id = $1',
                [session_id]
            );
            inboxId = inboxRes.rows[0]?.inbox_id || null;
        }
    } catch (err) {
        console.warn('[createConversation] Error getting inbox_id:', err.message);
    }

    try {
        let resolvedContactId = contact_id;

        if (!resolvedContactId && phone_number) {
            let normalized = String(phone_number).replace(/\D/g, '');
            if (normalized.length < 6) return res.status(400).json({ error: "Invalid phone number" });

            if (normalized.startsWith('00')) normalized = normalized.slice(2);
            else if (normalized.startsWith('0')) normalized = '62' + normalized.slice(1);
            else if (normalized.startsWith('8') && normalized.length <= 12) normalized = '62' + normalized;

            const existing = await pool.query(
                'SELECT id FROM contacts WHERE organization_id = $1 AND phone_number = $2 LIMIT 1',
                [organization_id, normalized]
            );

            if (existing.rows.length > 0) {
                resolvedContactId = existing.rows[0].id;
            } else {
                const created = await pool.query(
                    'INSERT INTO contacts (organization_id, phone_number, name, created_at) VALUES ($1, $2, $2, NOW()) RETURNING id',
                    [organization_id, normalized]
                );
                resolvedContactId = created.rows[0].id;
            }
        }

        const check = await pool.query(
            `SELECT id, whatsapp_session_id, channel FROM conversations
             WHERE organization_id = $1 AND contact_id = $2
             ORDER BY created_at DESC LIMIT 1`,
            [organization_id, resolvedContactId]
        );

        if (check.rows.length > 0) {
            const existing = check.rows[0];
            if (session_id) {
                const needsUpdate = !existing.whatsapp_session_id || String(existing.whatsapp_session_id) !== String(session_id);
                if (needsUpdate) {
                    const sessionCheck = await pool.query('SELECT id FROM whatsapp_sessions WHERE id = $1', [session_id]);
                    if (sessionCheck.rows.length > 0) {
                        await pool.query(
                            `UPDATE conversations SET whatsapp_session_id = $1, channel = 'whatsapp' WHERE id = $2`,
                            [session_id, existing.id]
                        );
                    }
                }
            }
            return res.json({ id: existing.id, is_new: false });
        }

        let newId;
        if (session_id) {
            const result = await pool.query(
                `INSERT INTO conversations (organization_id, contact_id, whatsapp_session_id, channel, inbox_id, status, assigned_to_agent_id, unread_count, created_at)
                 VALUES ($1, $2, $3, 'whatsapp', $4, 'open', $5, 0, NOW())
                 RETURNING id`,
                [organization_id, resolvedContactId, session_id, inboxId, userId]
            );
            newId = result.rows[0].id;
        } else {
            const result = await pool.query(
                `INSERT INTO conversations (organization_id, contact_id, inbox_id, status, assigned_to_agent_id, unread_count, created_at)
                 VALUES ($1, $2, $3, 'open', $4, 0, NOW())
                 RETURNING id`,
                [organization_id, resolvedContactId, inboxId, userId]
            );
            newId = result.rows[0].id;
        }

        autoAssignConversation(organization_id, newId, req.io, 'CS', session_id ? 'whatsapp' : null, inboxId).catch(err => console.error('[inboxController] autoAssign failed:', err.message));
        initTicket(organization_id, newId).catch(err => console.error('[inboxController] initTicket failed:', err.message));
        dispatchOrgEvent(organization_id, 'conversation.created', { conversationId: newId, contactId: resolvedContactId, channel: session_id ? 'whatsapp' : 'manual' }).catch(err => console.error('[Inbox] dispatchOrgEvent failed:', err.message));

        req.io?.to(`org_${organization_id}`).emit('new_conversation', {
            id: newId,
            contact_id: resolvedContactId,
            status: 'open',
            unread_count: 0,
            inbox_id: inboxId
        });

        res.json({ id: newId, is_new: true, inbox_id: inboxId });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const getConversations = async (req, res) => {
    try {
        const { organization_id, id: userId, role } = req.user;
        const userRes = await pool.query('SELECT role_level, permissions, assigned_devices FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        const roleLevel = user?.role_level || 1;
        const assignedDevices = user?.assigned_devices || [];
        
        let permissionsObj = {};
        try {
            permissionsObj = typeof user?.permissions === 'string' 
                ? JSON.parse(user.permissions) 
                : (user?.permissions || {});
        } catch (e) {}
        
        const canViewAllChats = permissionsObj.view_all_chats === true;
        const { status = 'all', channel, device_id, search, agent_id, label_ids, filter_by, sort_by, inbox_id, page = 1, limit = 50, hide_unknown } = req.query;

        let whereClause = `
        c.organization_id = $1
        AND (
            ws.whatsapp_number IS NULL OR
            NULLIF(regexp_replace(ct.phone_number, '[^0-9]', '', 'g'), '') != NULLIF(regexp_replace(ws.whatsapp_number, '[^0-9]', '', 'g'), '')
        )
        ${hide_unknown === 'true' ? "AND ct.name != 'Kontak WA' AND NOT (ct.name ~ '^[0-9]{12,}$')" : ""}
        AND (
            (c.channel = 'whatsapp' AND ws.status = 'connected')
            OR
            c.channel != 'whatsapp'
            OR
            c.channel IS NULL
        )
    `;
        const params = [organization_id];
        let paramIdx = 2;

        const orgSettingRes = await pool.query(`
            SELECT inbox_isolation_enabled FROM organizations WHERE id = $1
        `, [organization_id]);
        const inboxIsolationEnabled = orgSettingRes.rows[0]?.inbox_isolation_enabled === true;

        if (inboxIsolationEnabled) {
            const inboxAccessRes = await pool.query(`
                SELECT COUNT(*) as count FROM user_inbox_access WHERE user_id = $1
            `, [userId]);

            if (parseInt(inboxAccessRes.rows[0].count) > 0) {
                const allowedInboxes = await pool.query(`
                    SELECT inbox_id FROM user_inbox_access WHERE user_id = $1
                `, [userId]);
                const allowedInboxIds = allowedInboxes.rows.map(r => r.inbox_id);

                if (inbox_id) {
                    const requestedInboxId = parseInt(inbox_id);
                    if (!allowedInboxIds.includes(requestedInboxId)) {
                        return res.status(403).json({ error: 'You do not have access to this inbox' });
                    }
                    whereClause += ` AND c.inbox_id = $${paramIdx}`;
                    params.push(requestedInboxId);
                    paramIdx++;
                } else {
                    whereClause += ` AND (c.inbox_id = ANY($${paramIdx}::int[]) OR c.inbox_id IS NULL)`;
                    params.push(allowedInboxIds);
                    paramIdx++;
                }
            } else {
                if (inbox_id) {
                    whereClause += ` AND c.inbox_id = $${paramIdx}`;
                    params.push(parseInt(inbox_id));
                    paramIdx++;
                }
            }
        } else {
            if (inbox_id) {
                whereClause += ` AND c.inbox_id = $${paramIdx}`;
                params.push(parseInt(inbox_id));
                paramIdx++;
            }
        }

        if (role === 'super_admin' || role === 'admin_member') {
            // Full Access
        } else if (canViewAllChats) {
            if (roleLevel >= 10 && assignedDevices.length > 0) {
                const allowedConditions = [];
                const waIds = [];
                const msgIds = [];
                const igIds = [];
                const tgIds = [];
                const wcIds = [];

                assignedDevices.forEach(id => {
                    const [type, val] = id.split(':');
                    if (type === 'whatsapp') waIds.push(parseInt(val));
                    if (type === 'messenger') msgIds.push(parseInt(val));
                    if (type === 'instagram') igIds.push(parseInt(val));
                    if (type === 'telegram') tgIds.push(parseInt(val));
                    if (type === 'webchat') wcIds.push(parseInt(val));
                });

                if (waIds.length > 0) { params.push(waIds); allowedConditions.push(`c.whatsapp_session_id = ANY($${paramIdx}::int[])`); paramIdx++; }
                if (msgIds.length > 0) { params.push(msgIds); allowedConditions.push(`c.messenger_page_id = ANY($${paramIdx}::int[])`); paramIdx++; }
                if (igIds.length > 0) { params.push(igIds); allowedConditions.push(`c.instagram_account_id = ANY($${paramIdx}::int[])`); paramIdx++; }
                if (tgIds.length > 0) { params.push(tgIds); allowedConditions.push(`c.telegram_bot_id = ANY($${paramIdx}::int[])`); paramIdx++; }
                if (wcIds.length > 0) { params.push(wcIds); allowedConditions.push(`c.webchat_config_id = ANY($${paramIdx}::int[])`); paramIdx++; }

                if (allowedConditions.length > 0) {
                    whereClause += ` AND (${allowedConditions.join(' OR ')})`;
                } else {
                    whereClause += ` AND 1=0`;
                }
            }
        } else {
            whereClause += ` AND c.assigned_to_agent_id = $${paramIdx}`;
            params.push(userId);
            paramIdx++;
        }

        if (channel && channel !== 'all') {
            whereClause += ` AND c.channel = $${paramIdx}`;
            params.push(channel);
            paramIdx++;
        }
        if (device_id) {
            const [devType, devId] = device_id.split(':');
            if (devType && devId) {
                if (devType === 'webchat') { whereClause += ` AND c.channel = 'webchat' AND c.webchat_config_id = $${paramIdx}`; params.push(devId); paramIdx++; }
                else if (devType === 'whatsapp') { whereClause += ` AND c.whatsapp_session_id = $${paramIdx}`; params.push(devId); paramIdx++; }
                else if (devType === 'messenger') { whereClause += ` AND c.messenger_page_id = $${paramIdx}`; params.push(devId); paramIdx++; }
                else if (devType === 'instagram') { whereClause += ` AND c.instagram_account_id = $${paramIdx}`; params.push(devId); paramIdx++; }
                else if (devType === 'telegram') { whereClause += ` AND c.telegram_bot_id = $${paramIdx}`; params.push(devId); paramIdx++; }
            }
        }
        if (search) {
            let normalizedSearch = search.replace(/\D/g, '');
            if (normalizedSearch.startsWith('0')) {
                normalizedSearch = normalizedSearch.substring(1);
            } else if (normalizedSearch.startsWith('62')) {
                normalizedSearch = normalizedSearch.substring(2);
            }

            whereClause += ` AND (
                ct.name ILIKE $${paramIdx}
                OR ct.phone_number ILIKE $${paramIdx}
                OR ct.phone_number ILIKE $${paramIdx + 1}
                OR c.last_message ILIKE $${paramIdx}
                OR EXISTS (
                    SELECT 1 FROM messages m
                    WHERE m.conversation_id = c.id
                    AND m.content ILIKE $${paramIdx}
                )
            )`;
            params.push(`%${search}%`);
            if (normalizedSearch.length > 0) {
                params.push(`%${normalizedSearch}%`);
            } else {
                params.push(`%${search}%`);
            }
            paramIdx += 2;
        }

        if (agent_id && (role === 'super_admin' || role === 'admin_member' || roleLevel >= 10)) {
            whereClause += ` AND c.assigned_to_agent_id = $${paramIdx}`;
            params.push(parseInt(agent_id));
            paramIdx++;
        }

        if (label_ids) {
            const labelIdArray = label_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (labelIdArray.length > 0) {
                whereClause += ` AND EXISTS (
                    SELECT 1 FROM contact_labels cl 
                    WHERE cl.contact_id = c.contact_id 
                    AND cl.label_id = ANY($${paramIdx}::int[])
                )`;
                params.push(labelIdArray);
                paramIdx++;
            }
        }

        if (filter_by === 'read') {
            whereClause += ` AND c.unread_count = 0`;
        } else if (filter_by === 'unread') {
            whereClause += ` AND c.unread_count > 0`;
        }

        const countsQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE c.status != 'resolved' AND c.is_archived = false) as count_all,
            COUNT(*) FILTER (WHERE c.unread_count > 0 AND c.status != 'resolved' AND c.is_archived = false) as count_unread,
            COUNT(*) FILTER (WHERE c.is_urgent = true AND c.status != 'resolved' AND c.is_archived = false) as count_urgent,
            COUNT(*) FILTER (WHERE c.assigned_to_agent_id IS NULL AND c.status != 'resolved' AND c.is_archived = false) as count_unassigned,
            COUNT(*) FILTER (WHERE c.status = 'resolved' AND c.is_archived = false) as count_resolved,
            COUNT(*) FILTER (WHERE c.is_archived = true) as count_archived
        FROM conversations c
        JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
        WHERE ${whereClause}
    `;

        let dataQuery = `
      SELECT c.*, 
      CASE 
        WHEN ct.phone_number LIKE '%@lid' THEN COALESCE(NULLIF(ct.name, ct.phone_number), 'Kontak WA')
        ELSE ct.name
      END as contact_name, 
      ct.profile_pic_url, 
      ct.is_blocked,
      CASE WHEN ct.phone_number LIKE '%@lid' THEN NULL ELSE ct.phone_number END as phone_number,
      ct.internal_note,
      u.name as agent_name, 
      
      ws.type as device_type,

      CASE 
        WHEN c.channel = 'whatsapp' THEN ws.name
        WHEN c.channel = 'wa-api' OR c.channel = 'wa_api' THEN COALESCE(ws.name, 'WhatsApp Official API')
        WHEN c.channel = 'wa-coex' OR c.channel = 'wa_coex' THEN COALESCE(ws.name, 'WhatsApp CoEx')
        WHEN c.channel = 'messenger' THEN COALESCE(mp.page_name, 'Meta Messenger')
        WHEN c.channel = 'instagram' THEN COALESCE(ia.username, 'Instagram DM')
        WHEN c.channel = 'telegram' THEN COALESCE(tb.first_name, 'Telegram')
        WHEN c.channel = 'webchat' THEN COALESCE(wc.name, 'Web Widget')
        WHEN c.channel = 'email' THEN 'Email Inbox'
        WHEN c.channel = 'tiktok' THEN 'TikTok Shop & DM'
        WHEN c.channel = 'shopee' THEN 'Shopee Chat'
        WHEN c.channel = 'tokopedia' THEN 'Tokopedia Chat'
        WHEN c.channel = 'line' THEN 'LINE Official'
        ELSE COALESCE(ws.name, 'Omnichannel')
      END as device_name,

      COALESCE(ws.session_id, mp.page_id, ia.ig_id, tb.bot_token, wc.widget_uid::text) as gateway_session_id,
      
      COALESCE(
          (
            SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color))
            FROM contact_labels cl
            JOIN labels l ON cl.label_id = l.id
            WHERE cl.contact_id = c.contact_id
          ),
          '[]'
      ) as labels,

      (
        SELECT cf.name 
        FROM flow_sessions fs 
        JOIN chat_flows cf ON fs.flow_id = cf.id 
        WHERE fs.contact_id = c.contact_id AND fs.status = 'active' 
        LIMIT 1
      ) as active_flow_name

      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
      LEFT JOIN messenger_pages mp ON c.messenger_page_id = mp.id
      LEFT JOIN instagram_accounts ia ON c.instagram_account_id = ia.id
      LEFT JOIN telegram_bots tb ON c.telegram_bot_id = tb.id
      LEFT JOIN webchat_configs wc ON c.webchat_config_id = wc.id
      LEFT JOIN users u ON c.assigned_to_agent_id = u.id
      WHERE ${whereClause}
    `;

        if (status === 'archived') {
            dataQuery += ` AND c.is_archived = true`;
        } else {
            dataQuery += ` AND c.is_archived = false`;
            if (status === 'resolved') dataQuery += ` AND c.status = 'resolved'`;
            else if (status === 'unread') dataQuery += ` AND c.unread_count > 0 AND c.status != 'resolved'`;
            else if (status === 'urgent') dataQuery += ` AND c.is_urgent = true AND c.status != 'resolved'`;
            else if (status === 'unassigned') dataQuery += ` AND c.assigned_to_agent_id IS NULL AND c.status != 'resolved'`;
            else if (status === 'any') { }
            else {
                dataQuery += ` AND c.status != 'resolved'`;
            }
        }

        let orderByClause = 'ORDER BY c.is_pinned DESC';
        if (sort_by === 'newest') {
            orderByClause += ', c.created_at DESC';
        } else if (sort_by === 'oldest') {
            orderByClause += ', c.created_at ASC';
        } else {
            orderByClause += ', c.last_message_at DESC';
        }
        
        const parsedLimit = parseInt(limit, 10);
        const parsedPage = parseInt(page, 10);
        const offset = (parsedPage - 1) * parsedLimit;
        
        orderByClause += ` LIMIT ${parsedLimit} OFFSET ${offset}`;
        dataQuery += ` ${orderByClause}`;

        const [countsRes, dataRes] = await Promise.all([
            pool.query(countsQuery, params),
            pool.query(dataQuery, params)
        ]);

        res.json({
            conversations: dataRes.rows,
            counts: {
                all: parseInt(countsRes.rows[0].count_all || 0),
                unread: parseInt(countsRes.rows[0].count_unread || 0),
                urgent: parseInt(countsRes.rows[0].count_urgent || 0),
                resolved: parseInt(countsRes.rows[0].count_resolved || 0),
                archived: parseInt(countsRes.rows[0].count_archived || 0),
                unassigned: parseInt(countsRes.rows[0].count_unassigned || 0)
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

export const getConversationDetail = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const query = `
      SELECT c.*, 
      CASE 
        WHEN ct.phone_number LIKE '%@lid' THEN COALESCE(NULLIF(ct.name, ct.phone_number), 'Kontak WA')
        ELSE ct.name
      END as contact_name,
      ct.profile_pic_url,
      ct.is_blocked,
      CASE WHEN ct.phone_number LIKE '%@lid' THEN NULL ELSE ct.phone_number END as phone_number,
      ct.internal_note,
      u.name as agent_name, 
      
      ws.type as device_type,

      CASE 
        WHEN c.channel = 'whatsapp' THEN ws.name
        WHEN c.channel = 'wa-api' OR c.channel = 'wa_api' THEN COALESCE(ws.name, 'WhatsApp Official API')
        WHEN c.channel = 'wa-coex' OR c.channel = 'wa_coex' THEN COALESCE(ws.name, 'WhatsApp CoEx')
        WHEN c.channel = 'messenger' THEN COALESCE(mp.page_name, 'Meta Messenger')
        WHEN c.channel = 'instagram' THEN COALESCE(ia.username, 'Instagram DM')
        WHEN c.channel = 'telegram' THEN COALESCE(tb.first_name, 'Telegram')
        WHEN c.channel = 'webchat' THEN COALESCE(wc.name, 'Web Widget')
        WHEN c.channel = 'email' THEN 'Email Inbox'
        WHEN c.channel = 'tiktok' THEN 'TikTok Shop & DM'
        WHEN c.channel = 'shopee' THEN 'Shopee Chat'
        WHEN c.channel = 'tokopedia' THEN 'Tokopedia Chat'
        WHEN c.channel = 'line' THEN 'LINE Official'
        ELSE COALESCE(ws.name, 'Omnichannel')
      END as device_name,

      COALESCE(ws.session_id, mp.page_id, ia.ig_id, tb.bot_token, wc.widget_uid::text) as gateway_session_id,
      
      COALESCE(
          (
            SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color))
            FROM contact_labels cl
            JOIN labels l ON cl.label_id = l.id
            WHERE cl.contact_id = c.contact_id
          ),
          '[]'
      ) as labels,

      (
        SELECT cf.name 
        FROM flow_sessions fs 
        JOIN chat_flows cf ON fs.flow_id = cf.id 
        WHERE fs.contact_id = c.contact_id AND fs.status = 'active' 
        LIMIT 1
      ) as active_flow_name

      FROM conversations c
      JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN whatsapp_sessions ws ON c.whatsapp_session_id = ws.id
      LEFT JOIN messenger_pages mp ON c.messenger_page_id = mp.id
      LEFT JOIN instagram_accounts ia ON c.instagram_account_id = ia.id
      LEFT JOIN telegram_bots tb ON c.telegram_bot_id = tb.id
      LEFT JOIN webchat_configs wc ON c.webchat_config_id = wc.id
      LEFT JOIN users u ON c.assigned_to_agent_id = u.id
      WHERE c.id = $1 AND c.organization_id = $2
    `;

        const result = await pool.query(query, [id, organization_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateLabels = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { labelIds } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM contact_labels WHERE contact_id = (SELECT contact_id FROM conversations WHERE id = $1)', [id]);

        if (labelIds && labelIds.length > 0) {
            const contactRes = await client.query('SELECT contact_id FROM conversations WHERE id = $1', [id]);
            const contactId = contactRes.rows[0]?.contact_id;
            if (contactId) {
                const values = labelIds.map((lid, idx) => `($1, $${idx + 2})`).join(',');
                await client.query(
                    `INSERT INTO contact_labels (contact_id, label_id) VALUES ${values}`,
                    [contactId, ...labelIds]
                );
            }
        }
        await client.query('COMMIT');

        const labelsRes = await pool.query(`
            SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) as labels
            FROM contact_labels cl
            JOIN labels l ON cl.label_id = l.id
            WHERE cl.contact_id = (SELECT contact_id FROM conversations WHERE id = $1)
        `, [id]);

        const labels = labelsRes.rows[0].labels || [];

        req.io?.to(`org_${organization_id}`).emit('conversation_status_update', {
            conversationId: id,
            labels: labels
        });

        res.json({ success: true, labels });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};

export const getMediaGallery = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;
    const { type } = req.query;

    try {
        const convRes = await pool.query(
            'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2',
            [id, organization_id]
        );
        if (convRes.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

        let typeFilter = '';
        const params = [id];
        if (type && ['image', 'video', 'document', 'audio'].includes(type)) {
            typeFilter = ` AND m.type = $2`;
            params.push(type);
        }

        const result = await pool.query(
            `SELECT m.id, m.type, m.content, m.media_url, m.created_at, m.from_me,
                    u.name as sender_name
             FROM messages m
             LEFT JOIN users u ON m.sender_id = u.id
             WHERE m.conversation_id = $1
               AND m.media_url IS NOT NULL
               AND m.type IN ('image', 'video', 'document', 'audio')
               ${typeFilter}
             ORDER BY m.created_at DESC
             LIMIT 200`,
            params
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteConversation = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        const check = await pool.query('SELECT id FROM conversations WHERE id = $1 AND organization_id = $2', [id, organization_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Conversation not found" });

        await pool.query('DELETE FROM conversations WHERE id = $1', [id]);
        res.json({ message: "Conversation deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const clearChat = async (req, res) => {
    const { id } = req.params;
    const { organization_id } = req.user;

    try {
        await pool.query(
            `DELETE FROM messages WHERE conversation_id = $1 AND organization_id = $2`,
            [id, organization_id]
        );

        req.io?.to(`org_${organization_id}`).emit('chat_cleared', {
            conversationId: id
        });

        res.json({ success: true, conversationId: id });
    } catch (err) {
        res.status(500).json({ error: "Gagal membersihkan obrolan" });
    }
};
