import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, ArrowLeft, Calculator, CheckCircle2, Database, PencilLine, Printer, Send, ShieldCheck } from 'lucide-react';
import { api, SessionUser } from '../api';
import { ConsentModal } from '../components/ConsentModal';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useFormPersist } from '../hooks/useFormPersist';
import { useTrilingual } from '../hooks/useTrilingual';

type DeptStatus = 'VERIFIED' | 'VERIFICATION_REQUIRED' | 'IDENTITY_MISMATCH' | 'NOT_FOUND' | 'UNAVAILABLE';

interface DepartmentResult {
  department: string;
  status: DeptStatus;
  confidence?: number;
  source?: 'live' | 'demo-fixture';
  verified_source?: string;
  duration_ms: number;
}

interface ExecutionResult {
  consent_jti: string;
  form_values: Record<string, string>;
  department_status: DepartmentResult[];
  missing_documents: Array<{ department: string; missing_record_type: string; citizen_guidance_en: string; citizen_guidance_mr: string; portal_url: string }>;
  mgas_data: { verification_summary: { sources_verified: string[] } };
  audit_block: { index: number; block_hash: string };
  execution_metrics: { total_duration_ms: number };
}

interface Receipt {
  reference: string;
  audit_block: { index: number; block_hash: string; timestamp: string };
}

const DEPARTMENT_LABEL: Record<string, string> = {
  revenue: 'Revenue · Mahabhumi 7/12 (PostgreSQL)',
  rto: 'Transport · Sarathi & Vahan (MySQL)',
  certificates: 'Certificates · e-District (MongoDB)',
  education: 'Education Board · HSC (legacy CSV)',
};

const STATUS_TEXT: Record<DeptStatus, string> = {
  VERIFIED: 'Verified',
  VERIFICATION_REQUIRED: 'Name differs: confirm',
  IDENTITY_MISMATCH: 'Withheld: name mismatch',
  NOT_FOUND: 'No record',
  UNAVAILABLE: 'System unavailable',
};

interface FormWizardPageProps {
  journeyId: string;
  user: SessionUser;
  onBack: () => void;
}

export const FormWizardPage: React.FC<FormWizardPageProps> = ({ journeyId, user, onBack }) => {
  const { t, locale } = useTrilingual();
  const [journey, setJourney] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [proof, setProof] = useState<string | null>(null);

  // Draft survives reloads in this tab only (sessionStorage), and is cleared on submit and logout.
  const [formData, setFormData, clearDraft] = useFormPersist<Record<string, string>>(`${user.masked_id ?? user.full_name}_${journeyId}`, {});

  const loadJourney = async () => {
    setLoadError(null);
    try {
      setJourney((await api(`/api/v1/workflows/${journeyId}`)).workflow);
    } catch (err: any) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    loadJourney();
  }, [journeyId]);

  // Consent -> signed artifact -> federated fetch. Scope is decided by the server from the journey config.
  const handleGrantConsent = async () => {
    setIsAutoFilling(true);
    setIsConsentModalOpen(false);
    setError(null);
    try {
      const consent = await api('/api/v1/consent/grant', { body: { journey_id: journeyId } });
      const exec = await api(`/api/v1/workflows/${journeyId}/execute`, { body: { consent_token: consent.consent_token } });
      setResult(exec.result);
      setConfirmed({});
      setFormData((prev) => ({ ...prev, ...exec.result.form_values }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const fieldStatus = (field: any): DeptStatus | 'COMPUTED' | undefined => {
    if (!result) return undefined;
    if (field.source === 'identity') return 'VERIFIED';
    if (field.source === 'computed') return result.form_values[field.key] ? 'COMPUTED' : undefined;
    return result.department_status.find((d) => d.department === field.source)?.status;
  };

  const needsConfirmation = result?.department_status.filter((d) => d.status === 'VERIFICATION_REQUIRED') ?? [];
  const canSubmit = needsConfirmation.every((d) => confirmed[d.department]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const keys = new Set(journey.form_fields.map((f: any) => f.key));
      const form_values = Object.fromEntries(Object.entries(formData).filter(([k, v]) => keys.has(k) && String(v).trim() !== ''));
      setReceipt(await api('/api/v1/applications', { body: { journey_id: journeyId, consent_jti: result?.consent_jti, form_values } }));
      clearDraft();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyReceipt = async () => {
    const res = await api(`/api/v1/audit/proof/${receipt!.audit_block.block_hash}`);
    setProof(
      res.found && res.chain_intact
        ? `Verified: block #${res.block.index} (${res.block.action}) is part of an intact SHA-256 chain.`
        : 'NOT VERIFIED: block missing or the audit chain has been tampered with.'
    );
  };

  if (loadError) {
    return (
      <div role="alert" className="card" style={{ maxWidth: '700px', margin: '40px auto', padding: '24px' }}>
        <p style={{ marginBottom: '12px' }}>{loadError}</p>
        <button className="btn btn-ghost" onClick={loadJourney}>{t('btn_retry')}</button>
      </div>
    );
  }

  if (!journey) {
    return (
      <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
        <SkeletonLoader height="300px" count={2} />
      </div>
    );
  }

  if (receipt) {
    return (
      <div style={{ maxWidth: '760px', margin: '40px auto', padding: '0 24px' }}>
        <div className="card" style={{ padding: '40px 32px', textAlign: 'center' }}>
          <CheckCircle2 size={44} color="#047857" aria-hidden="true" />
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gov-navy)', margin: '12px 0' }}>{t('receipt_title')}</h1>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', textAlign: 'left', margin: '24px auto', maxWidth: '560px', fontSize: '14px' }}>
            <dt style={{ fontWeight: 700 }}>{t('receipt_reference')}</dt>
            <dd className="mono" style={{ fontSize: '15px', fontWeight: 700 }}>{receipt.reference}</dd>
            <dt style={{ fontWeight: 700 }}>Service</dt>
            <dd>{journey.title_en}</dd>
            <dt style={{ fontWeight: 700 }}>Submitted</dt>
            <dd>{new Date(receipt.audit_block.timestamp).toLocaleString()}</dd>
            <dt style={{ fontWeight: 700 }}>Audit block</dt>
            <dd className="mono" style={{ wordBreak: 'break-all' }}>#{receipt.audit_block.index} · {receipt.audit_block.block_hash}</dd>
          </dl>
          <p style={{ fontSize: '13px', color: 'var(--gov-slate-600)', marginBottom: '20px' }}>
            MahaLink keeps only a SHA-256 digest of this form in its audit ledger; the form itself goes to the department.
          </p>
          {proof && (
            <p role="status" style={{ fontWeight: 600, marginBottom: '16px', color: proof.startsWith('Verified') ? 'var(--gov-emerald-dark)' : 'var(--gov-rose-dark)' }}>
              {proof}
            </p>
          )}
          <div className="no-print" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={verifyReceipt}>
              <ShieldCheck size={16} aria-hidden="true" /> {t('btn_verify_receipt')}
            </button>
            <button className="btn btn-ghost" onClick={() => window.print()}>
              <Printer size={16} aria-hidden="true" /> {t('btn_print')}
            </button>
            <button className="btn btn-primary" onClick={onBack}>{t('nav_services')}</button>
          </div>
        </div>
      </div>
    );
  }

  const journeyTitle = locale === 'mr' ? journey.title_mr : locale === 'hi' ? journey.title_hi : journey.title_en;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <button onClick={onBack} className="btn" style={{ color: 'var(--gov-navy)', padding: '8px 0', marginBottom: '12px' }}>
        <ArrowLeft size={16} aria-hidden="true" /> {t('nav_services')}
      </button>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ background: 'var(--gov-navy)', color: '#FFFFFF', padding: '28px 32px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#FDBA74', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>
              Aaple Sarkar integration stub
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800 }}>{journeyTitle}</h1>
            <p style={{ fontSize: '13px', color: '#BFDBFE', marginTop: '6px' }}>{journey.description}</p>
          </div>
          {!result && (
            <button className="btn btn-saffron" onClick={() => setIsConsentModalOpen(true)} disabled={isAutoFilling} aria-busy={isAutoFilling}>
              <ShieldCheck size={18} aria-hidden="true" />
              {isAutoFilling ? t('loading') : 'Verify with MahaLink'}
            </button>
          )}
        </div>

        {error && (
          <div role="alert" style={{ margin: '24px 32px 0', padding: '16px', background: 'var(--gov-rose-bg)', borderRadius: '8px', border: '1px solid var(--gov-rose)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gov-rose-dark)', fontSize: '14px', fontWeight: 600 }}>
              <AlertTriangle size={18} aria-hidden="true" /> {error}
            </span>
            {!result && <button className="btn btn-ghost" onClick={() => setIsConsentModalOpen(true)}>{t('btn_retry')}</button>}
          </div>
        )}

        {result && (
          <section aria-labelledby="dept-status-heading" style={{ margin: '24px 32px 0' }}>
            <h2 id="dept-status-heading" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gov-slate-700)', marginBottom: '10px' }}>
              {t('dept_status_title')} · {result.execution_metrics.total_duration_ms} ms · audit block #{result.audit_block.index}
            </h2>
            <ul style={{ listStyle: 'none', display: 'grid', gap: '8px' }}>
              {result.department_status.map((d) => (
                <li key={d.department} className="card" style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center', fontSize: '13px' }}>
                  <Database size={16} aria-hidden="true" color="var(--gov-navy)" />
                  <strong style={{ minWidth: '260px' }}>{DEPARTMENT_LABEL[d.department] ?? d.department}</strong>
                  <StatusBadge status={d.status} label={STATUS_TEXT[d.status]} />
                  {d.confidence !== undefined && <span>match {(d.confidence * 100).toFixed(1)}%</span>}
                  {d.verified_source && <span className="mono">{d.verified_source}</span>}
                  <span className="mono" style={{ color: 'var(--gov-slate-600)' }}>{d.duration_ms} ms</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {result?.missing_documents.map((alert, idx) => (
          <div key={idx} role="note" style={{ margin: '12px 32px 0', padding: '14px 18px', background: 'var(--gov-amber-bg)', borderRadius: '8px', border: '1px solid var(--gov-amber)', display: 'flex', gap: '12px' }}>
            <AlertCircle size={18} color="#92400E" style={{ marginTop: '2px', flexShrink: 0 }} aria-hidden="true" />
            <div style={{ fontSize: '13px', color: 'var(--gov-amber-dark)' }}>
              <div style={{ fontWeight: 700 }}>{alert.missing_record_type}</div>
              <div>{locale === 'mr' ? alert.citizen_guidance_mr : alert.citizen_guidance_en}</div>
              <a href={alert.portal_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{alert.portal_url}</a>
            </div>
          </div>
        ))}

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {journey.form_fields.map((field: any) => {
              const label = locale === 'mr' ? field.label_mr : field.label_en;
              const status = fieldStatus(field);
              const autoFilled = Boolean(result?.form_values[field.key]);
              return (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor={`field-${field.key}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gov-slate-700)' }}>
                      {label}
                    </label>
                    {status && (status !== 'VERIFIED' || autoFilled) && <FieldBadge status={status} t={t} />}
                  </div>
                  <input
                    id={`field-${field.key}`}
                    type="text"
                    className="field-input"
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    style={autoFilled ? { borderColor: 'var(--gov-emerald)', background: '#F0FDF4', fontWeight: 600 } : undefined}
                  />
                </div>
              );
            })}
          </div>

          {needsConfirmation.map((d) => (
            <label key={d.department} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px', fontSize: '14px', minHeight: '44px' }}>
              <input
                type="checkbox"
                checked={Boolean(confirmed[d.department])}
                onChange={(e) => setConfirmed((prev) => ({ ...prev, [d.department]: e.target.checked }))}
                style={{ width: '20px', height: '20px' }}
              />
              {t('confirm_record').replace('{dept}', DEPARTMENT_LABEL[d.department] ?? d.department)}
            </label>
          ))}

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--gov-slate-200)', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--gov-slate-600)' }}>Draft kept in this browser tab only; cleared on submit or logout.</span>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit || submitting} aria-busy={submitting}>
              <Send size={16} aria-hidden="true" /> {submitting ? t('loading') : t('btn_submit_app')}
            </button>
          </div>
        </form>
      </div>

      <ConsentModal
        isOpen={isConsentModalOpen}
        journey={journey}
        onGrant={handleGrantConsent}
        onDeny={() => setIsConsentModalOpen(false)}
        isLoading={isAutoFilling}
      />
    </div>
  );
};

const StatusBadge: React.FC<{ status: DeptStatus; label: string }> = ({ status, label }) => {
  const [cls, Icon] =
    status === 'VERIFIED' ? ['badge-verified', CheckCircle2] : status === 'VERIFICATION_REQUIRED' ? ['badge-confirm', AlertTriangle] : ['badge-manual', PencilLine];
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} aria-hidden="true" /> {label}
    </span>
  );
};

const FieldBadge: React.FC<{ status: DeptStatus | 'COMPUTED'; t: (k: string) => string }> = ({ status, t }) => {
  if (status === 'COMPUTED') {
    return (
      <span className="badge badge-computed">
        <Calculator size={12} aria-hidden="true" /> {t('badge_computed')}
      </span>
    );
  }
  const key = status === 'VERIFIED' ? 'badge_verified' : status === 'VERIFICATION_REQUIRED' ? 'badge_confirm' : 'badge_manual';
  return <StatusBadge status={status} label={t(key)} />;
};
