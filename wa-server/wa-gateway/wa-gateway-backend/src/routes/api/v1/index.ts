import { FastifyInstance } from 'fastify';
import sessionsRoutes from './sessions.routes';
import messageRoutes from './message.routes';
import groupRoutes from './group.routes';
import contactRoutes from './contact.routes';
import profileRoutes from './profile.routes';
import playgroundRoutes from './playground.routes';
import chatRoutes from './chat.routes';

export default async function v1Api(fastify: FastifyInstance) {
  fastify.register(sessionsRoutes, { prefix: '/sessions' });
  fastify.register(messageRoutes, { prefix: '/message' });
  fastify.register(groupRoutes, { prefix: '/group' });
  fastify.register(contactRoutes, { prefix: '/contact' });
  fastify.register(profileRoutes, { prefix: '/profile' });
  fastify.register(chatRoutes, { prefix: '/chat' });
  fastify.register(playgroundRoutes, { prefix: '/playground' });
}
