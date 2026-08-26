import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SessionManager } from '../../../services/sessionManager';
import { toJid } from '../../../utils/jid';
import { WASocket } from '@whiskeysockets/baileys';
import { z } from 'zod';
import '@fastify/sensible';
import {
    createGroupBodySchema,
    groupInfoQuerySchema,
    groupListQuerySchema,
    groupParticipantsBodySchema,
    updateGroupSubjectBodySchema,
    updateGroupDescriptionBodySchema,
    groupInviteCodeQuerySchema,
    leaveGroupBodySchema
} from '../../../utils/validation';

export default async function groupRoutes(fastify: FastifyInstance) {
    const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
    const sessionManager = SessionManager.getInstance(fastify);

    const withActiveSession = async (sessionId: string, action: (sock: WASocket) => Promise<any>) => {
        const statusObj = sessionManager.getSessionStatus(sessionId);

        if (statusObj.status !== 'CONNECTED') {
            if (statusObj.status === 'DISCONNECTED') {
                sessionManager.startSession(sessionId).catch(() => {}); // Lazy start
            }
            const error = fastify.httpErrors.serviceUnavailable(`Session ${sessionId} is ${statusObj.status}. Please retry.`);
            (error as any).headers = { 'Retry-After': '5' };
            throw error;
        }

        const sock = sessionManager.getSession(sessionId);
        if (!sock) {
             await sessionManager.refreshSession(sessionId, true);
             throw fastify.httpErrors.serviceUnavailable('Session state inconsistency. Refreshing...');
        }
        return action(sock);
    };

    const toGroupJid = (jid: string) => {
        const standard = toJid(jid);
        if (standard.endsWith('@s.whatsapp.net')) {
            return standard.replace('@s.whatsapp.net', '@g.us');
        }
        if (!standard.includes('@')) {
            return `${standard}@g.us`;
        }
        return standard;
    };

    const raceWithTimeout = async <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
        let timeoutId: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(fastify.httpErrors.gatewayTimeout(errorMessage));
            }, ms);
        });

        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timeoutId!);
            return result;
        } catch (error) {
            clearTimeout(timeoutId!);
            // Prevent unhandled rejection
            promise.catch(() => {});
            throw error;
        }
    };

    // Centralized error handler
    const handleGroupError = (error: any, sessionId: string) => {
        if (error.statusCode === 504 || error.message?.includes('Timed Out') || error.isBoom && error.output?.statusCode === 408) {
            fastify.log.warn(`[GROUP-TIMEOUT] Session ${sessionId} timed out. Triggering refresh.`);
            sessionManager.refreshSession(sessionId, true).catch(() => {});
            const retryErr = fastify.httpErrors.gatewayTimeout('Upstream WhatsApp server timed out. Connection resetting.');
            (retryErr as any).headers = { 'Retry-After': '10' };
            throw retryErr;
        }
        throw error;
    };

    // Endpoint: List All Groups
    fastifyZod.get('/list', {
        schema: { querystring: groupListQuerySchema },
        preHandler: [fastify.verifySession]
    }, async (request, reply) => {
        const { sessionId } = request.query as z.infer<typeof groupListQuerySchema>;
        try {
            const groups = await withActiveSession(sessionId, async (sock) => {
                return await raceWithTimeout(sock.groupFetchAllParticipating(), 60000, 'Group list fetch timed out');
            });

            const groupList = Object.values(groups).map((g: any) => ({
                id: g.id,
                subject: g.subject,
                size: g.size,
                creation: g.creation,
                owner: sessionManager.getPhoneNumber(g.owner),
                desc: g.desc,
                participants: g.participants.map((p: any) => ({
                    id: sessionManager.getPhoneNumber(p.id),
                    admin: p.admin
                }))
            }));

            return { success: true, data: groupList };
        } catch (error) {
            return handleGroupError(error, sessionId);
        }
    });

    // Endpoint: Group Info (Smart Fallback)
    fastifyZod.get('/info', {
        schema: { querystring: groupInfoQuerySchema },
        preHandler: [fastify.verifySession]
    }, async (request, reply) => {
        const query = request.query as z.infer<typeof groupInfoQuerySchema>;
        const { sessionId, jid } = query;
        // FIX: Ensure we are looking for a GROUP Jid (@g.us), not a user Jid
        const targetJid = toGroupJid(jid);

        try {
            const result = await withActiveSession(sessionId, async (sock) => {
                try {
                    // 1. Try fast direct fetch
                    return await raceWithTimeout(sock.groupMetadata(targetJid), 30000, 'Direct fetch timeout');
                } catch (directError) {
                    request.log.warn(`[GROUP-INFO-FB] Direct fetch failed for ${targetJid}. Trying bulk...`);
                    // 2. Fallback to bulk fetch which sometimes works when direct fails due to sync issues
                    const allGroups = await raceWithTimeout(sock.groupFetchAllParticipating(), 60000, 'Bulk fetch timeout');
                    const found = allGroups[targetJid];
                    if (!found) throw fastify.httpErrors.notFound('Group not found');
                    return found;
                }
            });

            // Normalize result
            return {
                ...result,
                owner: sessionManager.getPhoneNumber(result.owner),
                participants: result.participants.map((p: any) => ({
                    id: sessionManager.getPhoneNumber(p.id),
                    admin: p.admin
                }))
            };
        } catch (error) {
            return handleGroupError(error, sessionId);
        }
    });

    // Endpoint: Create Group
    fastifyZod.post('/', { schema: { body: createGroupBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof createGroupBodySchema>;
        const { sessionId, subject, participants } = body;
        try {
            const result = await withActiveSession(sessionId, (sock) => sock.groupCreate(subject, participants.map(toJid)));
            return reply.code(201).send(result);
        } catch (error) { return handleGroupError(error, sessionId); }
    });

    // Endpoint: Manage Participants
    fastifyZod.post('/participants', { schema: { body: groupParticipantsBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof groupParticipantsBodySchema>;
        const { sessionId, jid, action, participants } = body;
        const targetJid = toGroupJid(jid);
        try {
            const result = await withActiveSession(sessionId, (sock) => sock.groupParticipantsUpdate(targetJid, participants.map(toJid), action));
            return { success: true, details: result };
        } catch (error) { return handleGroupError(error, sessionId); }
    });

    // Endpoint: Update Subject
    fastifyZod.put('/subject', { schema: { body: updateGroupSubjectBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof updateGroupSubjectBodySchema>;
        const { sessionId, jid, subject } = body;
        const targetJid = toGroupJid(jid);
        try {
            await withActiveSession(sessionId, (sock) => sock.groupUpdateSubject(targetJid, subject));
            return { success: true };
        } catch (error) { return handleGroupError(error, sessionId); }
    });

    // Endpoint: Update Description
    fastifyZod.put('/description', { schema: { body: updateGroupDescriptionBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof updateGroupDescriptionBodySchema>;
        const { sessionId, jid, description } = body;
        const targetJid = toGroupJid(jid);
        try {
            await withActiveSession(sessionId, (sock) => sock.groupUpdateDescription(targetJid, description));
            return { success: true };
        } catch (error) { return handleGroupError(error, sessionId); }
    });

    // Endpoint: Get Invite Code
    fastifyZod.get('/invite-code', { schema: { querystring: groupInviteCodeQuerySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const query = request.query as z.infer<typeof groupInviteCodeQuerySchema>;
        const { sessionId, jid } = query;
        const targetJid = toGroupJid(jid);
        try {
            const code = await withActiveSession(sessionId, (sock) => sock.groupInviteCode(targetJid));
            return { invite_code: code };
        } catch (error) { return handleGroupError(error, sessionId); }
    });

    // Endpoint: Leave Group
    fastifyZod.delete('/leave', { schema: { body: leaveGroupBodySchema }, preHandler: [fastify.verifySession] }, async (request, reply) => {
        const body = request.body as z.infer<typeof leaveGroupBodySchema>;
        const { sessionId, jid } = body;
        const targetJid = toGroupJid(jid);
        try {
            await withActiveSession(sessionId, (sock) => sock.groupLeave(targetJid));
            return { success: true };
        } catch (error) { return handleGroupError(error, sessionId); }
    });
}
