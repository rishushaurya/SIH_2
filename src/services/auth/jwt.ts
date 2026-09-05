import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AuthTokenPayload {
  citizen_hash: string;
  full_name: string;
  role: 'CITIZEN' | 'DEPT_ADMIN' | 'SYS_ADMIN';
  department_id?: string;
}

export function signAuthToken(payload: AuthTokenPayload, expiresIn: string = '1h'): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn,
    issuer: 'https://auth.mahalink.maharashtra.gov.in',
    subject: payload.citizen_hash,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'https://auth.mahalink.maharashtra.gov.in',
    }) as any;
    return {
      citizen_hash: decoded.citizen_hash || decoded.sub,
      full_name: decoded.full_name,
      role: decoded.role || 'CITIZEN',
      department_id: decoded.department_id,
    };
  } catch (error: any) {
    throw new Error(`Authentication token invalid or expired: ${error.message}`);
  }
}
