import cors from 'cors';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from './config/env';
import { globalErrorHandler } from './gateway/errorHandler';
import { createRateLimiter } from './gateway/rateLimiter';
import router from './gateway/routes';
import { originGuard, requestContext, securityHeadersMiddleware } from './gateway/securityHeaders';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  // 1. Perimeter: correlation IDs, headers, CORS allow-list, body cap, CSRF origin check, IP rate limit
  app.use(requestContext);
  app.use(securityHeadersMiddleware);
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(originGuard);
  app.use(createRateLimiter({ maxRequests: 300, windowSeconds: 60, name: 'ip' }));
  // Responses carry personal data: never cache them anywhere.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // 2. API gateway
  app.use(router);
  app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown API route.' }));

  // 3. Integration stub UI (production build), served from the same origin so cookies stay SameSite=Strict
  const clientDist = path.resolve(process.cwd(), 'client/dist');
  if (fs.existsSync(clientDist)) {
    app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(clientDist, { index: false }));
    app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  // 4. Global structured error handler
  app.use(globalErrorHandler);
  return app;
}
