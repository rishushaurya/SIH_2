import { createApp } from './app';
import { env, oidcEnabled } from './config/env';
import { log } from './gateway/logger';
import { auditLedger } from './services/audit/hashChain';
import { ConsentManager } from './services/consent/consentManager';
import { startLiveListener } from './services/ingest/liveListener';

// Tamper detection on startup: refuse to run on a broken audit chain (fail closed).
const chain = auditLedger.verifyChainIntegrity();
if (!chain.isValid) {
  log('ERROR', 'AUDIT LEDGER INTEGRITY FAILURE — refusing to start', { message: chain.message });
  process.exit(1);
}
ConsentManager.restore(auditLedger.allBlocks());

if (env.NODE_ENV === 'production' && env.DEMO_MODE) {
  log('WARN', 'DEMO_MODE=true in production: demo personas and fixture fallback are enabled. Set DEMO_MODE=false for a real deployment.');
}

const server = createApp().listen(env.PORT, () => {
  log('INFO', 'MahaLink gateway started', {
    port: env.PORT,
    environment: env.NODE_ENV,
    mode: env.DEMO_MODE ? 'demo' : 'live',
    meri_pehchaan_oidc: oidcEnabled ? 'enabled' : 'not configured',
    audit_blocks_verified: chain.totalBlocks,
  });
  void startLiveListener();
});

const handleShutdown = (signal: string) => {
  log('INFO', `Received ${signal}. Shutting down gracefully.`);
  server.close(() => process.exit(0));
  // Force shutdown if open SSE connections keep the server alive
  setTimeout(() => process.exit(0), 3000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
