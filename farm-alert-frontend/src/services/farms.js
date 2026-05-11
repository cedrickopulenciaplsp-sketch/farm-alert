import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// farms.js — Supabase API wrappers for the Farms domain
//
// All reads use the `v_farms_enriched` view (defined in 004_views.sql) which
// already includes barangay_name, classification, and livestock_type_name so
// the frontend never has to perform extra joins.
// ---------------------------------------------------------------------------

/**
 * Fetch all farms, with optional search & filter parameters.
 *
 * @param {object}  options
 * @param {string}  [options.search]    - fuzzy-match against farm_name or owner_name
 * @param {number}  [options.barangayId] - filter by barangay_id (exact)
 * @param {string}  [options.status]    - filter by farm status ('Active' | 'Inactive')
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getFarms({ search = '', barangayId = null, status = null } = {}) {
  let query = supabase
    .from('v_farms_enriched')
    .select('*')
    .order('farm_name', { ascending: true });

  if (search) {
    // PostgREST 'or' filter: match farm_name OR owner_name
    query = query.or(`farm_name.ilike.%${search}%,owner_name.ilike.%${search}%`);
  }

  if (barangayId) {
    query = query.eq('barangay_id', barangayId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single farm by its primary key.
 * Returns the enriched row (barangay_name, livestock_type_name included).
 *
 * @param {string} id  - farm_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getFarmById(id) {
  const { data, error } = await supabase
    .from('v_farms_enriched')
    .select('*')
    .eq('farm_id', id)
    .single();

  return { data, error };
}

/**
 * Create a new farm.
 * `farmData` should match the `farms` table columns (not the view).
 *
 * @param {object} farmData
 * @param {string} farmData.farm_name
 * @param {string} farmData.owner_name
 * @param {string} [farmData.contact_number]
 * @param {number} farmData.barangay_id
 * @param {number} farmData.livestock_type_id
 * @param {number} [farmData.head_count]   - number of animals
 * @param {number} [farmData.latitude]
 * @param {number} [farmData.longitude]
 * @param {string} [farmData.status]   - defaults to 'Active' in DB
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createFarm(farmData) {
  const { data, error } = await supabase
    .from('farms')
    .insert(farmData)
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing farm's data.
 *
 * @param {string} id       - farm_id (UUID)
 * @param {object} farmData - partial object with fields to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateFarm(id, farmData) {
  const { data, error } = await supabase
    .from('farms')
    .update(farmData)
    .eq('farm_id', id)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a farm record.
 * Note: RLS policies may restrict this to admin users only.
 *
 * @param {string} id - farm_id (UUID)
 * @returns {Promise<{ error: object|null }>}
 */
export async function deleteFarm(id) {
  const { error } = await supabase
    .from('farms')
    .delete()
    .eq('farm_id', id);

  return { error };
}

/**
 * Fetch all barangays for use in dropdowns.
 * Ordered alphabetically by barangay_name.
 *
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getBarangays() {
  const { data, error } = await supabase
    .from('barangays')
    .select('barangay_id, barangay_name, classification')
    .order('barangay_name', { ascending: true });

  return { data, error };
}

/**
 * Fetch all livestock types for use in dropdowns.
 *
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getLivestockTypes() {
  const { data, error } = await supabase
    .from('livestock_types')
    .select('livestock_type_id, type_name')
    .order('type_name', { ascending: true });

  return { data, error };
}
