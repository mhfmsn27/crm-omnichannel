import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load from potential .env locations (local dir, cwd, or parent directories)
const envLocations = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env')
];

for (const loc of envLocations) {
  if (fs.existsSync(loc)) {
    dotenv.config({ path: loc });
    break;
  }
}
dotenv.config();

// Auto map PORT to SERVER_PORT if set
if (process.env.PORT && !process.env.SERVER_PORT) {
  process.env.SERVER_PORT = process.env.PORT;
}

// Auto construct DATABASE_URL if individual DB vars are provided
if ((!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') && process.env.DB_NAME) {
  const user = process.env.DB_USER || 'postgres';
  const pass = process.env.DB_PASSWORD ? `:${encodeURIComponent(process.env.DB_PASSWORD)}` : '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_NAME;
  process.env.DATABASE_URL = `postgresql://${user}${pass}@${host}:${port}/${db}`;
}

// Fallback for JWT_SECRET if empty string
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '' || process.env.JWT_SECRET.length < 16) {
  process.env.JWT_SECRET = 'crmhub_wa_gateway_super_secure_jwt_secret_2026_key!';
}

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid postgresql:// connection string'),
  JWT_SECRET: z.string().min(16).default('crmhub_wa_gateway_super_secure_jwt_secret_2026_key!'),
  SERVER_PORT: z.coerce.number().int().positive().default(8001),

  // Single-tenant / CRMHUB integration: webhook is delivered here instead of per-client DB lookup
  CRMHUB_WEBHOOK_URL: z.string().url().optional(),

  PROXY_ENABLED: z.string().transform(v => v === 'true').optional(),
  PROXY_HOST: z.string().optional(),
  PROXY_PORT: z.coerce.number().optional(),
  PROXY_USERNAME: z.string().optional(),
  PROXY_PASSWORD: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ FATAL: Invalid environment variables in WA Gateway Backend:');
  console.error(JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2));
  console.error('\n👉 Please configure DATABASE_URL in your .env file (e.g. postgresql://user:password@localhost:5432/dbname)\n');
  (process as any).exit(1);
}

export const config = parsedEnv.data!;

