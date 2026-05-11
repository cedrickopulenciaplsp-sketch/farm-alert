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
  const [farmsRes, activeReportsRes, outbreaksRes] = await Promise.all([
    supabase.from('farms').select('*', { count: 'exact', head: true }),
    supabase.from('disease_reports').select('*', { count: 'exact', head: true }).neq('status', 'Resolved'),
    supabase.from('outbreak_alerts').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
  ]);

  return {
    totalFarms: farmsRes.count || 0,
    activeReports: activeReportsRes.count || 0,
    activeOutbreaks: outbreaksRes.count || 0,
    error: farmsRes.error || activeReportsRes.error || outbreaksRes.error
  };
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
    .select('report_id, date_reported, disease_id, disease_name, severity, barangay_name, created_at');

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
