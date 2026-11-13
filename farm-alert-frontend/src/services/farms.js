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
export async function getFarms({ search = '', barangayId = null, status = null, sortBy = 'name_asc' } = {}) {
  let query = supabase
    .from('v_farms_enriched')
    .select('*');

  // Apply sorting
  if (sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'oldest') {
    query = query.order('created_at', { ascending: true });
  } else {
    // default: name_asc
    query = query.order('farm_name', { ascending: true });
  }

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
 * Queries the base 'farms' table to get all raw IDs and columns needed for editing.
 *
 * @param {string} id  - farm_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getFarmById(id) {
  const { data, error } = await supabase
    .from('farms')
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
 * Fetch only the 10 approved rural barangays for use in the Farm Registry dropdown.
 * Strictly restricted by name as per CVO requirements.
 * Ordered alphabetically by barangay_name.
 *
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
const DEFAULT_BARANGAY_COORDS = {
  'Concepcion':        { lat: 14.084200, lng: 121.341500 },
  'Dolores':           { lat: 14.095800, lng: 121.339200 },
  'San Cristobal':     { lat: 14.049400, lng: 121.376900 },
  'San Gregorio':      { lat: 14.039800, lng: 121.309500 },
  'San Joaquin':       { lat: 14.034500, lng: 121.321800 },
  'San Vicente':       { lat: 14.041200, lng: 121.331500 },
  'Santa Ana':         { lat: 14.029800, lng: 121.338400 },
  'Santa Cruz':        { lat: 14.059200, lng: 121.354100 },
  'Santisimo Rosario': { lat: 14.018500, lng: 121.318200 },
  'Santo Niño':        { lat: 14.048500, lng: 121.361200 },
};

export async function getBarangays() {
  const { data, error } = await supabase
    .from('barangays')
    .select('*')
    .eq('is_active', true)
    .order('barangay_name', { ascending: true });

  const enriched = (data ?? []).map((b) => {
    const fallback = DEFAULT_BARANGAY_COORDS[b.barangay_name];
    return {
      ...b,
      latitude: b.latitude ?? fallback?.lat ?? 14.069300,
      longitude: b.longitude ?? fallback?.lng ?? 121.326500,
    };
  });

  return { data: enriched, error };
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

/**
 * Fetch the full 360° dossier for a single farm:
 * the enriched farm profile + all disease reports for that farm ordered chronologically.
 *
 * @param {string} farmId - farm_id (UUID)
 * @returns {Promise<{ farm: object|null, reports: Array, error: object|null }>}
 */
export async function getFarmDossier(farmId) {
  const [farmRes, reportsRes] = await Promise.all([
    supabase
      .from('v_farms_enriched')
      .select('*')
      .eq('farm_id', farmId)
      .single(),
    supabase
      .from('v_reports_enriched')
      .select('*')
      .eq('farm_id', farmId)
      .order('date_reported', { ascending: false }),
  ]);

  return {
    farm:    farmRes.data ?? null,
    reports: reportsRes.data ?? [],
    error:   farmRes.error || reportsRes.error || null,
  };
}
