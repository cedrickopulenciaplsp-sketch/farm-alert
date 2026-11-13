import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getUserProfile, isAuthorizedEmail } from '../services/auth';
import { getMyAccountAccess } from '../services/accounts';
import { writeAuditLog } from '../services/admin';

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

const DEMO_ROLE_KEY    = 'farm_alert_demo_role';
const DEMO_FARM_KEY    = 'farm_alert_demo_farm_id';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function normalizeRole(rawRole) {
  if (!rawRole) return null;
  if (rawRole === 'cvo_officer') return 'cvo_staff';
  if (rawRole === 'admin' || rawRole === 'cvo_staff' || rawRole === 'farmer') return rawRole;
  return 'cvo_staff';
}

function profileRole(profile) {
  if (!profile) return null;
  if (profile.role) return normalizeRole(profile.role);
  if (profile.role_id === 2) return 'admin';
  if (profile.role_id === 3) return 'farmer';
  return 'cvo_staff';
}

/**
 * Resolve what the signed-in Google account is allowed to do.
 *
 * Source of truth is the `authorized_accounts` registry (Migration 037) via the
 * `get_my_account_access()` RPC. If that migration has not been applied yet,
 * fall back to the static project-team allowlist so the app keeps working.
 */
async function resolveAccess(authUser) {
  const [{ profile }, accessRes] = await Promise.all([
    getUserProfile(authUser.id),
    getMyAccountAccess(),
  ]);

  if (accessRes.data) {
    return {
      profile,
      access: {
        authorized:      Boolean(accessRes.data.authorized) && profile?.is_active !== false,
        role:            normalizeRole(accessRes.data.role),
        farmId:          accessRes.data.farm_id ?? null,
        isDemoAccount:   Boolean(accessRes.data.is_demo_account),
      },
    };
  }

  // Fallback (Migration 037 not yet applied)
  const isTeam = isAuthorizedEmail(authUser.email);
  return {
    profile,
    access: {
      authorized:    isTeam,
      role:          profileRole(profile) ?? (isTeam ? 'admin' : null),
      farmId:        profile?.farm_id ?? null,
      isDemoAccount: isTeam,
    },
  };
}

function recordLogin() {
  // Prevent duplicate login logs on page refreshes
  if (sessionStorage.getItem('login_logged')) return;
  sessionStorage.setItem('login_logged', 'true');

  const ua = navigator.userAgent;
  const getBrowser = () => {
    if (ua.includes('Edg/'))    return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome'))  return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari'))  return 'Safari';
    return 'Unknown Browser';
  };
  const getOS = () => {
    if (ua.includes('Windows'))    return 'Windows';
    if (ua.includes('Mac OS'))     return 'macOS';
    if (ua.includes('Android'))    return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux'))      return 'Linux';
    return 'Unknown OS';
  };
  const deviceInfo = `${getBrowser()} on ${getOS()}`;

  fetch('https://api.ipify.org?format=json')
    .then(res => res.json())
    .then(async (data) => {
      if (!data.ip) return;
      const { error: loginErr } = await supabase
        .from('login_logs')
        .insert([{ ip_address: data.ip, device_info: deviceInfo }]);
      if (loginErr) console.warn('[Auth] Login log insert failed:', loginErr.message);

      const { error: auditErr } = await writeAuditLog({
        userId:      null,
        action:      `System Login (IP: ${data.ip}) via ${deviceInfo}`,
        targetTable: 'system',
        targetId:    null,
      });
      if (auditErr) console.warn('[Auth] Audit log insert failed:', auditErr.message);
    })
    .catch(err => console.warn('[Auth] Could not fetch IP:', err));
}

// ---------------------------------------------------------------------------
// Provider component — wrap the entire app with this
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [session, setSession]             = useState(undefined); // undefined = still loading
  const [user, setUser]                   = useState(null);
  const [profile, setProfile]             = useState(null);      // row from public.users
  const [access, setAccess]               = useState(null);      // resolved account access
  const [profileLoaded, setProfileLoaded] = useState(false);     // true once access is resolved

  // Per-tab demo role (honoured ONLY for project-team demo accounts)
  const [demoRole, setDemoRoleState]  = useState(() => normalizeRole(sessionStorage.getItem(DEMO_ROLE_KEY)));
  const [demoFarmId, setDemoFarmId]   = useState(() => sessionStorage.getItem(DEMO_FARM_KEY) || null);

  const resolvedUserId = useRef(null);

  const clearAuthState = useCallback(() => {
    resolvedUserId.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setAccess(null);
    setProfileLoaded(true);
  }, []);

  const loadAccess = useCallback(async (authUser) => {
    if (!authUser) {
      resolvedUserId.current = null;
      setProfile(null);
      setAccess(null);
      setProfileLoaded(true);
      return;
    }

    const { profile: p, access: a } = await resolveAccess(authUser);

    if (!a.authorized) {
      // Not registered, or suspended by the City Veterinarian
      sessionStorage.setItem('unauthorized_login_email', authUser.email ?? '');
      await supabase.auth.signOut();
      clearAuthState();
      return;
    }

    resolvedUserId.current = authUser.id;
    setProfile(p);
    setAccess(a);
    setProfileLoaded(true);
  }, [clearAuthState]);

  useEffect(() => {
    // 1. Existing session
    supabase.auth.getSession().then(({ data }) => {
      const s = data?.session ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      loadAccess(s?.user ?? null);
    });

    // 2. Future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      const newUserId = newSession?.user?.id ?? null;

      // Only re-resolve access when the signed-in identity actually changes
      // (avoids blanking the UI on TOKEN_REFRESHED events).
      if (newUserId !== resolvedUserId.current) {
        setProfileLoaded(false);
        // Defer Supabase calls out of the auth callback (avoids client lock).
        setTimeout(() => loadAccess(newSession?.user ?? null), 0);
      }

      if (event === 'SIGNED_IN' && newSession?.user) {
        recordLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAccess]);

  // session === undefined means getSession() hasn't resolved yet
  const loading = session === undefined;

  const refreshProfile = useCallback(() => {
    if (user) return loadAccess(user);
    return Promise.resolve();
  }, [user, loadAccess]);

  // Per-tab role switching for defense demonstrations (sessionStorage = per tab)
  const setDemoRole = useCallback((nextRole, nextFarmId = null) => {
    const norm = normalizeRole(nextRole);
    if (norm) {
      sessionStorage.setItem(DEMO_ROLE_KEY, norm);
    } else {
      sessionStorage.removeItem(DEMO_ROLE_KEY);
    }
    setDemoRoleState(norm);

    if (nextFarmId) {
      sessionStorage.setItem(DEMO_FARM_KEY, nextFarmId);
      setDemoFarmId(nextFarmId);
    } else if (norm !== 'farmer') {
      sessionStorage.removeItem(DEMO_FARM_KEY);
      setDemoFarmId(null);
    }
  }, []);

  const isDemoAccount = Boolean(access?.isDemoAccount);

  const userRole = (isDemoAccount && demoRole)
    ? demoRole
    : (access?.role || profileRole(profile) || 'cvo_staff');

  const userFarmId = isDemoAccount
    ? (demoFarmId || access?.farmId || profile?.farm_id || null)
    : (access?.farmId || profile?.farm_id || null);

  const value = {
    session,
    user,
    role: userRole,
    userRole,
    userFarmId,
    isDemoAccount,
    isAuthorized: Boolean(access?.authorized),
    setDemoRole,
    profile,
    loading,
    profileLoaded,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Custom hook
// ---------------------------------------------------------------------------
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
