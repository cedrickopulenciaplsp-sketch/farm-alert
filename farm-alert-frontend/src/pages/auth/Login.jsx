import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, AlertCircle, LogIn } from 'lucide-react';
import { login } from '../../services/auth';

// ---------------------------------------------------------------------------
// Reusable input component with focus/error states
// ---------------------------------------------------------------------------
function FormInput({ id, label, type, value, onChange, placeholder, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={id}
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={id === 'email' ? 'email' : 'current-password'}
          style={{
            width: '100%',
            padding: '11px 14px',
            paddingRight: children ? '44px' : '14px',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-overlay)',
            border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-brand)';
            e.target.style.boxShadow = error
              ? '0 0 0 3px hsla(4, 74%, 49%, 0.12)'
              : '0 0 0 3px hsla(152, 58%, 28%, 0.12)';
            e.target.style.background = 'var(--color-surface)';
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? 'var(--color-danger)' : 'var(--color-border)';
            e.target.style.boxShadow = 'none';
            e.target.style.background = 'var(--color-overlay)';
          }}
        />
        {children && (
          <div style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
          }}>
            {children}
          </div>
        )}
      </div>
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-danger)',
        }}>
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left decorative panel
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
      {/* Decorative rings */}
      <div style={{
        position: 'absolute',
        top: '-80px',
        right: '-80px',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        border: '60px solid hsla(145, 60%, 60%, 0.07)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-60px',
        left: '-60px',
        width: '260px',
        height: '260px',
        borderRadius: '50%',
        border: '50px solid hsla(145, 60%, 60%, 0.06)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-sm)',
          background: 'hsla(145, 70%, 70%, 0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid hsla(145, 70%, 70%, 0.25)',
        }}>
          <Leaf size={20} color="hsl(145, 70%, 78%)" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'var(--text-md)',
          color: 'hsl(145, 70%, 88%)',
          letterSpacing: '-0.01em',
        }}>
          FarmAlert
        </span>
      </div>

      {/* Center copy */}
      <div style={{ zIndex: 1 }}>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'hsla(145, 60%, 75%, 0.75)',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}>
          City Veterinary Office
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'var(--text-2xl)',
          color: '#ffffff',
          lineHeight: 1.2,
          marginBottom: '16px',
          letterSpacing: '-0.02em',
        }}>
          Livestock Disease Monitoring
        </h1>
        <p style={{
          fontSize: 'var(--text-base)',
          color: 'hsla(0, 0%, 100%, 0.55)',
          lineHeight: 1.65,
          maxWidth: '280px',
        }}>
          Real-time disease surveillance and automated outbreak detection for San Pablo City farms.
        </p>
      </div>

      {/* Footer note */}
      <div style={{ zIndex: 1 }}>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'hsla(0, 0%, 100%, 0.35)',
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

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Basic client-side validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    const { error: authError } = await login(email.trim(), password);
    setIsLoading(false);

    if (authError) {
      // Map Supabase error messages to friendly copy
      if (authError.message?.toLowerCase().includes('invalid login')) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(authError.message ?? 'An unexpected error occurred. Please try again.');
      }
      return;
    }

    navigate('/dashboard', { replace: true });
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--color-canvas)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Left brand panel — hidden on small screens */}
      <BrandPanel />

      {/* Right form panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        overflowY: 'auto',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
        }}>

          {/* Header */}
          <div
            className="fa-animate-in"
            style={{ marginBottom: '36px' }}
          >
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'var(--text-xl)',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}>
              Welcome back
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}>
              Sign in to access the FarmAlert dashboard.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >

            {/* Global error banner */}
            {error && (
              <div
                className="fa-animate-in"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: 'var(--color-danger-light)',
                  border: '1.5px solid hsl(4, 74%, 80%)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-danger)',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Email field */}
            <div className="fa-animate-in fa-animate-in-delay-1">
              <FormInput
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="officer@sanpablocity.gov.ph"
              />
            </div>

            {/* Password field */}
            <div className="fa-animate-in fa-animate-in-delay-2">
              <FormInput
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
              >
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: 'var(--color-text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  {showPassword
                    ? <EyeOff size={17} />
                    : <Eye size={17} />
                  }
                </button>
              </FormInput>
            </div>

            {/* Submit button */}
            <div className="fa-animate-in fa-animate-in-delay-3">
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: isLoading
                    ? 'var(--color-border-strong)'
                    : 'var(--color-brand)',
                  color: 'var(--color-text-inverse)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em',
                  boxShadow: 'none',
                }}
                onMouseEnter={e => {
                  if (!isLoading) {
                    e.currentTarget.style.background = 'var(--color-brand-hover)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isLoading) {
                    e.currentTarget.style.background = 'var(--color-brand)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid hsla(0,0%,100%,0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign in
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p
            className="fa-animate-in fa-animate-in-delay-4"
            style={{
              marginTop: '32px',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            Access is restricted to authorized CVO personnel only.
            <br />
            Contact your administrator to request access.
          </p>
        </div>
      </div>

      {/* Spinner keyframe — injected inline to avoid CSS file coupling */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
