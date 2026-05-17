import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// pests.js — Supabase API wrappers for the Pest Library reference table
// ---------------------------------------------------------------------------

/**
 * Fetch all pests, optionally filtered by a search term.
 * @param {string} [search] - filter by pest_name (case-insensitive)
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getPests(search = '') {
  let query = supabase
    .from('pests')
    .select('*')
    .order('pest_name', { ascending: true });

  if (search.trim()) {
    query = query.ilike('pest_name', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single pest by ID.
 * @param {string} id - pest_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getPestById(id) {
  const { data, error } = await supabase
    .from('pests')
    .select('*')
    .eq('pest_id', id)
    .single();

  return { data, error };
}

/**
 * Create a new pest record. Admin only (enforced by RLS).
 * @param {object} pestData
 * @param {string} pestData.pest_name
 * @param {string} [pestData.description]
 * @param {string} [pestData.signs_of_infestation]
 * @param {string} [pestData.control_methods]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createPest(pestData) {
  const { data, error } = await supabase
    .from('pests')
    .insert(pestData)
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing pest record. Admin only (enforced by RLS).
 * @param {string} id - pest_id (UUID)
 * @param {object} pestData - partial object to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updatePest(id, pestData) {
  const { data, error } = await supabase
    .from('pests')
    .update(pestData)
    .eq('pest_id', id)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a pest record. Admin only (enforced by RLS).
 * @param {string} id - pest_id (UUID)
 * @returns {Promise<{ error: object|null }>}
 */
export async function deletePest(id) {
  const { error } = await supabase
    .from('pests')
    .delete()
    .eq('pest_id', id);

  return { error };
}
