import { supabase } from '../lib/supabase';

/**
 * Log in a user with email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ data, error }>}
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
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
 * Includes the requires_password_change flag.
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

/**
 * Update the user's password in Supabase Auth and clear the
 * requires_password_change flag in the users table.
 * @param {string} newPassword
 * @returns {Promise<{ error }>}
 */
export async function updatePassword(newPassword) {
  // 1. Update Auth password
  const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
  if (authError) return { error: authError };

  // 2. Clear the flag on the users table (match by auth_id of the current session)
  const { data: sessionData } = await supabase.auth.getSession();
  const authId = sessionData?.session?.user?.id;
  if (!authId) return { error: new Error('No active session found.') };

  const { error: dbError } = await supabase
    .from('users')
    .update({ requires_password_change: false })
    .eq('auth_id', authId);

  return { error: dbError ?? null };
}

