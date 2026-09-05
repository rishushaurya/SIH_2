import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DEMO_MODE: z.string().default('true').transform((val) => val === 'true'),

  // Cryptography & JWT Keys
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters for security.'),
  ECDSA_KEY_ID: z.string().default('mahalink-consent-ca-2026'),

  // PostgreSQL (Revenue Department)
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.string().default('5432').transform((val) => parseInt(val, 10)),
  PG_USER: z.string().default('postgres'),
  PG_PASSWORD: z.string().default('postgres'),
  PG_DATABASE: z.string().default('maha_revenue'),

  // MySQL (RTO Transport Department)
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.string().default('3306').transform((val) => parseInt(val, 10)),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default('root'),
  MYSQL_DATABASE: z.string().default('maha_rto'),

  // MongoDB (Certificate Services)
  MONGO_URI: z.string().default('mongodb://localhost:27017/maha_certificates'),

  // Legacy CSV Flat-Files Directory
  CSV_DATA_DIR: z.string().default('./src/db/files'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type EnvConfig = z.infer<typeof envSchema>;
