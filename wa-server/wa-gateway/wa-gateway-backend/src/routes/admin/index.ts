import { FastifyInstance } from 'fastify';
import authRoutes from './auth.routes';
import clientRoutes from './clients.routes';
import dashboardRoutes from './dashboard.routes';

export default async function adminApi(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/auth' });

  fastify.register(async (protectedAdminRoutes) => {
    protectedAdminRoutes.addHook('onRequest', protectedAdminRoutes.authenticateAdmin);
    protectedAdminRoutes.register(clientRoutes, { prefix: '/clients' });
    protectedAdminRoutes.register(dashboardRoutes, { prefix: '/dashboard' });
  });
}
