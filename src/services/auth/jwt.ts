import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export type Role = 'CITIZEN' | 'DEPT_ADMIN' | 'SYS_ADMIN';

export interface SessionUser {
  citizen_hash: string;
  full_name: string;
  role: Role;
  department_id?: string;
  masked_id?: string;
  auth_provider: string;
}

export interface SessionClaims extends SessionUser {
  jti: string;
  exp: number;
  auth_time: number;
}

const ISSUER = 'https://auth.mahalink.maharashtra.gov.in';
const AUDIENCE = 'mahalink-session';
export const SESSION_TTL_SECONDS = 15 * 60;
const SESSION_ABSOLUTE_SECONDS = 8 * 60 * 60;

// Logged-out session IDs, kept until their own expiry.
// seniordev: per-process; move to Redis when running several gateway instances.
const revokedJtis = new Map<string, number>();

export function signSession(user: SessionUser, authTime = Math.floor(Date.now() / 1000)): string {
  const { citizen_hash, full_name, role, department_id, masked_id, auth_provider } = user;
  return jwt.sign({ citizen_hash, full_name, role, department_id, masked_id, auth_provider, auth_time: authTime }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: SESSION_TTL_SECONDS,
    issuer: ISSUER,
    audience: AUDIENCE,
    subject: citizen_hash,
    jwtid: randomUUID(),
  });
}

export function verifySession(token: string): SessionClaims {
  const claims = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
    clockTolerance: 30,
  }) as SessionClaims;
  if (revokedJtis.has(claims.jti)) throw new Error('Session was logged out.');
  if (Date.now() / 1000 - claims.auth_time > SESSION_ABSOLUTE_SECONDS) throw new Error('Session exceeded its maximum lifetime.');
  return claims;
}

export function revokeSession(claims: SessionClaims): void {
  const now = Date.now() / 1000;
  for (const [jti, exp] of revokedJtis) if (exp < now) revokedJtis.delete(jti);
  revokedJtis.set(claims.jti, claims.exp);
}
