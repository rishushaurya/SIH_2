import { describe, expect, it, vi } from 'vitest';
import { rtoAdapter } from '../../src/adapters/rtoAdapter';
import { auditLedger } from '../../src/services/audit/hashChain';
import { ConsentManager } from '../../src/services/consent/consentManager';
import { getJourney } from '../../src/services/workflow/journeys';
import { WorkflowEngine } from '../../src/services/workflow/workflowEngine';

const PRIYA = { full_name: 'Priya Ramesh Sharma', aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' };
const SUNIL = { full_name: 'Sunil Baban Jadhav', aadhaar_hash: 'b72c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c' };

const run = (citizen: typeof PRIYA, journeyId: string, tokenOwner = citizen) => {
  const { token } = ConsentManager.grantConsent(tokenOwner.aadhaar_hash, getJourney(journeyId)!);
  return WorkflowEngine.executeJourney({ journey_id: journeyId, citizen, consent_token: token });
};

describe('Workflow Engine & Multi-Department Execution', () => {
  it('executes the income certificate journey end-to-end with auto-fill values', async () => {
    const result = await run(PRIYA, 'income_certificate');

    expect(result.mgas_data.revenue_land_records?.survey_number).toBe('45/1A');
    expect(result.mgas_data.transport_records?.registered_vehicles?.[0].registration_number).toBe('MH-12-AB-1234');
    expect(result.mgas_data.certificate_records?.income_certificate?.annual_income_inr).toBe(340000);
    expect(result.form_values.land_survey_number).toBe('45/1A');
    expect(result.form_values.calculated_income_bracket).toContain('within EWS income limit');
    expect(result.department_status.every((d) => d.status === 'VERIFIED')).toBe(true);
    expect(result.department_status.find((d) => d.department === 'revenue')!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(auditLedger.verifyChainIntegrity().isValid).toBe(true);
  });

  it('returns only sections covered by the consent scope (purpose limitation)', async () => {
    const result = await run(PRIYA, 'driving_license');
    expect(result.mgas_data.transport_records?.driving_license?.dl_number).toBe('MH12-20190012891');
    expect(result.mgas_data.transport_records?.registered_vehicles).toBeUndefined(); // no vehicle_rc scope
    expect(result.mgas_data.revenue_land_records).toBeUndefined(); // only the address is consented
    expect(result.mgas_data.verified_address?.village).toBe('Wagholi');
    expect(result.mgas_data.certificate_records).toBeUndefined();
  });

  it('logs one DATA_FETCH block per department under the consent jti', async () => {
    const before = auditLedger.getBlockCount();
    const result = await run(PRIYA, 'income_certificate');
    const fetches = auditLedger.allBlocks().slice(before).filter((b) => b.action === 'DATA_FETCH');
    expect(fetches.map((b) => b.department).sort()).toEqual(['certificates', 'revenue', 'rto']);
    expect(fetches.every((b) => b.consent_jti === result.consent_jti)).toBe(true);
  });

  it('withholds records whose name does not match the signed-in citizen', async () => {
    const impostor = { full_name: 'Amit Kumar Patel', aadhaar_hash: PRIYA.aadhaar_hash };
    const result = await run(impostor, 'income_certificate');
    expect(result.department_status.every((d) => d.status === 'IDENTITY_MISMATCH')).toBe(true);
    expect(result.mgas_data.revenue_land_records).toBeUndefined();
    expect(result.missing_documents.some((a) => a.reason === 'IDENTITY_MISMATCH')).toBe(true);
  });

  it('gives missing-record and expiry guidance instead of inventing data', async () => {
    const scholarship = await run(SUNIL, 'scholarship_application');
    expect(scholarship.department_status.find((d) => d.department === 'education')!.status).toBe('NOT_FOUND');
    expect(scholarship.missing_documents.some((a) => a.department === 'education' && a.reason === 'NOT_FOUND')).toBe(true);

    const licence = await run(SUNIL, 'driving_license');
    expect(licence.missing_documents.some((a) => a.reason === 'EXPIRED')).toBe(true);
  });

  it('degrades one department instead of failing the journey, then opens the circuit breaker', async () => {
    const outage = vi.spyOn(rtoAdapter, 'queryCitizenRecord').mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await run(PRIYA, 'income_certificate');
    expect(result.department_status.find((d) => d.department === 'rto')!.status).toBe('UNAVAILABLE');
    expect(result.department_status.find((d) => d.department === 'revenue')!.status).toBe('VERIFIED');
    expect(result.form_values.land_survey_number).toBe('45/1A');
    expect(result.missing_documents.some((a) => a.department === 'rto' && a.reason === 'UNAVAILABLE')).toBe(true);

    for (let i = 0; i < 4; i++) await run(PRIYA, 'income_certificate');
    outage.mockClear();
    await run(PRIYA, 'income_certificate');
    expect(outage).not.toHaveBeenCalled(); // circuit open: the failing system is not hammered
    outage.mockRestore();
  });

  it('rejects an invalid token and a token minted for another citizen', async () => {
    await expect(
      WorkflowEngine.executeJourney({ journey_id: 'income_certificate', citizen: PRIYA, consent_token: 'not.a.token' })
    ).rejects.toMatchObject({ statusCode: 403, code: 'CONSENT_INVALID' });
    await expect(run(PRIYA, 'income_certificate', SUNIL)).rejects.toMatchObject({ statusCode: 403 });
  });
});
