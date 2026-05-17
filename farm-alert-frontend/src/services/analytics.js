import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// analytics.js — Supabase API wrappers for Analytics and Mapping views
// ---------------------------------------------------------------------------

/**
 * Fetch geospatial farm data for the Disease Map.
 */
export async function getMapFarms() {
  const { data, error } = await supabase
    .from('v_map_farms')
    .select('*');
  return { data, error };
}

/**
 * Fetch overall summary counts for the main Dashboard.
 */
export async function getDashboardSummary() {
  const [farmsRes, activeReportsRes, outbreaksRes, mortalitiesRes] = await Promise.all([
    supabase.from('farms').select('*', { count: 'exact', head: true }),
    supabase.from('disease_reports').select('*', { count: 'exact', head: true }).neq('status', 'Resolved'),
    supabase.from('outbreak_alerts').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    // Sum all mortalities from non-resolved reports
    supabase.from('disease_reports').select('mortalities').neq('status', 'Resolved'),
  ]);

  const totalMortalities = mortalitiesRes.data
    ? mortalitiesRes.data.reduce((sum, row) => sum + (row.mortalities || 0), 0)
    : 0;

  return {
    totalFarms: farmsRes.count || 0,
    activeReports: activeReportsRes.count || 0,
    activeOutbreaks: outbreaksRes.count || 0,
    totalMortalities,
    error: farmsRes.error || activeReportsRes.error || outbreaksRes.error || mortalitiesRes.error
  };
}

/**
 * Fetch the current count of active outbreak alerts.
 * Used by the Analytics page stat card.
 */
export async function getActiveOutbreaks() {
  const { count, error } = await supabase
    .from('outbreak_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Active');
  return { count: count || 0, error };
}

/**
 * Fetch enriched disease_reports for client-side analytics filtering.
 * @param {object} options
 * @param {string|null} options.since - ISO date string to filter from
 * @param {string|null} options.diseaseId - disease UUID to filter by
 */
export async function getFilteredReports({ since = null, diseaseId = null } = {}) {
  let query = supabase
    .from('v_reports_enriched')
    .select('report_id, date_reported, disease_id, disease_name, severity, barangay_name, created_at, mortalities, animals_affected');

  if (since) query = query.gte('date_reported', since);
  if (diseaseId) query = query.eq('disease_id', diseaseId);

  const { data, error } = await query.order('date_reported', { ascending: true });
  return { data, error };
}

/**
 * Analytics: Monthly Case Trends
 */
export async function getMonthlyTrends() {
  const { data, error } = await supabase
    .from('v_analytics_monthly')
    .select('*')
    .order('report_month', { ascending: true });
  return { data, error };
}

/**
 * Analytics: Breakdown by Disease
 */
export async function getDiseaseBreakdown() {
  const { data, error } = await supabase
    .from('v_analytics_by_disease')
    .select('*')
    .order('case_count', { ascending: false });
  return { data, error };
}

/**
 * Analytics: Breakdown by Barangay
 */
export async function getBarangayHotspots() {
  const { data, error } = await supabase
    .from('v_analytics_by_barangay')
    .select('*')
    .order('case_count', { ascending: false });
  return { data, error };
}

/**
 * Analytics: Breakdown by Severity
 */
export async function getSeverityBreakdown() {
  const { data, error } = await supabase
    .from('v_analytics_by_severity')
    .select('*');
  return { data, error };
}

/**
 * Analytics: Pest control interventions by pest type (from pest_control_logs).
 */
export async function getPestControlActivity() {
  const { data, error } = await supabase
    .from('pest_control_logs')
    .select('pest_type');
  if (error) return { data: null, error };

  // Aggregate client-side: count occurrences of each pest_type
  const map = {};
  (data ?? []).forEach(r => {
    const key = r.pest_type || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  const aggregated = Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([pest_type, count]) => ({ pest_type, count }));
  return { data: aggregated, error: null };
}

/**
 * Analytics: Farm status distribution (Active / Inactive / Quarantine).
 */
export async function getFarmStatusBreakdown() {
  const { data, error } = await supabase
    .from('farms')
    .select('status');
  if (error) return { data: null, error };

  const map = {};
  (data ?? []).forEach(r => {
    map[r.status] = (map[r.status] || 0) + 1;
  });
  const result = Object.entries(map).map(([status, count]) => ({ status, count }));
  return { data: result, error: null };
}

/**
 * Analytics: Disease report status distribution (Active / Under Monitoring / Resolved).
 */
export async function getReportStatusBreakdown() {
  const { data, error } = await supabase
    .from('disease_reports')
    .select('status');
  if (error) return { data: null, error };

  const map = {};
  (data ?? []).forEach(r => {
    map[r.status] = (map[r.status] || 0) + 1;
  });
  const result = Object.entries(map).map(([status, count]) => ({ status, count }));
  return { data: result, error: null };
}
