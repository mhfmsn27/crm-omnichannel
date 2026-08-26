import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SessionManager } from '../../../services/sessionManager';
import { WASocket } from '@whiskeysockets/baileys';
import { z } from 'zod';
import '@fastify/sensible';
import { updateProfileStatusBodySchema, updateProfilePictureBodySchema } from '../../../utils/validation';

export default async function profileRoutes(fastify: FastifyInstance) {
    const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
    const sessionManager = SessionManager.getInstance(fastify);

    const withActiveSession = async (sessionId: string, action: (sock: WASocket) => Promise<any>) => {
        const sock = sessionManager.getSession(sessionId);
        if (!sock || sessionManager.getSessionStatus(sessionId).status !== 'CONNECTED') {
            throw fastify.httpErrors.conflict(`Session ${sessionId} not active or not connected.`);
        }
        return action(sock);
    };

    fastify.addHook('preHandler', fastify.verifySession);

    fastifyZod.put('/status', { schema: { body: updateProfileStatusBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof updateProfileStatusBodySchema>;
        const { sessionId, text } = body;
        await withActiveSession(sessionId, (sock) => sock.updateProfileStatus(text));
        return { success: true };
    });

    fastifyZod.post('/picture', { schema: { body: updateProfilePictureBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof updateProfilePictureBodySchema>;
        const { sessionId, url } = body;
        await withActiveSession(sessionId, (sock) => {
            if (!sock.user?.id) throw fastify.httpErrors.internalServerError('User ID not available in session.');
            return sock.updateProfilePicture(sock.user.id, { url });
        });
        return { success: true };
    });
}
