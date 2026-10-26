// Structured JSON logging (OBSERVABILITY.md §1). Never pass raw PII in `fields`; use maskId().
type Level = 'INFO' | 'WARN' | 'ERROR';

export function log(level: Level, message: string, fields: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV === 'test' && level !== 'ERROR') return;
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, service: 'mahalink-gateway', message, ...fields });
  (level === 'ERROR' ? console.error : console.log)(line);
}

export const maskId = (id?: string): string | undefined => (id ? `${id.slice(0, 8)}…` : undefined);
