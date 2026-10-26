import React, { useEffect, useState } from 'react';
import { Ban, CheckCircle2, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTrilingual } from '../hooks/useTrilingual';

interface Consent {
  jti: string;
  purpose: string;
  departments: string[];
  scope: string[];
  issued_at: number;
  expires_at: number;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

interface AccessEntry {
  index: number;
  timestamp: string;
  action: string;
  department?: string;
  purpose: string;
  consent_jti?: string;
  block_hash: string;
}

const STATUS_CLASS: Record<Consent['status'], string> = { ACTIVE: 'badge-verified', REVOKED: 'badge-confirm', EXPIRED: 'badge-manual' };

export const ConsentPage: React.FC = () => {
  const { t } = useTrilingual();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [entries, setEntries] = useState<AccessEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revokingJti, setRevokingJti] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [history, passbook] = await Promise.all([api('/api/v1/consent/history'), api('/api/v1/audit/me?limit=100')]);
      setConsents(history.consents);
      setEntries(passbook.entries);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRevoke = async (jti: string) => {
    setRevokingJti(jti);
    try {
      setMessage((await api(`/api/v1/consent/revoke/${encodeURIComponent(jti)}`, { method: 'POST' })).message);
      await load();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setRevokingJti(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gov-navy)' }}>{t('active_consents')}</h1>
          <p style={{ fontSize: '14px', color: 'var(--gov-slate-600)', marginTop: '4px' }}>
            DPDP Act 2023 s.6(4): you can withdraw consent as easily as you gave it. Revocation stops all further department access immediately.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={14} aria-hidden="true" /> {t('btn_retry')}
        </button>
      </div>

      {message && (
        <div role="status" className="card" style={{ padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gov-navy)' }}>
          <CheckCircle2 size={16} aria-hidden="true" /> {message}
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader height="180px" count={2} />
      ) : loadError ? (
        <div role="alert" className="card" style={{ padding: '24px' }}>
          <p style={{ marginBottom: '12px' }}>{loadError}</p>
          <button className="btn btn-ghost" onClick={load}>{t('btn_retry')}</button>
        </div>
      ) : (
        <>
          {consents.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <ShieldCheck size={32} color="var(--gov-slate-400)" aria-hidden="true" />
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '8px 0' }}>{t('no_consents')}</h2>
            </div>
          ) : (
            <div className="card" style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <caption className="sr-only">{t('active_consents')}</caption>
                <thead>
                  <tr>
                    <th scope="col">Consent ID (jti)</th>
                    <th scope="col">Purpose</th>
                    <th scope="col">Departments / scope</th>
                    <th scope="col">Issued / expires</th>
                    <th scope="col">Status</th>
                    <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c) => (
                    <tr key={c.jti}>
                      <td className="mono">{c.jti.slice(9, 22)}…</td>
                      <td style={{ fontWeight: 600 }}>{c.purpose}</td>
                      <td>
                        {c.departments.join(', ')}
                        <div className="mono" style={{ color: 'var(--gov-slate-600)' }}>{c.scope.join(' · ')}</div>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <div>{new Date(c.issued_at).toLocaleString()}</div>
                        <div>{new Date(c.expires_at).toLocaleString()}</div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_CLASS[c.status]}`}>{c.status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {c.status === 'ACTIVE' && (
                          <button
                            className="btn"
                            style={{ background: 'var(--gov-rose-dark)', color: '#FFFFFF', padding: '6px 12px' }}
                            onClick={() => handleRevoke(c.jti)}
                            disabled={revokingJti === c.jti}
                          >
                            <Ban size={14} aria-hidden="true" /> {revokingJti === c.jti ? t('loading') : t('btn_revoke')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Privacy passbook: who accessed my data, when, and under which consent */}
          <section aria-labelledby="passbook-heading" style={{ marginTop: '40px' }}>
            <h2 id="passbook-heading" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gov-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} aria-hidden="true" /> {t('passbook_title')}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--gov-slate-600)', margin: '4px 0 16px' }}>{t('passbook_desc')}</p>
            {entries.length === 0 ? (
              <p className="card" style={{ padding: '24px' }}>{t('passbook_empty')}</p>
            ) : (
              <div className="card" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Event</th>
                      <th scope="col">Department</th>
                      <th scope="col">Purpose</th>
                      <th scope="col">Audit block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.index}>
                        <td style={{ fontSize: '12px' }}>{new Date(e.timestamp).toLocaleString()}</td>
                        <td>
                          <span className="badge badge-computed">{e.action}</span>
                        </td>
                        <td>{e.department ?? '—'}</td>
                        <td>{e.purpose}</td>
                        <td className="mono">
                          #{e.index} · {e.block_hash.slice(0, 12)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
