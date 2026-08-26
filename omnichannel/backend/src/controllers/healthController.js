import pool from '../config/db.js';
import redisConnection from '../config/redis.js';
import { Queue } from 'bullmq';

// Queues
const broadcastQueue = new Queue('broadcast-queue', { connection: redisConnection });
const warmerQueue = new Queue('warmer-queue', { connection: redisConnection });
const followUpQueue = new Queue('followup-queue', { connection: redisConnection });
const aiFollowUpQueue = new Queue('ai-followup-queue', { connection: redisConnection });

/**
 * Public/Standard Health Check Endpoint
 * GET /api/health
 */
export const getHealthStatus = async (req, res) => {
    const startTime = Date.now();
    let dbStatus = 'disconnected';
    let dbLatency = null;
    let redisStatus = 'disconnected';
    let redisLatency = null;

    // Check Database
    try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        dbLatency = `${Date.now() - dbStart}ms`;
        dbStatus = 'connected';
    } catch (e) {
        dbStatus = `error: ${e.message}`;
    }

    // Check Redis
    try {
        if (redisConnection?.status === 'ready') {
            const redisStart = Date.now();
            await redisConnection.ping();
            redisLatency = `${Date.now() - redisStart}ms`;
            redisStatus = 'connected';
        } else {
            redisStatus = redisConnection?.status || 'disconnected';
        }
    } catch (e) {
        redisStatus = `error: ${e.message}`;
    }

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected';

    const statusObj = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        response_time: `${Date.now() - startTime}ms`,
        environment: process.env.NODE_ENV || 'production',
        services: {
            database: {
                status: dbStatus,
                latency: dbLatency,
                pool_total: pool.totalCount,
                pool_idle: pool.idleCount,
                pool_waiting: pool.waitingCount
            },
            redis: {
                status: redisStatus,
                latency: redisLatency
            },
            memory: {
                rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            }
        }
    };

    res.status(isHealthy ? 200 : 503).json(statusObj);
};

/**
 * Super Admin Queue Statistics Endpoint
 * GET /api/sa/queues/stats
 */
export const getQueueStats = async (req, res) => {
    try {
        const getStatsForQueue = async (queue, name) => {
            try {
                const [waiting, active, completed, failed, delayed] = await Promise.all([
                    queue.getWaitingCount().catch(() => 0),
                    queue.getActiveCount().catch(() => 0),
                    queue.getCompletedCount().catch(() => 0),
                    queue.getFailedCount().catch(() => 0),
                    queue.getDelayedCount().catch(() => 0)
                ]);
                return { name, waiting, active, completed, failed, delayed, status: 'active' };
            } catch (err) {
                return { name, status: 'error', error: err.message };
            }
        };

        const [broadcastStats, warmerStats, followUpStats, aiFollowUpStats] = await Promise.all([
            getStatsForQueue(broadcastQueue, 'Broadcast Queue'),
            getStatsForQueue(warmerQueue, 'Warmer Queue'),
            getStatsForQueue(followUpQueue, 'Follow-up Queue'),
            getStatsForQueue(aiFollowUpQueue, 'AI Follow-up Queue')
        ]);

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            queues: [broadcastStats, warmerStats, followUpStats, aiFollowUpStats]
        });
    } catch (err) {
        console.error('[HealthController] Queue stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

export default {
    getHealthStatus,
    getQueueStats
};
