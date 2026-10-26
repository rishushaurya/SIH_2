import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, FileText, Lock, Shield, Sparkles } from 'lucide-react';
import { api } from '../api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTrilingual } from '../hooks/useTrilingual';

interface HomePageProps {
  canApply: boolean;
  onSelectService: (serviceId: string) => void;
  onOpenConsole: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ canApply, onSelectService, onOpenConsole }) => {
  const { t, locale } = useTrilingual();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setWorkflows((await api('/api/v1/workflows')).workflows);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--gov-navy-dark) 0%, var(--gov-navy) 60%, #004d99 100%)',
          borderRadius: '16px',
          padding: '48px 40px',
          color: '#FFFFFF',
          marginBottom: '40px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '850px', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 102, 0, 0.2)',
              color: '#FDBA74',
              border: '1px solid rgba(255, 102, 0, 0.4)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={14} color="#F97316" />
            <span>{t('hero_tag')}</span>
          </div>

          <h1 style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1.25, marginBottom: '16px', letterSpacing: '-0.02em' }}>
            {t('hero_title')}
          </h1>

          <p style={{ fontSize: '16px', lineHeight: 1.6, color: '#E2E8F0', marginBottom: '28px' }}>
            {t('hero_desc')}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            <button
              onClick={() => {
                const element = document.getElementById('service-catalog');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'var(--gov-saffron)',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{t('btn_explore_services')}</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={onOpenConsole}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                backdropFilter: 'blur(8px)',
              }}
            >
              {t('btn_open_console')}
            </button>
          </div>
        </div>

        {/* 3 Core Architecture Pillars Pill Group */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '36px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#CBD5E1' }}>
            <CheckCircle2 size={16} color="#10B981" />
            <span>Zero Central Storage (Federated Adapters)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#CBD5E1' }}>
            <Lock size={16} color="#38BDF8" />
            <span>DPDP Act 2023 Compliant Consent Manager</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#CBD5E1' }}>
            <Shield size={16} color="#FBBF24" />
            <span>SHA-256 Hash-Chained Audit Ledger</span>
          </div>
        </div>
      </div>

      {/* Service Catalog Section */}
      <div id="service-catalog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gov-navy)', letterSpacing: '-0.01em' }}>
              {t('section_services')}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--gov-slate-500)' }}>
              Select a citizen service to experience Once-Only cross-department auto-fill in action.
            </p>
          </div>
        </div>

        {/* 4-State Service Grid Handling */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            <SkeletonLoader height="220px" count={3} />
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', background: 'var(--gov-rose-bg)', borderRadius: '12px', border: '1px solid var(--gov-rose)' }}>
            <div style={{ color: 'var(--gov-rose-dark)', fontWeight: 700, marginBottom: '8px' }}>Failed to load services directory</div>
            <p style={{ color: 'var(--gov-slate-600)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={fetchWorkflows}
              style={{ background: 'var(--gov-navy)', color: '#FFFFFF', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
            >
              Retry Loading Services
            </button>
          </div>
        ) : workflows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--gov-slate-200)' }}>
            <p style={{ color: 'var(--gov-slate-500)', fontSize: '14px' }}>No services available in the registry.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {workflows.map((wf) => {
              const title = locale === 'mr' ? wf.title_mr : locale === 'hi' ? wf.title_hi : wf.title_en;
              return (
                <div
                  key={wf.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--gov-slate-200)',
                    boxShadow: 'var(--shadow-sm)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gov-navy)', background: 'var(--gov-navy-bg)', padding: '3px 8px', borderRadius: '4px' }}>
                        {wf.category || 'e-District Service'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gov-emerald-dark)', background: 'var(--gov-emerald-bg)', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} />
                        <span>Auto-Fill Ready</span>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gov-slate-900)', marginBottom: '8px' }}>
                      {title}
                    </h3>

                    <p style={{ fontSize: '13px', color: 'var(--gov-slate-600)', lineHeight: 1.5, marginBottom: '20px' }}>
                      {wf.description}
                    </p>

                    {/* Department Badges */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--gov-slate-400)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                        Integrated Departments:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {wf.required_departments.map((dept: string) => (
                          <span
                            key={dept}
                            style={{
                              fontSize: '11px',
                              background: 'var(--gov-slate-100)',
                              color: 'var(--gov-slate-700)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--gov-slate-200)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              textTransform: 'capitalize',
                            }}
                          >
                            <Building2 size={12} color="#64748B" />
                            <span>{dept}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectService(wf.id)}
                    disabled={!canApply}
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'var(--gov-navy)',
                      color: '#FFFFFF',
                      padding: '10px 16px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <FileText size={16} aria-hidden="true" />
                    <span>{canApply ? t('btn_apply') : t('citizens_only')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
