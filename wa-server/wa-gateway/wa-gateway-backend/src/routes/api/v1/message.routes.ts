import { FastifyInstance, FastifyRequest } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { SessionManager } from '../../../services/sessionManager';
import { toJid } from '../../../utils/jid';
import { WASocket, proto, downloadMediaMessage, WAMessage } from '@whiskeysockets/baileys';
import { z } from 'zod';
import '@fastify/sensible';
import {
    sendTextBodySchema,
    sendMediaBodySchema,
    sendLocationBodySchema,
    sendContactBodySchema,
    sendButtonsBodySchema,
    reactBodySchema,
    deleteMessageBodySchema,
    forwardMessageBodySchema,
    downloadMediaBodySchema,
    sendBulkBodySchema,
    editMessageBodySchema
} from '../../../utils/validation';

const sessionMessageQueues = new Map<string, Promise<any>>();

// Helper: Clean up queue entry after settle (prevents memory leak)
const queueSettle = (sessionId: string) => {
    const existing = sessionMessageQueues.get(sessionId);
    if (existing) {
        existing.finally(() => {
            // Only clear if this queue hasn't been superseded by a newer queue
            if (sessionMessageQueues.get(sessionId) === existing) {
                sessionMessageQueues.delete(sessionId);
            }
        });
    }
};

export default async function messageRoutes(fastify: FastifyInstance) {
    const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
    const sessionManager = SessionManager.getInstance(fastify);

    // Fungsi helper untuk mendapatkan sesi yang aktif (dengan antrian per-sesi)
    const withActiveSession = async (sessionId: string, action: (sock: WASocket) => Promise<any>) => {
        const sock = sessionManager.getSession(sessionId);
        if (!sock || sessionManager.getSessionStatus(sessionId).status !== 'CONNECTED') {
            throw fastify.httpErrors.conflict(`Session ${sessionId} not active or not connected.`);
        }

        const currentQueue = sessionMessageQueues.get(sessionId) || Promise.resolve();

        // Build next queue: chain after previous, clean up after settle
        const nextQueue = currentQueue.then(async () => {
            const result = await action(sock);
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms rate limit gap
            sessionMessageQueues.delete(sessionId); // ✅ Clean up queue entry
            return result;
        }).catch(async (err) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            sessionMessageQueues.delete(sessionId); // ✅ Clean up on error too
            throw err;
        });

        sessionMessageQueues.set(sessionId, nextQueue);
        queueSettle(sessionId); // Schedule cleanup

        return nextQueue;
    };

    fastify.addHook('preHandler', fastify.verifySession);

    fastifyZod.post('/send-text', { schema: { body: sendTextBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof sendTextBodySchema>;
        const { sessionId, to, text, replyTo } = body;
        const jid = toJid(to);
        const options = replyTo ? { quoted: replyTo as unknown as WAMessage } : {};

        const result = await withActiveSession(sessionId, async (sock) => {
            // ANTI-BAN: Send 'composing' presence before message to mimic human typing
            try { await sock.sendPresenceUpdate('composing', jid); } catch (_) {}

            // iOS FIX: Use retry-capable send method
            return sessionManager.sendMessageWithRetry(sessionId, jid, { text }, options);
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/send-media', { schema: { body: sendMediaBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof sendMediaBodySchema>;
        const { sessionId, to, mediaType, url, caption, mimetype, filename, replyTo } = body;
        const jid = toJid(to);
        let content: any = {};
        switch (mediaType) {
            case 'image': content = { image: { url }, caption }; break;
            case 'video': content = { video: { url }, caption }; break;
            case 'audio': content = { audio: { url }, mimetype: mimetype || 'audio/mp4' }; break;
            case 'document':
                if (!mimetype || !filename) throw fastify.httpErrors.badRequest('Mimetype and filename are required for documents.');
                content = { document: { url }, mimetype, fileName: filename };
                break;
            default: throw fastify.httpErrors.badRequest('Invalid mediaType.');
        }
        const options = replyTo ? { quoted: replyTo as unknown as WAMessage } : {};

        const result = await withActiveSession(sessionId, async (sock) => {
            // ANTI-BAN: Send 'composing' presence before message to mimic human typing
            try { await sock.sendPresenceUpdate('composing', jid); } catch (_) {}

            // iOS FIX: Use retry-capable send method
            return sessionManager.sendMessageWithRetry(sessionId, jid, content, options);
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/send-location', { schema: { body: sendLocationBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof sendLocationBodySchema>;
        const { sessionId, to, latitude, longitude } = body;
        const jid = toJid(to);

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method
            return sessionManager.sendMessageWithRetry(sessionId, jid, {
                location: { degreesLatitude: latitude, degreesLongitude: longitude }
            });
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/send-contact', { schema: { body: sendContactBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof sendContactBodySchema>;
        const { sessionId, to, name, phone } = body;
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;waid=${phone}:${phone}\nEND:VCARD`;
        const jid = toJid(to);

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method
            return sessionManager.sendMessageWithRetry(sessionId, jid, {
                contacts: { displayName: name, contacts: [{ vcard }] }
            });
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/send-buttons', { schema: { body: sendButtonsBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof sendButtonsBodySchema>;
        const { sessionId, to, text, footer, buttons } = body;
        const jid = toJid(to);

        // Force fallback to Text for better deliverability on mobile apps (Meta blocks unofficial buttons)
        const fallbackText = `${text}\n\n${buttons.map((btn, i) => `${i + 1}. ${btn.text}`).join('\n')}\n\n_${footer || 'Silakan balas dengan opsi di atas'}_`;

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method
            return sessionManager.sendMessageWithRetry(sessionId, jid, { text: fallbackText });
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/react', { schema: { body: reactBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof reactBodySchema>;
        const { sessionId, to, key, emoji } = body;
        const jid = toJid(to);

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method
            return sessionManager.sendMessageWithRetry(sessionId, jid, { react: { text: emoji, key } });
        });
        return { success: true, details: result };
    });

    fastifyZod.delete('/', { schema: { body: deleteMessageBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof deleteMessageBodySchema>;
        const { sessionId, to, key } = body;
        const jid = toJid(to);

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method for delete
            return sessionManager.sendMessageWithRetry(sessionId, jid, { delete: key });
        });
        return { success: true, details: result };
    });

    fastifyZod.put('/edit', { schema: { body: editMessageBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof editMessageBodySchema>;
        const { sessionId, to, key, text } = body;
        const jid = toJid(to);

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method for edit
            return sessionManager.sendMessageWithRetry(sessionId, jid, { edit: key, text });
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/forward', { schema: { body: forwardMessageBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof forwardMessageBodySchema>;
        const { sessionId, to, message } = body;
        const jid = toJid(to);

        const result = await withActiveSession(sessionId, (sock) => {
            // iOS FIX: Use retry-capable send method for forward
            return sessionManager.sendMessageWithRetry(sessionId, jid, { forward: message as unknown as WAMessage });
        });
        return { success: true, details: result };
    });

    fastifyZod.post('/send-bulk', { schema: { body: sendBulkBodySchema } }, async (request, reply) => {
        const body = request.body as z.infer<typeof sendBulkBodySchema>;
        const { sessionId, receivers, message, type, delay = 2000 } = body;

        const report = {
            total: receivers.length,
            sent: 0,
            failed: 0,
            details: [] as any[]
        };

        await withActiveSession(sessionId, async (sock) => {
            for (const receiver of receivers) {
                const jid = toJid(receiver);
                try {
                    if (report.sent > 0 || report.failed > 0) {
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }

                    let content: any = {};
                    if (type === 'text' && message.text) {
                        content = { text: message.text };
                    } else if (type === 'image' && message.url) {
                        content = { image: { url: message.url }, caption: message.caption };
                    } else if (type === 'video' && message.url) {
                        content = { video: { url: message.url }, caption: message.caption };
                    } else {
                        throw new Error('Invalid content for bulk type');
                    }

                    // iOS FIX: Use retry-capable send method
                    await sessionManager.sendMessageWithRetry(sessionId, jid, content);
                    report.sent++;
                    report.details.push({ to: receiver, status: 'sent' });
                } catch (error: any) {
                    report.failed++;
                    report.details.push({ to: receiver, status: 'failed', error: error.message });
                }
            }
        });

        return { success: true, report };
    });

    fastifyZod.post('/download-media', {
        schema: { body: downloadMediaBodySchema }
    }, async (request, reply) => {
        const body = request.body as z.infer<typeof downloadMediaBodySchema>;
        const { message } = body;

        const sessionId = (body as any).sessionId;

        const stream = await withActiveSession(sessionId, async (sock) => {
            try {
                return await downloadMediaMessage(
                    message as unknown as WAMessage,
                    'stream',
                    {},
                    { logger: fastify.log, reuploadRequest: sock.updateMediaMessage }
                );
            } catch (error: any) {
                fastify.log.error(error, "Failed to download media");

                if (error.message?.includes('404') || error.message?.includes('410')) {
                    throw fastify.httpErrors.notFound("Media not found or expired on WhatsApp servers.");
                }
                throw fastify.httpErrors.internalServerError("Failed to decrypt or download media. Try re-sending.");
            }
        });

        reply.header('Content-Type', 'application/octet-stream');
        return reply.send(stream);
    });
}
