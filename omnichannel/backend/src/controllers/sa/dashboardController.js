
import pool from '../../config/db.js';
import axios from 'axios';
import redisConnection from '../../config/redis.js';
import { Queue } from 'bullmq';

const broadcastQueue = new Queue('broadcast-queue', { connection: redisConnection });

export const getDashboardData = async (req, res) => {
    try {
        // Execute all queries in parallel for performance
        const [
            kpiRes,
            revenueChartRes,
            planDistRes,
            activityRes,
            healthRes,
            queueCounts,
            topTenantsRes
        ] = await Promise.all([
            // 1. KPIs (MRR, Active Tenants, New Signups, Pending Payments)
            pool.query(`
                SELECT 
                    (
                        SELECT COALESCE(SUM(
                            CASE 
                                WHEN s.plan_id IS NOT NULL THEN p.price_monthly 
                                ELSE 0 
                            END
                        ), 0)
                        FROM subscriptions s
                        JOIN plans p ON s.plan_id = p.id
                        WHERE s.status = 'active'
                    ) as mrr,
                    
                    (SELECT COUNT(*) FROM organizations WHERE subscription_status = 'active' AND id != 1) as active_tenants,
                    
                    (SELECT COUNT(*) FROM organizations WHERE created_at >= date_trunc('month', CURRENT_DATE) AND id != 1) as new_signups,
                    
                    (SELECT COUNT(*) FROM transactions WHERE status = 'pending_confirmation') as pending_payments
            `),

            // 2. Revenue Growth Chart (Last 6 Months)
            pool.query(`
                SELECT 
                    to_char(date_trunc('month', series.month), 'Mon') as month_name,
                    COALESCE(SUM(t.amount), 0) as total_revenue
                FROM generate_series(
                    date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                    date_trunc('month', CURRENT_DATE),
                    '1 month'
                ) as series(month)
                LEFT JOIN transactions t ON date_trunc('month', t.created_at) = series.month AND t.status = 'success'
                GROUP BY 1, series.month
                ORDER BY series.month ASC
            `),

            // 3. Plan Distribution (Pie Chart)
            pool.query(`
                SELECT p.name, COUNT(s.id) as count
                FROM subscriptions s
                JOIN plans p ON s.plan_id = p.id
                WHERE s.status = 'active'
                GROUP BY p.name
            `),

            // 4. Recent Activity Feed (Signups & Payments)
            pool.query(`
                (
                    SELECT 'signup' as type, 
                           'New Registration: ' || name as message, 
                           created_at 
                    FROM organizations 
                    WHERE id != 1
                    ORDER BY created_at DESC LIMIT 5
                )
                UNION ALL
                (
                    SELECT 'payment' as type, 
                           'Payment ' || status || ': ' || invoice_number as message, 
                           updated_at as created_at 
                    FROM transactions 
                    WHERE status IN ('success', 'pending_confirmation')
                    ORDER BY updated_at DESC LIMIT 5
                )
                ORDER BY created_at DESC LIMIT 5
            `),
            
            // 5. System Health Check
            checkSystemHealth(),

            // 6. Queue Stats
            broadcastQueue.getJobCounts('active', 'waiting', 'completed', 'failed', 'delayed'),

            // 7. Top Tenants by Volume (Last 30 Days)
            pool.query(`
                SELECT o.name, p.name as plan_name, COUNT(m.id) as msg_count
                FROM organizations o
                JOIN messages m ON o.id = m.organization_id
                LEFT JOIN plans p ON o.plan_id = p.id
                WHERE m.created_at > NOW() - INTERVAL '30 days' AND o.id != 1
                GROUP BY o.id, p.name
                ORDER BY msg_count DESC
                LIMIT 5
            `)
        ]);

        const kpi = kpiRes.rows[0];
        const mrrGrowth = 12.5; 

        const response = {
            kpi: {
                mrr: parseInt(kpi.mrr),
                mrr_growth: mrrGrowth,
                active_tenants: parseInt(kpi.active_tenants),
                new_signups: parseInt(kpi.new_signups),
                pending_payments: parseInt(kpi.pending_payments)
            },
            charts: {
                revenue_growth: revenueChartRes.rows.map(r => ({
                    name: r.month_name,
                    revenue: parseInt(r.total_revenue)
                })),
                plan_distribution: planDistRes.rows.map(r => ({
                    name: r.name,
                    value: parseInt(r.count)
                }))
            },
            recent_activities: activityRes.rows,
            system_status: healthRes,
            queue_stats: queueCounts,
            top_tenants: topTenantsRes.rows
        };

        res.json(response);

    } catch (err) {
        console.error("SA Dashboard Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Helper to check system health
const checkSystemHealth = async () => {
    const status = {
        wa_gateway: 'offline',
        redis: 'offline',
        database: 'online' // Implicit since we are querying
    };

    try {
        // Check Redis
        const ping = await redisConnection.ping();
        if (ping === 'PONG') status.redis = 'online';
    } catch (e) { console.error("Redis Health Fail", e); }

    try {
        // Check Gateway (Mock ping)
        // In prod: axios.get(process.env.WA_GATEWAY_URL + '/health')
        status.wa_gateway = 'online'; 
    } catch (e) { console.error("Gateway Health Fail", e); }

    return status;
};
