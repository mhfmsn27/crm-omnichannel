import pool from '../config/db.js';
import axios from 'axios';
import redisConnection from '../config/redis.js';
import { Queue } from 'bullmq';

export const getDashboardData = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const agentsOnline = req.io.sockets.adapter.rooms.get(`org_${organization_id}`)?.size || 0;

        const [
            statsRes,
            chartRes,
            devicesRes,
            announcementRes,
            activityRes,
            channelSummaryRes,
            orgRes
        ] = await Promise.all([
            // 1. General Stats — all real data from DB
            pool.query(`
                SELECT
                    COUNT(*) FILTER (WHERE from_me = false AND created_at >= CURRENT_DATE) as incoming_today,
                    COUNT(*) FILTER (WHERE from_me = true AND created_at >= CURRENT_DATE) as outgoing_today,
                    (
                        SELECT COUNT(*) FROM conversations
                        WHERE organization_id = $1
                          AND unread_count > 0
                          AND status != 'resolved'
                          AND is_archived = false
                    ) as unreplied,
                    (SELECT COUNT(*) FROM contacts WHERE organization_id = $1) as total_contacts,
                    (
                        SELECT COUNT(*) FROM conversations
                        WHERE organization_id = $1
                          AND status = 'resolved'
                          AND closed_at >= CURRENT_DATE
                    ) as resolved_today,
                    (
                        SELECT COUNT(*) FROM conversations
                        WHERE organization_id = $1
                          AND status = 'open'
                          AND is_archived = false
                    ) as open_conversations
                FROM messages
                WHERE organization_id = $1
            `, [organization_id]),

            // 2. Chart Data (Last 7 Days)
            pool.query(`
                SELECT
                    to_char(d.day, 'YYYY-MM-DD') as date,
                    COALESCE(COUNT(m.id) FILTER (WHERE m.from_me = false), 0) as incoming,
                    COALESCE(COUNT(m.id) FILTER (WHERE m.from_me = true), 0) as outgoing
                FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') as d(day)
                LEFT JOIN messages m ON date_trunc('day', m.created_at) = d.day AND m.organization_id = $1
                GROUP BY 1
                ORDER BY 1 ASC
            `, [organization_id]),

            // 3. Unified Devices List (All Channels)
            pool.query(`
                SELECT id, name, status, whatsapp_number as info,
                       CASE WHEN type = 'official' THEN 'whatsapp_official' ELSE 'whatsapp' END as type,
                       created_at
                FROM whatsapp_sessions WHERE organization_id = $1
                UNION ALL
                SELECT id, page_name as name, CASE WHEN is_active THEN 'connected' ELSE 'disconnected' END as status, 'FB Page' as info, 'messenger' as type, created_at FROM messenger_pages WHERE organization_id = $1
                UNION ALL
                SELECT id, username as name, CASE WHEN is_active THEN 'connected' ELSE 'disconnected' END as status, 'Instagram' as info, 'instagram' as type, created_at FROM instagram_accounts WHERE organization_id = $1
                UNION ALL
                SELECT id, first_name as name, CASE WHEN is_active THEN 'connected' ELSE 'disconnected' END as status, '@'||username as info, 'telegram' as type, created_at FROM telegram_bots WHERE organization_id = $1
                UNION ALL
                SELECT id, name, CASE WHEN is_active THEN 'connected' ELSE 'disconnected' END as status, 'Widget' as info, 'webchat' as type, created_at FROM webchat_configs WHERE organization_id = $1
                ORDER BY status DESC, created_at DESC
            `, [organization_id]),

            // 4. Announcements
            pool.query(`
                SELECT id, title, content as message, type, image_url, link_url, is_active
                FROM announcements
                WHERE is_active = true
                ORDER BY created_at DESC
                LIMIT 5
            `),

            // 5. Activity Feed — recent conversations with contact name + last message
            pool.query(`
                SELECT
                    'conversation' as type,
                    COALESCE(ct.name, ct.phone_number) as title,
                    c.last_message as subtitle,
                    c.last_message_at as created_at,
                    c.status,
                    c.unread_count,
                    COALESCE(c.channel, 'other') as channel
                FROM conversations c
                JOIN contacts ct ON c.contact_id = ct.id
                WHERE c.organization_id = $1
                  AND c.last_message IS NOT NULL
                  AND c.last_message != ''
                  AND c.is_archived = false
                ORDER BY c.last_message_at DESC
                LIMIT 8
            `, [organization_id]),

            // 6. Channel Breakdown
            pool.query(`
                SELECT
                    COALESCE(channel, 'other') as channel,
                    COUNT(*) as total_conversations,
                    COUNT(*) FILTER (WHERE status = 'open' AND is_archived = false) as open_count,
                    COUNT(*) FILTER (WHERE unread_count > 0 AND status != 'resolved' AND is_archived = false) as unread_count
                FROM conversations
                WHERE organization_id = $1
                GROUP BY channel
                ORDER BY total_conversations DESC
            `, [organization_id]),

            // 7. Subscription Info
            pool.query(`
                SELECT s.status, s.trial_ends_at, s.expires_at, p.name as plan_name
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.organization_id = $1
                ORDER BY s.created_at DESC LIMIT 1
            `, [organization_id])
        ]);

        const subInfo = orgRes.rows[0];
        const row = statsRes.rows[0];

        const response = {
            stats: {
                incoming_today: parseInt(row.incoming_today),
                outgoing_today: parseInt(row.outgoing_today),
                unreplied: parseInt(row.unreplied),
                total_contacts: parseInt(row.total_contacts),
                resolved_today: parseInt(row.resolved_today),
                open_conversations: parseInt(row.open_conversations),
                agents_online: agentsOnline
            },
            chart_data: chartRes.rows.map(row => ({
                date: row.date,
                in: parseInt(row.incoming),
                out: parseInt(row.outgoing)
            })),
            devices: devicesRes.rows,
            announcements: announcementRes.rows,
            activity_feed: activityRes.rows,
            channel_summary: channelSummaryRes.rows,
            subscription: subInfo
        };

        res.json(response);

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: err.message });
    }
};
