import { v4 as uuidv4 } from 'uuid';
import { ConsentCryptoSigner } from './cryptoSigner';

export interface ConsentRecord {
  jti: string;
  citizen_hash: string;
  journey_id: string;
  purpose: string;
  departments: string[];
  scope: string[];
  issued_at: number;
  expires_at: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  revocation_timestamp?: number;
  token?: string;
}

export class ConsentManager {
  private static consents: Map<string, ConsentRecord> = new Map();
  private static revokedJtis: Set<string> = new Set();

  public static grantConsent(params: {
    citizen_hash: string;
    journey_id: string;
    purpose: string;
    departments: string[];
    scope: string[];
    validity_minutes?: number;
  }): { jti: string; token: string; record: ConsentRecord } {
    const jti = `urn:uuid:${uuidv4()}`;
    const now = Math.floor(Date.now() / 1000);
    const validitySec = (params.validity_minutes || 15) * 60;
    const expiresAt = now + validitySec;

    const payload = {
      jti,
      iss: 'https://consent.mahalink.maharashtra.gov.in',
      sub: params.citizen_hash,
      aud: params.departments.map((d) => `dept:${d}`),
      purpose: params.purpose,
      scope: params.scope,
      iat: now,
      exp: expiresAt,
      statutory_basis: 'DPDP_ACT_2023_SEC_6',
      revocation_url: `/api/v1/consent/revoke/${jti}`,
    };

    const token = ConsentCryptoSigner.signArtifact(payload);

    const record: ConsentRecord = {
      jti,
      citizen_hash: params.citizen_hash,
      journey_id: params.journey_id,
      purpose: params.purpose,
      departments: params.departments,
      scope: params.scope,
      issued_at: now * 1000,
      expires_at: expiresAt * 1000,
      status: 'ACTIVE',
      token,
    };

    this.consents.set(jti, record);
    return { jti, token, record };
  }

  public static verifyConsent(token: string, requiredDept: string): { valid: boolean; payload?: any; error?: string } {
    const check = ConsentCryptoSigner.verifyArtifact(token);
    if (!check.valid) {
      return check;
    }

    const { jti, aud } = check.payload;

    if (this.revokedJtis.has(jti)) {
      return { valid: false, error: 'Consent token was explicitly REVOKED by citizen.' };
    }

    const targetAudience = `dept:${requiredDept}`;
    if (!aud || !aud.includes(targetAudience)) {
      return {
        valid: false,
        error: `Consent token is not authorized for department: ${requiredDept}. Allowed: ${aud.join(', ')}`,
      };
    }

    return { valid: true, payload: check.payload };
  }

  public static revokeConsent(jti: string, citizen_hash: string): { success: boolean; message: string } {
    const record = this.consents.get(jti);
    if (!record) {
      // If not in local store, still add to revocation set for defense
      this.revokedJtis.add(jti);
      return { success: true, message: `Consent token ${jti} revoked.` };
    }

    if (record.citizen_hash !== citizen_hash) {
      return { success: false, message: 'Unauthorized: Citizen hash mismatch for revocation.' };
    }

    record.status = 'REVOKED';
    record.revocation_timestamp = Date.now();
    this.revokedJtis.add(jti);
    this.consents.set(jti, record);

    return { success: true, message: `Consent artifact ${jti} successfully revoked.` };
  }

  public static getCitizenConsents(citizen_hash: string): ConsentRecord[] {
    const records: ConsentRecord[] = [];
    const now = Date.now();

    for (const record of this.consents.values()) {
      if (record.citizen_hash === citizen_hash) {
        if (record.status === 'ACTIVE' && now > record.expires_at) {
          record.status = 'EXPIRED';
        }
        // Strip sensitive raw JWT token from history payload
        const { token, ...safeRecord } = record;
        records.push(safeRecord as ConsentRecord);
      }
    }

    return records.sort((a, b) => b.issued_at - a.issued_at);
  }

  public static clear(): void {
    this.consents.clear();
    this.revokedJtis.clear();
  }
}
