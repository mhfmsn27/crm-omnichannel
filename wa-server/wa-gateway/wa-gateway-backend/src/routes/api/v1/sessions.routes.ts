import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as sessionService from '../../../services/session.service';
import { SessionManager } from '../../../services/sessionManager';
import { z } from 'zod';
import '@fastify/postgres';
import '@fastify/sensible';
import { createSessionBodySchema, sessionIdParamsSchema, refreshContactBodySchema } from '../../../utils/validation';

export default async function sessionsRoutes(fastify: FastifyInstance) {
  const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
  const sessionManager = SessionManager.getInstance(fastify);

  fastifyZod.post('/', { schema: { body: createSessionBodySchema } }, async (request, reply) => {
    const clientId = request.client.id;
    const body = request.body as z.infer<typeof createSessionBodySchema>;
    const { name, syncFullHistory } = body;
    const dbClient = await (fastify as any).pg.connect();
    try {
      const newSession = await sessionService.createSession(dbClient, clientId, name, syncFullHistory);
      return reply.code(201).send(newSession);
    } finally {
      dbClient.release();
    }
  });

  fastifyZod.get('/:sessionId/status', { schema: { params: sessionIdParamsSchema } }, async (request, reply) => {
    const params = request.params as z.infer<typeof sessionIdParamsSchema>;
    const { sessionId } = params;
    const clientId = request.client.id;
    // FIX: Cast fastify to any to access pg
    const dbClient = await (fastify as any).pg.connect();
    try {
      const hasOwnership = await sessionService.verifySessionOwnership(dbClient, clientId, sessionId);
      if (!hasOwnership) throw fastify.httpErrors.forbidden('You do not own this session.');

      return sessionManager.getSessionStatus(sessionId);
    } finally {
      dbClient.release();
    }
  });

  fastify.get('/', async (request, reply) => {
    const clientId = request.client.id;
    // FIX: Cast fastify to any to access pg
    const dbClient = await (fastify as any).pg.connect();
    try {
      const sessions = await sessionService.getSessionsByClientId(dbClient, clientId);
      return reply.send(sessions);
    } finally {
      dbClient.release();
    }
  });

  fastifyZod.post('/:sessionId/start', { schema: { params: sessionIdParamsSchema } }, async (request, reply) => {
    const params = request.params as z.infer<typeof sessionIdParamsSchema>;
    const { sessionId } = params;
    const clientId = request.client.id;
    // FIX: Cast fastify to any to access pg
    const dbClient = await (fastify as any).pg.connect();
    let hasOwnership = false;
    try {
      hasOwnership = await sessionService.verifySessionOwnership(dbClient, clientId, sessionId);
    } finally {
      dbClient.release();
    }
    
    if (!hasOwnership) throw fastify.httpErrors.forbidden('You do not own this session.');

    fastify.log.info(`[START-REQ/${sessionId}] Starting session request...`);

    // Start session and WAIT for it to complete (not just fire and forget)
    const startResult = await sessionManager.startSession(sessionId, clientId);
    fastify.log.info(`[START-INITIAL/${sessionId}] Initial result: ${startResult.status}`);

    // Now poll for status updates (QR or CONNECTED)
    const maxWait = 30;
    const checkInterval = 500; // ms
    const maxAttempts = maxWait / (checkInterval / 1000);

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      const status = sessionManager.getSessionStatus(sessionId);

      fastify.log.debug(`[START-POLL/${sessionId}] Attempt ${i+1}/${maxAttempts}: status=${status.status}, hasQR=${!!status.qr}`);

      if (status.status === 'CONNECTED') {
        fastify.log.info(`[START-SUCCESS/${sessionId}] Session connected!`);
        return status;
      }

      if (status.status === 'NEED_QR' && status.qr) {
        fastify.log.info(`[START-QR/${sessionId}] QR code ready, returning to client`);
        return status;
      }

      // If disconnected or other error, return current status
      if (status.status === 'DISCONNECTED') {
        fastify.log.warn(`[START-FAIL/${sessionId}] Session disconnected during start`);
        return status;
      }
    }

    // Timeout - return whatever status we have
    const finalStatus = sessionManager.getSessionStatus(sessionId);
    fastify.log.warn(`[START-TIMEOUT/${sessionId}] Timeout reached, returning: ${finalStatus.status}`);
    return finalStatus;
  });

  fastifyZod.delete('/:sessionId', { schema: { params: sessionIdParamsSchema } }, async (request, reply) => {
    const params = request.params as z.infer<typeof sessionIdParamsSchema>;
    const { sessionId } = params;
    const clientId = request.client.id;
    // FIX: Cast fastify to any to access pg
    const dbClient = await (fastify as any).pg.connect();
    try {
      await sessionManager.stopSession(sessionId);
      const result = await sessionService.deleteSession(dbClient, clientId, sessionId);
      if (!result) throw fastify.httpErrors.notFound('Session not found or not owned by you.');
      return reply.code(204).send();
    } finally {
      dbClient.release();
    }
  });

  // ============================================
  // iOS FIX: Refresh Contact Session
  // ============================================

  /**
   * Refresh session with a specific contact to fix "waiting for this message" issues
   *
   * When a user (especially iOS) sees "waiting for this message",
   * use this endpoint to re-establish the encryption session.
   *
   * Example 1 (phone number - recommended for users):
   * POST /api/v1/sessions/:sessionId/refresh-contact
   * Body: { "phone": "628123456789" }
   *
   * Example 2 (full JID):
   * POST /api/v1/sessions/:sessionId/refresh-contact
   * Body: { "jid": "628123456789@s.whatsapp.net" }
   */
  fastifyZod.post('/:sessionId/refresh-contact', {
    schema: {
      params: sessionIdParamsSchema,
      body: refreshContactBodySchema
    }
  }, async (request, reply) => {
    const params = request.params as z.infer<typeof sessionIdParamsSchema>;
    const { sessionId } = params;
    const body = request.body as z.infer<typeof refreshContactBodySchema>;
    const clientId = request.client.id;

    // Verify ownership
    const dbClient = await (fastify as any).pg.connect();
    try {
      const hasOwnership = await sessionService.verifySessionOwnership(dbClient, clientId, sessionId);
      if (!hasOwnership) throw fastify.httpErrors.forbidden('You do not own this session.');

      // Get session status
      const status = sessionManager.getSessionStatus(sessionId);
      if (status.status !== 'CONNECTED') {
        throw fastify.httpErrors.conflict(`Session ${sessionId} is not connected. Current status: ${status.status}`);
      }

      // Convert phone to JID if provided
      let targetJid = body.jid;
      if (body.phone && !targetJid) {
        // Clean phone number - remove any non-digit except leading +
        const cleanPhone = body.phone.replace(/[^\d+]/g, '');
        // Convert to JID format
        targetJid = cleanPhone.replace(/^(\+?62)/, '62') + '@s.whatsapp.net';
      }

      if (!targetJid) {
        throw fastify.httpErrors.badRequest('Either phone or jid is required');
      }

      // Normalize JID
      if (!targetJid.includes('@')) {
        targetJid = targetJid + '@s.whatsapp.net';
      }

      // Perform the refresh
      const success = await sessionManager.forceRefreshContactSession(sessionId, targetJid);

      return {
        success: true,
        message: success
          ? `Session refreshed successfully for ${targetJid}. Try sending a message again.`
          : `Session refresh attempted for ${targetJid}. The contact may still have issues.`,
        contact: {
          jid: targetJid,
          displayId: targetJid.split('@')[0], // Phone number for display
        }
      };
    } finally {
      dbClient.release();
    }
  });
}
