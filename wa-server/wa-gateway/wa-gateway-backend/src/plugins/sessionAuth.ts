import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifySessionOwnership } from '../services/session.service';
import '@fastify/postgres';
import '@fastify/sensible';

// Removed failing module augmentation due to missing type definitions in environment
// declare module 'fastify' { ... }

async function sessionAuthPlugin(fastify: FastifyInstance) {
  fastify.decorate('verifySession', async function (request: FastifyRequest, reply: FastifyReply) {
    // Cast request to any to access client property injected by auth plugin
    const clientId = (request as any).client?.id;

    // Ambil sessionId dari body atau query.
    const sessionId = (request.body as any)?.sessionId || (request.query as any)?.sessionId;

    if (!sessionId) {
      return reply.code(400).send({ message: 'sessionId is required.' });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
         return reply.code(400).send({ message: 'Invalid sessionId format. Must be a valid UUID.' });
    }
 
    const dbClient = await (fastify as any).pg.connect();
    try {
      const hasOwnership = await verifySessionOwnership(dbClient, clientId, sessionId);
      if (!hasOwnership) {
        return reply.code(403).send({ message: 'You do not have permission to access this session.' });
      }
    } catch (err) {
      request.log.error(err, 'Error verifying session ownership');
      throw fastify.httpErrors.internalServerError();
    } finally {
      dbClient.release();
    }
  });
}

export default fp(sessionAuthPlugin);
