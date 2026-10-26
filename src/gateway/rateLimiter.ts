import { NextFunction, Request, Response } from 'express';

const memoryStore = new Map<string, number[]>();
let longestWindowMs = 60_000;

// Drop idle keys so the store cannot grow without bound (memory-exhaustion DoS).
setInterval(() => {
  const cutoff = Date.now() - longestWindowMs;
  for (const [key, timestamps] of memoryStore) {
    if (timestamps[timestamps.length - 1] < cutoff) memoryStore.delete(key);
  }
}, 60_000).unref();

// Sliding-window limiter keyed by citizen when authenticated, else by client IP (set TRUST_PROXY behind a proxy).
// seniordev: per-process store; use Redis when running more than one gateway instance.
export function createRateLimiter(options: { maxRequests: number; windowSeconds: number; name: string }) {
  const windowMs = options.windowSeconds * 1000;
  longestWindowMs = Math.max(longestWindowMs, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const subject = (req as any).user?.citizen_hash || req.ip || 'unknown';
    const key = `${options.name}:${subject}`;
    const now = Date.now();
    const timestamps = (memoryStore.get(key) || []).filter((ts) => now - ts < windowMs);

    if (timestamps.length >= options.maxRequests) {
      const resetInSeconds = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      memoryStore.set(key, timestamps);
      res.setHeader('Retry-After', resetInSeconds.toString());
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please wait before retrying.',
        retry_after_seconds: resetInSeconds,
        request_id: (req as any).requestId,
      });
    }

    timestamps.push(now);
    memoryStore.set(key, timestamps);
    next();
  };
}
