import { departmentAdapters } from '../src/adapters/registry';
import { env, oidcEnabled } from '../src/config/env';
import { auditLedger } from '../src/services/audit/hashChain';
import { ConsentCryptoSigner } from '../src/services/consent/cryptoSigner';
import { listJourneys } from '../src/services/workflow/journeys';

// Pre-demo / pre-deploy self-test: configuration, ledger integrity, keys and every department connection.
async function main() {
  const rows: Array<[string, boolean, string]> = [];
  const chain = auditLedger.verifyChainIntegrity();
  const journeys = listJourneys().map((j) => j.id);

  rows.push(['Node.js runtime (>= 20)', Number(process.versions.node.split('.')[0]) >= 20, process.version]);
  rows.push(['Environment (.env, Zod-validated)', true, `${env.NODE_ENV}, ${env.DEMO_MODE ? 'DEMO' : 'LIVE'} mode`]);
  rows.push(['Audit ledger integrity', chain.isValid, `${chain.message} [${env.AUDIT_LOG_PATH || 'in-memory'}]`]);
  rows.push(['Consent signing key (ES256)', true, `kid ${ConsentCryptoSigner.getKeyId().slice(0, 16)}… [${env.CONSENT_KEY_FILE || 'ephemeral'}]`]);
  rows.push(['Journey configurations', journeys.length > 0, journeys.join(', ')]);
  rows.push(['Meri Pehchaan OIDC', true, oidcEnabled ? `configured (${env.OIDC_AUTHORIZE_URL})` : 'not configured: demo login only']);

  const adapters = [
    ['Revenue (PostgreSQL)', departmentAdapters.revenue],
    ['RTO (MySQL)', departmentAdapters.rto],
    ['Certificates (MongoDB)', departmentAdapters.certificates],
    ['Education (legacy CSV)', departmentAdapters.education],
  ] as const;
  for (const [name, adapter] of adapters) {
    const health = await adapter.ping();
    rows.push([name, health.status === 'UP', `${health.status}, source=${health.source}${health.via ? ` via ${health.via}` : ''}, ${health.latency_ms} ms`]);
  }

  for (const [name, ok, detail] of rows) console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name.padEnd(36)} ${detail}`);
  const failed = rows.filter(([, ok]) => !ok).length;
  console.log(`\n${rows.length - failed}/${rows.length} checks passed.`);
  process.exit(failed ? 1 : 0);
}

main();
