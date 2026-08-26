import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SessionManager } from '../../../services/sessionManager';
import { toJid } from '../../../utils/jid';
import { WASocket } from '@whiskeysockets/baileys';
import { z } from 'zod';
import '@fastify/sensible';
import {
    checkWhatsappBodySchema,
    blockUnblockBodySchema,
    contactQuerySchema
} from '../../../utils/validation';

const profilePicCache = new Map<string, { url: string | null, expires: number, isError?: boolean }>();
const CACHE_TTL_SUCCESS = 24 * 60 * 60 * 1000; // 24 Hours for success
const CACHE_TTL_ERROR = 60 * 60 * 1000;        // 1 Hour for errors/timeouts

export default async function contactRoutes(fastify: FastifyInstance) {
    const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
    const sessionManager = SessionManager.getInstance(fastify);

    const withActiveSession = async (sessionId: string, action: (sock: WASocket) => Promise<any>) => {
        const sock = sessionManager.getSession(sessionId);
        if (!sock || sessionManager.getSessionStatus(sessionId).status !== 'CONNECTED') {
            throw fastify.httpErrors.conflict(`Session ${sessionId} not active or not connected.`);
        }
        return action(sock);
    };

    const raceWithTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
        let timeoutId: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Timed Out'));
            }, ms);
        });
        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timeoutId!);
            return result;
        } catch (error) {
            clearTimeout(timeoutId!);
            throw error;
        }
    };

    fastify.addHook('preHandler', fastify.verifySession);

    // Endpoint: Check WhatsApp Number
    fastifyZod.post('/check-whatsapp', { schema: { body: checkWhatsappBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof checkWhatsappBodySchema>;
        const { sessionId, numbers } = body;

        const results = await withActiveSession(sessionId, async (sock) => {
            return await Promise.all(numbers.map(async (num) => {
                try {
                    let clean = num.toString().replace(/\D/g, '');
                    if (clean.startsWith('08')) clean = '62' + clean.slice(1);
                    else if (clean.startsWith('8') && clean.length >= 10) clean = '62' + clean;

                    const jidToCheck = toJid(clean);
                    const onWaResult = await raceWithTimeout(sock.onWhatsApp(jidToCheck), 5000).catch(() => []);

                    const result = onWaResult?.[0];
                    const exists = result?.exists || false;

                    return {
                        number: num,
                        formatted: clean,
                        on_whatsapp: exists,
                        exists: exists,
                        jid: result?.jid || null
                    };
                } catch (error) {
                    return { number: num, on_whatsapp: false, exists: false, error: "Check failed" };
                }
            }));
        });
        return results;
    });

    // Endpoint: Get Profile Picture (Optimized for Fail-Fast)
    fastifyZod.get('/profile-picture', { schema: { querystring: contactQuerySchema } }, async (request, reply) => {
        const query = request.query as z.infer<typeof contactQuerySchema>;
        const { sessionId, jid } = query;
        const targetJid = toJid(jid);

        const cacheKey = `${sessionId}:${targetJid}`;
        const cached = profilePicCache.get(cacheKey);

        // Return cached value immediately if valid
        if (cached && cached.expires > Date.now()) {
            // If it was an error previously, return null immediately without trying again
            if (cached.isError) {
                return { profile_picture_url: null };
            }
            return { profile_picture_url: cached.url };
        }

        try {
            const url = await withActiveSession(sessionId, async (sock) => {
                // Reduce timeout to 3s. If it takes longer, it's likely gonna fail or block the queue.
                // Better to return null quickly than hang the request.
                return await raceWithTimeout(
                    sock.profilePictureUrl(targetJid, 'image'),
                    3000
                );
            });

            // Success: Cache for 24 hours
            profilePicCache.set(cacheKey, { url: url || null, expires: Date.now() + CACHE_TTL_SUCCESS, isError: false });

            return { profile_picture_url: url || null };
        } catch (error: any) {
            const isTimeout = error.message?.includes('Timed Out') || error.code === 'ETIMEDOUT';
            const isPrivacy = error?.data === 401 || error?.data === 403 || error?.data === 400 || error?.data === 404;

            // Log warning only for timeouts, debug for privacy/not-found
            if (isTimeout) {
                request.log.warn(`[PROFILE-PIC] Timeout for ${targetJid}. Caching failure.`);
            }

            // Negative Caching:
            // If it timed out or failed due to privacy/404, assume it will fail again soon.
            // Cache as null for 1 hour to prevent repetitive load.
            profilePicCache.set(cacheKey, {
                url: null,
                expires: Date.now() + CACHE_TTL_ERROR,
                isError: true
            });

            return { profile_picture_url: null, error: isTimeout ? 'timeout' : 'not-found' };
        }
    });

    // Endpoint: Get Status
    fastifyZod.get('/status', { schema: { querystring: contactQuerySchema } }, async (request, reply) => {
        const query = request.query as z.infer<typeof contactQuerySchema>;
        const { sessionId, jid } = query;

        try {
            const status = await withActiveSession(sessionId, async (sock) => {
                return await raceWithTimeout(sock.fetchStatus(toJid(jid)), 5000);
            });
            return status;
        } catch (error: any) {
            return { status: null, error: 'unavailable' };
        }
    });

    fastifyZod.post('/block', { schema: { body: blockUnblockBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof blockUnblockBodySchema>;
        const { sessionId, jid } = body;
        await withActiveSession(sessionId, (sock) => sock.updateBlockStatus(toJid(jid), 'block'));
        return { success: true, message: `JID ${jid} has been blocked.` };
    });

    fastifyZod.post('/unblock', { schema: { body: blockUnblockBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof blockUnblockBodySchema>;
        const { sessionId, jid } = body;
        await withActiveSession(sessionId, (sock) => sock.updateBlockStatus(toJid(jid), 'unblock'));
        return { success: true, message: `JID ${jid} has been unblocked.` };
    });

    // ========================================================================
    // Endpoint: Resolve All LID Contacts for a Session
    // Returns all known LID → PN mappings from cache + WhatsApp address book.
    // Used by backend to heal old @lid contacts in the database.
    // ========================================================================
    const resolveLidsBodySchema = z.object({
        sessionId: z.string().min(1)
    });

    fastifyZod.post('/resolve-lids', { schema: { body: resolveLidsBodySchema } }, async (request, reply) => {
        const { sessionId } = request.body as z.infer<typeof resolveLidsBodySchema>;

        const status = sessionManager.getSessionStatus(sessionId);
        if (status.status !== 'CONNECTED') {
            throw fastify.httpErrors.conflict(`Session ${sessionId} is not connected (status: ${status.status}).`);
        }

        const mappings = await sessionManager.resolveAllLids(sessionId);

        return {
            sessionId,
            status: status.status,
            resolvedCount: mappings.length,
            mappings  // Array of { lid: string, pn: string }
        };
    });
}
