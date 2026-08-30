import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Auto map PORT to SERVER_PORT if set
if (process.env.PORT && !process.env.SERVER_PORT) {
  process.env.SERVER_PORT = process.env.PORT;
}

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
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
  console.error('❌ FATAL: Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  (process as any).exit(1);
}

export const config = parsedEnv.data!;
