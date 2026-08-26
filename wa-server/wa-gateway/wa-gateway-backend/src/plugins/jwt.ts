import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt, { JWT } from '@fastify/jwt';
import { config } from '../config';

async function jwtPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: '7d',
    },
  });
}

export default fp(jwtPlugin);