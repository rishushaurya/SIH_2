import { env } from '../config/env';

export type DataSource = 'live' | 'demo-fixture';

export interface AdapterHealth {
  status: 'UP' | 'DOWN';
  source: DataSource;
  latency_ms: number;
  via?: 'mtls-security-server';
}

export interface DepartmentAdapter {
  departmentId: string;
  departmentName: string;
  ping(): Promise<AdapterHealth>;
  // Resolves null when the department authoritatively has no record; throws when the system is unreachable.
  // Remote (security-server) adapters forward the consent token so the department can verify it itself.
  queryCitizenRecord(aadhaarHash: string, consentToken?: string): Promise<RawDepartmentRecord | null>;
}

export interface RawDepartmentRecord {
  department: string;
  query_timestamp: string;
  aadhaar_hash: string;
  data: Record<string, any>;
  verified_source: string;
  source: DataSource;
}

// Defence in depth at the trust boundary: only a 64-char hex digest ever reaches a query.
export function assertCitizenHash(hash: string): void {
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid citizen hash.');
}

// Live system first. Seed fixtures only in DEMO_MODE and only when the system is unreachable —
// never when it answered "no record". With DEMO_MODE=false an outage surfaces as an error (fail-soft upstream).
export async function liveOrFixture<T>(live: () => Promise<T>, fixture: () => T): Promise<{ value: T; source: DataSource }> {
  try {
    return { value: await live(), source: 'live' };
  } catch (err) {
    if (!env.DEMO_MODE) throw err;
    return { value: fixture(), source: 'demo-fixture' };
  }
}

export async function probe(check: () => Promise<unknown>): Promise<AdapterHealth> {
  const start = Date.now();
  try {
    const { source } = await liveOrFixture(check, () => null);
    return { status: 'UP', source, latency_ms: Date.now() - start };
  } catch {
    return { status: 'DOWN', source: 'live', latency_ms: Date.now() - start };
  }
}

export function toRecord(
  department: string,
  aadhaarHash: string,
  systemName: string,
  result: { value: Record<string, any> | null; source: DataSource }
): RawDepartmentRecord | null {
  if (!result.value) return null;
  return {
    department,
    query_timestamp: new Date().toISOString(),
    aadhaar_hash: aadhaarHash,
    data: result.value,
    verified_source: result.source === 'live' ? `${systemName} (live query)` : `${systemName} (seed fixture: DEMO_MODE, database offline)`,
    source: result.source,
  };
}
