import crypto from 'crypto';
import { AddressInfo } from 'net';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import router from '../../src/gateway/routes';
import { aadhaarCheckDigit } from '../../src/services/auth/identity';

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const call = (path: string, init: RequestInit & { cookie?: string } = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(init.cookie ? { Cookie: init.cookie } : {}), ...(init.headers as object) },
  });

async function login(body: Record<string, string>): Promise<string> {
  const res = await call('/api/v1/auth/sso/login', { method: 'POST', body: JSON.stringify(body) });
  expect(res.status).toBe(200);
  return res.headers.getSetCookie()[0].split(';')[0];
}

describe('HTTP API security controls', () => {
  it('sends the documented security headers', async () => {
    const res = await call('/health');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('strict-transport-security')).toContain('max-age=63072000');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('never exposes raw Aadhaar numbers or hashes in the persona list', async () => {
    const body = await (await call('/api/v1/auth/personas')).text();
    expect(body).not.toMatch(/[a-f0-9]{64}/);
    expect(body).not.toMatch(/\d{4}-\d{4}-\d{4}/);
    expect(body).toContain('XXXX-XXXX-');
  });

  it('issues an HttpOnly SameSite=Strict session cookie (no token in the body)', async () => {
    const res = await call('/api/v1/auth/sso/login', { method: 'POST', body: JSON.stringify({ persona_id: 'P-01' }) });
    const cookie = res.headers.getSetCookie()[0];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(JSON.stringify(await res.json())).not.toContain('eyJ');
  });

  it('rejects malformed Aadhaar numbers and never lets a custom login self-assign a role', async () => {
    const bad = await call('/api/v1/auth/sso/login', { method: 'POST', body: JSON.stringify({ full_name: 'Test User', aadhaar: '123412341234' }) });
    expect(bad.status).toBe(400);

    const aadhaar = `98765432101${aadhaarCheckDigit('98765432101')}`;
    const cookie = await login({ full_name: 'Test User', aadhaar, role: 'SYS_ADMIN' } as any);
    const session = await (await call('/api/v1/auth/session', { cookie })).json();
    expect(session.user.role).toBe('CITIZEN');
  });

  it('requires authentication for APIs and the live event stream', async () => {
    expect((await call('/api/v1/workflows')).status).toBe(401);
    expect((await call('/api/v1/events/stream')).status).toBe(401);
    expect((await call('/api/v1/workflows', { cookie: 'mahalink_session=forged.token.value' })).status).toBe(401);
  });

  it('enforces the RBAC matrix on the audit ledger', async () => {
    const citizen = await login({ persona_id: 'P-01' });
    expect((await call('/api/v1/audit/ledger', { cookie: citizen })).status).toBe(403);
    expect((await call('/api/v1/audit/export', { cookie: citizen })).status).toBe(403);

    const admin = await login({ persona_id: 'ADMIN-01' });
    expect((await call('/api/v1/audit/ledger', { cookie: admin })).status).toBe(200);
    expect((await call('/api/v1/consent/grant', { method: 'POST', cookie: admin, body: JSON.stringify({ journey_id: 'income_certificate' }) })).status).toBe(403);
  });

  it('rejects cross-origin state-changing requests (CSRF)', async () => {
    const cookie = await login({ persona_id: 'P-01' });
    const res = await call('/api/v1/consent/grant', {
      method: 'POST',
      cookie,
      headers: { Origin: 'https://evil.example' },
      body: JSON.stringify({ journey_id: 'income_certificate' }),
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('CSRF_ORIGIN_REJECTED');
  });

  it('runs the full citizen flow: consent -> auto-fill -> submit -> receipt proof -> access passbook', async () => {
    const cookie = await login({ persona_id: 'P-01' });

    // Client-supplied scope is ignored; only the journey decides.
    const grant = await (
      await call('/api/v1/consent/grant', {
        method: 'POST',
        cookie,
        body: JSON.stringify({ journey_id: 'income_certificate', departments: ['education'], scope: ['*'] }),
      })
    ).json();
    expect(grant.record.departments).toEqual(['revenue', 'rto', 'certificates']);

    // A department verifies the artifact on its own with the published key.
    const { keys } = await (await call('/.well-known/jwks.json')).json();
    const key = crypto.createPublicKey({ key: keys[0], format: 'jwk' });
    expect(() => jwt.verify(grant.consent_token, key, { algorithms: ['ES256'] })).not.toThrow();

    const exec = await call('/api/v1/workflows/income_certificate/execute', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ consent_token: grant.consent_token }),
    });
    expect(exec.status).toBe(200);
    expect(exec.headers.get('cache-control')).toBe('no-store');
    const { result } = await exec.json();
    expect(result.form_values.land_survey_number).toBe('45/1A');

    const unknownField = await call('/api/v1/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ journey_id: 'income_certificate', consent_jti: grant.consent_jti, form_values: { is_admin: 'yes' } }),
    });
    expect(unknownField.status).toBe(400);

    const submit = await call('/api/v1/applications', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ journey_id: 'income_certificate', consent_jti: grant.consent_jti, form_values: result.form_values }),
    });
    expect(submit.status).toBe(201);
    const receipt = await submit.json();
    expect(receipt.reference).toMatch(/^MH-INC-\d{4}-\d{6}$/);

    const proof = await (await call(`/api/v1/audit/proof/${receipt.audit_block.block_hash}`, { cookie })).json();
    expect(proof).toMatchObject({ found: true, chain_intact: true, block: { action: 'FORM_SUBMIT' } });

    const passbook = await (await call('/api/v1/audit/me', { cookie })).json();
    const actions = passbook.entries.map((e: any) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['CONSENT_GRANT', 'DATA_FETCH', 'WORKFLOW_EXECUTE', 'FORM_SUBMIT']));
    expect(JSON.stringify(passbook)).not.toContain('actor_id');

    // A Revenue desk officer sees Revenue entries only; this flow also touched RTO and Certificates.
    const deptAdmin = await login({ persona_id: 'DEPT-01' });
    const scoped = await (await call('/api/v1/audit/ledger', { cookie: deptAdmin })).json();
    expect(scoped.scope).toBe('department:revenue');
    expect(scoped.blocks.some((b: any) => b.department === 'revenue')).toBe(true);
    expect(scoped.blocks.some((b: any) => b.department === 'rto' || b.department === 'certificates')).toBe(false);
  });

  it('does not let one citizen use or revoke another citizen\'s consent', async () => {
    const priya = await login({ persona_id: 'P-01' });
    const rajesh = await login({ persona_id: 'P-02' });
    const grant = await (await call('/api/v1/consent/grant', { method: 'POST', cookie: priya, body: JSON.stringify({ journey_id: 'income_certificate' }) })).json();

    const stolen = await call('/api/v1/workflows/income_certificate/execute', {
      method: 'POST',
      cookie: rajesh,
      body: JSON.stringify({ consent_token: grant.consent_token }),
    });
    expect(stolen.status).toBe(403);
    expect((await call(`/api/v1/consent/revoke/${encodeURIComponent(grant.consent_jti)}`, { method: 'POST', cookie: rajesh })).status).toBe(403);
  });

  it('stops data access immediately after revocation', async () => {
    const cookie = await login({ persona_id: 'P-01' });
    const grant = await (await call('/api/v1/consent/grant', { method: 'POST', cookie, body: JSON.stringify({ journey_id: 'driving_license' }) })).json();
    const revoke = await call(`/api/v1/consent/revoke/${encodeURIComponent(grant.consent_jti)}`, { method: 'POST', cookie });
    expect(revoke.status).toBe(200);
    const exec = await call('/api/v1/workflows/driving_license/execute', {
      method: 'POST',
      cookie,
      body: JSON.stringify({ consent_token: grant.consent_token }),
    });
    expect(exec.status).toBe(403);
    expect((await exec.json()).message).toContain('REVOKED');
  });

  it('documents every route in the OpenAPI description (API Setu listing)', async () => {
    const spec = await (await call('/openapi.json')).json();
    const documented = Object.entries(spec.paths).flatMap(([p, ops]) => Object.keys(ops as object).map((m) => `${m.toUpperCase()} ${p}`));
    const implemented = (router as any).stack
      .filter((layer: any) => layer.route)
      .flatMap((layer: any) => Object.keys(layer.route.methods).map((m) => `${m.toUpperCase()} ${layer.route.path.replace(/:(\w+)/g, '{$1}')}`));
    expect(documented.sort()).toEqual(implemented.sort());
  });

  it('invalidates the session on logout', async () => {
    const cookie = await login({ persona_id: 'P-03' });
    expect((await call('/api/v1/auth/logout', { method: 'POST', cookie })).status).toBe(200);
    expect((await call('/api/v1/auth/session', { cookie })).status).toBe(401);
  });
});
