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
