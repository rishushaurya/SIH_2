import { describe, expect, it } from 'vitest';
import { ConsentCryptoSigner } from '../../src/services/consent/cryptoSigner';
import { ConsentManager } from '../../src/services/consent/consentManager';

describe('DEPA Consent Manager & ECDSA Signer', () => {
  it('should mint an ECDSA P-256 signed JWT consent artifact', () => {
    const citizenHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const { jti, token, record } = ConsentManager.grantConsent({
      citizen_hash: citizenHash,
      journey_id: 'income_certificate',
      purpose: 'Income Certificate Verification',
      departments: ['revenue', 'rto'],
      scope: ['revenue:7_12:read', 'rto:vehicle_rc:read'],
      validity_minutes: 15,
    });

    expect(jti).toContain('urn:uuid:');
    expect(token.split('.').length).toBe(3);
    expect(record.status).toBe('ACTIVE');

    // Verify token validity for authorized department
    const revCheck = ConsentManager.verifyConsent(token, 'revenue');
    expect(revCheck.valid).toBe(true);
    expect(revCheck.payload.sub).toBe(citizenHash);

    // Verify rejection for unauthorized department
    const policeCheck = ConsentManager.verifyConsent(token, 'police');
    expect(policeCheck.valid).toBe(false);
    expect(policeCheck.error).toContain('not authorized for department: police');
  });

  it('should immediately invalidate token upon citizen revocation', () => {
    const citizenHash = 'test_citizen_hash_123';
    const { jti, token } = ConsentManager.grantConsent({
      citizen_hash: citizenHash,
      journey_id: 'driving_license',
      purpose: 'DL Renewal',
      departments: ['rto'],
      scope: ['rto:dl:read'],
      validity_minutes: 10,
    });

    // Before revocation
    expect(ConsentManager.verifyConsent(token, 'rto').valid).toBe(true);

    // Execute revocation
    const revokeResult = ConsentManager.revokeConsent(jti, citizenHash);
    expect(revokeResult.success).toBe(true);

    // After revocation
    const checkAfterRevoke = ConsentManager.verifyConsent(token, 'rto');
    expect(checkAfterRevoke.valid).toBe(false);
    expect(checkAfterRevoke.error).toContain('explicitly REVOKED');
  });

  it('should detect tampered JWT payload', () => {
    const payload = { sub: 'citizen1', aud: ['dept:revenue'], exp: Date.now() / 1000 + 3600 };
    const token = ConsentCryptoSigner.signArtifact(payload);

    const parts = token.split('.');
    // Modify the payload base64 part
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'MALICIOUS_ATTACKER' })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const check = ConsentCryptoSigner.verifyArtifact(tamperedToken);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('signature verification failed');
  });
});
