import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// outbreaks.js — Supabase API wrappers for the Outbreak Alerts domain
//
// All reads use the `v_outbreaks_enriched` view (defined in 004_views.sql) which
// already includes barangay_name, disease_name, and acknowledged_by_name.
// ---------------------------------------------------------------------------

/**
 * Fetch all outbreak alerts, with optional status filtering.
 *
 * @param {object}  options
 * @param {string}  [options.status]    - filter by status ('Active', 'Resolved')
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getOutbreaks({ status = null } = {}) {
  let query = supabase
    .from('v_outbreaks_enriched')
    .select('*')
    .order('date_triggered', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single outbreak alert by its primary key.
 *
 * @param {string} id  - outbreak_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getOutbreakById(id) {
  const { data, error } = await supabase
    .from('v_outbreaks_enriched')
    .select('*')
    .eq('outbreak_id', id)
    .single();

  return { data, error };
}

/**
 * Update an existing outbreak alert (e.g., acknowledging or resolving it).
 *
 * @param {string} id           - outbreak_id (UUID)
 * @param {object} outbreakData - partial object with fields to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateOutbreak(id, outbreakData) {
  const { data, error } = await supabase
    .from('outbreak_alerts')
    .update(outbreakData)
    .eq('outbreak_id', id)
    .select()
    .single();

  return { data, error };
}

/**
 * Returns the count of currently Active outbreaks.
 * Used by the Sidebar badge — avoids fetching full records for a simple count.
 *
 * @returns {Promise<{ count: number, error: object|null }>}
 */
export async function getActiveOutbreakCount() {
  const { count, error } = await supabase
    .from('outbreak_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');

  return { count: count ?? 0, error };
}

