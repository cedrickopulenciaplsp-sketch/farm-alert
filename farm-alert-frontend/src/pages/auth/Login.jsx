import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { WarningCircle as AlertCircle, ShieldCheck, Leaf } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { loginWithGoogle } from '../../services/auth';

// ---------------------------------------------------------------------------
// Google "G" logo SVG
// ---------------------------------------------------------------------------
function GoogleLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Veterinary Caduceus SVG icon
// ---------------------------------------------------------------------------
function VetCaduceus({ size = 48, color = '#1a4731' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <line x1="24" y1="8" x2="24" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M24 12 C18 10, 12 12, 11 16 C10 20, 15 22, 24 20" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M24 12 C30 10, 36 12, 37 16 C38 20, 33 22, 24 20" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M16 11 C13 9, 10 10, 9 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M32 11 C35 9, 38 10, 39 13" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M24 20 C19 22, 17 26, 20 29 C23 32, 27 30, 24 34 C21 38, 18 40, 20 43" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M24 20 C29 22, 31 26, 28 29 C25 32, 21 30, 24 34 C27 38, 30 40, 28 43" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="44" r="2" fill={color}/>
      <circle cx="28" cy="44" r="2" fill={color}/>
      <circle cx="24" cy="8" r="3" fill={color}/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Floating faint virus icon for right panel
// ---------------------------------------------------------------------------
function VirusBackground({
  colors = ['rgba(26, 100, 60, 0.07)', 'rgba(26, 100, 60, 0.06)', 'rgba(26, 100, 60, 0.05)'],
  positions = [
    { top: '-40px',  right: '-40px', size: '220px', anim: 'virus-float-1', dur: '18s' },
    { bottom: '60px', left: '-30px',  size: '160px', anim: 'virus-float-2', dur: '22s' },
    { top: '42%',    right: '20px',   size: '90px',  anim: 'virus-float-3', dur: '14s' },
  ],
}) {
  // A virus shape: central circle + spikes with round balls at tips
  function VirusIcon({ style }) {
    const spikes = 8;
    const cx = 60, cy = 60, r = 22, spikeLen = 18, ballR = 5;
    const elements = [];
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * 2 * Math.PI;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      const x2 = cx + (r + spikeLen) * Math.cos(angle);
      const y2 = cy + (r + spikeLen) * Math.sin(angle);
      elements.push(
        <line key={`line-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />,
        <circle key={`ball-${i}`} cx={x2} cy={y2} r={ballR} fill="currentColor" />
      );
    }
    return (
      <svg viewBox="0 0 120 120" aria-hidden="true" style={style}>
        <circle cx={cx} cy={cy} r={r} fill="currentColor" />
        <circle cx={cx} cy={cy} r={r * 0.5} fill="rgba(255,255,255,0.15)" />
        {elements}
      </svg>
    );
  }

  return (
    <>
      <style>{`
        @keyframes virus-float-1 {
          0%,100% { transform: translate(0px, 0px) rotate(0deg); }
          33%      { transform: translate(6px, -10px) rotate(15deg); }
          66%      { transform: translate(-4px, 6px) rotate(-8deg); }
        }
        @keyframes virus-float-2 {
          0%,100% { transform: translate(0px, 0px) rotate(0deg); }
          40%      { transform: translate(-8px, 12px) rotate(-20deg); }
          70%      { transform: translate(5px, -5px) rotate(10deg); }
        }
        @keyframes virus-float-3 {
          0%,100% { transform: translate(0px, 0px) rotate(0deg); }
          50%      { transform: translate(10px, 8px) rotate(25deg); }
        }
      `}</style>

      {positions.map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: pos.top, bottom: pos.bottom,
          left: pos.left, right: pos.right,
          width: pos.size, height: pos.size,
          color: colors[i] ?? colors[0],
          animation: `${pos.anim} ${pos.dur} ease-in-out infinite`,
          pointerEvents: 'none',
        }}>
          <VirusIcon style={{ width: '100%', height: '100%' }} />
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Left Branding Panel (60%) — clean gradient, no lines/radar
// ---------------------------------------------------------------------------
function BrandPanel() {
  return (
    <div className="auth-left" style={{
      flex: '0 0 60%',
      background: 'linear-gradient(160deg, #123f24 0%, #0a2614 45%, #041208 100%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '56px 64px',
    }}>
      {/* Subtle vignette overlay to deepen edges */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 60% 40%, transparent 40%, rgba(0,0,0,0.25) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Faint virus icons — left panel */}
      <VirusBackground
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.03)']}
        positions={[
          { top: '-50px', left: '-50px', size: '240px', anim: 'virus-float-2', dur: '20s' },
          { bottom: '80px', right: '-30px', size: '180px', anim: 'virus-float-3', dur: '24s' },
          { top: '38%', left: '55%', size: '100px', anim: 'virus-float-1', dur: '16s' },
        ]}
      />

      {/* Logo (Top) */}
      <div className="auth-left-brand" style={{ zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '8px',
            background: 'rgba(140, 210, 160, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(140, 210, 160, 0.25)',
            flexShrink: 0,
          }}>
            <Leaf size={20} color="#8cd2a0" />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '1.2rem', color: '#ffffff', letterSpacing: '-0.01em',
              display: 'block', lineHeight: 1.15,
            }}>
              FarmAlert
            </span>
            <span className="auth-mobile-sub" style={{
              display: 'none',
              fontSize: '0.72rem', color: '#8cd2a0', fontWeight: 600,
            }}>
              City Veterinary Office · San Pablo City
            </span>
          </div>
        </div>
      </div>

      {/* Center Text */}
      <div className="auth-left-body" style={{ zIndex: 10 }}>
        <p style={{
          fontSize: '0.85rem', color: '#8cd2a0',
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          CITY VETERINARY OFFICE
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '2.4rem', color: '#ffffff',
          lineHeight: 1.15, marginBottom: '16px', letterSpacing: '-0.02em',
        }}>
          Livestock Disease Monitoring
        </h1>
        <p style={{
          fontSize: '1.05rem', color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.6, maxWidth: '400px',
        }}>
          Real-time disease surveillance and automated outbreak detection for San Pablo City farms.
        </p>
      </div>

      {/* Bottom Features List */}
      <div className="auth-left-footer" style={{ zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          'Real-time outbreak detection',
          'Farm registry management',
          'Disease trend analytics',
        ].map((feature) => (
          <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#8cd2a0', flexShrink: 0,
            }} />
            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
              {feature}
            </span>
          </div>
        ))}
        <p style={{
          fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)',
          marginTop: '16px',
        }}>
          San Pablo City, Laguna
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Login page
// ---------------------------------------------------------------------------
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, profileLoaded, isAuthorized, userRole, setDemoRole } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [showDemoRoles, setShowDemoRoles] = useState(false);
  const [selectedRole, setSelectedRole] = useState(
    () => sessionStorage.getItem('farm_alert_demo_role') || null
  );

  // Only redirect if the account is confirmed authorized
  if (!loading && session && profileLoaded && isAuthorized) {
    return <Navigate to={userRole === 'farmer' ? '/farmer-portal' : '/dashboard'} replace />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // 1. Check if AuthContext rejected an unauthorized account
    const rejectedEmail = sessionStorage.getItem('unauthorized_login_email');
    if (rejectedEmail) {
      sessionStorage.removeItem('unauthorized_login_email');
      setOauthError(`Access restricted: "${rejectedEmail}" is not registered with the City Veterinary Office, or has been suspended. Please contact the City Veterinarian or sign in with your registered Google account.`);
      return;
    }

    // 2. Parse OAuth errors from query string or URL hash fragment
    const searchParams = new URLSearchParams(location.search);
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const errCode = searchParams.get('error') || hashParams.get('error') || searchParams.get('error_code') || hashParams.get('error_code');
    const errDesc = searchParams.get('error_description') || hashParams.get('error_description');

    if (errCode || errDesc) {
      const descLower = errDesc?.toLowerCase() || '';
      if (
        errCode === 'access_denied' ||
        errCode === 'unexpected_failure' ||
        errCode === 'server_error' ||
        descLower.includes('authorized') ||
        descLower.includes('restricted') ||
        descLower.includes('database error')
      ) {
        setOauthError('Access restricted to authorized personnel only. Please use the official CVO Google account.');
      } else {
        setOauthError(decodeURIComponent((errDesc ?? 'Authentication failed. Please try again.').replace(/\+/g, ' ')));
      }
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate]);

  async function handleGoogleSignIn(roleOverride = null) {
    const targetRole = typeof roleOverride === 'string' ? roleOverride : null;
    setDemoRole(targetRole);
    setSelectedRole(targetRole);
    setOauthError('');
    setIsLoading(true);
    const { error } = await loginWithGoogle();
    if (error) {
      setOauthError(error.message ?? 'Could not connect to Google. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @media (max-width: 1024px) {
          .auth-layout { flex-direction: column !important; height: auto !important; min-height: 100dvh !important; overflow-x: hidden !important; }
          .auth-left { flex: none !important; width: 100% !important; padding: 28px 24px !important; }
          .auth-right { flex: 1 !important; width: 100% !important; padding: 32px 24px 44px !important; box-shadow: none !important; overflow: hidden !important; align-items: flex-start !important; }
          .auth-card { margin: 0 auto !important; }
        }
        @media (max-width: 768px) {
          .auth-left { padding: 16px 20px !important; }
          .auth-left-body, .auth-left-footer { display: none !important; }
          .auth-mobile-sub { display: block !important; }
          .auth-right { padding: 24px 18px 32px !important; }
        }
        @keyframes login-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="auth-layout" style={{
        display: 'flex',
        width: '100%',
        minHeight: '100dvh',
        overflowX: 'hidden',
        fontFamily: 'var(--font-body)',
        background: '#ffffff',
      }}>
        {/* Left branding panel (60%) */}
        <BrandPanel />

        {/* Right sign-in panel (40%) */}
        <div className="auth-right" style={{
          flex: '0 0 40%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 40px',
          background: '#ffffff',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.06)',
          zIndex: 20,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}>
          {/* Clipped layer for faint animated virus icons so they never cause horizontal scroll */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <VirusBackground />
          </div>

          <div className="auth-card" style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 10, margin: 'auto 0' }}>
            {/* Vet caduceus icon */}
            <div className="fa-animate-in" style={{ marginBottom: '22px' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '14px',
                background: 'rgba(26, 71, 49, 0.06)',
                border: '1.5px solid rgba(26, 71, 49, 0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px',
              }}>
                <VetCaduceus size={28} color="#1a4731" />
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: '1.6rem', color: '#1a4731',
                letterSpacing: '-0.02em', marginBottom: '6px',
              }}>
                Sign In to FarmAlert
              </h2>
              <p style={{
                fontSize: '0.875rem', color: '#64748b',
                lineHeight: 1.5,
                margin: 0,
              }}>
                Use your registered Google account for the City Veterinary Office or Farmer Portal.
              </p>
            </div>

            {/* OAuth error banner */}
            {oauthError && (
              <div
                className="fa-animate-in"
                role="alert"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px 14px',
                  background: '#fef2f2',
                  border: '1.5px solid #fca5a5',
                  borderRadius: '10px',
                  fontSize: '0.875rem', color: '#b91c1c',
                  fontWeight: 500, marginBottom: '24px', lineHeight: 1.5,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{oauthError}</span>
              </div>
            )}

            {/* Google Sign-In Button */}
            <div className="fa-animate-in fa-animate-in-delay-1">
              <button
                id="google-signin-btn"
                type="button"
                disabled={isLoading}
                onClick={handleGoogleSignIn}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  background: isLoading ? '#f8fafc' : '#ffffff',
                  color: isLoading ? '#94a3b8' : '#0f172a',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    e.currentTarget.style.borderColor = '#1a4731';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(26,71,49,0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isLoading) {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                onMouseDown={e => {
                  if (!isLoading) e.currentTarget.style.transform = 'scale(0.99)';
                }}
                onMouseUp={e => {
                  if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)';
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{
                      width: '18px', height: '18px',
                      border: '2px solid #cbd5e1',
                      borderTopColor: '#1a4731',
                      borderRadius: '50%',
                      animation: 'login-spin 0.7s linear infinite',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <GoogleLogo size={20} />
                    Sign in with Google
                  </>
                )}
              </button>
            </div>

            {/* Authorized account notice */}
            <div
              className="fa-animate-in fa-animate-in-delay-2"
              style={{
                marginTop: '20px',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: 'rgba(26, 71, 49, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                marginTop: '1px',
              }}>
                <ShieldCheck size={16} color="#1a4731" strokeWidth={2.5} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  fontSize: '0.8rem', fontWeight: 700,
                  color: '#0f172a', margin: '0 0 2px',
                }}>
                  Authorized Accounts Only
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.45, margin: 0 }}>
                  CVO personnel and livestock raisers sign in with an email registered by the San Pablo City Veterinary Office. Unregistered accounts cannot access the system.
                </p>
              </div>
            </div>

            {/* Collapsible Team Demo Role Switcher (for defense testing only) */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDemoRoles(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                {showDemoRoles ? 'Hide Demo Role Switcher' : 'Team Demo Mode (Switch Role)'}
              </button>
            </div>

            {showDemoRoles && (
              <div
                className="fa-animate-in"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '12px',
                }}
              >
                {[
                  {
                    id: 'demo-login-admin',
                    role: 'admin',
                    title: 'City Veterinarian (Admin)',
                    badge: 'Full Access',
                    desc: 'Full Command Center · Barangay Masterlist · Outbreak Resolution',
                    border: '#f59e0b',
                    bg: '#fffdf5',
                    badgeBg: '#fef3c7',
                    badgeColor: '#b45309',
                  },
                  {
                    id: 'demo-login-staff',
                    role: 'cvo_staff',
                    title: 'Veterinary Inspector (Staff)',
                    badge: 'Field Ops',
                    desc: 'Field Operations · Blood Sample & Lab Results · Biosecurity Inspection',
                    border: '#3b82f6',
                    bg: '#f8faff',
                    badgeBg: '#dbeafe',
                    badgeColor: '#1d4ed8',
                  },
                  {
                    id: 'demo-login-farmer',
                    role: 'farmer',
                    title: 'Livestock Raiser (Farmer)',
                    badge: 'Farmer Portal',
                    desc: 'Mobile Farm Dossier · Report Sick Animals · Barangay Advisory',
                    border: '#16a34a',
                    bg: '#f6fdf8',
                    badgeBg: '#dcfce7',
                    badgeColor: '#15803d',
                  },
                ].map((item) => {
                  const active = selectedRole === item.role;
                  return (
                    <button
                      key={item.role}
                      id={item.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleGoogleSignIn(item.role)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: active ? `2px solid ${item.border}` : '1.5px solid #e2e8f0',
                        background: active ? item.bg : '#ffffff',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>
                          {item.title}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '999px',
                          background: item.badgeBg,
                          color: item.badgeColor,
                        }}>
                          {item.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <p
              className="fa-animate-in fa-animate-in-delay-4"
              style={{
                marginTop: '20px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                textAlign: 'center',
                lineHeight: 1.5,
                letterSpacing: '0.01em',
              }}
            >
              FarmAlert · City Veterinary Office, San Pablo City
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
