import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Shield, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface InspectionEvent {
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

interface InspectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InspectionPanel: React.FC<InspectionPanelProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<InspectionEvent[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const eventSource = new EventSource('/api/v1/events/stream');

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.type && parsed.type !== 'CONNECTED') {
          setEvents((prev) => [...prev.slice(-100), parsed]);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const token = localStorage.getItem('mahalink_auth_token');
      const res = await fetch('/api/v1/audit/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch {
      setVerificationResult({ isValid: false, message: 'Verification API unreachable.' });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        width: '480px',
        height: 'calc(100vh - 110px)',
        position: 'sticky',
        top: '110px',
        background: '#020617',
        color: '#F8FAFC',
        borderLeft: '1px solid #1E293B',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
        zIndex: 50,
      }}
    >
      {/* Top Console Header */}
      <div
        style={{
          padding: '12px 16px',
          background: '#0B1120',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="#38BDF8" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#38BDF8' }}>
            MahaLink Live Switchboard
          </span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Shield size={12} />
            <span>{isVerifying ? 'Checking...' : 'Verify Hash Chain'}</span>
          </button>
          <button onClick={onClose} style={{ color: '#94A3B8', padding: '2px' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          style={{
            padding: '10px 16px',
            background: verificationResult.isValid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderBottom: `1px solid ${verificationResult.isValid ? '#10B981' : '#EF4444'}`,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          {verificationResult.isValid ? <CheckCircle2 size={16} color="#10B981" /> : <AlertTriangle size={16} color="#EF4444" />}
          <div>
            <div style={{ fontWeight: 700, color: verificationResult.isValid ? '#34D399' : '#F87171' }}>
              {verificationResult.isValid ? 'HASH CHAIN INTACT (0 TAMPERING DETECTED)' : 'FRAUD DETECTED IN AUDIT LEDGER'}
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{verificationResult.message}</div>
          </div>
        </div>
      )}

      {/* Real-Time Scrolling Terminal Feed */}
      <div
        ref={scrollRef}
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '12px',
        }}
      >
        {events.length === 0 ? (
          <div style={{ color: '#64748B', textAlign: 'center', padding: '40px 0', fontSize: '12px' }}>
            Listening for live middleware triggers...<br />
            <span style={{ fontSize: '11px', color: '#475569' }}>Apply for a service to view real-time cryptographic token minting, adapter queries & audit blocks.</span>
          </div>
        ) : (
          events.map((ev, index) => (
            <div
              key={index}
              style={{
                background: '#090D1A',
                border: '1px solid #1E293B',
                borderRadius: '6px',
                padding: '10px',
                lineHeight: 1.4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
                <span
                  style={{
                    color:
                      ev.type.includes('CONSENT')
                        ? '#F97316'
                        : ev.type.includes('MATCH')
                        ? '#34D399'
                        : ev.type.includes('AUDIT')
                        ? '#FACC15'
                        : '#38BDF8',
                    fontWeight: 700,
                  }}
                >
                  [{ev.type}]
                </span>
                <span style={{ color: '#64748B' }}>{ev.timestamp.split('T')[1].slice(0, 12)}</span>
              </div>

              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#CBD5E1', fontSize: '11px' }}>
                {JSON.stringify(ev.data, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* Bottom Console Footer */}
      <div style={{ padding: '8px 16px', background: '#0B1120', borderTop: '1px solid #1E293B', fontSize: '11px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
        <span>Events Streamed: {events.length}</span>
        <span>mTLS + ECDSA Active</span>
      </div>
    </div>
  );
};
