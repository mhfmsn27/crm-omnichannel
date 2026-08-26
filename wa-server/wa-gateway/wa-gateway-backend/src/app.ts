import Fastify, { FastifyInstance } from 'fastify';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import sensible, { HttpErrors } from '@fastify/sensible';
import { JWT } from '@fastify/jwt';
import { PostgresDb } from '@fastify/postgres';
import '@fastify/postgres';
import '@fastify/jwt';
import '@fastify/sensible';

// Plugins
import dbPlugin from './plugins/db';
import jwtPlugin from './plugins/jwt';
import authPlugin from './plugins/auth';
import sessionAuthPlugin from './plugins/sessionAuth';

// Rute
import adminRoutes from './routes/admin';
import v1ApiRoutes from './routes/api/v1';

export default async function buildApp() {
    const app = Fastify({
        logger: {
            transport: process.env.NODE_ENV !== 'production'
                ? { target: 'pino-pretty' }
                : undefined,
        },
    }).withTypeProvider<ZodTypeProvider>();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // 1. Daftarkan semua plugin inti
    await app.register(sensible);
    await app.register(dbPlugin);
    await app.register(jwtPlugin);
    await app.register(authPlugin);
    await app.register(sessionAuthPlugin);
    
    // 2. Daftarkan grup rute utama
    
    // FIX: Ubah prefix admin menjadi /api/v1/admin agar sesuai dengan konfigurasi
    // baseURL frontend (NEXT_PUBLIC_API_URL) yang mengarah ke /api/v1
    await app.register(adminRoutes, { prefix: '/api/v1/admin' });
    
    // Daftarkan SEMUA rute API v1 (SaaS Client) di bawah plugin terenkapsulasi
    // yang menerapkan hook otentikasi klien (API Key)
    await app.register(async (apiInstance) => {
        apiInstance.addHook('onRequest', apiInstance.authenticateClient);
        apiInstance.register(v1ApiRoutes, { prefix: '/v1' });
    }, { prefix: '/api' });


    // Endpoint health check
    app.get('/health', async (request, reply) => {
        try {
            // FIX: Cast app to any to access pg property
            await (app as any).pg.query('SELECT 1');
            return reply.code(200).send({ status: 'ok', uptime: (process as any).uptime() });
        } catch (error: any) {
            request.log.error(error, 'Health check failed');
            return reply.code(503).send({ status: 'error', checks: { database: error.message } });
        }
    });

    app.log.info('Application plugins and routes registered.');

    return app;
};
