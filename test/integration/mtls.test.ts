import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readMtls, RemoteAdapter } from '../../src/adapters/remoteAdapter';
import { createApp } from '../../src/app';
import { createSecurityServer } from '../../src/securityServer';
import { ConsentManager } from '../../src/services/consent/consentManager';
import { getJourney } from '../../src/services/workflow/journeys';

const PRIYA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const RAJESH = '9f83c120a1098bcf98a729e1082cba983b749019283746192837461928374619';
// Certificates are generated with openssl through scripts/mtls-certs.sh; skip where those tools are absent.
const hasPki = spawnSync('openssl', ['version']).status === 0 && spawnSync('sh', ['-c', 'exit 0']).status === 0;

describe.skipIf(!hasPki)('Department Security Server: mutual TLS 1.3 + independent consent check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mahalink-mtls-'));
  const files = (name: string) => ({ key: path.join(dir, `${name}.key`), cert: path.join(dir, `${name}.crt`), ca: path.join(dir, 'ca.crt') });
  let gateway: Server;
  let securityServer: https.Server;
  let url: string;

  beforeAll(async () => {
    execFileSync('sh', ['scripts/mtls-certs.sh', dir]);
    gateway = createApp().listen(0);
    await new Promise((resolve) => gateway.once('listening', resolve));
    securityServer = createSecurityServer({
      department: 'revenue',
      jwksUrl: `http://127.0.0.1:${(gateway.address() as AddressInfo).port}/.well-known/jwks.json`,
      gatewayClientCn: 'mahalink-gateway',
      ...readMtls(files('revenue-security-server')),
    }).listen(0);
    await new Promise((resolve) => securityServer.once('listening', resolve));
    url = `https://localhost:${(securityServer.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    securityServer.close();
    gateway.close();
  });

  const remote = (clientCert: string) => new RemoteAdapter('revenue', 'Revenue', url, readMtls(files(clientCert)));
  const consentFor = (citizen: string, journey: string) => ConsentManager.grantConsent(citizen, getJourney(journey)!).token;

  it('releases the record to the gateway certificate with a consent that covers the department', async () => {
    const record = await remote('mahalink-gateway').queryCitizenRecord(PRIYA, consentFor(PRIYA, 'income_certificate'));
    expect(record?.data.survey_number).toBe('45/1A');
    expect(record?.verified_source).toContain('via mTLS security server');
    expect((await remote('mahalink-gateway').ping()).status).toBe('UP');
  });

  it('refuses a TLS connection without a client certificate', async () => {
    const attempt = new Promise((resolve, reject) => {
      const req = https.request(`${url}/health`, { ca: fs.readFileSync(files('ca').ca) }, resolve);
      req.on('error', reject);
      req.end();
    });
    await expect(attempt).rejects.toThrow();
  });

  it('refuses a certificate from the same CA that is not the gateway', async () => {
    await expect(remote('rto-security-server').queryCitizenRecord(PRIYA, consentFor(PRIYA, 'income_certificate'))).rejects.toThrow();
  });

  it('verifies consent itself: wrong department or wrong citizen is refused', async () => {
    // Scholarship consent covers education + certificates, not revenue.
    await expect(remote('mahalink-gateway').queryCitizenRecord(PRIYA, consentFor(PRIYA, 'scholarship_application'))).rejects.toThrow(/403/);
    // Priya's consent cannot release Rajesh's land record.
    await expect(remote('mahalink-gateway').queryCitizenRecord(RAJESH, consentFor(PRIYA, 'income_certificate'))).rejects.toThrow(/403/);
    // A forged token is refused.
    await expect(remote('mahalink-gateway').queryCitizenRecord(PRIYA, 'eyJhbGciOiJFUzI1NiJ9.e30.AAAA')).rejects.toThrow(/403/);
  });
});
