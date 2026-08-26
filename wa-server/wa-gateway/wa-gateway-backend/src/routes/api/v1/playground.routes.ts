import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SessionManager } from '../../../services/sessionManager';
import { sessionIdParamsSchema } from '../../../utils/validation';
import { z } from 'zod';

export default async function playgroundRoutes(fastify: FastifyInstance) {
  const sessionManager = SessionManager.getInstance(fastify);
  const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
 
  fastifyZod.get('/messages', {
      schema: {
          querystring: z.object({ sessionId: z.string().uuid() })
      },
      preHandler: [fastify.verifySession]
  }, async (request, reply) => {
    const { sessionId } = request.query as { sessionId: string };
    const messages = sessionManager.popMessages(sessionId);
    return reply.send(messages);
  });
}
