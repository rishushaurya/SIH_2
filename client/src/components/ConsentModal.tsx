import React from 'react';
import { ShieldCheck, Lock, Clock, Building2, AlertCircle } from 'lucide-react';
import { useTrilingual } from '../hooks/useTrilingual';

interface ConsentModalProps {
  isOpen: boolean;
  journey: any;
  citizenName?: string;
  onGrant: () => void;
  onDeny: () => void;
  isLoading?: boolean;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  isOpen,
  journey,
  onGrant,
  onDeny,
  isLoading = false,
}) => {
  const { t } = useTrilingual();

  if (!isOpen || !journey) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          maxWidth: '620px',
          width: '100%',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          border: '1px solid var(--gov-slate-300)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--gov-navy)',
            color: '#FFFFFF',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              background: 'var(--gov-saffron)',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={24} color="#FFFFFF" />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              {t('modal_consent_title')}
            </h3>
            <p style={{ fontSize: '12px', color: '#93C5FD', margin: 0 }}>
              Digital Personal Data Protection Act 2023 (Section 6 Verified Scope)
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* Purpose Box */}
          <div style={{ marginBottom: '20px', background: 'var(--gov-slate-50)', padding: '16px', borderRadius: '8px', border: '1px solid var(--gov-slate-200)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gov-slate-500)', textTransform: 'uppercase', marginBottom: '4px' }}>
              {t('modal_purpose')}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gov-slate-800)' }}>
              {journey.title_en} (#{journey.id.toUpperCase()}-2026)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gov-slate-600)', marginTop: '4px' }}>
              {journey.description}
            </div>
          </div>

          {/* Requested Departments & Scopes */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gov-slate-700)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="#003366" />
              <span>{t('modal_depts')} & Data Scopes</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {journey.required_departments.map((dept: string) => (
                <div
                  key={dept}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    border: '1px solid var(--gov-slate-200)',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--gov-navy)', textTransform: 'capitalize' }}>
                    {dept === 'revenue' && 'Revenue Department (Mahabhumi 7/12)'}
                    {dept === 'rto' && 'Transport Department (Sarathi & Vahan)'}
                    {dept === 'certificates' && 'Certificate Services (e-District MahaOnline)'}
                    {dept === 'education' && 'Higher Education Board (Marksheets)'}
                  </span>
                  <span style={{ fontSize: '11px', background: 'var(--gov-emerald-bg)', color: 'var(--gov-emerald-dark)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Read-Only (Transient)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Time Limit & Statutory Guard */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--gov-slate-600)', background: 'var(--gov-slate-100)', padding: '10px', borderRadius: '6px' }}>
              <Clock size={16} color="#64748B" />
              <span>Validity: <strong>15 Minutes</strong> (Single Use)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--gov-slate-600)', background: 'var(--gov-slate-100)', padding: '10px', borderRadius: '6px' }}>
              <Lock size={16} color="#64748B" />
              <span>Cryptographic Token: <strong>ECDSA P-256</strong></span>
            </div>
          </div>

          {/* Statutory DPDP Notice */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--gov-navy-bg)',
              border: '1px solid rgba(0, 51, 102, 0.2)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '12px',
              color: 'var(--gov-navy)',
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{t('modal_statutory')}</span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--gov-slate-50)',
            borderTop: '1px solid var(--gov-slate-200)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onDeny}
            disabled={isLoading}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: '1px solid var(--gov-slate-300)',
              background: '#FFFFFF',
              color: 'var(--gov-slate-700)',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            {t('btn_deny_consent')}
          </button>
          <button
            onClick={onGrant}
            disabled={isLoading}
            style={{
              padding: '10px 22px',
              borderRadius: '6px',
              background: 'var(--gov-saffron)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheck size={18} />
            <span>{isLoading ? 'Minting Token...' : t('btn_grant_consent')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
