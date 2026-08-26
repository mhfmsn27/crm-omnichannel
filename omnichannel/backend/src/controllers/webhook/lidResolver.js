import pool from '../../config/db.js';

/**
 * Core LID resolution function.
 * @param {object} opts
 * @param {Pool} opts.pool - Database pool
 * @param {string} opts.dbSessionId - Internal DB session ID (not the wa-server session_id)
 * @param {string} opts.organizationId - Organization ID
 * @param {Array<{lid: string, pn: string, name?: string, imgUrl?: string}>} opts.mappings - LID → PN mappings
 * @param {object|null} opts.io - Socket.io instance (optional, for frontend notifications)
 * @returns {Promise<{resolved: number, merged: number, updated: number}>} Stats
 */
export const resolveLidMappings = async ({ pool: dbPool = pool, dbSessionId, organizationId, mappings, io }) => {
    const stats = { resolved: 0, merged: 0, updated: 0 };

    const orgIdInt = parseInt(organizationId, 10);
    if (isNaN(orgIdInt)) {
        console.error('[resolveLidMappings] Invalid organizationId:', organizationId);
        return stats;
    }

    try {
        const sessionRes = await dbPool.query('SELECT device_info FROM whatsapp_sessions WHERE id = $1', [dbSessionId]);
        if (sessionRes.rows.length > 0) {
            let deviceInfo = sessionRes.rows[0].device_info || {};
            if (typeof deviceInfo === 'string') {
                try { deviceInfo = JSON.parse(deviceInfo); } catch (e) { deviceInfo = {}; }
            }
            if (deviceInfo.sync_contacts === false) {
                console.log(`[resolveLidMappings] Skipped for session ${dbSessionId} because sync_contacts is disabled.`);
                return stats;
            }
        }
    } catch (err) {
        console.error('[resolveLidMappings] Error checking sync_contacts:', err);
    }

    for (const { lid, pn, name, imgUrl } of mappings) {
        if (!lid || !pn || !lid.includes('@lid')) continue;

        let realPhone = String(pn).split('@')[0].replace(/[^0-9]/g, '');
        if (realPhone.startsWith('0')) realPhone = '62' + realPhone.slice(1);
        else if (realPhone.startsWith('8')) realPhone = '62' + realPhone;
        if (!realPhone) continue;

        const hasMeaningfulName = name && name.trim() && !/^\d{12,}$/.test(name) && name !== lid;
        const bestName = hasMeaningfulName ? name.trim() : null;

        try {
            const lidDigits = String(lid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
            const baseLid = lidDigits + '@lid';
            const lidContacts = await dbPool.query(
                `SELECT id, name, profile_pic_url FROM contacts
                 WHERE organization_id = $1::bigint
                 AND (phone_number = $2 OR phone_number = $3 OR phone_number = $4 OR whatsapp_lid = $2 OR whatsapp_lid = $3)`,
                [orgIdInt, lid, baseLid, lidDigits]
            );

            const realContact = await dbPool.query(
                `SELECT id, name, profile_pic_url, whatsapp_lid FROM contacts
                 WHERE organization_id = $1::bigint AND phone_number = $2 LIMIT 1`,
                [orgIdInt, realPhone]
            );

            let lidContactId = null;
            if (lidContacts.rows.length > 0) {
                lidContactId = lidContacts.rows[0].id;
            }

            if (realContact.rows.length > 0 && lidContactId && realContact.rows[0].id !== lidContactId) {
                const realContactId = realContact.rows[0].id;
                const finalName = bestName || realContact.rows[0].name || lidContacts.rows[0].name || realPhone;
                const finalPic = imgUrl || realContact.rows[0].profile_pic_url || lidContacts.rows[0].profile_pic_url || null;

                await dbPool.query(
                    `UPDATE messages SET conversation_id = sub.target_conv_id
                     FROM (
                         SELECT m.id AS msg_id,
                                (SELECT id FROM conversations WHERE contact_id = $1::bigint AND organization_id = $2::bigint LIMIT 1) AS target_conv_id
                         FROM messages m
                         JOIN conversations c ON m.conversation_id = c.id
                         WHERE c.contact_id = $3::bigint AND c.organization_id = $2::bigint
                     ) sub
                     WHERE messages.id = sub.msg_id AND sub.target_conv_id IS NOT NULL`,
                    [realContactId, orgIdInt, lidContactId]
                );

                await dbPool.query(
                    `UPDATE conversations SET contact_id = $1::bigint
                     WHERE contact_id = $2::bigint AND organization_id = $3::bigint
                     AND whatsapp_session_id NOT IN (
                         SELECT whatsapp_session_id FROM conversations WHERE contact_id = $1::bigint AND organization_id = $3::bigint
                     )`,
                    [realContactId, orgIdInt, lidContactId]
                );

                await dbPool.query(
                    `DELETE FROM conversations WHERE contact_id = $1::bigint AND organization_id = $2::bigint`,
                    [lidContactId, orgIdInt]
                );

                await dbPool.query(
                    `DELETE FROM contacts WHERE id = $1::bigint AND organization_id = $2::bigint`,
                    [lidContactId, orgIdInt]
                );

                await dbPool.query(
                    `UPDATE contacts SET whatsapp_lid = $1, name = COALESCE($2, name), profile_pic_url = COALESCE($3, profile_pic_url), updated_at = NOW()
                     WHERE id = $4::bigint`,
                    [lid, finalName, finalPic, realContactId]
                );

                stats.merged++;
            } else if (realContact.rows.length > 0) {
                const updateFields = ['whatsapp_lid = $1', 'updated_at = NOW()'];
                const updateParams = [lid, realContact.rows[0].id];
                let paramIdx = 3;

                if (bestName && (!realContact.rows[0].name || /^\d+$/.test(realContact.rows[0].name))) {
                    updateFields.push(`name = $${paramIdx}`);
                    updateParams.push(bestName);
                    paramIdx++;
                }
                if (imgUrl && !realContact.rows[0].profile_pic_url) {
                    updateFields.push(`profile_pic_url = $${paramIdx}`);
                    updateParams.push(imgUrl);
                    paramIdx++;
                }

                await dbPool.query(
                    `UPDATE contacts SET ${updateFields.join(', ')} WHERE id = $2::bigint`,
                    updateParams
                );
                stats.resolved++;
            } else if (lidContactId) {
                await dbPool.query(
                    `UPDATE contacts
                     SET phone_number = $1,
                         whatsapp_lid = $2,
                         name = COALESCE($3, name),
                         profile_pic_url = COALESCE($4, profile_pic_url),
                         updated_at = NOW()
                     WHERE id = $5::bigint`,
                    [realPhone, lid, bestName, imgUrl || null, lidContactId]
                );
                stats.updated++;
            } else {
                try {
                    await dbPool.query(
                        `INSERT INTO contacts (organization_id, name, phone_number, whatsapp_lid, profile_pic_url)
                         VALUES ($1::bigint, COALESCE($2, $3), $3, $4, $5)
                         ON CONFLICT (organization_id, phone_number) DO UPDATE
                         SET whatsapp_lid = EXCLUDED.whatsapp_lid, updated_at = NOW()`,
                        [orgIdInt, bestName, realPhone, lid, imgUrl || null]
                    );
                    stats.updated++;
                } catch (insertErr) {
                    console.error(`[resolveLidMappings] Error proactively inserting ${realPhone}:`, insertErr.message);
                }
            }

            let resolvedContactId = realContact.rows.length > 0 ? realContact.rows[0].id : lidContactId;
            if (!resolvedContactId) {
                const fetchRes = await dbPool.query('SELECT id FROM contacts WHERE organization_id = $1::bigint AND phone_number = $2', [orgIdInt, realPhone]);
                if (fetchRes.rows.length > 0) resolvedContactId = fetchRes.rows[0].id;
            }

            if (resolvedContactId) {
                const convs = await dbPool.query(
                    `SELECT id, last_message_at FROM conversations
                     WHERE organization_id = $1::bigint AND contact_id = $2 AND whatsapp_session_id = $3
                     ORDER BY last_message_at DESC`,
                    [orgIdInt, resolvedContactId, dbSessionId]
                );
                if (convs.rows.length > 1) {
                    const keepId = convs.rows[0].id;
                    const mergeIds = convs.rows.slice(1).map(r => r.id);
                    await dbPool.query(
                        `UPDATE messages SET conversation_id = $1 WHERE conversation_id = ANY($2::int[])`,
                        [keepId, mergeIds]
                    );
                    await dbPool.query(
                        `DELETE FROM conversations WHERE id = ANY($1::int[]) AND organization_id = $2::bigint`,
                        [mergeIds, orgIdInt]
                    );
                }
            }

            if (typeof io !== 'undefined' && io) {
                io.to(`org_${orgIdInt}`).emit('contact_merged', { lid, realPhone });
            }
        } catch (err) {
            console.error(`[resolveLidMappings] Error processing ${lid} -> ${pn}:`, err.message);
        }
    }

    return stats;
};

export const handleLidResolved = async (req, res, sessionId, mappings) => {
    const sessionRes = await pool.query(
        'SELECT id, organization_id FROM whatsapp_sessions WHERE session_id = $1 LIMIT 1',
        [sessionId]
    );
    if (!sessionRes.rows.length) return;
    const { id: dbSessionId, organization_id } = sessionRes.rows[0];
    const socketInstance = req?.io || (req?.app?.get ? req.app.get('io') : null);

    await resolveLidMappings({
        pool,
        dbSessionId,
        organizationId: organization_id,
        mappings,
        io: socketInstance
    });
};
