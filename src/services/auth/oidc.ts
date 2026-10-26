import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { httpError } from '../../gateway/errorHandler';
import { hashIdentity, maskAadhaar } from './identity';
import { SessionUser } from './jwt';

// Meri Pehchaan / DigiLocker partner flow: OAuth 2.0 authorization code + PKCE (S256), plus OIDC nonce.
// Provider-agnostic: point the OIDC_* variables at Meri Pehchaan in production or at Keycloak for local tests.

const LOGIN_WINDOW_MS = 10 * 60 * 1000;
// seniordev: per-process pending-login map; a multi-instance deployment needs sticky sessions or Redis here.
const pendingLogins = new Map<string, { verifier: string; nonce: string; expires: number }>();

const randomToken = () => crypto.randomBytes(32).toString('base64url');

export function buildAuthorizeUrl(): string {
  const now = Date.now();
  for (const [state, p] of pendingLogins) if (p.expires < now) pendingLogins.delete(state);

  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  pendingLogins.set(state, { verifier, nonce, expires: now + LOGIN_WINDOW_MS });

  const url = new URL(env.OIDC_AUTHORIZE_URL);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: env.OIDC_CLIENT_ID,
    redirect_uri: env.OIDC_REDIRECT_URI,
    scope: env.OIDC_SCOPE,
    state,
    nonce,
    code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

let jwksCache: { keys: Array<crypto.JsonWebKey & { kid?: string }>; fetchedAt: number } | null = null;

async function findSigningKey(kid: string | undefined): Promise<crypto.KeyObject> {
  const stale = !jwksCache || Date.now() - jwksCache.fetchedAt > LOGIN_WINDOW_MS;
  const known = jwksCache?.keys.some((k) => k.kid === kid);
  if (stale || !known) {
    const res = await fetch(env.OIDC_JWKS_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw httpError(502, 'OIDC_JWKS_UNAVAILABLE', 'Identity provider keys could not be fetched.');
    const body = (await res.json()) as { keys?: Array<crypto.JsonWebKey & { kid?: string }> };
    jwksCache = { keys: body.keys || [], fetchedAt: Date.now() };
  }
  const jwk = jwksCache!.keys.find((k) => k.kid === kid) ?? (jwksCache!.keys.length === 1 ? jwksCache!.keys[0] : undefined);
  if (!jwk) throw httpError(401, 'OIDC_UNKNOWN_KEY', 'ID token was signed with an unknown key.');
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

async function verifyIdToken(idToken: string, nonce: string): Promise<Record<string, unknown>> {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded) throw httpError(401, 'OIDC_ID_TOKEN_INVALID', 'Malformed ID token.');
  const key = await findSigningKey(decoded.header.kid);
  let claims: Record<string, unknown>;
  try {
    claims = jwt.verify(idToken, key, {
      algorithms: ['RS256', 'PS256', 'ES256'],
      issuer: env.OIDC_ISSUER,
      audience: env.OIDC_CLIENT_ID,
      clockTolerance: 30,
    }) as Record<string, unknown>;
  } catch (err: any) {
    throw httpError(401, 'OIDC_ID_TOKEN_INVALID', `ID token rejected: ${err.message}`);
  }
  if (claims.nonce !== nonce) throw httpError(401, 'OIDC_NONCE_MISMATCH', 'ID token nonce does not match this login.');
  return claims;
}

async function fetchUserInfo(accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(env.OIDC_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw httpError(502, 'OIDC_USERINFO_FAILED', 'Identity provider user info request failed.');
  return (await res.json()) as Record<string, unknown>;
}

export async function completeLogin(code: string, state: string): Promise<SessionUser> {
  const pending = pendingLogins.get(state);
  pendingLogins.delete(state); // single use
  if (!pending || pending.expires < Date.now()) {
    throw httpError(400, 'OIDC_STATE_INVALID', 'Login session expired or was already used. Please sign in again.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.OIDC_REDIRECT_URI,
    client_id: env.OIDC_CLIENT_ID,
    code_verifier: pending.verifier,
  });
  if (env.OIDC_CLIENT_SECRET) body.set('client_secret', env.OIDC_CLIENT_SECRET);

  const tokenRes = await fetch(env.OIDC_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(5000),
  });
  if (!tokenRes.ok) throw httpError(502, 'OIDC_TOKEN_EXCHANGE_FAILED', 'Identity provider rejected the authorization code.');
  const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };

  let claims: Record<string, unknown>;
  if (tokens.id_token && env.OIDC_JWKS_URL) claims = await verifyIdToken(tokens.id_token, pending.nonce);
  else if (tokens.access_token && env.OIDC_USERINFO_URL) claims = await fetchUserInfo(tokens.access_token);
  else throw httpError(502, 'OIDC_NO_IDENTITY', 'Identity provider returned neither a verifiable ID token nor user info.');

  const subject = String(claims[env.OIDC_ID_CLAIM] ?? '');
  if (!subject) throw httpError(401, 'OIDC_SUBJECT_MISSING', `Identity claim "${env.OIDC_ID_CLAIM}" missing.`);

  // An Aadhaar-valued claim links to department records keyed by the same Aadhaar hash; any other subject is namespaced.
  const isAadhaar = /^\d{12}$/.test(subject);
  return {
    citizen_hash: hashIdentity(subject, isAadhaar ? 'aadhaar' : 'oidc'),
    full_name: String(claims[env.OIDC_NAME_CLAIM] ?? 'Citizen'),
    role: env.ADMIN_SUBJECTS.includes(subject) ? 'SYS_ADMIN' : 'CITIZEN',
    masked_id: isAadhaar ? maskAadhaar(subject) : undefined,
    auth_provider: env.OIDC_PROVIDER_NAME,
  };
}
