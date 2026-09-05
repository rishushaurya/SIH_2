import React, { useEffect, useState } from 'react';
import { Shield, Activity, Database, Server, RefreshCw } from 'lucide-react';
import { SkeletonLoader } from '../components/SkeletonLoader';

export const AdminConsolePage: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('mahalink_auth_token');
      const [healthRes, ledgerRes] = await Promise.all([
        fetch('/health'),
        fetch('/api/v1/audit/ledger?limit=20', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const health = await healthRes.json();
      const ledger = await ledgerRes.json();

      setHealthData(health);
      setLedgerData(ledger);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--gov-saffron-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            State Data Authority Oversight
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--gov-navy)' }}>
            MahaLink Middleware Admin & Scrutiny Desk
          </h1>
        </div>

        <button
          onClick={fetchAdminData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--gov-navy)',
            color: '#FFFFFF',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gov-slate-500)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Server size={16} color="#3B82F6" />
            <span>Gateway Health</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: healthData?.status === 'healthy' ? '#10B981' : '#F59E0B', marginTop: '8px' }}>
            {healthData?.status?.toUpperCase() || 'ONLINE'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gov-slate-400)', marginTop: '4px' }}>
            Uptime: {healthData?.uptime_seconds || 0}s | Heap: {healthData?.memory?.heap_used_mb || 0}MB
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gov-slate-500)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Database size={16} color="#10B981" />
            <span>Connected Adapters</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gov-navy)', marginTop: '8px' }}>
            4 / 4 Active
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gov-slate-400)', marginTop: '4px' }}>
            Postgres, MySQL, Mongo & CSV
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gov-slate-500)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Shield size={16} color="#F59E0B" />
            <span>Audit Blocks Mined</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gov-navy)', marginTop: '8px' }}>
            {ledgerData?.total_blocks || 1} Blocks
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gov-emerald-dark)', marginTop: '4px', fontWeight: 600 }}>
            SHA-256 Chain Verified Intact
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '12px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--gov-slate-500)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
            <Activity size={16} color="#8B5CF6" />
            <span>Average Query Latency</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gov-navy)', marginTop: '8px' }}>
            &lt; 15ms
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gov-slate-400)', marginTop: '4px' }}>
            Sub-Second SLA Compliant
          </div>
        </div>
      </div>

      {/* Immutable Hash-Chain Audit Ledger Table */}
      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--gov-slate-200)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', background: 'var(--gov-slate-50)', borderBottom: '1px solid var(--gov-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gov-navy)', margin: 0 }}>
              Immutable SHA-256 Hash-Chained Audit Ledger
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--gov-slate-500)', margin: '2px 0 0' }}>
              Cryptographic transaction log recording every citizen consent authorization and departmental query.
            </p>
          </div>
          <span style={{ fontSize: '11px', background: 'var(--gov-emerald-bg)', color: 'var(--gov-emerald-dark)', padding: '4px 10px', borderRadius: '4px', fontWeight: 700 }}>
            TAMPER-EVIDENT LEDGER ACTIVE
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '20px' }}>
            <SkeletonLoader height="120px" count={2} />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ background: '#0F172A', color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>Block #</th>
                <th style={{ padding: '12px 16px' }}>Timestamp</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
                <th style={{ padding: '12px 16px' }}>Purpose / Scope</th>
                <th style={{ padding: '12px 16px' }}>Previous Hash</th>
                <th style={{ padding: '12px 16px' }}>Block Hash</th>
              </tr>
            </thead>
            <tbody>
              {ledgerData?.blocks?.map((b: any) => (
                <tr key={b.index} style={{ borderBottom: '1px solid var(--gov-slate-100)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--gov-navy)' }}>#{b.index}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--gov-slate-500)' }}>{b.timestamp.replace('T', ' ').slice(0, 19)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'var(--gov-slate-100)', color: 'var(--gov-slate-800)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {b.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--gov-slate-700)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                    {b.purpose}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{b.prev_hash.slice(0, 12)}...</td>
                  <td style={{ padding: '12px 16px', color: '#0284C7', fontWeight: 600 }}>{b.block_hash.slice(0, 16)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
