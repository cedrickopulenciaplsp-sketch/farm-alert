import { supabase } from '../lib/supabase';

/**
 * Fetch all pest compliance logs, with optional filters.
 * Includes nested joins to retrieve farm_name, barangay_name, and the encoder's full_name.
 *
 * @param {object} options
 * @param {string} [options.farmId] - filter by specific farm
 * @param {number} [options.barangayId] - filter by barangay
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getComplianceLogs({ farmId = null, barangayId = null } = {}) {
  let query = supabase
    .from('pest_compliance_logs')
    .select(`
      *,
      farms!inner (
        farm_name,
        barangay_id,
        barangays (
          barangay_name
        )
      ),
      users (
        full_name
      )
    `)
    .order('evaluation_date', { ascending: false });

  if (farmId) {
    query = query.eq('farm_id', farmId);
  }

  if (barangayId) {
    query = query.eq('farms.barangay_id', barangayId);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single compliance log by ID.
 *
 * @param {string} id - log_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getComplianceLogById(id) {
  const { data, error } = await supabase
    .from('pest_compliance_logs')
    .select('*')
    .eq('log_id', id)
    .single();

  return { data, error };
}

/**
 * Create a new compliance log.
 *
 * @param {object} logData
 * @param {string} logData.farm_id
 * @param {string} logData.compliance_status - 'Compliant' | 'Semi-Compliant' | 'Non-Compliant'
 * @param {string} logData.evaluation_date
 * @param {string} [logData.notes]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createComplianceLog(logData) {
  const { data, error } = await supabase
    .from('pest_compliance_logs')
    .insert(logData)
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing compliance log.
 *
 * @param {string} id - log_id (UUID)
 * @param {object} logData - partial object to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateComplianceLog(id, logData) {
  const { data, error } = await supabase
    .from('pest_compliance_logs')
    .update(logData)
    .eq('log_id', id)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete a compliance log.
 *
 * @param {string} id - log_id (UUID)
 * @returns {Promise<{ error: object|null }>}
 */
export async function deleteComplianceLog(id) {
  const { error } = await supabase
    .from('pest_compliance_logs')
    .delete()
    .eq('log_id', id);

  return { error };
}
