import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// reports.js — Supabase API wrappers for the Disease Reports domain
//
// All reads use the `v_reports_enriched` view (defined in 004_views.sql) which
// already includes farm_name, owner_name, barangay_name, disease_name,
// livestock_type_name, and encoded_by_name.
// ---------------------------------------------------------------------------

/**
 * Fetch all disease reports, with optional search & filter parameters.
 *
 * @param {object}  options
 * @param {string}  [options.status]    - filter by status ('Active', 'Resolved', etc.)
 * @param {string}  [options.severity]  - filter by severity ('Low', 'Medium', 'High', 'Critical')
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getReports({ status = null, severity = null } = {}) {
  let query = supabase
    .from('v_reports_enriched')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  if (severity) {
    query = query.eq('severity', severity);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Fetch a single report by its primary key.
 *
 * @param {string} id  - report_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getReportById(id) {
  const { data, error } = await supabase
    .from('v_reports_enriched')
    .select('*')
    .eq('report_id', id)
    .single();

  return { data, error };
}

/**
 * Create a new disease report.
 * `reportData` should match the `disease_reports` table columns.
 *
 * @param {object} reportData
 * @param {string} reportData.farm_id
 * @param {string} reportData.disease_id
 * @param {string} reportData.severity
 * @param {string} reportData.date_reported
 * @param {string} [reportData.additional_notes]
 * @param {string} reportData.encoded_by - user_id
 * @param {string} [reportData.status] - defaults to 'Active'
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createReport(reportData) {
  const { data, error } = await supabase
    .from('disease_reports')
    .insert(reportData)
    .select()
    .single();

  return { data, error };
}

/**
 * Update an existing disease report's data (e.g. marking it 'Resolved').
 *
 * @param {string} id       - report_id (UUID)
 * @param {object} reportData - partial object with fields to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateReport(id, reportData) {
  const { data, error } = await supabase
    .from('disease_reports')
    .update(reportData)
    .eq('report_id', id)
    .select()
    .single();

  return { data, error };
}
