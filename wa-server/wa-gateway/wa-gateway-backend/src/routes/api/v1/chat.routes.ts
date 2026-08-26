import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SessionManager } from '../../../services/sessionManager';
import { WASocket } from '@whiskeysockets/baileys';
import { toJid } from '../../../utils/jid';
import { z } from 'zod';
import '@fastify/sensible';
import {
    chatPresenceBodySchema,
    chatArchiveBodySchema,
    chatPinBodySchema,
    chatMuteBodySchema,
    chatMarkReadBodySchema
} from '../../../utils/validation';

export default async function chatRoutes(fastify: FastifyInstance) {
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

    fastifyZod.post('/presence', { schema: { body: chatPresenceBodySchema } }, async (request, reply) => {
        const { sessionId, jid, presence } = request.body as z.infer<typeof chatPresenceBodySchema>;
        await withActiveSession(sessionId, (sock) => sock.sendPresenceUpdate(presence, toJid(jid)));
        return { success: true };
    });

    fastifyZod.post('/archive', { schema: { body: chatArchiveBodySchema } }, async (request, reply) => {
        const { sessionId, jid, archive } = request.body as z.infer<typeof chatArchiveBodySchema>;
        await withActiveSession(sessionId, (sock) => sock.chatModify({ archive, lastMessages: [] }, toJid(jid)));
        return { success: true };
    });

    fastifyZod.post('/pin', { schema: { body: chatPinBodySchema } }, async (request, reply) => {
        const { sessionId, jid, pin } = request.body as z.infer<typeof chatPinBodySchema>;
        await withActiveSession(sessionId, (sock) => sock.chatModify({ pin }, toJid(jid)));
        return { success: true };
    });

    fastifyZod.post('/mute', { schema: { body: chatMuteBodySchema } }, async (request, reply) => {
        const { sessionId, jid, muteDuration } = request.body as z.infer<typeof chatMuteBodySchema>;
        const mute = muteDuration && muteDuration > 0 ? Date.now() + muteDuration : null;
        await withActiveSession(sessionId, (sock) => sock.chatModify({ mute }, toJid(jid)));
        return { success: true };
    });

    fastifyZod.post('/mark-read', { schema: { body: chatMarkReadBodySchema } }, async (request, reply) => {
        const { sessionId, jid, read } = request.body as z.infer<typeof chatMarkReadBodySchema>;
        await withActiveSession(sessionId, (sock) => sock.chatModify({ markRead: read, lastMessages: [] }, toJid(jid)));
        return { success: true };
    });
}
