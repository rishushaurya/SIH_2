import { NextFunction, Request, Response } from 'express';
import { Role, SESSION_TTL_SECONDS, SessionClaims, signSession, verifySession } from './jwt';

export const SESSION_COOKIE = 'mahalink_session';

export interface AuthenticatedRequest extends Request {
  user?: SessionClaims;
}

// HttpOnly + SameSite=Strict; Secure whenever the request arrived over HTTPS (directly or via a trusted proxy).
export function setSessionCookie(req: Request, res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: req.secure,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(req: Request, res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: req.secure, sameSite: 'strict', path: '/' });
}

// Browsers use the cookie; server-to-server integrators (portal backends) may send a Bearer token.
function readToken(req: Request): { token?: string; fromCookie: boolean } {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return { token: header.slice(7), fromCookie: false };
  const cookie = req.headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return { token: cookie?.slice(SESSION_COOKIE.length + 1), fromCookie: true };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { token, fromCookie } = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sign in is required.' });
  }

  try {
    req.user = verifySession(token);
  } catch {
    return res.status(401).json({ error: 'INVALID_SESSION', message: 'Session is invalid or expired. Please sign in again.' });
  }

  // Sliding renewal in the last 5 minutes; auth_time keeps the 8-hour absolute cap.
  if (fromCookie && req.user.exp - Date.now() / 1000 < 5 * 60) {
    setSessionCookie(req, res, signSession(req.user, req.user.auth_time));
  }
  next();
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Your role does not permit this action.' });
    }
    next();
  };
}
