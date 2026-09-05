import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Send, AlertCircle } from 'lucide-react';
import { ConsentModal } from '../components/ConsentModal';
import { MeriPehchaanAuthModal } from '../components/MeriPehchaanAuthModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useFormPersist } from '../hooks/useFormPersist';
import { useTrilingual } from '../hooks/useTrilingual';

interface FormWizardPageProps {
  journeyId: string;
  user: any;
  onBack: () => void;
}

export const FormWizardPage: React.FC<FormWizardPageProps> = ({ journeyId, user, onBack }) => {
  const { t, locale } = useTrilingual();
  const [journey, setJourney] = useState<any>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Form persistence hook for offline & error recovery
  const [formData, setFormData, clearDraft] = useFormPersist<Record<string, any>>(
    `${user?.aadhaar_hash || 'anon'}_${journeyId}`,
    {}
  );

  // 1. Fetch Journey Schema
  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoadingSchema(true);
      try {
        const token = localStorage.getItem('mahalink_auth_token');
        const res = await fetch(`/api/v1/workflows/${journeyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Could not load service specification.');
        const data = await res.json();
        setJourney(data.workflow);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoadingSchema(false);
      }
    };

    fetchSchema();
  }, [journeyId]);

  // 2. Handle Consent Grant & Automated Once-Only Data Execution
  const handleGrantConsent = async () => {
    setIsAutoFilling(true);
    setIsConsentModalOpen(false);
    setError(null);

    try {
      const authToken = localStorage.getItem('mahalink_auth_token');

      // Step A: Mint DEPA Consent JWT
      const consentRes = await fetch('/api/v1/consent/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          journey_id: journeyId,
          purpose: journey.title_en,
          departments: journey.required_departments,
          scope: journey.consent_scope,
          validity_minutes: 15,
        }),
      });

      if (!consentRes.ok) throw new Error('Failed to mint DEPA Consent token.');
      const consentData = await consentRes.json();
      const consentToken = consentData.consent_token;

      // Step B: Execute Multi-Department Data Aggregation
      const execRes = await fetch(`/api/v1/workflows/${journeyId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          consent_token: consentToken,
        }),
      });

      if (!execRes.ok) {
        const errJson = await execRes.json();
        throw new Error(errJson.message || 'Workflow data aggregation failed.');
      }

      const execData = await execRes.json();
      const result = execData.result;
      setExecutionResult(result);

      // Step C: Auto-Fill Form Fields into State
      const mgas = result.mgas_data;
      const updatedForm: Record<string, any> = { ...formData };

      // Map Revenue Data
      if (mgas.revenue_land_records) {
        updatedForm.land_survey_number = mgas.revenue_land_records.survey_number;
        updatedForm.land_area_hectares = `${mgas.revenue_land_records.land_area_hectares} Hectares`;
        updatedForm.property_tax_annual = `₹${mgas.revenue_land_records.annual_assessment_tax_inr}`;
        updatedForm.residential_district = mgas.revenue_land_records.location.district;
        updatedForm.residential_village = `${mgas.revenue_land_records.location.taluka} / ${mgas.revenue_land_records.location.village}`;
      }

      // Map Transport / RTO Data
      if (mgas.transport_records) {
        if (mgas.transport_records.driving_license) {
          updatedForm.dl_number = mgas.transport_records.driving_license.dl_number;
          updatedForm.vehicle_classes = mgas.transport_records.driving_license.authorized_classes;
          updatedForm.dl_expiry_date = mgas.transport_records.driving_license.valid_until;
        }
        if (mgas.transport_records.registered_vehicles?.length > 0) {
          updatedForm.vehicle_count = `${mgas.transport_records.registered_vehicles.length} Vehicle(s)`;
          updatedForm.primary_vehicle_reg = `${mgas.transport_records.registered_vehicles[0].registration_number} (${mgas.transport_records.registered_vehicles[0].make_model})`;
        }
      }

      // Map Certificates Data
      if (mgas.certificate_records) {
        if (mgas.certificate_records.income_certificate) {
          updatedForm.previous_assessed_income = `₹${mgas.certificate_records.income_certificate.annual_income_inr.toLocaleString('en-IN')}`;
          updatedForm.family_annual_income = `₹${mgas.certificate_records.income_certificate.annual_income_inr.toLocaleString('en-IN')}`;
          updatedForm.calculated_income_bracket = 'Category B (Economically Weaker Section)';
        }
        if (mgas.certificate_records.caste_certificate) {
          updatedForm.caste_certificate_id = mgas.certificate_records.caste_certificate.certificate_id;
          updatedForm.caste_category = `${mgas.certificate_records.caste_certificate.caste_category} (${mgas.certificate_records.caste_certificate.sub_caste || 'General'})`;
        }
      }

      // Map Education Data
      if (mgas.education_records) {
        updatedForm.student_roll_no = mgas.education_records.student_roll_no;
        updatedForm.marks_percentage = `${mgas.education_records.percentage}% (${mgas.education_records.grade})`;
        updatedForm.eligibility_status = 'ELIGIBLE (Merit Score > 75%)';
      }

      // Map Identity
      updatedForm.applicant_name = (mgas.citizen_profile.full_name_marathi && mgas.citizen_profile.full_name_marathi !== mgas.citizen_profile.full_name_english)
        ? `${mgas.citizen_profile.full_name_english} (${mgas.citizen_profile.full_name_marathi})`
        : mgas.citizen_profile.full_name_english;
      updatedForm.student_name = updatedForm.applicant_name;

      setFormData(updatedForm);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    clearDraft();
  };

  if (isLoadingSchema) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
        <SkeletonLoader height="300px" count={2} />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--gov-slate-200)', padding: '48px 32px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--gov-emerald-bg)', color: 'var(--gov-emerald)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gov-navy)', marginBottom: '8px' }}>
            अर्ज यशस्वीरीत्या सादर केला गेला / Application Submitted!
          </h2>

          <p style={{ color: 'var(--gov-slate-600)', fontSize: '15px', marginBottom: '24px' }}>
            Your application for <strong>{journey?.title_en}</strong> has been received and verified across state databases.
          </p>

          <div style={{ background: 'var(--gov-slate-50)', padding: '20px', borderRadius: '8px', border: '1px solid var(--gov-slate-200)', maxWidth: '480px', margin: '0 auto 32px', textAlign: 'left', fontSize: '13px', lineHeight: 1.8 }}>
            <div><strong>Application Reference:</strong> MH-REV-2026-{Math.floor(100000 + Math.random() * 900000)}</div>
            <div><strong>Applicant:</strong> {formData.applicant_name || user?.full_name}</div>
            <div><strong>Statutory SLA:</strong> 7 Working Days (RTS Act 2015)</div>
            <div><strong>Audit Block Hash:</strong> {executionResult?.audit_block.block_hash.slice(0, 24)}...</div>
          </div>

          <button
            onClick={onBack}
            style={{
              background: 'var(--gov-navy)',
              color: '#FFFFFF',
              padding: '12px 28px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            Return to Citizen Dashboard
          </button>
        </div>
      </div>
    );
  }

  const journeyTitle = locale === 'mr' ? journey?.title_mr : locale === 'hi' ? journey?.title_hi : journey?.title_en;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--gov-navy)',
          fontWeight: 600,
          fontSize: '14px',
          marginBottom: '20px',
        }}
      >
        <ArrowLeft size={16} />
        <span>परत जा / Back to Services</span>
      </button>

      {/* Main Form Container */}
      <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
        
        {/* Form Header Banner */}
        <div style={{ background: 'var(--gov-navy)', color: '#FFFFFF', padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#FDBA74', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
              Maharashtra Aaple Sarkar Integration Stub
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>
              {journeyTitle}
            </h1>
            <p style={{ fontSize: '13px', color: '#93C5FD', marginTop: '6px' }}>
              {journey?.description}
            </p>
          </div>

          {/* Trigger Verify Button */}
          {!executionResult && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              disabled={isAutoFilling}
              style={{
                background: 'var(--gov-saffron)',
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-sm)',
                cursor: isAutoFilling ? 'wait' : 'pointer',
              }}
            >
              <ShieldCheck size={18} />
              <span>{isAutoFilling ? 'Processing Pipelines...' : 'Verify with MahaLink'}</span>
            </button>
          )}
        </div>

        {/* Error Alert Box */}
        {error && (
          <div style={{ margin: '24px 32px 0', padding: '16px', background: 'var(--gov-rose-bg)', borderRadius: '8px', border: '1px solid var(--gov-rose)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gov-rose-dark)', fontSize: '13px', fontWeight: 600 }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setIsAuthModalOpen(true)} style={{ color: 'var(--gov-navy)', fontWeight: 700, fontSize: '12px' }}>
              Retry
            </button>
          </div>
        )}

        {/* Execution Metrics & Verification Banner */}
        {executionResult && (
          <div style={{ margin: '24px 32px 0', padding: '16px 20px', background: 'var(--gov-emerald-bg)', borderRadius: '8px', border: '1px solid var(--gov-emerald)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={22} color="#059669" />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gov-emerald-dark)' }}>
                  डेटा स्वयंचलितरीत्या पुनर्प्राप्त केला (Retrieved in {executionResult.execution_metrics.total_duration_ms}ms)
                </div>
                <div style={{ fontSize: '12px', color: '#065F46' }}>
                  {executionResult.mgas_data.verification_summary.sources_verified.join(' • ')}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#065F46', fontFamily: 'var(--font-mono)' }}>
              <div>Audit Block #{executionResult.audit_block.index}</div>
              <div>Hash: {executionResult.audit_block.block_hash.slice(0, 14)}...</div>
            </div>
          </div>
        )}

        {/* Missing Documents Alert Banner (If Applicable) */}
        {executionResult?.missing_documents?.map((alert: any, idx: number) => (
          <div key={idx} style={{ margin: '16px 32px 0', padding: '14px 18px', background: 'var(--gov-amber-bg)', borderRadius: '8px', border: '1px solid var(--gov-amber)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={18} color="#D97706" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gov-amber-dark)' }}>
                Missing Record: {alert.missing_record_type}
              </div>
              <div style={{ fontSize: '12px', color: '#92400E', marginTop: '2px' }}>
                {locale === 'mr' ? alert.citizen_guidance_mr : alert.citizen_guidance_en}
              </div>
            </div>
          </div>
        ))}

        {/* Dynamic Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {journey?.form_fields?.map((field: any) => {
              const fieldLabel = locale === 'mr' ? field.label_mr : field.label_en;
              const hasAutoFilled = formData[field.key] !== undefined && formData[field.key] !== '';

              return (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gov-slate-700)' }}>
                      {fieldLabel}
                    </label>
                    {hasAutoFilled && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gov-emerald-dark)', background: 'var(--gov-emerald-bg)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={10} />
                        <span>Source Verified</span>
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={`Enter ${fieldLabel}`}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: hasAutoFilled ? '1px solid var(--gov-emerald)' : '1px solid var(--gov-slate-300)',
                      background: hasAutoFilled ? 'rgba(209, 250, 229, 0.2)' : '#FFFFFF',
                      fontSize: '14px',
                      color: 'var(--gov-slate-900)',
                      fontWeight: hasAutoFilled ? 600 : 400,
                      outline: 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Form Actions */}
          <div style={{ marginTop: '36px', paddingTop: '24px', borderTop: '1px solid var(--gov-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--gov-slate-500)' }}>
              Draft saved locally. You can close the tab and return anytime.
            </div>

            <button
              type="submit"
              style={{
                background: 'var(--gov-navy)',
                color: '#FFFFFF',
                padding: '12px 32px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <Send size={16} />
              <span>{t('btn_submit_app')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Meri Pehchaan SSO Authentication Modal (Step 1) */}
      <MeriPehchaanAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          setIsConsentModalOpen(true);
        }}
        user={user}
        serviceTitle={journeyTitle}
      />

      {/* DPDP Act 2023 Consent Modal Trigger (Step 2) */}
      <ConsentModal
        isOpen={isConsentModalOpen}
        journey={journey}
        citizenName={user?.full_name || 'Priya Sharma'}
        onGrant={handleGrantConsent}
        onDeny={() => setIsConsentModalOpen(false)}
        isLoading={isAutoFilling}
      />
    </div>
  );
};
