import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { auditLedger } from '../../src/services/audit/hashChain';
import { ConsentCryptoSigner } from '../../src/services/consent/cryptoSigner';
import { allowsDepartment, ConsentManager } from '../../src/services/consent/consentManager';
import { getJourney } from '../../src/services/workflow/journeys';

const PRIYA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const RAJESH = '9f83c120a1098bcf98a729e1082cba983b749019283746192837461928374619';
const income = getJourney('income_certificate')!;

describe('DEPA Consent Manager & ES256 signer', () => {
  it('mints an artifact whose scope comes from the journey config', () => {
    const { token, record } = ConsentManager.grantConsent(PRIYA, income);
    const check = ConsentManager.verifyConsent(token, { citizen_hash: PRIYA, journey_id: income.id });
    expect(check.valid).toBe(true);
    if (!check.valid) return;
    expect(record.scope).toEqual(income.consent_scope);
    expect(allowsDepartment(check.payload, 'revenue')).toBe(true);
    expect(allowsDepartment(check.payload, 'education')).toBe(false);
  });

  it('is verifiable by any standard JWT library through the published JWKS (RFC 7518 ES256)', () => {
    const { token } = ConsentManager.grantConsent(PRIYA, income);
    const [jwk] = ConsentCryptoSigner.getJwks().keys;
    const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: 'jwk' });
    const payload = jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as jwt.JwtPayload;
    expect(payload.sub).toBe(PRIYA);
    expect(jwt.decode(token, { complete: true })!.header.kid).toBe(jwk.kid);
  });

  it('rejects use by a different citizen or for a different journey', () => {
    const { token } = ConsentManager.grantConsent(PRIYA, income);
    expect(ConsentManager.verifyConsent(token, { citizen_hash: RAJESH, journey_id: income.id }).valid).toBe(false);
    expect(ConsentManager.verifyConsent(token, { citizen_hash: PRIYA, journey_id: 'driving_license' }).valid).toBe(false);
  });

  it('rejects tampered payloads', () => {
    const { token } = ConsentManager.grantConsent(PRIYA, income);
    const [h, , s] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: RAJESH, exp: Date.now() / 1000 + 600 })).toString('base64url');
    const check = ConsentCryptoSigner.verifyArtifact(`${h}.${forged}.${s}`);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('signature verification failed');
  });

  it('revokes immediately, only by the data principal, and the revocation survives a restart', () => {
    const { jti, token } = ConsentManager.grantConsent(PRIYA, income);
    expect(ConsentManager.revokeConsent(jti, RAJESH).status).toBe(403);
    expect(ConsentManager.revokeConsent(jti, PRIYA).status).toBe(200);
    expect(ConsentManager.verifyConsent(token, { citizen_hash: PRIYA, journey_id: income.id })).toMatchObject({ valid: false });

    // Simulated restart: registry rebuilt from the audit ledger.
    ConsentManager.clear();
    ConsentManager.restore(auditLedger.allBlocks());
    expect(ConsentManager.getRecord(jti)?.status).toBe('REVOKED');
    const check = ConsentManager.verifyConsent(token, { citizen_hash: PRIYA, journey_id: income.id });
    expect(check.valid).toBe(false);
    expect(auditLedger.verifyChainIntegrity().isValid).toBe(true);
  });
});
