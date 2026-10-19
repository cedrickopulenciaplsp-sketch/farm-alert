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
export async function getComplianceLogs({ farmId = null, barangayId = null, status = null } = {}) {
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
    .order('evaluation_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (farmId) {
    query = query.eq('farm_id', farmId);
  }

  if (barangayId) {
    query = query.eq('farms.barangay_id', barangayId);
  }

  const { data, error } = await query;
  if (error) return { data, error };

  // Guarantee 1 row per farm: keep only the most recent evaluation
  let uniqueLogs = [];
  const seenFarms = new Set();
  for (const log of (data || [])) {
    if (!seenFarms.has(log.farm_id)) {
      seenFarms.add(log.farm_id);
      uniqueLogs.push(log);
    }
  }

  // Filter by compliance status if specified
  if (status) {
    uniqueLogs = uniqueLogs.filter(log => log.compliance_status === status);
  }

  return { data: uniqueLogs, error: null };
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
 * Create or update a compliance log for a farm.
 * If the farm already has an inspection record, it updates the existing record
 * and removes any historical duplicates so each farm has exactly 1 status entry.
 *
 * @param {object} logData
 * @param {string} logData.farm_id
 * @param {boolean} logData.passed_physical_inspection
 * @param {boolean} logData.passed_documentation
 * @param {string} logData.evaluation_date
 * @param {string} [logData.notes]
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createComplianceLog(logData) {
  // Check if a record already exists for this farm
  const { data: existing } = await supabase
    .from('pest_compliance_logs')
    .select('log_id')
    .eq('farm_id', logData.farm_id)
    .order('evaluation_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (existing && existing.length > 0) {
    const primaryId = existing[0].log_id;
    const { data, error } = await supabase
      .from('pest_compliance_logs')
      .update(logData)
      .eq('log_id', primaryId)
      .select()
      .single();

    // Clean up any older duplicate records for this farm
    if (existing.length > 1) {
      const duplicateIds = existing.slice(1).map(r => r.log_id);
      await supabase
        .from('pest_compliance_logs')
        .delete()
        .in('log_id', duplicateIds);
    }

    return { data, error };
  }

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

  // If this farm has older duplicates in the database, purge them
  if (data?.farm_id) {
    const { data: duplicates } = await supabase
      .from('pest_compliance_logs')
      .select('log_id')
      .eq('farm_id', data.farm_id)
      .neq('log_id', id);

    if (duplicates && duplicates.length > 0) {
      const duplicateIds = duplicates.map(r => r.log_id);
      await supabase
        .from('pest_compliance_logs')
        .delete()
        .in('log_id', duplicateIds);
    }
  }

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
