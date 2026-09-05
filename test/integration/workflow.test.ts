import { describe, expect, it } from 'vitest';
import { ConsentManager } from '../../src/services/consent/consentManager';
import { WorkflowEngine } from '../../src/services/workflow/workflowEngine';

describe('Workflow Engine & Multi-Department Execution', () => {
  it('should execute Income Certificate journey end-to-end with consent and auto-fill', async () => {
    const priyaSharma = {
      full_name: 'Priya Ramesh Sharma',
      aadhaar_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    // 1. Grant DEPA Consent
    const { token } = ConsentManager.grantConsent({
      citizen_hash: priyaSharma.aadhaar_hash,
      journey_id: 'income_certificate',
      purpose: 'Income Certificate Application',
      departments: ['revenue', 'rto', 'certificates'],
      scope: ['revenue:7_12:read', 'rto:vehicle_rc:read', 'certificates:historical_income:read'],
      validity_minutes: 15,
    });

    // 2. Execute Journey
    const result = await WorkflowEngine.executeJourney({
      journey_id: 'income_certificate',
      citizen: priyaSharma,
      consent_token: token,
    });

    expect(result.journey_id).toBe('income_certificate');
    expect(result.citizen_profile.full_name).toBe(priyaSharma.full_name);

    // 3. Verify Normalized Data from all 3 departments
    expect(result.mgas_data.revenue_land_records?.survey_number).toBe('45/1A');
    expect(result.mgas_data.revenue_land_records?.land_area_hectares).toBe(1.45);

    expect(result.mgas_data.transport_records?.registered_vehicles.length).toBeGreaterThan(0);
    expect(result.mgas_data.transport_records?.registered_vehicles[0].registration_number).toBe('MH-12-AB-1234');

    expect(result.mgas_data.certificate_records?.income_certificate?.annual_income_inr).toBe(340000);

    // 4. Verify Identity Resolver Multi-Script Matching
    expect(result.execution_metrics.resolver_matches.length).toBeGreaterThan(0);
    expect(result.execution_metrics.resolver_matches[0].confidence).toBeGreaterThanOrEqual(0.90);

    // 5. Verify Mined Hash-Chain Audit Block
    expect(result.audit_block.index).toBeGreaterThan(0);
    expect(result.audit_block.block_hash.length).toBe(64);
  });

  it('should reject workflow execution if consent token is expired or invalid', async () => {
    const fakeCitizen = {
      full_name: 'Test Citizen',
      aadhaar_hash: 'fake_hash_123',
    };

    await expect(
      WorkflowEngine.executeJourney({
        journey_id: 'income_certificate',
        citizen: fakeCitizen,
        consent_token: 'INVALID_OR_EXPIRED_JWT_TOKEN',
      })
    ).rejects.toThrow('DEPA Consent Verification Failed');
  });
});
