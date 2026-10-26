import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Deterministic, isolated environment: in-memory ledger and keys, unreachable databases (demo fixtures),
    // and a mock Meri Pehchaan provider started by test/integration/oidc.test.ts.
    env: {
      NODE_ENV: 'test',
      DEMO_MODE: 'true',
      JWT_SECRET: 'test-only-jwt-secret-0123456789abcdef0123456789',
      AADHAAR_PEPPER: 'test-only-aadhaar-pepper-0123456789abcdef012345',
      AUDIT_LOG_PATH: '',
      CONSENT_KEY_FILE: '',
      PG_PORT: '1',
      MYSQL_PORT: '1',
      MONGO_URI: 'mongodb://127.0.0.1:1/maha_certificates',
      CSV_DATA_DIR: './src/db/files',
      OIDC_PROVIDER_NAME: 'Meri Pehchaan (mock)',
      OIDC_ISSUER: 'http://127.0.0.1:5911',
      OIDC_AUTHORIZE_URL: 'http://127.0.0.1:5911/authorize',
      OIDC_TOKEN_URL: 'http://127.0.0.1:5911/token',
      OIDC_JWKS_URL: 'http://127.0.0.1:5911/jwks',
      OIDC_CLIENT_ID: 'mahalink-test-client',
      OIDC_REDIRECT_URI: 'http://localhost:5000/api/v1/auth/oidc/callback',
      OIDC_ID_CLAIM: 'aadhaar',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/db/**', 'src/index.ts'],
    },
  },
});
