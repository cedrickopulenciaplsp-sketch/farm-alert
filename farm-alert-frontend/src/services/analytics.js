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

// ---------------------------------------------------------------------------
// Helper — resolve a time-range string to an ISO from-date string
// ---------------------------------------------------------------------------
function getFromDate(timeRange) {
  const now = new Date();
  if (timeRange === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }
  if (timeRange === '6m') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  }
  if (timeRange === 'ytd') {
    return `${now.getFullYear()}-01-01`;
  }
  return null; // 'all' — no filter
}

/**
 * Analytics: Monthly Case Trends
 * Fetches from disease_reports and aggregates client-side so time-range
 * filters work correctly against the pre-aggregated view.
 * @param {string} timeRange - '30d' | '6m' | 'ytd' | 'all'
 */
export async function getMonthlyTrends(timeRange = 'ytd') {
  const fromDate = getFromDate(timeRange);

  let query = supabase
    .from('disease_reports')
    .select('date_reported, animals_affected, mortalities')
    .order('date_reported', { ascending: true });

  if (fromDate) query = query.gte('date_reported', fromDate);

  const { data, error } = await query;
  if (error) return { data: null, error };

  // Aggregate by month in JS
  const map = {};
  (data ?? []).forEach((r) => {
    const d = new Date(r.date_reported);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-PH', { month: 'short', year: 'numeric' });
    if (!map[key]) {
      map[key] = {
        report_month: key,
        month_label: label,
        total_reports: 0,
        total_animals_affected: 0,
        total_mortalities: 0,
      };
    }
    map[key].total_reports += 1;
    map[key].total_animals_affected += r.animals_affected ?? 0;
    map[key].total_mortalities += r.mortalities ?? 0;
  });

  const sorted = Object.values(map).sort((a, b) =>
    a.report_month.localeCompare(b.report_month)
  );
  return { data: sorted, error: null };
}

/**
 * Analytics: Case distribution by disease.
 * @param {object} filters
 * @param {string} [filters.livestockType] - 'Swine' | 'Poultry' | 'Both' | 'all'
 * @param {string} [filters.timeRange]    - '30d' | '6m' | 'ytd' | 'all'
 */
export async function getDiseaseBreakdown(filters = {}) {
  const { livestockType = 'all', timeRange = 'all' } = filters;
  const fromDate = getFromDate(timeRange);

  // Fetch from base table with filters, aggregate client-side
  let query = supabase
    .from('disease_reports')
    .select(`
      disease_id,
      animals_affected,
      mortalities,
      diseases!inner ( disease_name, livestock_types!inner ( type_name ) )
    `);

  if (fromDate) query = query.gte('date_reported', fromDate);
  if (livestockType !== 'all') {
    query = query.eq('diseases.livestock_types.type_name', livestockType);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  const map = {};
  (data ?? []).forEach((r) => {
    const name = r.diseases?.disease_name ?? 'Unknown';
    const type = r.diseases?.livestock_types?.type_name ?? 'Unknown';
    if (!map[name]) {
      map[name] = { disease_name: name, livestock_type: type, total_reports: 0, total_animals_affected: 0, total_mortalities: 0 };
    }
    map[name].total_reports += 1;
    map[name].total_animals_affected += r.animals_affected ?? 0;
    map[name].total_mortalities += r.mortalities ?? 0;
  });

  const sorted = Object.values(map).sort((a, b) => b.total_reports - a.total_reports);
  return { data: sorted, error: null };
}

/**
 * Analytics: Disease density by barangay.
 * @param {object} filters
 * @param {string} [filters.timeRange] - '30d' | '6m' | 'ytd' | 'all'
 */
export async function getBarangayHotspots(filters = {}) {
  const { timeRange = 'all' } = filters;
  const fromDate = getFromDate(timeRange);

  if (!fromDate) {
    // No time filter — use the view directly
    const { data, error } = await supabase
      .from('v_analytics_by_barangay')
      .select('*')
      .order('total_reports', { ascending: false });
    return { data, error };
  }

  // Time-filtered: query base tables and aggregate
  let query = supabase
    .from('disease_reports')
    .select(`
      report_id, animals_affected, mortalities,
      farms!inner ( barangay_id, barangays!inner ( barangay_name, classification ) )
    `)
    .gte('date_reported', fromDate);

  const { data, error } = await query;
  if (error) return { data: null, error };

  const map = {};
  (data ?? []).forEach((r) => {
    const b = r.farms?.barangays;
    const key = r.farms?.barangay_id;
    if (!key) return;
    if (!map[key]) {
      map[key] = {
        barangay_id: key,
        barangay_name: b?.barangay_name ?? 'Unknown',
        classification: b?.classification ?? 0,
        total_reports: 0,
        total_animals_affected: 0,
        total_mortalities: 0,
      };
    }
    map[key].total_reports += 1;
    map[key].total_animals_affected += r.animals_affected ?? 0;
    map[key].total_mortalities += r.mortalities ?? 0;
  });

  const sorted = Object.values(map).sort((a, b) => b.total_reports - a.total_reports);
  return { data: sorted, error: null };
}

/**
 * Analytics: Severity breakdown — always all 4 levels.
 * Supports time-range filtering via base table.
 * @param {string} timeRange - '30d' | '6m' | 'ytd' | 'all'
 */
export async function getSeverityBreakdown(timeRange = 'all') {
  const fromDate = getFromDate(timeRange);

  if (!fromDate) {
    const { data, error } = await supabase
      .from('v_analytics_by_severity')
      .select('*');
    return { data, error };
  }

  // Time-filtered: aggregate from base
  const { data, error } = await supabase
    .from('disease_reports')
    .select('severity, animals_affected, mortalities')
    .gte('date_reported', fromDate);

  if (error) return { data: null, error };

  const ORDER = { Critical: 1, Severe: 2, Moderate: 3, Mild: 4 };
  const map = {};
  (data ?? []).forEach((r) => {
    const key = r.severity ?? 'Unknown';
    if (!map[key]) {
      map[key] = { severity: key, total_reports: 0, total_animals_affected: 0, total_mortalities: 0 };
    }
    map[key].total_reports += 1;
    map[key].total_animals_affected += r.animals_affected ?? 0;
    map[key].total_mortalities += r.mortalities ?? 0;
  });

  const sorted = Object.values(map).sort(
    (a, b) => (ORDER[a.severity] ?? 5) - (ORDER[b.severity] ?? 5)
  );
  return { data: sorted, error: null };
}

// ---------------------------------------------------------------------------
// Convenience: load all 4 datasets at once (used on initial page mount)
// ---------------------------------------------------------------------------
export async function getAllAnalytics(options = {}) {
  const { timeRange = 'ytd', livestockType = 'all' } = options;

  const [monthly, disease, barangay, severity] = await Promise.all([
    getMonthlyTrends(timeRange),
    getDiseaseBreakdown({ livestockType, timeRange }),
    getBarangayHotspots({ timeRange }),
    getSeverityBreakdown(timeRange),
  ]);

  return { monthly, disease, barangay, severity };
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

/**
 * Analytics: Pest control compliance distribution (Compliant / Semi-Compliant / Non-Compliant).
 */
export async function getComplianceBreakdown() {
  const { data, error } = await supabase
    .from('pest_compliance_logs')
    .select('compliance_status');
  if (error) return { data: null, error };

  const map = {};
  (data ?? []).forEach(r => {
    const key = r.compliance_status || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  const result = Object.entries(map).map(([status, count]) => ({ status, count }));
  return { data: result, error: null };
}
