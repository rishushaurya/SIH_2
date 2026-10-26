import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const bool = (fallback: 'true' | 'false') => z.enum(['true', 'false']).default(fallback).transform((v) => v === 'true');
const int = (fallback: string) => z.string().default(fallback).transform((v) => parseInt(v, 10));
const list = (fallback: string) =>
  z.string().default(fallback).transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

// Values that ship in .env.example or as dev defaults; production must replace them.
const DEV_PEPPER = 'dev-only-aadhaar-pepper-replace-in-production';
const KNOWN_PLACEHOLDERS = new Set([DEV_PEPPER, 'mahalink_jwt_master_secret_2026_government_of_maharashtra_key']);

const envSchema = z
  .object({
    PORT: int('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DEMO_MODE: bool('true'),
    // Number of reverse-proxy hops to trust for client IPs (1 behind nginx / a load balancer).
    TRUST_PROXY: int('0'),
    CORS_ORIGINS: list('http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173'),

    // Secrets
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters. Run: npm run env:init'),
    AADHAAR_PEPPER: z.string().min(32).default(DEV_PEPPER),

    // Persistent state ('' keeps it in memory only, used by tests)
    AUDIT_LOG_PATH: z.string().default('./data/audit-ledger.jsonl'),
    CONSENT_KEY_FILE: z.string().default('./data/consent-signing-key.pem'),

    // Meri Pehchaan / DigiLocker (OAuth 2.0 + PKCE). Any OIDC provider works, e.g. Keycloak for local tests.
    OIDC_PROVIDER_NAME: z.string().default('Meri Pehchaan'),
    OIDC_ISSUER: z.string().default(''),
    OIDC_AUTHORIZE_URL: z.string().default(''),
    OIDC_TOKEN_URL: z.string().default(''),
    OIDC_JWKS_URL: z.string().default(''),
    OIDC_USERINFO_URL: z.string().default(''),
    OIDC_CLIENT_ID: z.string().default(''),
    OIDC_CLIENT_SECRET: z.string().default(''),
    OIDC_REDIRECT_URI: z.string().default(''),
    OIDC_SCOPE: z.string().default('openid'),
    OIDC_ID_CLAIM: z.string().default('sub'),
    OIDC_NAME_CLAIM: z.string().default('name'),
    // OIDC subjects (value of OIDC_ID_CLAIM) that get the SYS_ADMIN role
    ADMIN_SUBJECTS: list(''),

    // PostgreSQL (Revenue Department) — adapter credentials should be a SELECT-only role
    PG_HOST: z.string().default('localhost'),
    PG_PORT: int('5432'),
    PG_USER: z.string().default('postgres'),
    PG_PASSWORD: z.string().default('postgres'),
    PG_DATABASE: z.string().default('maha_revenue'),
    PG_SSL: bool('false'),

    // MySQL (RTO Transport Department)
    MYSQL_HOST: z.string().default('localhost'),
    MYSQL_PORT: int('3306'),
    MYSQL_USER: z.string().default('root'),
    MYSQL_PASSWORD: z.string().default('root'),
    MYSQL_DATABASE: z.string().default('maha_rto'),
    MYSQL_SSL: bool('false'),

    // MongoDB (Certificate Services); enable TLS with ?tls=true in the URI
    MONGO_URI: z.string().default('mongodb://localhost:27017/maha_certificates'),

    // Seeder-only admin credentials. When set, the seeder also creates the read-only adapter accounts.
    PG_ADMIN_USER: z.string().default(''),
    PG_ADMIN_PASSWORD: z.string().default(''),
    MYSQL_ADMIN_USER: z.string().default(''),
    MYSQL_ADMIN_PASSWORD: z.string().default(''),
    MONGO_ADMIN_URI: z.string().default(''),

    // Legacy CSV flat-file directory (every *.csv inside is read)
    CSV_DATA_DIR: z.string().default('./src/db/files'),

    // Department Security Server mode (X-Road pattern, mutual TLS 1.3). Gateway side: which departments are
    // remote, e.g. "revenue=https://revenue-security-server:8443". Each process uses its own MTLS_* files.
    REMOTE_ADAPTERS: list(''),
    MTLS_CERT_FILE: z.string().default('./certs/mtls/mahalink-gateway.crt'),
    MTLS_KEY_FILE: z.string().default('./certs/mtls/mahalink-gateway.key'),
    MTLS_CA_FILE: z.string().default('./certs/mtls/ca.crt'),
    // Security-server side
    SECURITY_SERVER_DEPARTMENT: z.string().default(''),
    SECURITY_SERVER_PORT: int('8443'),
    CONSENT_JWKS_URL: z.string().default('http://localhost:5000/.well-known/jwks.json'),
    GATEWAY_CLIENT_CN: z.string().default('mahalink-gateway'),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV !== 'production') return;
    for (const key of ['JWT_SECRET', 'AADHAAR_PEPPER'] as const) {
      if (KNOWN_PLACEHOLDERS.has(e[key])) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} uses a public placeholder; run npm run env:init -- --force` });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('CRITICAL: Environment variable validation failed:');
  console.error(z.prettifyError(parsedEnv.error));
  process.exit(1);
}

export const env = parsedEnv.data;
export type EnvConfig = z.infer<typeof envSchema>;

export const oidcEnabled = Boolean(
  env.OIDC_AUTHORIZE_URL && env.OIDC_TOKEN_URL && env.OIDC_CLIENT_ID && env.OIDC_REDIRECT_URI && env.OIDC_ISSUER &&
    (env.OIDC_JWKS_URL || env.OIDC_USERINFO_URL)
);

export const pgConfig = {
  host: env.PG_HOST,
  port: env.PG_PORT,
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE,
  ssl: env.PG_SSL ? { rejectUnauthorized: true } : undefined,
  connectionTimeoutMillis: 2000,
};

export const mysqlConfig = {
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  ssl: env.MYSQL_SSL ? { rejectUnauthorized: true } : undefined,
  connectTimeout: 2000,
  dateStrings: true,
};
