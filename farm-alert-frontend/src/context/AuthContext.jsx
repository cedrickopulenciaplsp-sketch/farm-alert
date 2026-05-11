import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Helper: extract the application role from Supabase JWT app_metadata
// Returns 'admin' | 'cvo_officer' | null
// ---------------------------------------------------------------------------
function parseRole(session) {
  return session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role ?? null;
}

// ---------------------------------------------------------------------------
// Provider component — wrap the entire app with this
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [user, setUser]       = useState(null);
  const [role, setRole]       = useState(null);

  useEffect(() => {
    // 1. Fetch the existing session on first mount
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data?.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setRole(parseRole(currentSession));
    });

    // 2. Subscribe to future auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setRole(parseRole(newSession));
      }
    );

    // 3. Cleanup listener when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  // session === undefined means the initial getSession() hasn't resolved yet
  const loading = session === undefined;

  const value = { session, user, role, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Custom hook — use this in any component: const { user, role } = useAuth();
// ---------------------------------------------------------------------------
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return context;
}
