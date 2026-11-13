import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// barangays.js — CRUD service layer for the Dynamic Barangay Masterlist (Task 2.1)
// ---------------------------------------------------------------------------

const DEFAULT_CENTER = { lat: 14.069300, lng: 121.326500 };

/**
 * Fetch barangays ordered alphabetically by barangay_name.
 *
 * @param {object}  [options]
 * @param {boolean} [options.onlyActive=false] - if true, only return active barangays
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getBarangays({ onlyActive = false } = {}) {
  let query = supabase
    .from('barangays')
    .select('*')
    .order('barangay_name', { ascending: true });

  if (onlyActive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  const enriched = (data ?? []).map((b) => ({
    ...b,
    latitude:  b.latitude  != null ? Number(b.latitude)  : DEFAULT_CENTER.lat,
    longitude: b.longitude != null ? Number(b.longitude) : DEFAULT_CENTER.lng,
  }));

  return { data: enriched, error };
}

/**
 * Create a new barangay in public.barangays.
 *
 * @param {object} payload
 * @param {string} payload.barangay_name
 * @param {number} payload.classification - 0 = Rural, 1 = Urban
 * @param {number} [payload.latitude]
 * @param {number} [payload.longitude]
 * @param {string} [payload.contact_person]
 * @param {string} [payload.contact_number]
 * @param {boolean} [payload.is_active=true]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createBarangay(payload) {
  const row = {
    barangay_name:  payload.barangay_name.trim(),
    classification: Number(payload.classification) === 1 ? 1 : 0,
    latitude:       payload.latitude  != null && payload.latitude  !== '' ? Number(payload.latitude)  : DEFAULT_CENTER.lat,
    longitude:      payload.longitude != null && payload.longitude !== '' ? Number(payload.longitude) : DEFAULT_CENTER.lng,
    contact_person: payload.contact_person?.trim() || null,
    contact_number: payload.contact_number?.trim() || null,
    is_active:      payload.is_active ?? true,
  };

  const { data, error } = await supabase
    .from('barangays')
    .insert(row)
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing barangay's details and GPS coordinates.
 *
 * @param {number|string} barangayId
 * @param {object} updates
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateBarangay(barangayId, updates) {
  const row = {
    ...(updates.barangay_name  !== undefined ? { barangay_name: updates.barangay_name.trim() } : {}),
    ...(updates.classification !== undefined ? { classification: Number(updates.classification) === 1 ? 1 : 0 } : {}),
    ...(updates.latitude       !== undefined ? { latitude: updates.latitude !== '' && updates.latitude != null ? Number(updates.latitude) : null } : {}),
    ...(updates.longitude      !== undefined ? { longitude: updates.longitude !== '' && updates.longitude != null ? Number(updates.longitude) : null } : {}),
    ...(updates.contact_person !== undefined ? { contact_person: updates.contact_person?.trim() || null } : {}),
    ...(updates.contact_number !== undefined ? { contact_number: updates.contact_number?.trim() || null } : {}),
    ...(updates.is_active      !== undefined ? { is_active: Boolean(updates.is_active) } : {}),
  };

  const { data, error } = await supabase
    .from('barangays')
    .update(row)
    .eq('barangay_id', barangayId)
    .select()
    .single();

  return { data, error };
}

/**
 * Enable or disable a barangay in dropdowns.
 *
 * @param {number|string} barangayId
 * @param {boolean} isActive
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function toggleBarangayStatus(barangayId, isActive) {
  const { data, error } = await supabase
    .from('barangays')
    .update({ is_active: Boolean(isActive) })
    .eq('barangay_id', barangayId)
    .select()
    .single();

  return { data, error };
}
