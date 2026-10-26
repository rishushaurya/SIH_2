import { departmentAdapters } from '../../adapters/registry';
import { DataSource, RawDepartmentRecord } from '../../adapters/types';
import { httpError } from '../../gateway/errorHandler';
import { log } from '../../gateway/logger';
import { EventBroadcaster } from '../audit/eventBroadcaster';
import { auditLedger, digestOf } from '../audit/hashChain';
import { allowsDepartment, ConsentManager } from '../consent/consentManager';
import { mapFormValues } from '../normalizer/formMapper';
import { departmentName, MGASNormalizer, NormalizedMGASPayload } from '../normalizer/mgasNormalizer';
import { IdentityResolver } from '../resolver/identityResolver';
import { DepartmentStatus, MissingDocDetector, MissingDocumentAlert } from '../rules/missingDocDetector';
import { getJourney } from './journeys';

export interface DepartmentResult {
  department: string;
  status: DepartmentStatus;
  confidence?: number;
  source?: DataSource;
  verified_source?: string;
  duration_ms: number;
}

export interface WorkflowExecutionResult {
  journey_id: string;
  consent_jti: string;
  mgas_data: NormalizedMGASPayload;
  form_values: Record<string, string>;
  department_status: DepartmentResult[];
  missing_documents: MissingDocumentAlert[];
  audit_block: { index: number; block_hash: string; timestamp: string };
  execution_metrics: { total_duration_ms: number; departments_queried: string[] };
}

const ADAPTER_TIMEOUT_MS = 3000;
const BREAKER_THRESHOLD = 5;
const BREAKER_WINDOW_MS = 30_000;
const BREAKER_OPEN_MS = 30_000;

// Circuit breaker per department (TAD §6.2): 5 failures in 30 s opens it for 30 s.
// seniordev: per-process state; share it (Redis) if several gateway instances must trip together.
const breakers = new Map<string, { failures: number[]; openUntil: number }>();

async function queryDepartment(department: string, citizenHash: string, consentToken: string): Promise<RawDepartmentRecord | null | 'UNAVAILABLE'> {
  const breaker = breakers.get(department) ?? { failures: [], openUntil: 0 };
  breakers.set(department, breaker);
  const now = Date.now();
  if (now < breaker.openUntil) return 'UNAVAILABLE';

  let timer: NodeJS.Timeout | undefined;
  try {
    const record = await Promise.race([
      departmentAdapters[department].queryCitizenRecord(citizenHash, consentToken),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${ADAPTER_TIMEOUT_MS} ms`)), ADAPTER_TIMEOUT_MS);
      }),
    ]);
    breaker.failures = [];
    return record;
  } catch (err: any) {
    breaker.failures = [...breaker.failures.filter((t) => now - t < BREAKER_WINDOW_MS), now];
    if (breaker.failures.length >= BREAKER_THRESHOLD) breaker.openUntil = now + BREAKER_OPEN_MS;
    log('WARN', 'department adapter unavailable', { department, error: err.message, circuit_open: now < breaker.openUntil });
    return 'UNAVAILABLE';
  } finally {
    clearTimeout(timer);
  }
}

const STATUS_BY_FLAG = {
  AUTO_RESOLVED: 'VERIFIED',
  VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED',
  MISMATCH: 'IDENTITY_MISMATCH',
} as const;

export class WorkflowEngine {
  public static async executeJourney(params: {
    journey_id: string;
    citizen: { full_name: string; aadhaar_hash: string };
    consent_token: string;
  }): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const journey = getJourney(params.journey_id);
    if (!journey) throw httpError(404, 'WORKFLOW_NOT_FOUND', `Journey ${params.journey_id} is not registered.`);

    // 1. Verify DEPA consent: signature, expiry, revocation, data principal and purpose.
    const subject = params.citizen.aadhaar_hash;
    const check = ConsentManager.verifyConsent(params.consent_token, { citizen_hash: subject, journey_id: journey.id });
    if (!check.valid) throw httpError(403, 'CONSENT_INVALID', `DEPA Consent Verification Failed: ${check.error}`);
    const consent = check.payload;
    const departments = journey.required_departments.filter((d) => allowsDepartment(consent, d));

    EventBroadcaster.emit('EVENT_QUERY_DISPATCH', { journey_id: journey.id, departments, consent_jti: consent.jti }, { subject });

    // 2. Parallel, fail-soft department queries.
    const outcomes = await Promise.all(
      departments.map(async (department) => {
        const t0 = Date.now();
        const outcome = await queryDepartment(department, subject, params.consent_token);
        return { department, outcome, duration_ms: Date.now() - t0 };
      })
    );

    // 3. Identity resolution; mismatched records are withheld, never auto-filled.
    const accepted: Record<string, RawDepartmentRecord> = {};
    const statuses: Record<string, DepartmentStatus> = {};
    const departmentStatus: DepartmentResult[] = [];

    for (const { department, outcome, duration_ms } of outcomes) {
      const record = outcome === 'UNAVAILABLE' ? null : outcome;
      let status: DepartmentStatus = outcome === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'NOT_FOUND';
      let confidence: number | undefined;

      if (record) {
        const sourceName = departmentName(department, record.data) ?? '';
        const match = IdentityResolver.resolve(params.citizen, {
          department,
          source_name: sourceName,
          source_aadhaar_hash: record.aadhaar_hash,
        });
        confidence = match.confidenceScore;
        status = STATUS_BY_FLAG[match.flag];
        if (status !== 'IDENTITY_MISMATCH') accepted[department] = record;
        EventBroadcaster.emit(
          'EVENT_IDENTITY_MATCH',
          { department, confidence, flag: match.flag, duration_ms, source: record.source },
          { subject, pii: { candidate_name: sourceName, primary_name: params.citizen.full_name } }
        );
      }

      statuses[department] = status;
      departmentStatus.push({ department, status, confidence, source: record?.source, verified_source: record?.verified_source, duration_ms });

      // Every access attempt is logged, including misses and outages (DPDP Rules 2025 r.6).
      auditLedger.append({
        actor_id: subject,
        action: 'DATA_FETCH',
        department,
        journey_id: journey.id,
        purpose: journey.title_en,
        consent_jti: consent.jti,
        payload_digest: record ? digestOf(record.data) : status,
        metadata: { status, source: record?.source },
      });
    }

    // 4. MGAS normalisation limited to the consented scope.
    const mgas = MGASNormalizer.normalize(params.citizen, accepted, consent.scope);
    const confidences = departmentStatus.flatMap((d) => (d.confidence === undefined ? [] : [d.confidence]));
    mgas.verification_summary.resolution_confidence_average = confidences.length
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000) / 1000
      : 0;
    EventBroadcaster.emit('EVENT_NORMALIZER', { journey_id: journey.id, sources_verified: mgas.verification_summary.sources_verified }, { subject });

    // 5. Hash-chained proof of the whole exchange.
    const block = auditLedger.append({
      actor_id: subject,
      action: 'WORKFLOW_EXECUTE',
      journey_id: journey.id,
      purpose: journey.title_en,
      consent_jti: consent.jti,
      payload_digest: digestOf(mgas),
      metadata: { statuses },
    });
    EventBroadcaster.emit('EVENT_AUDIT_MINED', { block_index: block.index, block_hash: block.block_hash, prev_hash: block.prev_hash }, { subject });

    return {
      journey_id: journey.id,
      consent_jti: consent.jti,
      mgas_data: mgas,
      form_values: mapFormValues(journey, mgas),
      department_status: departmentStatus,
      missing_documents: MissingDocDetector.evaluate(journey.id, statuses, mgas),
      audit_block: { index: block.index, block_hash: block.block_hash, timestamp: block.timestamp },
      execution_metrics: { total_duration_ms: Date.now() - startTime, departments_queried: departments },
    };
  }
}
