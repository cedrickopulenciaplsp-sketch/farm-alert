import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Leaf, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loginWithGoogle } from '../../services/auth';

// ---------------------------------------------------------------------------
// Google "G" logo SVG — official brand asset colors
// ---------------------------------------------------------------------------
function GoogleLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Floating virus SVG — coronavirus-style with body + 10 protein spikes
// ---------------------------------------------------------------------------
function VirusOrb({ size = 60, color = 'hsla(145, 60%, 70%, 0.18)', fill = 'hsla(145, 60%, 20%, 0.25)', style = {} }) {
  const spikeCount = 10;
  const bodyR      = 20;
  const spikeStart = 20;
  const spikeEnd   = 34;
  const bulbCenter = 38;
  const bulbR      = 3.5;

  const spikes = Array.from({ length: spikeCount }, (_, i) => {
    const angle = (i * 360 / spikeCount) * (Math.PI / 180);
    return {
      x1: 50 + spikeStart * Math.cos(angle),
      y1: 50 + spikeStart * Math.sin(angle),
      x2: 50 + spikeEnd   * Math.cos(angle),
      y2: 50 + spikeEnd   * Math.sin(angle),
      cx: 50 + bulbCenter * Math.cos(angle),
      cy: 50 + bulbCenter * Math.sin(angle),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ position: 'absolute', pointerEvents: 'none', ...style }}
    >
      <circle cx="50" cy="50" r={bodyR} fill={fill} stroke={color} strokeWidth="1.8" />
      {spikes.map((s, i) => (
        <g key={i}>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={color} strokeWidth="1.5" />
          <circle cx={s.cx} cy={s.cy} r={bulbR} fill={fill} stroke={color} strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Left decorative brand panel
// ---------------------------------------------------------------------------
function BrandPanel() {
  return (
    <div
      style={{
        flex: '0 0 42%',
        background: 'linear-gradient(155deg, hsl(152, 60%, 22%) 0%, hsl(160, 55%, 16%) 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 44px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Depth overlays — restore the moody dark corners from the original design */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-120px',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(152, 80%, 5%, 0.55) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', left: '-100px',
        width: '360px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(160, 80%, 5%, 0.50) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Floating virus decorations */}
      <VirusOrb size={190} color="hsla(145, 65%, 72%, 0.18)" fill="hsla(152, 60%, 10%, 0.30)" style={{ top: '-55px',  right: '-65px', animation: 'virus-spin 24s linear infinite',  zIndex: 0 }} />
      <VirusOrb size={130} color="hsla(145, 65%, 72%, 0.16)" fill="hsla(152, 60%, 10%, 0.25)" style={{ bottom: '-40px', left: '-40px', animation: 'virus-float 7s ease-in-out infinite', zIndex: 0 }} />
      <VirusOrb size={88}  color="hsla(145, 65%, 72%, 0.13)" fill="hsla(152, 60%, 10%, 0.20)" style={{ top: '36%',   left: '-22px',  animation: 'virus-drift 9s ease-in-out infinite',  animationDelay: '-3s', zIndex: 0 }} />
      <VirusOrb size={68}  color="hsla(145, 65%, 72%, 0.14)" fill="hsla(152, 60%, 10%, 0.18)" style={{ top: '14%',   right: '8%',    animation: 'virus-float 5s ease-in-out infinite',  animationDelay: '-2s', zIndex: 0 }} />
      <VirusOrb size={54}  color="hsla(145, 65%, 72%, 0.11)" fill="hsla(152, 60%, 10%, 0.15)" style={{ bottom: '18%', right: '-12px', animation: 'virus-drift 13s ease-in-out infinite', animationDelay: '-6s', zIndex: 0 }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
          background: 'hsla(145, 70%, 70%, 0.18)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          border: '1px solid hsla(145, 70%, 70%, 0.25)',
        }}>
          <Leaf size={20} color="hsl(145, 70%, 78%)" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'var(--text-md)', color: 'hsl(145, 70%, 88%)',
          letterSpacing: '-0.01em',
        }}>
          FarmAlert
        </span>
      </div>

      {/* Center copy */}
      <div style={{ zIndex: 1 }}>
        <p style={{
          fontSize: 'var(--text-sm)', color: 'hsla(145, 60%, 75%, 0.75)',
          fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          City Veterinary Office
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'var(--text-2xl)', color: '#ffffff',
          lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-0.02em',
        }}>
          Livestock Disease Monitoring
        </h1>
        <p style={{
          fontSize: 'var(--text-base)', color: 'hsla(0, 0%, 100%, 0.55)',
          lineHeight: 1.65, maxWidth: '280px',
        }}>
          Real-time disease surveillance and automated outbreak detection for San Pablo City farms.
        </p>
      </div>

      {/* Feature pills */}
      <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[
          'Real-time outbreak detection',
          'Farm registry management',
          'Disease trend analytics',
        ].map((feature) => (
          <div
            key={feature}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: 'var(--text-sm)', color: 'hsla(0,0%,100%,0.6)',
            }}
          >
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: 'hsl(145, 60%, 55%)', flexShrink: 0,
            }} />
            {feature}
          </div>
        ))}
        <p style={{
          fontSize: 'var(--text-sm)', color: 'hsla(0, 0%, 100%, 0.35)',
          marginTop: '12px',
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

  // If already logged in and profile is loaded, redirect to dashboard
  if (!loading && session && profileLoaded) {
    return <Navigate to="/dashboard" replace />;
  }

  // Parse OAuth error from redirect query params
  // Supabase appends ?error=access_denied&error_description=... when a
  // DB trigger rejects the sign-in (unauthorized email).
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
      // Clean up the URL so the error doesn't persist on refresh
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate]);

  async function handleGoogleSignIn() {
    setOauthError('');
    setIsLoading(true);
    const { error } = await loginWithGoogle();
    // loginWithGoogle() performs a browser redirect, so if we reach here,
    // it means the redirect itself failed (e.g., provider not configured).
    if (error) {
      setOauthError(error.message ?? 'Could not connect to Google. Please try again.');
      setIsLoading(false);
    }
    // If no error, the browser is navigating away — keep spinner on.
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-canvas)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Left brand panel */}
      <BrandPanel />

      {/* Right sign-in panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Header */}
          <div className="fa-animate-in" style={{ marginBottom: '40px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'var(--color-overlay)',
              border: '1.5px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <ShieldCheck size={26} color="var(--color-brand)" strokeWidth={1.75} />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em', marginBottom: '8px',
            }}>
              Secure Sign In
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)',
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
                background: 'var(--color-danger-light)',
                border: '1.5px solid hsl(4, 74%, 80%)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)', color: 'var(--color-danger)',
                fontWeight: 500, marginBottom: '20px', lineHeight: 1.5,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
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
                padding: '13px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: isLoading ? 'var(--color-overlay)' : 'var(--color-surface)',
                color: isLoading ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.01em',
                transition: 'all var(--transition-base)',
                boxShadow: 'var(--shadow-xs)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (!isLoading) {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              onMouseDown={e => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.99)';
                }
              }}
              onMouseUp={e => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: '18px', height: '18px',
                    border: '2px solid var(--color-border-strong)',
                    borderTopColor: 'var(--color-brand)',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  Redirecting to Google…
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
              margin: '28px 0',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              Authorized access only
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          </div>

          {/* Authorized account notice */}
          <div
            className="fa-animate-in fa-animate-in-delay-3"
            style={{
              padding: '14px 16px',
              background: 'hsla(152, 58%, 28%, 0.06)',
              border: '1.5px solid hsla(152, 58%, 28%, 0.14)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'flex-start', gap: '10px',
            }}
          >
            <ShieldCheck
              size={16}
              color="var(--color-brand)"
              strokeWidth={2}
              style={{ flexShrink: 0, marginTop: '1px' }}
            />
            <div>
              <p style={{
                fontSize: 'var(--text-sm)', fontWeight: 600,
                color: 'var(--color-text-primary)', marginBottom: '3px',
              }}>
                Authorized account
              </p>
              <p style={{
                fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)',
                lineHeight: 1.5,
              }}>
                Only <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  sanielken2@gmail.com
                </strong> may access this system.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p
            className="fa-animate-in fa-animate-in-delay-4"
            style={{
              marginTop: '28px',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            FarmAlert · City Veterinary Office, San Pablo City
          </p>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes virus-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes virus-float {
          0%, 100% { transform: translateY(0px)   rotate(0deg); }
          50%       { transform: translateY(-20px) rotate(15deg); }
        }
        @keyframes virus-drift {
          0%   { transform: translate(0px,   0px)   rotate(0deg); }
          25%  { transform: translate(12px, -14px)  rotate(20deg); }
          50%  { transform: translate(6px,  -8px)   rotate(-10deg); }
          75%  { transform: translate(-10px, 8px)   rotate(30deg); }
          100% { transform: translate(0px,   0px)   rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
