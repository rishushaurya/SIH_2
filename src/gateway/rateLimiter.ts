import { NextFunction, Request, Response } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: { maxRequests: number; windowSeconds: number; name?: string }) {
  const windowMs = options.windowSeconds * 1000;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const key = `${options.name || 'global'}_${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      memoryStore.set(key, record);
    }

    // Filter timestamps within the current sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= options.maxRequests) {
      const oldestTs = record.timestamps[0];
      const resetInSeconds = Math.ceil((oldestTs + windowMs - now) / 1000);

      res.setHeader('Retry-After', resetInSeconds.toString());
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait before retrying.',
        retry_after_seconds: resetInSeconds,
        request_id: (req as any).requestId,
      });
    }

    record.timestamps.push(now);
    next();
  };
}
