import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import * as clientService from '../../services/client.service';
import { z } from 'zod';
import '@fastify/postgres';
import '@fastify/sensible';
 
const clientParamsSchema = z.object({
    id: z.string().uuid('Invalid client ID format'),
});

const createClientBodySchema = z.object({
    name: z.string().min(1),
    webhook_url: z.string().url().or(z.literal('')).optional().nullable(),
});

const updateClientBodySchema = z.object({
    name: z.string().min(1).optional(),
    webhook_url: z.string().url().or(z.literal('')).optional().nullable(),
});

export default async function clientRoutes(fastify: FastifyInstance) {
  fastify.log.info('Client routes plugin loaded'); // Debug log
  const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();

  // Handler untuk GET /admin/clients
  fastify.get('/', async (request, reply) => {
    // FIX: Cast fastify to any to access pg
    const dbClient = await (fastify as any).pg.connect();
    try {
      const clients = await clientService.getClients(dbClient);
      return reply.send(clients);
    } catch (err) {
      request.log.error(err, 'Failed to get clients');
      throw fastify.httpErrors.internalServerError('Error fetching clients');
    } finally {
      dbClient.release();
    }
  });

  // Handler untuk POST /admin/clients
  fastifyZod.post('/', { schema: { body: createClientBodySchema } }, async (request, reply) => {
    const dbClient = await (fastify as any).pg.connect();
    try {
      const body = request.body as z.infer<typeof createClientBodySchema>;
      const newClient = await clientService.createClient(dbClient, body);
      return reply.code(201).send(newClient);
    } catch (err) {
      request.log.error(err, 'Failed to create client');
      throw fastify.httpErrors.internalServerError('Error creating client');
    } finally {
      dbClient.release();
    }
  });

  // Handler untuk PUT /admin/clients/:id
  fastifyZod.put('/:id', { schema: { params: clientParamsSchema, body: updateClientBodySchema } }, async (request, reply) => {
    const dbClient = await (fastify as any).pg.connect();
    try {
      const params = request.params as z.infer<typeof clientParamsSchema>;
      const body = request.body as z.infer<typeof updateClientBodySchema>;

      const updatedClient = await clientService.updateClient(dbClient, params.id, body);
      if (!updatedClient) {
        return reply.code(404).send({ message: 'Client not found' });
      }
      return reply.send(updatedClient);
    } catch (err) {
        request.log.error(err, 'Failed to update client');
        throw fastify.httpErrors.internalServerError('Error updating client');
    } finally {
      dbClient.release();
    }
  });

  // Handler untuk DELETE /admin/clients/:id
  fastifyZod.delete('/:id', { schema: { params: clientParamsSchema } }, async (request, reply) => {
    const dbClient = await (fastify as any).pg.connect();
    try {
      const params = request.params as z.infer<typeof clientParamsSchema>;
      const result = await clientService.deleteClient(dbClient, params.id);
      if (!result) {
        return reply.code(404).send({ message: 'Client not found' });
      }
      return reply.code(204).send();
    } catch (err) {
        request.log.error(err, 'Failed to delete client');
        throw fastify.httpErrors.internalServerError('Error deleting client');
    } finally {
      dbClient.release();
    }
  });
}
