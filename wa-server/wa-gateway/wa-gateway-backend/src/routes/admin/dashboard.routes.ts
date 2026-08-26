import { FastifyInstance } from 'fastify';
import { SessionManager } from '../../services/sessionManager';
import os from 'os';
import '@fastify/postgres';
import '@fastify/sensible';

export default async function dashboardRoutes(fastify: FastifyInstance) {

  fastify.get('/stats', async (request, reply) => {
    // FIX: Cast fastify to any to access pg
    const dbClient = await (fastify as any).pg.connect();
    try {
      const clientsCountResult = await dbClient.query('SELECT COUNT(*) FROM clients');
      const sessionsCountResult = await dbClient.query('SELECT COUNT(*) FROM sessions');

      const recentClientsResult = await dbClient.query(
          'SELECT id, name, created_at FROM clients ORDER BY created_at DESC LIMIT 5'
      );

      const clientGrowthResult = await dbClient.query(`
        SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
        FROM clients
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY date
        ORDER BY date ASC
      `);

      const totalClients = parseInt(clientsCountResult.rows[0].count, 10);
      const totalSessionsDb = parseInt(sessionsCountResult.rows[0].count, 10);

      const sessionManager = SessionManager.getInstance(fastify);
      const realtimeStats = sessionManager.getSessionStats();

      const usedMem = os.totalmem() - os.freemem();
      const memUsagePercentage = Math.round((usedMem / os.totalmem()) * 100);
      const uptime = Math.floor(os.uptime());
      const loadAvg = os.loadavg()[0];

      return reply.send({
        overview: {
            totalClients,
            totalSessions: totalSessionsDb,
            activeSessions: realtimeStats.connected,
            sessionsNeedingQr: realtimeStats.need_qr
        },
        sessionStatusDistribution: realtimeStats,
        recentClients: recentClientsResult.rows,
        clientGrowth: clientGrowthResult.rows,
        system: {
            memoryUsage: memUsagePercentage,
            uptime: uptime,
            loadAvg: loadAvg.toFixed(2),
            platform: os.platform()
        }
      });

    } catch (err) {
      request.log.error(err, 'Failed to fetch dashboard stats');
      throw fastify.httpErrors.internalServerError('Error fetching dashboard statistics');
    } finally {
      dbClient.release();
    }
  });
}
