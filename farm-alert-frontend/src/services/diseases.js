import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// diseases.js — Supabase API wrappers for the Diseases domain
//
// The `diseases` table holds the static library of tracked animal diseases.
// These are primarily read-only for CVO officers; only admins can add
// or modify disease entries (enforced by RLS).
//
// Schema fields (from 001_initial_schema.sql):
//   disease_id, disease_name, livestock_type_id,
//   description, common_symptoms, causes, control_prevention
// ---------------------------------------------------------------------------

/**
 * Fetch all diseases from the library.
 * Optionally filtered by livestock type.
 *
 * @param {object} [options]
 * @param {number} [options.livestockTypeId] - filter by livestock_type_id (exact)
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getDiseases({ livestockTypeId = null } = {}) {
  let query = supabase
    .from('diseases')
    .select(`
      disease_id,
      disease_name,
      description,
      common_symptoms,
      causes,
      control_prevention,
      livestock_type_id,
      livestock_types ( type_name )
    `)
    .order('disease_name', { ascending: true });

  if (livestockTypeId) {
    query = query.eq('livestock_type_id', livestockTypeId);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single disease by its primary key, including related livestock type.
 *
 * @param {string} id - disease_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getDiseaseById(id) {
  const { data, error } = await supabase
    .from('diseases')
    .select(`
      disease_id,
      disease_name,
      description,
      common_symptoms,
      causes,
      control_prevention,
      livestock_type_id,
      livestock_types ( type_name )
    `)
    .eq('disease_id', id)
    .single();

  return { data, error };
}
