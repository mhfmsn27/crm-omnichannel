import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { AuthService } from '../../services/auth.service';
import { loginBodySchema } from '../../utils/validation';

export default async function authRoutes(fastify: FastifyInstance) {
  const fastifyZod = fastify.withTypeProvider<ZodTypeProvider>();
  const authService = new AuthService(fastify);

  fastifyZod.post('/login', { schema: { body: loginBodySchema } }, async (request, reply) => {
    try {
      const result = await authService.loginAdmin(request.body);
      return reply.send(result);
    } catch (error) {
        throw error;
    }
  });
}
