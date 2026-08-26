import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import redisConnection from '../config/redis.js';
import { Queue } from 'bullmq';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Queue instances
const broadcastQueue = new Queue('broadcast-queue', { connection: redisConnection });
const warmerQueue = new Queue('warmer-queue', { connection: redisConnection });
const followUpQueue = new Queue('followup-queue', { connection: redisConnection });
const aiFollowUpQueue = new Queue('ai-followup-queue', { connection: redisConnection });

// Helper to calculate directory size recursively
const getDirectorySize = (dirPath) => {
    let size = 0;
    try {
        if (!fs.existsSync(dirPath)) return 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        // Silently ignore permissions / busy errors
    }
    return size;
};

// Helper: Format bytes
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// Format seconds to human uptime
const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
};

/**
 * GET /api/app/system/health
 * Returns comprehensive OS, PostgreSQL, Redis, Storage, and Queue telemetry.
 */
export const getSystemHealth = async (req, res) => {
    const startTime = Date.now();

    try {
        // 1. OS & Hardware Telemetry
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memUsagePercent = Math.round((usedMem / totalMem) * 100);
        const cpus = os.cpus() || [];
        const cpuModel = cpus[0]?.model || 'Generic CPU';
        const cpuCores = cpus.length;
        const loadAvg = os.loadavg();

        // 2. Node.js Process Telemetry
        const processMemory = process.memoryUsage();
        const processUptime = process.uptime();

        // 3. PostgreSQL Telemetry
        let dbStatus = 'connected';
        let dbLatency = null;
        let dbName = 'crmhub';
        let dbSizePretty = '0 MB';
        let dbSizeBytes = 0;
        let tableCount = 0;
        let activeConnections = 0;

        try {
            const dbStart = Date.now();
            const [dbInfoRes, tablesRes, connRes] = await Promise.all([
                pool.query(`SELECT current_database() as db_name, pg_size_pretty(pg_database_size(current_database())) as size_pretty, pg_database_size(current_database()) as size_bytes`),
                pool.query(`SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'`),
                pool.query(`SELECT count(*)::int as count FROM pg_stat_activity WHERE datname = current_database()`)
            ]);
            dbLatency = `${Date.now() - dbStart}ms`;
            if (dbInfoRes.rows.length > 0) {
                dbName = dbInfoRes.rows[0].db_name;
                dbSizePretty = dbInfoRes.rows[0].size_pretty;
                dbSizeBytes = parseInt(dbInfoRes.rows[0].size_bytes, 10);
            }
            tableCount = tablesRes.rows[0]?.count || 0;
            activeConnections = connRes.rows[0]?.count || 0;
        } catch (e) {
            dbStatus = `error: ${e.message}`;
        }

        // 4. Storage & Uploads Directory
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const uploadsSizeBytes = getDirectorySize(uploadsDir);
        const uploadsSizePretty = formatBytes(uploadsSizeBytes);

        // 5. Redis Telemetry
        let redisStatus = 'disconnected';
        let redisLatency = null;
        let redisKeyCount = 0;

        try {
            if (redisConnection?.status === 'ready') {
                const rStart = Date.now();
                await redisConnection.ping();
                redisLatency = `${Date.now() - rStart}ms`;
                redisStatus = 'connected';
                redisKeyCount = await redisConnection.dbsize().catch(() => 0);
            } else {
                redisStatus = redisConnection?.status || 'disconnected';
            }
        } catch (e) {
            redisStatus = `error: ${e.message}`;
        }

        // 6. BullMQ Queue Telemetry
        const getQueueCounts = async (q, label) => {
            try {
                const [waiting, active, completed, failed, delayed] = await Promise.all([
                    q.getWaitingCount().catch(() => 0),
                    q.getActiveCount().catch(() => 0),
                    q.getCompletedCount().catch(() => 0),
                    q.getFailedCount().catch(() => 0),
                    q.getDelayedCount().catch(() => 0),
                ]);
                return { label, waiting, active, completed, failed, delayed, status: 'operational' };
            } catch (err) {
                return { label, status: 'unavailable', error: err.message };
            }
        };

        const [broadcastQ, warmerQ, followupQ, aiFollowupQ] = await Promise.all([
            getQueueCounts(broadcastQueue, 'Broadcasts'),
            getQueueCounts(warmerQueue, 'WA Warmer'),
            getQueueCounts(followUpQueue, 'Auto Follow-up'),
            getQueueCounts(aiFollowUpQueue, 'AI Follow-up'),
        ]);

        const responseTime = `${Date.now() - startTime}ms`;

        res.json({
            status: (dbStatus === 'connected' && redisStatus === 'connected') ? 'optimal' : 'degraded',
            response_time: responseTime,
            timestamp: new Date().toISOString(),
            server: {
                platform: `${os.type()} (${os.platform()} ${os.arch()})`,
                hostname: os.hostname(),
                node_version: process.version,
                uptime_formatted: formatUptime(processUptime),
                uptime_seconds: Math.floor(processUptime),
                cpu: {
                    model: cpuModel,
                    cores: cpuCores,
                    load_avg_1m: (loadAvg[0] || 0).toFixed(2),
                    load_avg_5m: (loadAvg[1] || 0).toFixed(2)
                },
                memory: {
                    total_pretty: formatBytes(totalMem),
                    used_pretty: formatBytes(usedMem),
                    free_pretty: formatBytes(freeMem),
                    used_percent: memUsagePercent,
                    rss_mb: Math.round(processMemory.rss / (1024 * 1024)),
                    heap_used_mb: Math.round(processMemory.heapUsed / (1024 * 1024)),
                    heap_total_mb: Math.round(processMemory.heapTotal / (1024 * 1024))
                }
            },
            database: {
                status: dbStatus,
                latency: dbLatency,
                db_name: dbName,
                size_pretty: dbSizePretty,
                size_bytes: dbSizeBytes,
                total_tables: tableCount,
                active_connections: activeConnections,
                pool: {
                    total: pool.totalCount,
                    idle: pool.idleCount,
                    waiting: pool.waitingCount
                }
            },
            redis: {
                status: redisStatus,
                latency: redisLatency,
                keys_count: redisKeyCount
            },
            storage: {
                uploads_path: 'uploads/',
                uploads_size_pretty: uploadsSizePretty,
                uploads_size_bytes: uploadsSizeBytes
            },
            queues: [broadcastQ, warmerQ, followupQ, aiFollowupQ]
        });

    } catch (err) {
        console.error('[SystemHealth] Error collecting telemetry:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/app/system/backup-db
 * Generates and streams a full SQL backup snapshot of application tables.
 */
export const downloadDatabaseBackup = async (req, res) => {
    const { role } = req.user;
    if (role !== 'admin_member' && role !== 'super_admin') {
        return res.status(403).json({ error: 'Akses ditolak: Hanya Admin yang dapat mengunduh backup database.' });
    }

    try {
        const organizationId = req.user.organization_id;
        const now = new Date();
        const dateStamp = now.toISOString().replace(/[:T]/g, '-').slice(0, 19);
        const filename = `crmhub_backup_${dateStamp}.sql`;

        // Key tables to snapshot in logical dependency order
        const targetTables = [
            'organizations',
            'users',
            'contacts',
            'conversations',
            'messages',
            'bot_configs',
            'knowledge_base_qa',
            'knowledge_base_articles',
            'leads',
            'deals',
            'pipelines',
            'pipeline_stages',
            'invoices',
            'invoice_items',
            'products',
            'labels',
            'contact_labels',
            'quick_replies',
            'whatsapp_sessions',
            'flow_definitions',
            'auto_reply_rules',
            'working_hours_configs',
            'custom_fields',
            'contact_custom_fields'
        ];

        let sqlDump = `-- ========================================================\n`;
        sqlDump += `-- CRMHUB OMNICHANNEL FULL DATABASE BACKUP\n`;
        sqlDump += `-- Generated At: ${now.toISOString()}\n`;
        sqlDump += `-- Node Platform: ${os.platform()} ${os.arch()}\n`;
        sqlDump += `-- Organization ID: ${organizationId}\n`;
        sqlDump += `-- ========================================================\n\n`;
        sqlDump += `SET statement_timeout = 0;\n`;
        sqlDump += `SET client_encoding = 'UTF8';\n`;
        sqlDump += `SET standard_conforming_strings = on;\n\n`;

        for (const tableName of targetTables) {
            // Check if table exists
            const tableCheck = await pool.query(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
                [tableName]
            );
            if (tableCheck.rows.length === 0) continue;

            // Fetch table rows for this organization (or global if no organization_id column)
            let query = `SELECT * FROM "${tableName}"`;
            let params = [];

            // Check if table has organization_id column
            const colCheck = await pool.query(
                `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'organization_id'`,
                [tableName]
            );

            if (colCheck.rows.length > 0 && role !== 'super_admin') {
                query += ` WHERE organization_id = $1`;
                params.push(organizationId);
            }

            query += ` LIMIT 50000`;

            const rowsResult = await pool.query(query, params).catch(() => ({ rows: [] }));
            const rows = rowsResult.rows;

            sqlDump += `-- --------------------------------------------------------\n`;
            sqlDump += `-- Table data for: ${tableName} (${rows.length} rows)\n`;
            sqlDump += `-- --------------------------------------------------------\n`;

            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                const colNames = columns.map(c => `"${c}"`).join(', ');

                for (const row of rows) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null || val === undefined) return 'NULL';
                        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
                        if (typeof val === 'number') return val;
                        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
                        if (val instanceof Date) return `'${val.toISOString()}'`;
                        return `'${String(val).replace(/'/g, "''")}'`;
                    }).join(', ');

                    sqlDump += `INSERT INTO "${tableName}" (${colNames}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
                }
            }
            sqlDump += `\n`;
        }

        sqlDump += `-- ========================================================\n`;
        sqlDump += `-- BACKUP COMPLETED SUCCESSFULLY\n`;
        sqlDump += `-- ========================================================\n`;

        res.setHeader('Content-Type', 'application/sql; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', Buffer.byteLength(sqlDump, 'utf8'));

        return res.send(sqlDump);

    } catch (err) {
        console.error('[SystemHealth] Backup generation error:', err.message);
        res.status(500).json({ error: `Gagal membuat backup database: ${err.message}` });
    }
};
