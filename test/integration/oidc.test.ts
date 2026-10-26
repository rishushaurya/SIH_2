import crypto from 'crypto';
import http from 'http';
import { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { aadhaarCheckDigit, hashIdentity } from '../../src/services/auth/identity';
import { completeLogin } from '../../src/services/auth/oidc';

// Mock Meri Pehchaan provider on the port configured in vitest.config.ts: authorization code + PKCE + RS256 ID token.
const ISSUER = 'http://127.0.0.1:5911';
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const AADHAAR = `87654321098${aadhaarCheckDigit('87654321098')}`;
const codes = new Map<string, { challenge: string; nonce: string }>();

const idp = http.createServer((req, res) => {
  const url = new URL(req.url!, ISSUER);
  if (url.pathname === '/jwks') {
    res.end(JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'mp-1', alg: 'RS256', use: 'sig' }] }));
    return;
  }
  if (url.pathname === '/token') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const form = new URLSearchParams(body);
      const grant = codes.get(form.get('code')!);
      const verifierHash = crypto.createHash('sha256').update(form.get('code_verifier') || '').digest('base64url');
      if (!grant || grant.challenge !== verifierHash) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'invalid_grant' }));
        return;
      }
      codes.delete(form.get('code')!);
      const idToken = jwt.sign({ aadhaar: AADHAAR, name: 'Kavita Suresh More', nonce: grant.nonce }, privateKey, {
        algorithm: 'RS256',
        keyid: 'mp-1',
        issuer: ISSUER,
        audience: 'mahalink-test-client',
        subject: 'mp-user-42',
        expiresIn: 300,
      });
      res.end(JSON.stringify({ access_token: 'at', id_token: idToken, token_type: 'Bearer' }));
    });
    return;
  }
  res.statusCode = 404;
  res.end();
});

// Simulates the citizen approving at the provider: returns the code it would redirect back with.
function approve(authorizeUrl: string): { code: string; state: string } {
  const params = new URL(authorizeUrl).searchParams;
  expect(params.get('code_challenge_method')).toBe('S256');
  const code = crypto.randomBytes(8).toString('hex');
  codes.set(code, { challenge: params.get('code_challenge')!, nonce: params.get('nonce')! });
  return { code, state: params.get('state')! };
}

let app: http.Server;
let base: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => idp.listen(5911, '127.0.0.1', resolve));
  app = createApp().listen(0);
  await new Promise((resolve) => app.once('listening', resolve));
  base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
});
afterAll(() => {
  idp.close();
  app.close();
});

describe('Meri Pehchaan OAuth 2.0 + PKCE login', () => {
  it('redirects to the provider, exchanges the code with PKCE and starts a session', async () => {
    const start = await fetch(`${base}/api/v1/auth/oidc/start`, { redirect: 'manual' });
    expect(start.status).toBe(302);
    const { code, state } = approve(start.headers.get('location')!);

    const callback = await fetch(`${base}/api/v1/auth/oidc/callback?code=${code}&state=${state}`, { redirect: 'manual' });
    expect(callback.headers.get('location')).toBe('/');
    const cookie = callback.headers.getSetCookie()[0].split(';')[0];

    const session = await (await fetch(`${base}/api/v1/auth/session`, { headers: { Cookie: cookie } })).json();
    expect(session.user).toMatchObject({ full_name: 'Kavita Suresh More', role: 'CITIZEN', auth_provider: 'Meri Pehchaan (mock)' });
    expect(session.user.masked_id).toBe(`XXXX-XXXX-${AADHAAR.slice(-4)}`);
  });

  it('links the provider identity to department records through the same Aadhaar hash', async () => {
    const start = await fetch(`${base}/api/v1/auth/oidc/start`, { redirect: 'manual' });
    const { code, state } = approve(start.headers.get('location')!);
    const user = await completeLogin(code, state);
    expect(user.citizen_hash).toBe(hashIdentity(AADHAAR, 'aadhaar'));
  });

  it('rejects a replayed or forged state', async () => {
    const start = await fetch(`${base}/api/v1/auth/oidc/start`, { redirect: 'manual' });
    const { code, state } = approve(start.headers.get('location')!);
    await completeLogin(code, state);
    await expect(completeLogin(code, state)).rejects.toMatchObject({ code: 'OIDC_STATE_INVALID' });

    const failed = await fetch(`${base}/api/v1/auth/oidc/callback?code=x&state=forged`, { redirect: 'manual' });
    expect(failed.headers.get('location')).toBe('/?login_error=OIDC_STATE_INVALID');
    expect(failed.headers.getSetCookie()).toHaveLength(0);
  });
});
