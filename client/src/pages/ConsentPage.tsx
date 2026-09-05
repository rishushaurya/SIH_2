import React, { useEffect, useState } from 'react';
import { ShieldCheck, Ban, CheckCircle2, RefreshCw } from 'lucide-react';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTrilingual } from '../hooks/useTrilingual';

export const ConsentPage: React.FC = () => {
  const { t } = useTrilingual();
  const [consents, setConsents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingJti, setRevokingJti] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchConsents = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('mahalink_auth_token');
      const res = await fetch('/api/v1/consent/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConsents(data.consents || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  const handleRevoke = async (jti: string) => {
    setRevokingJti(jti);
    setMessage(null);
    try {
      const token = localStorage.getItem('mahalink_auth_token');
      const res = await fetch(`/api/v1/consent/revoke/${encodeURIComponent(jti)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessage(data.message || 'Consent token successfully revoked.');
      await fetchConsents();
    } catch {
      setMessage('Failed to revoke consent token.');
    } finally {
      setRevokingJti(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gov-navy)' }}>
            {t('active_consents')}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--gov-slate-500)', marginTop: '4px' }}>
            Under DPDP Act 2023 Section 6(4), you maintain unconditional authority to inspect and revoke active data-sharing permissions at any time.
          </p>
        </div>

        <button
          onClick={fetchConsents}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--gov-slate-100)',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--gov-slate-700)',
            border: '1px solid var(--gov-slate-200)',
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', background: 'var(--gov-navy-bg)', color: 'var(--gov-navy)', borderRadius: '8px', border: '1px solid var(--gov-navy)', marginBottom: '20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* 4-State Consents Table */}
      {isLoading ? (
        <SkeletonLoader height="180px" count={2} />
      ) : consents.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--gov-slate-200)' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--gov-slate-100)', color: 'var(--gov-slate-400)', marginBottom: '12px' }}>
            <ShieldCheck size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gov-slate-800)', marginBottom: '6px' }}>
            {t('no_consents')}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--gov-slate-500)' }}>
            When you apply for a citizen service, your granted DPDP consent tokens will appear here for auditability and revocation.
          </p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--gov-slate-50)', borderBottom: '1px solid var(--gov-slate-200)', color: 'var(--gov-slate-600)', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Token Identifier (JTI)</th>
                <th style={{ padding: '14px 20px' }}>Purpose / Service</th>
                <th style={{ padding: '14px 20px' }}>Departments</th>
                <th style={{ padding: '14px 20px' }}>Issued / Expiry</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {consents.map((c) => (
                <tr key={c.jti} style={{ borderBottom: '1px solid var(--gov-slate-100)' }}>
                  <td style={{ padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--gov-slate-700)' }}>
                    {c.jti.slice(0, 18)}...
                  </td>
                  <td style={{ padding: '16px 20px', fontWeight: 600, color: 'var(--gov-slate-900)' }}>
                    {c.purpose}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.departments.map((d: string) => (
                        <span key={d} style={{ background: 'var(--gov-slate-100)', color: 'var(--gov-slate-700)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', textTransform: 'capitalize' }}>
                          {d}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--gov-slate-500)', fontSize: '12px' }}>
                    <div>Issued: {new Date(c.issued_at).toLocaleTimeString()}</div>
                    <div>Expires: {new Date(c.expires_at).toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background:
                          c.status === 'ACTIVE'
                            ? 'var(--gov-emerald-bg)'
                            : c.status === 'REVOKED'
                            ? 'var(--gov-rose-bg)'
                            : 'var(--gov-slate-100)',
                        color:
                          c.status === 'ACTIVE'
                            ? 'var(--gov-emerald-dark)'
                            : c.status === 'REVOKED'
                            ? 'var(--gov-rose-dark)'
                            : 'var(--gov-slate-500)',
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {c.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevoke(c.jti)}
                        disabled={revokingJti === c.jti}
                        style={{
                          background: 'var(--gov-rose)',
                          color: '#FFFFFF',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Ban size={12} />
                        <span>{revokingJti === c.jti ? 'Revoking...' : t('btn_revoke')}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
