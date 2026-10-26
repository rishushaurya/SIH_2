import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from '../config/env';
import { log, maskId } from './logger';

// SECURITY_ACCESS.md §3.3 header set, via helmet. Fonts are self-hosted, so no third-party origins.
export const securityHeadersMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    strictTransportSecurity: { maxAge: 63072000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),
  (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  },
];

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/;

// Correlation ID + one structured access-log line per request (no query strings: they can carry OAuth codes).
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get('x-request-id');
  const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    log('INFO', 'request', {
      request_id: requestId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: Number(process.hrtime.bigint() - start) / 1e6,
      actor_id: maskId((req as any).user?.citizen_hash),
    });
  });
  next();
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defence for cookie sessions (OWASP: SameSite=Strict + Origin verification).
// Browsers always send Origin on cross-site state-changing requests; non-browser clients use Bearer tokens.
export function originGuard(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('origin');
  if (SAFE_METHODS.has(req.method) || !origin) return next();
  if (origin === `${req.protocol}://${req.get('host')}` || env.CORS_ORIGINS.includes(origin)) return next();
  return res.status(403).json({
    error: 'CSRF_ORIGIN_REJECTED',
    message: 'Cross-origin state-changing request rejected.',
    request_id: (req as any).requestId,
  });
}
