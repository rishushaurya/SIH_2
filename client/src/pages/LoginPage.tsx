import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { api, ApiError, SessionUser } from '../api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTrilingual } from '../hooks/useTrilingual';

interface Persona {
  id: string;
  full_name: string;
  masked_id: string;
  district: string;
  role: SessionUser['role'];
  department_id?: string;
  scenario: string;
}

interface AuthConfig {
  demo_mode: boolean;
  oidc: { enabled: boolean; provider_name: string };
}

export const LoginPage: React.FC<{ onLogin: (user: SessionUser) => void }> = ({ onLogin }) => {
  const { t } = useTrilingual();
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [fieldError, setFieldError] = useState<{ name?: string; aadhaar?: string; form?: string }>({});
  // Error code handed back by the Meri Pehchaan callback redirect (/?login_error=...)
  const [providerError] = useState(() => new URLSearchParams(window.location.search).get('login_error'));

  const load = async () => {
    setLoadError(null);
    try {
      const cfg = await api<AuthConfig>('/api/v1/auth/config');
      setConfig(cfg);
      if (cfg.demo_mode) setPersonas((await api<{ personas: Persona[] }>('/api/v1/auth/personas')).personas);
    } catch (err: any) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    load();
    if (providerError) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const signIn = async (key: string, body: Record<string, string>) => {
    setBusy(key);
    setFieldError({});
    try {
      onLogin((await api<{ user: SessionUser }>('/api/v1/auth/sso/login', { body })).user);
    } catch (err) {
      const e = err as ApiError;
      setFieldError(e.code === 'INVALID_AADHAAR' ? { aadhaar: e.message } : { form: e.message });
    } finally {
      setBusy(null);
    }
  };

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      name: fullName.trim().length < 3 ? 'Enter the full name as registered.' : undefined,
      aadhaar: aadhaar.replace(/\D/g, '').length !== 12 ? 'Aadhaar has 12 digits.' : undefined,
    };
    if (errors.name || errors.aadhaar) return setFieldError(errors);
    signIn('custom', { full_name: fullName, aadhaar });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gov-navy)', marginBottom: '8px' }}>{t('login_title')}</h1>
      <p style={{ color: 'var(--gov-slate-600)', marginBottom: '28px', maxWidth: '760px' }}>{t('hero_desc')}</p>

      {providerError && (
        <div role="alert" className="card" style={{ padding: '14px 18px', marginBottom: '20px', borderColor: 'var(--gov-rose)', color: 'var(--gov-rose-dark)' }}>
          {t('login_failed')}: {providerError}
        </div>
      )}

      {/* Real citizen sign-in: Meri Pehchaan (OAuth 2.0 + PKCE) */}
      <section className="card" style={{ padding: '24px', marginBottom: '28px' }} aria-labelledby="meri-heading">
        <h2 id="meri-heading" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gov-navy)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} aria-hidden="true" /> {config?.oidc.provider_name ?? 'Meri Pehchaan'}
        </h2>
        {config?.oidc.enabled ? (
          <a href="/api/v1/auth/oidc/start" className="btn btn-saffron">
            <KeyRound size={18} aria-hidden="true" /> {t('login_meri')}
          </a>
        ) : (
          <p style={{ color: 'var(--gov-slate-600)', fontSize: '14px' }}>{t('login_meri_off')}</p>
        )}
      </section>

      {loadError && (
        <div role="alert" className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          <p style={{ marginBottom: '10px' }}>{loadError}</p>
          <button className="btn btn-ghost" onClick={load}>{t('btn_retry')}</button>
        </div>
      )}
      {!config && !loadError && <SkeletonLoader height="160px" count={2} />}

      {config?.demo_mode && (
        <>
          <section aria-labelledby="demo-heading" style={{ marginBottom: '28px' }}>
            <h2 id="demo-heading" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gov-navy)' }}>{t('login_demo_title')}</h2>
            <p style={{ color: 'var(--gov-slate-600)', fontSize: '14px', marginBottom: '14px' }}>{t('login_demo_desc')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {personas.map((p) => (
                <button
                  key={p.id}
                  className="card"
                  onClick={() => signIn(p.id, { persona_id: p.id })}
                  disabled={busy !== null}
                  aria-busy={busy === p.id}
                  style={{ padding: '16px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '44px' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--gov-slate-900)' }}>
                    <UserRound size={16} aria-hidden="true" /> {p.full_name}
                  </span>
                  <span className="mono" style={{ color: 'var(--gov-slate-600)' }}>
                    {p.masked_id} · {p.district}
                  </span>
                  <span className={`badge ${p.role === 'CITIZEN' ? 'badge-computed' : 'badge-confirm'}`} style={{ alignSelf: 'flex-start' }}>
                    {p.role.replace('_', ' ')}
                    {p.department_id ? ` · ${p.department_id}` : ''}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--gov-slate-600)' }}>{p.scenario}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: '24px' }} aria-labelledby="custom-heading">
            <h2 id="custom-heading" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gov-navy)' }}>{t('login_custom_title')}</h2>
            <p style={{ color: 'var(--gov-slate-600)', fontSize: '14px', marginBottom: '16px' }}>{t('login_custom_desc')}</p>
            <form onSubmit={submitCustom} noValidate style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', alignItems: 'start' }}>
              <div>
                <label htmlFor="custom-name" style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{t('field_full_name')}</label>
                <input
                  id="custom-name"
                  className="field-input"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={Boolean(fieldError.name)}
                  aria-describedby={fieldError.name ? 'custom-name-error' : undefined}
                />
                {fieldError.name && <p id="custom-name-error" className="field-error">{fieldError.name}</p>}
              </div>
              <div>
                <label htmlFor="custom-aadhaar" style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{t('field_aadhaar')}</label>
                <input
                  id="custom-aadhaar"
                  className="field-input mono"
                  inputMode="numeric"
                  autoComplete="off"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  aria-invalid={Boolean(fieldError.aadhaar)}
                  aria-describedby={fieldError.aadhaar ? 'custom-aadhaar-error' : undefined}
                />
                {fieldError.aadhaar && <p id="custom-aadhaar-error" className="field-error">{fieldError.aadhaar}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy !== null} style={{ marginTop: '24px' }}>
                {busy === 'custom' ? t('loading') : t('btn_login')}
              </button>
            </form>
            {fieldError.form && <p role="alert" className="field-error">{fieldError.form}</p>}
          </section>
        </>
      )}
    </div>
  );
};
