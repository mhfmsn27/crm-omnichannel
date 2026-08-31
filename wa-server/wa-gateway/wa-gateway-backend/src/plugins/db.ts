import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import { config } from '../config';

async function dbConnector(fastify: FastifyInstance) {
  try {
    fastify.register(fastifyPostgres, {
      connectionString: config.DATABASE_URL,
    });

    fastify.ready(async () => {
        try {
            const client = await (fastify as any).pg.connect();
            try {
                // Ensure clients table exists
                await client.query(`
                    CREATE TABLE IF NOT EXISTS clients (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        webhook_url TEXT,
                        api_key VARCHAR(255) UNIQUE NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);

                // Ensure sessions table exists
                await client.query(`
                    CREATE TABLE IF NOT EXISTS sessions (
                        id VARCHAR(255) PRIMARY KEY,
                        client_id VARCHAR(255) NOT NULL,
                        name VARCHAR(255),
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `);
                
                // Then ensure column exists
                await client.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sync_full_history BOOLEAN DEFAULT FALSE;`);
                
                // Seed default CRMHUB API client
                const defaultKey = process.env.API_KEY || process.env.WA_GATEWAY_API_KEY || 'crmhub_wa_gateway_key_v2_9988';
                await client.query(`
                    INSERT INTO clients (name, webhook_url, api_key)
                    VALUES ('CRMHUB Main System', $1, $2)
                    ON CONFLICT (api_key) DO NOTHING;
                `, [process.env.CRMHUB_WEBHOOK_URL || null, defaultKey]);

                fastify.log.info('[Migration] clients and sessions tables ensured and seeded in DB');
            } catch(e: any) {
                fastify.log.error('[Migration] DB Init Failed: ' + e.message);
            } finally {
                client.release();
            }
        } catch (e: any) {
            fastify.log.error('[Migration] PG Connect failed: ' + e.message);
        }
    });
  } catch (err) {
    fastify.log.error(err, 'Failed to connect to the database.');
    (process as any).exit(1);
  }
}

export default fp(dbConnector);