import React, { useEffect, useState } from 'react';
import { Activity, Database, Download, RefreshCw, Server, Shield } from 'lucide-react';
import { api, SessionUser } from '../api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { useTrilingual } from '../hooks/useTrilingual';

interface AdapterHealth {
  status: 'UP' | 'DOWN';
  source: 'live' | 'demo-fixture';
  latency_ms: number;
  via?: 'mtls-security-server';
}

// /health answers 503 when degraded, so read it with fetch rather than the throwing api() helper.
const fetchHealth = async () => (await fetch('/health')).json();

export const AdminConsolePage: React.FC<{ user: SessionUser }> = ({ user }) => {
  const { t } = useTrilingual();
  const [health, setHealth] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [chain, setChain] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [h, l, c] = await Promise.all([fetchHealth(), api('/api/v1/audit/ledger?limit=50'), api('/api/v1/audit/verify', { method: 'POST' })]);
      setHealth(h);
      setLedger(l);
      setChain(c);
    } catch (err: any) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const adapters: Array<[string, AdapterHealth]> = health ? Object.entries(health.adapters) : [];
  const upCount = adapters.filter(([, a]) => a.status === 'UP').length;
  const liveCount = adapters.filter(([, a]) => a.status === 'UP' && a.source === 'live').length;
  const avgLatency = adapters.length ? Math.round(adapters.reduce((sum, [, a]) => sum + a.latency_ms, 0) / adapters.length) : 0;

  const metrics = [
    { icon: Server, label: 'Gateway', value: health?.status?.toUpperCase() ?? '—', note: `mode ${health?.mode ?? '—'} · uptime ${health?.uptime_seconds ?? 0}s` },
    { icon: Database, label: 'Department adapters', value: `${upCount} / ${adapters.length} up`, note: `${liveCount} live, ${upCount - liveCount} on seed fixtures` },
    { icon: Shield, label: 'Audit ledger', value: `${chain?.totalBlocks ?? 0} blocks`, note: chain ? (chain.isValid ? 'SHA-256 chain verified intact' : `TAMPERED: ${chain.message}`) : '—' },
    { icon: Activity, label: 'Adapter latency (avg)', value: `${avgLatency} ms`, note: 'measured by the last health probe' },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--gov-saffron-deep)', fontWeight: 700, textTransform: 'uppercase' }}>
            {user.role === 'SYS_ADMIN' ? 'State Data Authority oversight' : `Department desk · ${user.department_id}`}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gov-navy)' }}>MahaLink Admin & Scrutiny Desk</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {user.role === 'SYS_ADMIN' && (
            <a className="btn btn-ghost" href="/api/v1/audit/export" download>
              <Download size={14} aria-hidden="true" /> Export ledger (NDJSON)
            </a>
          )}
          <button className="btn btn-primary" onClick={load}>
            <RefreshCw size={14} aria-hidden="true" /> {t('btn_retry')}
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          {loadError}
        </div>
      )}

      {isLoading ? (
        <SkeletonLoader height="120px" count={3} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {metrics.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gov-slate-600)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                  <Icon size={16} aria-hidden="true" /> {label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--gov-navy)', marginTop: '8px' }}>{value}</div>
                <div style={{ fontSize: '12px', color: 'var(--gov-slate-600)', marginTop: '4px' }}>{note}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ overflowX: 'auto', marginBottom: '28px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Department system</th>
                  <th scope="col">Status</th>
                  <th scope="col">Data source</th>
                  <th scope="col">Latency</th>
                </tr>
              </thead>
              <tbody>
                {adapters.map(([name, a]) => (
                  <tr key={name}>
                    <td className="mono">{name}</td>
                    <td>
                      <span className={`badge ${a.status === 'UP' ? 'badge-verified' : 'badge-confirm'}`}>{a.status}</span>
                    </td>
                    <td>
                      {a.source === 'live' ? 'Live database' : 'Seed fixture (DEMO_MODE, database offline)'}
                      {a.via && ' · via mTLS security server'}
                    </td>
                    <td className="mono">{a.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gov-slate-200)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gov-navy)' }}>Hash-chained audit ledger · scope {ledger?.scope}</h2>
              <p style={{ fontSize: '12px', color: 'var(--gov-slate-600)' }}>Citizen identifiers are keyed hashes; no names or record contents are stored.</p>
            </div>
            <table className="data-table mono">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Action</th>
                  <th scope="col">Department</th>
                  <th scope="col">Purpose</th>
                  <th scope="col">Prev hash</th>
                  <th scope="col">Block hash</th>
                </tr>
              </thead>
              <tbody>
                {ledger?.blocks.map((b: any) => (
                  <tr key={b.index}>
                    <td style={{ fontWeight: 700 }}>{b.index}</td>
                    <td>{b.timestamp.replace('T', ' ').slice(0, 19)}</td>
                    <td>{b.action}</td>
                    <td>{b.department ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-sans)' }}>{b.purpose}</td>
                    <td>{b.prev_hash.slice(0, 10)}…</td>
                    <td>{b.block_hash.slice(0, 14)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
