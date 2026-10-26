import React, { useEffect, useState } from 'react';
import { api, SessionUser } from './api';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header, Tab } from './components/Header';
import { InspectionPanel } from './components/InspectionPanel';
import { useTrilingual } from './hooks/useTrilingual';
import { AdminConsolePage } from './pages/AdminConsolePage';
import { ConsentPage } from './pages/ConsentPage';
import { FormWizardPage } from './pages/FormWizardPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

export const App: React.FC = () => {
  const { t } = useTrilingual();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('services');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('income_certificate');
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(() => window.innerWidth > 1024);

  // Restore an existing session (HttpOnly cookie); any 401 later returns to the login screen.
  useEffect(() => {
    api<{ user: SessionUser }>('/api/v1/auth/session')
      .then((data) => signIn(data.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
    const onExpired = () => setUser(null);
    window.addEventListener('mahalink:session-expired', onExpired);
    return () => window.removeEventListener('mahalink:session-expired', onExpired);
  }, []);

  const signIn = (signedIn: SessionUser) => {
    setUser(signedIn);
    setActiveTab(signedIn.role === 'CITIZEN' ? 'services' : 'admin');
  };

  const handleLogout = async () => {
    await api('/api/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
    sessionStorage.clear(); // drop form drafts holding personal data
    setUser(null);
  };

  const handleSelectService = (serviceId: string) => {
    setSelectedJourneyId(serviceId);
    setActiveTab('apply');
  };

  if (booting) {
    return (
      <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--gov-navy)', fontWeight: 600 }} role="status">
        {t('loading')}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--gov-bg)' }}>
        <Header
          user={user}
          onLogout={handleLogout}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isConsoleOpen={isConsoleOpen}
          onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        />

        {!user ? (
          <main style={{ flex: 1 }}>
            <LoginPage onLogin={signIn} />
          </main>
        ) : (
          <div className="workspace" style={{ display: 'flex', flex: 1 }}>
            <main style={{ flex: 1, minWidth: 0, paddingBottom: '60px' }}>
              {activeTab === 'services' && (
                <HomePage
                  canApply={user.role === 'CITIZEN'}
                  onSelectService={handleSelectService}
                  onOpenConsole={() => setIsConsoleOpen(true)}
                />
              )}
              {activeTab === 'apply' && (
                <FormWizardPage journeyId={selectedJourneyId} user={user} onBack={() => setActiveTab('services')} />
              )}
              {activeTab === 'consents' && <ConsentPage />}
              {activeTab === 'admin' && <AdminConsolePage user={user} />}
            </main>

            {/* Live Inspection Console: shows this citizen's own pipeline events (admins see all, without names) */}
            <InspectionPanel isOpen={isConsoleOpen} onClose={() => setIsConsoleOpen(false)} />
          </div>
        )}

        <Footer />
      </div>
    </ErrorBoundary>
  );
};
export default App;
