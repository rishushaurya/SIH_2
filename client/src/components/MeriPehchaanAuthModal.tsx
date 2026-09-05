import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Smartphone, KeyRound, X, ArrowRight, RefreshCw, UserCheck, Lock } from 'lucide-react';

interface MeriPehchaanAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: any;
  serviceTitle: string;
}

export const MeriPehchaanAuthModal: React.FC<MeriPehchaanAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  serviceTitle,
}) => {
  const [authMethod, setAuthMethod] = useState<'aadhaar_otp' | 'pin'>('aadhaar_otp');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [pinValue, setPinValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Generate masked Aadhaar display
  const maskedAadhaar = user?.aadhaar_hash
    ? `XXXX-XXXX-${user.aadhaar_hash.slice(-4)}`
    : 'XXXX-XXXX-1234';

  const citizenName = user?.full_name || 'Priya Ramesh Sharma';
  const citizenNameMarathi = user?.full_name_marathi || 'प्रिया रमेश शर्मा';

  useEffect(() => {
    let timer: any;
    if (otpSent && countdown > 0 && !authSuccess) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown, authSuccess]);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    setOtpSent(true);
    setCountdown(60);
    setOtpValue('492018'); // Pre-fill test OTP for seamless evaluation
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setAuthSuccess(false);
        setOtpSent(false);
        setOtpValue('');
        setPinValue('');
        onSuccess();
      }, 1000);
    }, 900);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--gov-slate-200)',
        }}
      >
        {/* Modal Masthead / Header (National Single Sign-On Branding) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #002244 0%, #003366 100%)',
            color: '#FFFFFF',
            padding: '20px 24px',
            position: 'relative',
            borderBottom: '3px solid var(--gov-saffron)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* National Emblem Emblem Icon */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#FDBA74',
                  fontWeight: 900,
                }}
              >
                म
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    मेरी पहचान (Meri Pehchaan)
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'rgba(249, 115, 22, 0.25)',
                      color: '#FDBA74',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      border: '1px solid rgba(249, 115, 22, 0.4)',
                    }}
                  >
                    NSSO / Jan Parichay
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#93C5FD', marginTop: '2px' }}>
                  National Single Sign-On • Citizen Identity Authentication
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isVerifying}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#CBD5E1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px' }}>
          {/* Target Service Notice */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--gov-navy-bg)',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <ShieldCheck size={20} color="var(--gov-navy)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12px', color: 'var(--gov-navy-dark)' }}>
              <strong>Authentication Requested for:</strong> {serviceTitle} via MahaLink Interoperability Switchboard.
            </div>
          </div>

          {/* Citizen Details Card */}
          <div
            style={{
              background: 'var(--gov-slate-50)',
              border: '1px solid var(--gov-slate-200)',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--gov-slate-500)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Citizen Identity (DigiLocker Linked)
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--gov-slate-800)', marginTop: '2px' }}>
                  {citizenName} <span style={{ color: 'var(--gov-slate-500)', fontWeight: 500 }}>({citizenNameMarathi})</span>
                </div>
              </div>
              <div
                style={{
                  background: 'var(--gov-emerald-bg)',
                  color: 'var(--gov-emerald-dark)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <UserCheck size={14} />
                <span>KYC Ready</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '12px', color: 'var(--gov-slate-600)' }}>
              <div>
                <span style={{ color: 'var(--gov-slate-400)' }}>Aadhaar:</span> <strong>{maskedAadhaar}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--gov-slate-400)' }}>Mobile:</span> <strong>+91 98******12</strong>
              </div>
            </div>
          </div>

          {/* Auth Method Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', borderBottom: '1px solid var(--gov-slate-200)', paddingBottom: '8px' }}>
            <button
              onClick={() => setAuthMethod('aadhaar_otp')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: authMethod === 'aadhaar_otp' ? 'var(--gov-navy)' : 'transparent',
                color: authMethod === 'aadhaar_otp' ? '#FFFFFF' : 'var(--gov-slate-600)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Smartphone size={15} />
              <span>Aadhaar OTP</span>
            </button>
            <button
              onClick={() => setAuthMethod('pin')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                background: authMethod === 'pin' ? 'var(--gov-navy)' : 'transparent',
                color: authMethod === 'pin' ? '#FFFFFF' : 'var(--gov-slate-600)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <KeyRound size={15} />
              <span>DigiLocker PIN</span>
            </button>
          </div>

          {/* Tab 1: Aadhaar OTP */}
          {authMethod === 'aadhaar_otp' && (
            <div>
              {!otpSent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <p style={{ fontSize: '13px', color: 'var(--gov-slate-600)', marginBottom: '16px' }}>
                    Click below to receive a One-Time Password (OTP) on your Aadhaar-linked mobile (+91 98******12).
                  </p>
                  <button
                    onClick={handleSendOtp}
                    style={{
                      background: 'var(--gov-navy)',
                      color: '#FFFFFF',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Smartphone size={16} />
                    <span>Get Aadhaar OTP</span>
                  </button>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      background: '#FEF3C7',
                      border: '1px solid #FCD34D',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: '#92400E',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>OTP sent to Aadhaar-linked mobile (ending in <strong>12</strong>).</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>00:{countdown < 10 ? `0${countdown}` : countdown}</span>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--gov-slate-700)', marginBottom: '6px' }}>
                      Enter 6-digit Aadhaar OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      placeholder="492018"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid var(--gov-navy)',
                        fontSize: '18px',
                        letterSpacing: '0.3em',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--gov-slate-500)', marginTop: '4px', textAlign: 'center' }}>
                      Test OTP pre-filled. Press "Verify & Proceed" to authenticate.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: DigiLocker PIN */}
          {authMethod === 'pin' && (
            <div style={{ padding: '8px 0 16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--gov-slate-700)', marginBottom: '6px' }}>
                Enter 6-digit DigiLocker / Meri Pehchaan PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinValue}
                onChange={(e) => setPinValue(e.target.value)}
                placeholder="******"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--gov-slate-300)',
                  fontSize: '18px',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--gov-slate-500)', marginTop: '6px', textAlign: 'center' }}>
                Default demo PIN: Any 6 digits (e.g. 123456)
              </div>
            </div>
          )}

          {/* Success Flash Banner */}
          {authSuccess && (
            <div
              style={{
                padding: '14px',
                background: 'var(--gov-emerald-bg)',
                border: '1px solid var(--gov-emerald)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--gov-emerald-dark)',
                fontSize: '13px',
                fontWeight: 700,
                marginTop: '12px',
                animation: 'fadeIn 0.2s ease-in',
              }}
            >
              <CheckCircle2 size={20} color="#059669" />
              <span>Identity Verified via Meri Pehchaan SSO! Redirecting to DPDP Consent...</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            background: 'var(--gov-slate-50)',
            padding: '16px 28px',
            borderTop: '1px solid var(--gov-slate-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--gov-slate-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} />
            <span>256-Bit TLS Encrypted • UIDAI Certified</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={isVerifying}
              style={{
                padding: '9px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                border: '1px solid var(--gov-slate-300)',
                background: '#FFFFFF',
                color: 'var(--gov-slate-700)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleVerify}
              disabled={isVerifying || authSuccess}
              style={{
                padding: '9px 20px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                background: authSuccess ? '#059669' : 'var(--gov-saffron)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isVerifying ? 'wait' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {isVerifying ? (
                <>
                  <RefreshCw size={15} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Verifying Token...</span>
                </>
              ) : authSuccess ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Verified!</span>
                </>
              ) : (
                <>
                  <span>Verify & Proceed</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
