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
                // Ensure table exists first
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
                
                fastify.log.info('[Migration] sessions table and sync_full_history column ensured in DB');
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