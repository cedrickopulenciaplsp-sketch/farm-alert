import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getUserProfile } from '../services/auth';

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Helper: extract the application role from Supabase JWT app_metadata.
// Falls back to role_id from the public.users profile row if JWT has no role.
// Returns 'admin' | 'cvo_officer' | null
// ---------------------------------------------------------------------------
function parseRole(session, profile) {
  let r = session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role;
  if (!r && profile) {
    r = profile.role_id === 2 ? 'admin' : 'cvo_officer';
  }
  return r ?? null;
}

// ---------------------------------------------------------------------------
// Provider component — wrap the entire app with this
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [session, setSession]       = useState(undefined); // undefined = still loading
  const [user, setUser]             = useState(null);
  const [role, setRole]             = useState(null);
  const [profile, setProfile]       = useState(null);   // row from public.users
  const [profileLoaded, setProfileLoaded] = useState(false); // true once profile fetch is done

  // Fetch the profile row from the public.users table
  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const { profile: p } = await getUserProfile(authUser.id);
    setProfile(p);
    // Update role with DB fallback (handles JWT missing role metadata)
    setRole(prev => parseRole(null, p) ?? prev ?? null);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    // 1. Fetch existing session immediately — don't await profile here
    supabase.auth.getSession().then(({ data }) => {
      const s = data?.session ?? null;
      setSession(s);                           // ← unblocks loading immediately
      setUser(s?.user ?? null);
      setRole(parseRole(s, null));             // set role from JWT first
      if (!s?.user) setProfileLoaded(true);    // no user = no profile to wait for
      fetchProfile(s?.user ?? null);           // then update role/profile async
    });

    // 2. Subscribe to future auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setProfileLoaded(false);               // reset while new profile loads
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setRole(parseRole(newSession, null));
        if (!newSession?.user) setProfileLoaded(true);
        fetchProfile(newSession?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // session === undefined means getSession() hasn't resolved yet
  const loading = session === undefined;

  // True when the user must change their password before continuing
  const requiresPasswordChange = profile?.requires_password_change ?? false;

  // Refresh helper for SetupPassword page
  const refreshProfile = useCallback(() => {
    if (user) return fetchProfile(user);
    return Promise.resolve();
  }, [user, fetchProfile]);

  // Immediately clear the password-change gate in local state.
  // Called after a successful password update so the ProtectedRoute
  // does not loop back to /setup-password before the DB re-fetch finishes.
  const clearPasswordChangeFlag = useCallback(() => {
    setProfile(prev => prev ? { ...prev, requires_password_change: false } : prev);
  }, []);

  const value = { session, user, role, profile, loading, profileLoaded, requiresPasswordChange, refreshProfile, clearPasswordChangeFlag };

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
