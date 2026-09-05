import { NextFunction, Request, Response } from 'express';

export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).requestId || 'unknown';
  const statusCode = err.statusCode || err.status || 500;

  // Structured log output (internal)
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'ERROR' : 'WARN',
    request_id: requestId,
    path: req.path,
    method: req.method,
    status_code: statusCode,
    error_message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  console.error(JSON.stringify(logEntry));

  // Safe client response (Zero internal stack leaks)
  return res.status(statusCode).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: statusCode >= 500 ? 'An internal error occurred. Please quote the request ID for assistance.' : err.message,
    request_id: requestId,
  });
}
