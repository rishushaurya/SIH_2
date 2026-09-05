import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ background: 'var(--gov-navy-dark)', color: '#94A3B8', padding: '40px 24px 24px', marginTop: 'auto', borderTop: '4px solid var(--gov-saffron)' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px', marginBottom: '32px' }}>
        
        {/* Column 1: System Identity */}
        <div>
          <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '18px', marginBottom: '8px' }}>MahaLink (महा-लिंक)</div>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#CBD5E1' }}>
            Maharashtra Federated Interoperability & DPDP-Compliant Citizen Consent Middleware. Implemented under India Enterprise Architecture (IndEA 2.0) Integration Reference Model.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: '#10B981' }}>
            <CheckCircle2 size={14} />
            <span>Zero Central PII Persistence Architecture</span>
          </div>
        </div>

        {/* Column 2: Legal & Statutory */}
        <div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Statutory & Legal Frameworks</div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px', lineHeight: 2 }}>
            <li>Digital Personal Data Protection (DPDP) Act 2023</li>
            <li>Maharashtra State Data Policy (MSDP-2024)</li>
            <li>Maharashtra Right to Services (RTS) Act 2015</li>
            <li>Data Empowerment & Protection Architecture (DEPA)</li>
          </ul>
        </div>

        {/* Column 3: Participating Departments */}
        <div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Connected Department Silos</div>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '13px', lineHeight: 2 }}>
            <li>Revenue Department (Mahabhumi 7/12 - PostgreSQL 16)</li>
            <li>Transport Department (Sarathi & Vahan - MySQL 8.0)</li>
            <li>Certificate Services (e-District MahaOnline - MongoDB 7.0)</li>
            <li>School & Higher Education Board (Legacy Flat-File Stream)</li>
          </ul>
        </div>

        {/* Column 4: Sponsoring Authority */}
        <div>
          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '12px' }}>Sponsoring Authority</div>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#CBD5E1' }}>
            Government of Maharashtra<br />
            Department of Information Technology (DIT / Maha-IT)<br />
            Smart India Hackathon 2026 (PS: SIH26129)
          </p>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38BDF8' }}>
            <Shield size={14} />
            <span>ECDSA P-256 Tokens + SHA-256 Hash Chain</span>
          </div>
        </div>

      </div>

      <div style={{ maxWidth: '1600px', margin: '0 auto', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <div>© 2026 Government of Maharashtra. Designed for SIH 2026 Grand Finale.</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>STQC Certification Standards</span>
        </div>
      </div>
    </footer>
  );
};
