import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticateAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateClient: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifySession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    client: {
      id: string;
      name: string;
      webhook_url: string | null;
      api_key: string;
    };
  }
}
