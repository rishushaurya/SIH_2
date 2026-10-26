import { NextFunction, Request, Response } from 'express';
import { log } from './logger';

export interface HttpError extends Error {
  statusCode: number;
  code: string;
}

export function httpError(statusCode: number, code: string, message: string): HttpError {
  return Object.assign(new Error(message), { statusCode, code });
}

export function globalErrorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as any).requestId || 'unknown';
  const statusCode = err.statusCode || err.status || 500;

  log(statusCode >= 500 ? 'ERROR' : 'WARN', err.message, {
    request_id: requestId,
    path: req.path,
    method: req.method,
    status_code: statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Safe client response (Zero internal stack leaks)
  return res.status(statusCode).json({
    error: err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
    message: statusCode >= 500 ? 'An internal error occurred. Please quote the request ID for assistance.' : err.message,
    request_id: requestId,
  });
}
