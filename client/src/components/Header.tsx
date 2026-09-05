import React, { useState } from 'react';
import { Building2, Globe, LogOut, ShieldCheck, UserCheck, UserPlus, X } from 'lucide-react';
import { SupportedLocale } from '../hooks/useTrilingual';

interface HeaderProps {
  user: any;
  locale: SupportedLocale;
  onLocaleChange: (loc: SupportedLocale) => void;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPersonaSelect?: (personaOrData: any) => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  locale,
  onLocaleChange,
  onLogout,
  activeTab,
  onTabChange,
  onPersonaSelect,
  isConsoleOpen,
  onToggleConsole,
}) => {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAadhaar, setCustomAadhaar] = useState('');
  const [customDistrict, setCustomDistrict] = useState('Pune');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customAadhaar) return;
    if (onPersonaSelect) {
      onPersonaSelect({
        custom_name: customName,
        custom_aadhaar: customAadhaar,
        district: customDistrict,
      });
    }
    setIsCustomModalOpen(false);
  };

  return (
    <header style={{ borderBottom: '2px solid var(--gov-saffron)', background: '#FFFFFF' }}>
      {/* Top Government Masthead Strip */}
      <div
        style={{
          background: 'var(--gov-navy-dark)',
          color: '#E2E8F0',
          padding: '6px 24px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Building2 size={14} color="#F97316" />
          <span>महाराष्ट्र शासन | Government of Maharashtra</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span style={{ color: '#93C5FD' }}>Department of Information Technology (DIT / Maha-IT)</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Trilingual Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
            <Globe size={12} color="#94A3B8" />
            <button
              onClick={() => onLocaleChange('mr')}
              style={{
                color: locale === 'mr' ? '#FFFFFF' : '#94A3B8',
                fontWeight: locale === 'mr' ? 700 : 400,
                fontSize: '11px',
              }}
            >
              मराठी
            </button>
            <span>/</span>
            <button
              onClick={() => onLocaleChange('en')}
              style={{
                color: locale === 'en' ? '#FFFFFF' : '#94A3B8',
                fontWeight: locale === 'en' ? 700 : 400,
                fontSize: '11px',
              }}
            >
              English
            </button>
            <span>/</span>
            <button
              onClick={() => onLocaleChange('hi')}
              style={{
                color: locale === 'hi' ? '#FFFFFF' : '#94A3B8',
                fontWeight: locale === 'hi' ? 700 : 400,
                fontSize: '11px',
              }}
            >
              हिंदी
            </button>
          </div>

          {/* Inspection Console Toggle Button */}
          <button
            onClick={onToggleConsole}
            style={{
              background: isConsoleOpen ? '#F97316' : 'rgba(59, 130, 246, 0.2)',
              color: '#FFFFFF',
              padding: '2px 10px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '11px',
              border: isConsoleOpen ? '1px solid #EA580C' : '1px solid #3B82F6',
            }}
          >
            {isConsoleOpen ? 'Close Live Console' : 'Open Live Architecture Console'}
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div
        style={{
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1600px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Ashoka Stambh / State Seal Emblem representation */}
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'var(--gov-navy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '18px',
              border: '2px solid var(--gov-saffron)',
            }}
          >
            म
          </div>

          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gov-navy)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>MahaLink</span>
              <span style={{ fontSize: '11px', background: 'var(--gov-saffron-bg)', color: 'var(--gov-saffron-dark)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--gov-saffron-light)' }}>
                SIH26129
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gov-slate-500)', fontWeight: 500 }}>
              आंतर-विभागीय डेटा समन्वय व संमती मिडलवेअर (IndEA 2.0 / DEPA)
            </div>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onTabChange('services')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              background: activeTab === 'services' ? 'var(--gov-navy-bg)' : 'transparent',
              color: activeTab === 'services' ? 'var(--gov-navy)' : 'var(--gov-slate-600)',
            }}
          >
            सेवा सूची (Services)
          </button>
          <button
            onClick={() => onTabChange('consents')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              background: activeTab === 'consents' ? 'var(--gov-navy-bg)' : 'transparent',
              color: activeTab === 'consents' ? 'var(--gov-navy)' : 'var(--gov-slate-600)',
            }}
          >
            माझी संमती (My Consents)
          </button>
          <button
            onClick={() => onTabChange('admin')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              background: activeTab === 'admin' ? 'var(--gov-navy-bg)' : 'transparent',
              color: activeTab === 'admin' ? 'var(--gov-navy)' : 'var(--gov-slate-600)',
            }}
          >
            प्रशासन कक्ष (Admin Desk)
          </button>
        </nav>

        {/* Right User Identity Pill & Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--gov-slate-100)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid var(--gov-slate-200)',
                  fontSize: '13px',
                }}
              >
                <UserCheck size={16} color="#10B981" />
                <span style={{ fontWeight: 600, color: 'var(--gov-slate-800)' }}>{user.full_name}</span>
                <span style={{ color: 'var(--gov-slate-400)', fontSize: '11px' }}>({user.masked_aadhaar || 'Verified'})</span>
              </div>

              {/* Fast Persona Switcher Dropdown for Demo */}
              {onPersonaSelect && (
                <select
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM_MODAL') {
                      setIsCustomModalOpen(true);
                    } else {
                      onPersonaSelect(e.target.value);
                    }
                  }}
                  value={user.id && user.id.startsWith('CUSTOM') ? 'CUSTOM_MODAL' : (user.id || 'P-01')}
                  style={{
                    fontSize: '12px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--gov-slate-300)',
                    background: '#FFFFFF',
                    color: 'var(--gov-slate-700)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="P-01">Persona 1: Priya Sharma (Marathi/English)</option>
                  <option value="P-02">Persona 2: Rajesh Pawar (Baramati/OBC)</option>
                  <option value="P-03">Persona 3: Ananya Deshmukh (Nashik/HSC)</option>
                  <option value="ADMIN-01">Admin: Dr. Sanjay Kolhe (Maha-IT)</option>
                  <option value="CUSTOM_MODAL">+ Custom Citizen (Meri Pehchaan SSO)...</option>
                </select>
              )}

              <button
                onClick={() => setIsCustomModalOpen(true)}
                title="Login with custom citizen credentials"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: 'var(--gov-saffron-bg)',
                  color: 'var(--gov-saffron-dark)',
                  border: '1px solid var(--gov-saffron-light)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={14} />
                <span>Custom SSO</span>
              </button>

              <button
                onClick={onLogout}
                title="Logout"
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  color: 'var(--gov-slate-500)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gov-slate-600)', fontSize: '13px' }}>
              <ShieldCheck size={16} color="#3B82F6" />
              <span>Meri Pehchaan SSO Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Citizen Login Modal (Meri Pehchaan SSO) */}
      {isCustomModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 34, 68, 0.65)',
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              border: '1px solid var(--gov-slate-300)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'var(--gov-navy)',
                color: '#FFFFFF',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#F97316" />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>
                  Meri Pehchaan / DigiLocker Citizen Authentication
                </span>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                style={{ color: '#93C5FD', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCustomSubmit} style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: 'var(--gov-slate-600)', marginBottom: '18px', lineHeight: 1.5 }}>
                Enter any citizen's details (in English or Marathi) to test dynamic identity resolution, Devanagari transliteration, and Once-Only form auto-fill.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--gov-slate-700)', marginBottom: '4px' }}>
                    Full Name (English / मराठी):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Baban Patil / सुनील बबन पाटील"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--gov-slate-300)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--gov-slate-700)', marginBottom: '4px' }}>
                    Aadhaar / Pehchaan ID Number:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5566-7788-9900"
                    value={customAadhaar}
                    onChange={(e) => setCustomAadhaar(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--gov-slate-300)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--gov-slate-700)', marginBottom: '4px' }}>
                    District (जिल्हा):
                  </label>
                  <select
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--gov-slate-300)',
                      fontSize: '14px',
                      outline: 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="Pune">Pune (पुणे)</option>
                    <option value="Mumbai">Mumbai (मुंबई)</option>
                    <option value="Nashik">Nashik (नाशिक)</option>
                    <option value="Nagpur">Nagpur (नागपूर)</option>
                    <option value="Kolhapur">Kolhapur (कोल्हापूर)</option>
                    <option value="Thane">Thane (ठाणे)</option>
                    <option value="Aurangabad">Chhatrapati Sambhajinagar (छ. संभाजीनगर)</option>
                    <option value="Solapur">Solapur (सोलापूर)</option>
                    <option value="Satara">Satara (सातारा)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid var(--gov-slate-300)',
                    color: 'var(--gov-slate-700)',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: 'var(--gov-navy)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '13px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  Authenticate & Issue SSO Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
