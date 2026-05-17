import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { updatePassword } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Shared: reusable password input with toggle
// ---------------------------------------------------------------------------
function PasswordInput({ id, label, value, onChange, error, placeholder }) {
  const [show, setShow] = useState(false);
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
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          style={{
            width: '100%',
            padding: '11px 44px 11px 14px',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-primary)',
            background: 'var(--color-overlay)',
            border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            transition: 'border-color var(--transition-base), box-shadow var(--transition-base)',
            boxSizing: 'border-box',
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
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
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
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: 'var(--text-sm)', color: 'var(--color-danger)' }}>
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left brand panel — same style as Login
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
        position: 'absolute', top: '-80px', right: '-80px',
        width: '320px', height: '320px', borderRadius: '50%',
        border: '60px solid hsla(145, 60%, 60%, 0.07)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-60px', left: '-60px',
        width: '260px', height: '260px', borderRadius: '50%',
        border: '50px solid hsla(145, 60%, 60%, 0.06)', pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1 }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: 'var(--radius-sm)',
          background: 'hsla(145, 70%, 70%, 0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid hsla(145, 70%, 70%, 0.25)',
        }}>
          <Leaf size={20} color="hsl(145, 70%, 78%)" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'var(--text-md)', color: 'hsl(145, 70%, 88%)', letterSpacing: '-0.01em',
        }}>
          FarmAlert
        </span>
      </div>

      {/* Center copy */}
      <div style={{ zIndex: 1 }}>
        {/* Shield icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'hsla(145, 70%, 70%, 0.15)',
          border: '1px solid hsla(145, 70%, 70%, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px',
        }}>
          <ShieldCheck size={28} color="hsl(145, 70%, 78%)" />
        </div>

        <p style={{
          fontSize: 'var(--text-sm)', color: 'hsla(145, 60%, 75%, 0.75)',
          fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px',
        }}>
          Security Setup
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'var(--text-2xl)', color: '#ffffff',
          lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-0.02em',
        }}>
          Create Your Password
        </h1>
        <p style={{
          fontSize: 'var(--text-base)', color: 'hsla(0, 0%, 100%, 0.55)',
          lineHeight: 1.65, maxWidth: '280px',
        }}>
          Your account requires a new password before you can access the system. Choose a strong password you will remember.
        </p>
      </div>

      {/* Footer */}
      <div style={{ zIndex: 1 }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'hsla(0, 0%, 100%, 0.35)' }}>
          San Pablo City, Laguna
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strength indicator
// ---------------------------------------------------------------------------
function StrengthBar({ password }) {
  let score = 0;
  if (password.length >= 8)              score++;
  if (/[A-Z]/.test(password))           score++;
  if (/[0-9]/.test(password))           score++;
  if (/[^A-Za-z0-9]/.test(password))    score++;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

  if (!password) return null;

  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: i <= score ? colors[score] : 'var(--color-border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 'var(--text-xs)', color: colors[score] || 'var(--color-text-muted)', fontWeight: 500 }}>
        {labels[score] || 'Enter a password'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SetupPassword page
// ---------------------------------------------------------------------------
export default function SetupPassword() {
  const navigate = useNavigate();
  const { clearPasswordChangeFlag, role } = useAuth();

  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [error, setError]                   = useState('');
  const [fieldErrors, setFieldErrors]       = useState({});

  function validate() {
    const errs = {};
    if (!newPassword) errs.newPassword = 'Please enter a new password.';
    else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters.';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password.';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    const { error: updateError } = await updatePassword(newPassword);
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message ?? 'An unexpected error occurred. Please try again.');
      return;
    }

    // Immediately clear the gate in React state so ProtectedRoute
    // stops redirecting before the DB re-fetch completes.
    clearPasswordChangeFlag();
    navigate('/dashboard', { replace: true });
  }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--color-canvas)', fontFamily: 'var(--font-body)',
    }}>
      <BrandPanel />

      {/* Right form panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '40px 24px', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Header */}
          <div className="fa-animate-in" style={{ marginBottom: '32px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'hsla(152, 58%, 28%, 0.1)',
              border: '1px solid hsla(152, 58%, 28%, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px',
            }}>
              <KeyRound size={22} color="var(--color-brand)" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em', marginBottom: '6px',
            }}>
              Set up your password
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              This is a one-time setup required for your account. Choose a strong password to protect access to FarmAlert.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Global error */}
            {error && (
              <div
                className="fa-animate-in"
                role="alert"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 14px',
                  background: 'var(--color-danger-light)',
                  border: '1.5px solid hsl(4, 74%, 80%)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)', color: 'var(--color-danger)', fontWeight: 500,
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* New password */}
            <div className="fa-animate-in fa-animate-in-delay-1">
              <PasswordInput
                id="new-password"
                label="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                error={fieldErrors.newPassword}
                placeholder="Minimum 8 characters"
              />
              <StrengthBar password={newPassword} />
            </div>

            {/* Confirm password */}
            <div className="fa-animate-in fa-animate-in-delay-2">
              <PasswordInput
                id="confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
                placeholder="Re-enter your password"
              />
            </div>

            {/* Requirements checklist */}
            <div
              className="fa-animate-in fa-animate-in-delay-3"
              style={{
                padding: '12px 14px',
                background: 'var(--color-overlay)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}
            >
              {[
                { label: 'At least 8 characters', met: newPassword.length >= 8 },
                { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
                { label: 'At least one number', met: /[0-9]/.test(newPassword) },
              ].map(({ label, met }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: met ? '#10b981' : 'var(--color-border-strong)',
                    transition: 'background 0.2s ease', flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    color: met ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
                    transition: 'color 0.2s ease',
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="fa-animate-in fa-animate-in-delay-4">
              <button
                id="setup-password-submit"
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: isLoading ? 'var(--color-border-strong)' : 'var(--color-brand)',
                  color: 'var(--color-text-inverse)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-base)', fontWeight: 600,
                  fontFamily: 'var(--font-body)', cursor: isLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.01em', transition: 'background var(--transition-base)',
                }}
                onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = 'var(--color-brand-hover)'; e.currentTarget.style.transform = 'scale(1.01)'; } }}
                onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = 'var(--color-brand)'; e.currentTarget.style.transform = 'scale(1)'; } }}
              >
                {isLoading ? (
                  <>
                    <span style={{
                      width: '16px', height: '16px',
                      border: '2px solid hsla(0,0%,100%,0.4)', borderTopColor: '#fff',
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
                    }} />
                    Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Set Password &amp; Continue
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
