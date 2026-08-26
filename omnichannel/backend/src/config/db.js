
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reply_saas',
  max: 50, // Increased from 20 to 50 to handle webhook concurrency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increased from 10s to 30s to tolerate load spikes
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL Database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export { pool };
export default pool;
