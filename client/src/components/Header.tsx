import React from 'react';
import { Building2, Globe, LogOut, Terminal, UserCheck } from 'lucide-react';
import { SessionUser } from '../api';
import { SupportedLocale, useTrilingual } from '../hooks/useTrilingual';

export type Tab = 'services' | 'apply' | 'consents' | 'admin';

interface HeaderProps {
  user: SessionUser | null;
  onLogout: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
}

const LOCALES: Array<[SupportedLocale, string]> = [
  ['mr', 'मराठी'],
  ['en', 'English'],
  ['hi', 'हिंदी'],
];

export const Header: React.FC<HeaderProps> = ({ user, onLogout, activeTab, onTabChange, isConsoleOpen, onToggleConsole }) => {
  const { locale, changeLocale, t } = useTrilingual();

  // Navigation follows the RBAC matrix: citizens apply and manage consent, officers get the oversight desk.
  const tabs: Array<[Tab, string]> = !user
    ? []
    : user.role === 'CITIZEN'
    ? [
        ['services', t('nav_services')],
        ['consents', t('nav_consents')],
      ]
    : [
        ['admin', t('nav_admin')],
        ['services', t('nav_services')],
      ];

  return (
    <header style={{ borderBottom: '2px solid var(--gov-saffron)', background: '#FFFFFF' }}>
      {/* Government masthead strip */}
      <div
        style={{
          background: 'var(--gov-navy-dark)',
          color: '#E2E8F0',
          padding: '6px 24px',
          fontSize: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Building2 size={14} color="#F97316" aria-hidden="true" />
          <span>महाराष्ट्र शासन | Government of Maharashtra</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div role="group" aria-label="Language" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Globe size={12} color="#94A3B8" aria-hidden="true" />
            {LOCALES.map(([code, label]) => (
              <button
                key={code}
                onClick={() => changeLocale(code)}
                aria-pressed={locale === code}
                className="masthead-btn"
                style={{ color: locale === code ? '#FFFFFF' : '#CBD5E1', fontWeight: locale === code ? 700 : 400 }}
              >
                {label}
              </button>
            ))}
          </div>

          {user && (
            <button onClick={onToggleConsole} aria-pressed={isConsoleOpen} className="masthead-btn console-toggle">
              <Terminal size={12} aria-hidden="true" />
              <span>{isConsoleOpen ? 'Close Live Console' : t('btn_open_console')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main navigation bar */}
      <div
        style={{
          padding: '12px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1600px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            aria-hidden="true"
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
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--gov-navy)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>MahaLink</span>
              <span style={{ fontSize: '11px', background: 'var(--gov-saffron-bg)', color: 'var(--gov-saffron-dark)', padding: '2px 8px', borderRadius: '4px' }}>
                SIH26129
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gov-slate-600)', fontWeight: 500 }}>{t('system_sub')}</div>
          </div>
        </div>

        {tabs.length > 0 && (
          <nav aria-label="Primary" style={{ display: 'flex', gap: '8px' }}>
            {tabs.map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                aria-current={activeTab === tab ? 'page' : undefined}
                className="nav-tab"
              >
                {label}
              </button>
            ))}
          </nav>
        )}

        {user && (
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
              <UserCheck size={16} color="#047857" aria-hidden="true" />
              <span style={{ fontWeight: 600, color: 'var(--gov-slate-800)' }}>{user.full_name}</span>
              <span style={{ color: 'var(--gov-slate-600)', fontSize: '11px' }}>
                {user.role === 'CITIZEN' ? user.masked_id : user.role.replace('_', ' ')} · {user.auth_provider}
              </span>
            </div>
            <button onClick={onLogout} aria-label={t('btn_logout')} title={t('btn_logout')} className="icon-btn">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
