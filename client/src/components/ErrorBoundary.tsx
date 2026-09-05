import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '60px 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--gov-rose-bg)', color: 'var(--gov-rose)', marginBottom: '16px' }}>
            <AlertTriangle size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gov-slate-900)', marginBottom: '8px' }}>
            काहीतरी चूक झाली / An Unexpected Error Occurred
          </h2>
          <p style={{ color: 'var(--gov-slate-600)', fontSize: '14px', marginBottom: '24px' }}>
            {this.state.error?.message || 'A frontend rendering fault occurred. Your draft data is safely saved in local storage.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--gov-navy)',
              color: '#FFFFFF',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={16} />
            <span>पृष्ठ पुन्हा लोड करा / Reload Portal</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
