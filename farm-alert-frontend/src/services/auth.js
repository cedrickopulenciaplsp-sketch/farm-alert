import { supabase } from '../lib/supabase';

/**
 * Initiate Google OAuth sign-in flow.
 * Redirects the browser to Google's consent screen.
 * On success, Supabase redirects back to /dashboard with a valid session.
 * On failure (e.g., unauthorized email blocked by DB trigger), Supabase
 * redirects back to the login page with ?error=... query params.
 * @returns {Promise<{ data, error }>}
 */
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  return { data, error };
}

/**
 * Log out the currently authenticated user.
 * @returns {Promise<{ error }>}
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// Alias — used by Sidebar and any component that prefers this name
export const signOut = logout;

/**
 * Get the current active session.
 * Returns null if no session exists.
 * @returns {Promise<{ session, error }>}
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session ?? null, error };
}

/**
 * Fetch the application user profile row for the currently signed-in user.
 * @param {string} authId - The auth.users UUID (session.user.id)
 * @returns {Promise<{ profile, error }>}
 */
export async function getUserProfile(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, full_name, username, role_id, is_active, requires_password_change')
    .eq('auth_id', authId)
    .single();
  return { profile: data ?? null, error };
}

