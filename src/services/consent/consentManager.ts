import { randomUUID } from 'crypto';
import { EventBroadcaster } from '../audit/eventBroadcaster';
import { AuditBlock, auditLedger, sha256 } from '../audit/hashChain';
import type { Journey } from '../workflow/journeys';
import { ConsentCryptoSigner } from './cryptoSigner';

export interface ConsentRecord {
  jti: string;
  citizen_hash: string;
  journey_id: string;
  purpose: string;
  departments: string[];
  scope: string[];
  statutory_basis: string;
  issued_at: number;
  expires_at: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  revocation_timestamp?: number;
}

export interface ConsentPayload {
  jti: string;
  iss: string;
  sub: string;
  aud: string[];
  journey_id: string;
  purpose: string;
  scope: string[];
  iat: number;
  exp: number;
  statutory_basis: string;
  revocation_url: string;
}

const ISSUER = 'https://consent.mahalink.maharashtra.gov.in';

export const allowsDepartment = (payload: ConsentPayload, department: string) => payload.aud.includes(`dept:${department}`);

// DEPA consent manager. The registry is rebuilt from the persistent audit ledger at startup (restore),
// so a revocation survives restarts exactly like the signing key does.
export class ConsentManager {
  private static consents = new Map<string, ConsentRecord>();

  // Departments, scope, purpose and validity come from the journey config, never from the client.
  public static grantConsent(citizen_hash: string, journey: Journey): { jti: string; token: string; record: ConsentRecord } {
    const jti = `urn:uuid:${randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);
    const exp = now + journey.default_validity_minutes * 60;

    const payload: ConsentPayload = {
      jti,
      iss: ISSUER,
      sub: citizen_hash,
      aud: journey.required_departments.map((d) => `dept:${d}`),
      journey_id: journey.id,
      purpose: journey.title_en,
      scope: journey.consent_scope,
      iat: now,
      exp,
      statutory_basis: journey.statutory_basis,
      revocation_url: `/api/v1/consent/revoke/${jti}`,
    };
    const token = ConsentCryptoSigner.signArtifact({ ...payload });

    const record: ConsentRecord = {
      jti,
      citizen_hash,
      journey_id: journey.id,
      purpose: journey.title_en,
      departments: journey.required_departments,
      scope: journey.consent_scope,
      statutory_basis: journey.statutory_basis,
      issued_at: now * 1000,
      expires_at: exp * 1000,
      status: 'ACTIVE',
    };
    this.consents.set(jti, record);

    auditLedger.append({
      actor_id: citizen_hash,
      action: 'CONSENT_GRANT',
      journey_id: journey.id,
      purpose: journey.title_en,
      consent_jti: jti,
      payload_digest: sha256(token),
      metadata: { consent: { ...record } }, // a copy: the live record mutates on revocation, the block must not
    });
    EventBroadcaster.emit(
      'EVENT_CONSENT_MINT',
      { jti, departments: record.departments, scope: record.scope, expires_in_minutes: journey.default_validity_minutes },
      { subject: citizen_hash }
    );
    return { jti, token, record };
  }

  public static verifyConsent(
    token: string,
    expected: { citizen_hash: string; journey_id: string }
  ): { valid: true; payload: ConsentPayload } | { valid: false; error: string } {
    const check = ConsentCryptoSigner.verifyArtifact(token);
    if (!check.valid) return { valid: false, error: check.error! };

    const payload = check.payload as ConsentPayload;
    const record = this.consents.get(payload.jti);
    if (!record) return { valid: false, error: 'Consent artifact is not registered with this consent manager.' };
    if (record.status === 'REVOKED') return { valid: false, error: 'Consent token was explicitly REVOKED by citizen.' };
    if (payload.sub !== expected.citizen_hash) return { valid: false, error: 'Consent artifact belongs to a different data principal.' };
    if (payload.journey_id !== expected.journey_id) {
      return { valid: false, error: 'Consent artifact was granted for a different purpose (journey).' };
    }
    return { valid: true, payload };
  }

  public static revokeConsent(jti: string, citizen_hash: string): { status: 200 | 403 | 404; message: string } {
    const record = this.consents.get(jti);
    if (!record) return { status: 404, message: `Consent artifact ${jti} not found.` };
    if (record.citizen_hash !== citizen_hash) return { status: 403, message: 'Only the data principal can revoke this consent.' };
    if (record.status === 'REVOKED') return { status: 200, message: `Consent artifact ${jti} was already revoked.` };

    record.status = 'REVOKED';
    record.revocation_timestamp = Date.now();
    auditLedger.append({
      actor_id: citizen_hash,
      action: 'CONSENT_REVOKE',
      journey_id: record.journey_id,
      purpose: 'Citizen initiated consent withdrawal (DPDP Act 2023 s.6(4))',
      consent_jti: jti,
      payload_digest: 'REVOKED',
    });
    EventBroadcaster.emit('EVENT_CONSENT_REVOKE', { jti, departments: record.departments }, { subject: citizen_hash });
    return { status: 200, message: `Consent artifact ${jti} successfully revoked.` };
  }

  public static getRecord(jti: string): ConsentRecord | undefined {
    return this.consents.get(jti);
  }

  public static getCitizenConsents(citizen_hash: string): ConsentRecord[] {
    const now = Date.now();
    return [...this.consents.values()]
      .filter((r) => r.citizen_hash === citizen_hash)
      .map((r) => (r.status === 'ACTIVE' && now > r.expires_at ? { ...r, status: 'EXPIRED' as const } : r))
      .sort((a, b) => b.issued_at - a.issued_at);
  }

  public static restore(blocks: readonly AuditBlock[]): void {
    for (const block of blocks) {
      if (block.action === 'CONSENT_GRANT' && block.metadata?.consent) {
        const record = block.metadata.consent as ConsentRecord;
        this.consents.set(record.jti, { ...record });
      } else if (block.action === 'CONSENT_REVOKE' && block.consent_jti) {
        const record = this.consents.get(block.consent_jti);
        if (record) Object.assign(record, { status: 'REVOKED', revocation_timestamp: Date.parse(block.timestamp) });
      }
    }
  }

  public static clear(): void {
    this.consents.clear();
  }
}
