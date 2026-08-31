import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AlertCircle, ShieldCheck, Leaf } from 'lucide-react';
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
      <div style={{ zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '8px',
          background: 'rgba(140, 210, 160, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(140, 210, 160, 0.25)',
        }}>
          <Leaf size={20} color="#8cd2a0" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.25rem', color: '#ffffff', letterSpacing: '-0.01em',
        }}>
          FarmAlert
        </span>
      </div>

      {/* Center Text */}
      <div style={{ zIndex: 10 }}>
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
      <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
  const { session, loading, profileLoaded } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  if (!loading && session && profileLoaded) {
    return <Navigate to="/dashboard" replace />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errCode = params.get('error');
    const errDesc = params.get('error_description');

    if (errCode) {
      if (
        errCode === 'access_denied' ||
        errDesc?.toLowerCase().includes('authorized') ||
        errDesc?.toLowerCase().includes('restricted')
      ) {
        setOauthError('Access restricted to authorized personnel only. Please use the official CVO Google account.');
      } else {
        setOauthError(errDesc ?? 'Authentication failed. Please try again.');
      }
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate]);

  async function handleGoogleSignIn() {
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
          .auth-layout { flex-direction: column !important; }
          .auth-left { flex: none !important; height: auto !important; padding: 40px 32px !important; }
          .auth-right { flex: 1 !important; padding: 40px 32px !important; }
        }
        @keyframes login-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="auth-layout" style={{
        display: 'flex',
        height: '100vh',
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
          padding: '40px 48px',
          background: '#ffffff',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.06)',
          zIndex: 20,
          overflowY: 'auto',
          position: 'relative',
        }}>
          {/* Faint animated virus icons */}
          <VirusBackground />

          <div style={{ width: '100%', maxWidth: '360px', position: 'relative', zIndex: 10 }}>
            {/* Vet caduceus icon */}
            <div className="fa-animate-in" style={{ marginBottom: '40px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(26, 71, 49, 0.05)',
                border: '1.5px solid rgba(26, 71, 49, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '24px',
              }}>
                <VetCaduceus size={36} color="#1a4731" />
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: '1.75rem', color: '#1a4731',
                letterSpacing: '-0.02em', marginBottom: '10px',
              }}>
                Secure Sign In
              </h2>
              <p style={{
                fontSize: '0.875rem', color: '#64748b',
                lineHeight: 1.6,
              }}>
                Access is restricted to authorized City Veterinary Office personnel.
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

            {/* Divider */}
            <div
              className="fa-animate-in fa-animate-in-delay-2"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                margin: '32px 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap', letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600 }}>
                Authorized access only
              </span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Authorized account notice */}
            <div
              className="fa-animate-in fa-animate-in-delay-3"
              style={{
                padding: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                display: 'flex', alignItems: 'flex-start', gap: '12px',
              }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(26, 71, 49, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ShieldCheck size={18} color="#1a4731" strokeWidth={2.5} />
              </div>
              <div>
                <p style={{
                  fontSize: '0.85rem', fontWeight: 700,
                  color: '#0f172a', marginBottom: '4px',
                }}>
                  Authorized account
                </p>
                <p style={{
                  fontSize: '0.8rem', color: '#64748b',
                  lineHeight: 1.5,
                }}>
                  Only <strong style={{ color: '#1a4731', fontWeight: 600 }}>
                    sanielken2@gmail.com
                  </strong> may access this system.
                </p>
              </div>
            </div>

            {/* Footer */}
            <p
              className="fa-animate-in fa-animate-in-delay-4"
              style={{
                marginTop: '40px',
                fontSize: '0.75rem',
                color: '#94a3b8',
                textAlign: 'center',
                lineHeight: 1.6,
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
