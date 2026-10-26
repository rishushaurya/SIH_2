import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import jwt from 'jsonwebtoken';
import { TLSSocket } from 'tls';
import { localAdapters } from './adapters/registry';
import { readMtls, MtlsMaterial } from './adapters/remoteAdapter';
import { assertCitizenHash } from './adapters/types';
import { env } from './config/env';
import { log } from './gateway/logger';

// Department Security Server (X-Road pattern). Runs inside a department's network next to its database:
//  - accepts only mutually-authenticated TLS 1.3 from the MahaLink gateway certificate (pinned CA + CN);
//  - verifies the citizen's DEPA consent artifact itself against the Consent Authority JWKS, so the
//    department releases data on the citizen's signed consent, not on the gateway's word;
//  - then reads its own database with a SELECT-only account.
//   node dist/securityServer.js   (SECURITY_SERVER_DEPARTMENT, MTLS_*, CONSENT_JWKS_URL)

const CONSENT_ISSUER = 'https://consent.mahalink.maharashtra.gov.in';
const MAX_BODY_BYTES = 16 * 1024;

export interface SecurityServerOptions extends MtlsMaterial {
  department: string;
  jwksUrl: string;
  gatewayClientCn: string;
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) req.destroy(new Error('body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

export function createSecurityServer(opts: SecurityServerOptions): https.Server {
  const adapter = localAdapters[opts.department];
  if (!adapter) throw new Error(`Unknown department "${opts.department}"`);

  let jwks: { keys: Array<crypto.JsonWebKey & { kid?: string }>; fetchedAt: number } | null = null;
  const consentKey = async (kid?: string) => {
    if (!jwks || Date.now() - jwks.fetchedAt > 5 * 60_000 || !jwks.keys.some((k) => k.kid === kid)) {
      const res = await fetch(opts.jwksUrl, { signal: AbortSignal.timeout(3000) });
      jwks = { keys: ((await res.json()) as { keys: any[] }).keys, fetchedAt: Date.now() };
    }
    const jwk = jwks.keys.find((k) => k.kid === kid);
    if (!jwk) throw new Error('consent signed with an unknown key');
    return crypto.createPublicKey({ key: jwk, format: 'jwk' });
  };

  return https.createServer(
    { key: opts.key, cert: opts.cert, ca: opts.ca, requestCert: true, rejectUnauthorized: true, minVersion: 'TLSv1.3' },
    async (req, res) => {
      const peer = (req.socket as TLSSocket).getPeerCertificate();
      if (peer?.subject?.CN !== opts.gatewayClientCn) return send(res, 403, { error: 'CLIENT_NOT_AUTHORISED' });

      if (req.method === 'GET' && req.url === '/health') return send(res, 200, await adapter.ping());
      if (req.method !== 'POST' || req.url !== '/v1/query') return send(res, 404, { error: 'NOT_FOUND' });

      let body: { aadhaar_hash: string; consent_token: string };
      try {
        body = JSON.parse(await readBody(req));
        assertCitizenHash(body.aadhaar_hash);
      } catch {
        return send(res, 400, { error: 'BAD_REQUEST' });
      }

      let jti: string;
      try {
        const decoded = jwt.decode(body.consent_token, { complete: true });
        if (!decoded) throw new Error('malformed consent artifact');
        const claims = jwt.verify(body.consent_token, await consentKey(decoded.header.kid), {
          algorithms: ['ES256'],
          issuer: CONSENT_ISSUER,
        }) as jwt.JwtPayload;
        if (!(claims.aud as string[] | undefined)?.includes(`dept:${opts.department}`)) {
          throw new Error(`consent does not cover department "${opts.department}"`);
        }
        if (claims.sub !== body.aadhaar_hash) throw new Error('consent belongs to a different data principal');
        jti = claims.jti!;
      } catch (err: any) {
        log('WARN', 'consent rejected by security server', { service: 'security-server', department: opts.department, reason: err.message });
        return send(res, 403, { error: 'CONSENT_REJECTED', message: err.message });
      }

      try {
        const record = await adapter.queryCitizenRecord(body.aadhaar_hash);
        // Department-side access log, independent of the gateway's ledger.
        log('INFO', 'record released', { service: 'security-server', department: opts.department, consent_jti: jti, found: Boolean(record) });
        return send(res, 200, { record });
      } catch {
        return send(res, 503, { error: 'DEPARTMENT_SYSTEM_UNAVAILABLE' });
      }
    }
  );
}

if (require.main === module) {
  const server = createSecurityServer({
    department: env.SECURITY_SERVER_DEPARTMENT,
    jwksUrl: env.CONSENT_JWKS_URL,
    gatewayClientCn: env.GATEWAY_CLIENT_CN,
    ...readMtls({ key: env.MTLS_KEY_FILE, cert: env.MTLS_CERT_FILE, ca: env.MTLS_CA_FILE }),
  });
  server.listen(env.SECURITY_SERVER_PORT, () =>
    log('INFO', 'security server started', { service: 'security-server', department: env.SECURITY_SERVER_DEPARTMENT, port: env.SECURITY_SERVER_PORT })
  );
}
