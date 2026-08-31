import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  getMonthlyTrends,
  getDiseaseBreakdown,
  getBarangayHotspots,
  getSeverityBreakdown,
  getReportStatusBreakdown,
  getActiveOutbreaks,
  getComplianceBreakdown,
} from '../../services/analytics';
import { getDiseases } from '../../services/diseases';
import { getBarangays } from '../../services/farms';
import {
  AreaChart, Area,
  BarChart, Bar,
  Cell, Legend, Tooltip as RechartsTooltip,
  XAxis, YAxis, CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, MapPin, AlertTriangle, FileText,
  BarChart2, Filter, Calendar,
  ChevronUp, ChevronDown, Minus, ClipboardList, Skull, ShieldCheck,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import styles from './Analytics.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIME_RANGES = [
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 6 Months', value: '6m'  },
  { label: 'Year-to-Date', value: 'ytd' },
  { label: 'All Time',     value: 'all' },
];

const LIVESTOCK_TYPES = ['all', 'Swine', 'Poultry'];

const DISEASE_COLORS  = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
const SEVERITY_COLORS = { Mild: '#10b981', Moderate: '#f59e0b', Severe: '#f97316', Critical: '#ef4444' };

const COMPLIANCE_ORDER = ['Compliant', 'Semi-Compliant', 'Non-Compliant'];
const COMPLIANCE_META  = {
  'Compliant':      { color: '#10b981' },
  'Semi-Compliant': { color: '#f59e0b' },
  'Non-Compliant':  { color: '#ef4444' },
};

const STATUS_ORDER = ['Active', 'Under Monitoring', 'Resolved'];
const STATUS_META  = {
  'Active':           { color: '#ef4444', label: 'Active' },
  'Under Monitoring': { color: '#f59e0b', label: 'Monitoring' },
  'Resolved':         { color: '#10b981', label: 'Resolved' },
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
function SkeletonChart({ height = 260 }) {
  return (
    <div className={styles.skeleton} style={{ height }}>
      <div className={styles.skeletonBar} style={{ width: '70%', height: 16, marginBottom: 12 }} />
      <div className={styles.skeletonBar} style={{ width: '40%', height: 12, marginBottom: 24 }} />
      <div className={styles.skeletonChart} />
    </div>
  );
}

function EmptyChart({ message = 'No data available for this period.' }) {
  return (
    <div className={styles.emptyChart}>
      <FileText size={28} />
      <p>{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Stat Card
// ---------------------------------------------------------------------------
function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, loading }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIconBox} style={{ color: iconColor, background: iconBg }}>
        <Icon size={22} />
      </div>
      <div className={styles.statContent}>
        {loading
          ? <div className={styles.skeletonBar} style={{ width: 60, height: 28, marginBottom: 6 }} />
          : <p className={styles.statValue}>{value ?? '—'}</p>
        }
        <p className={styles.statLabel}>{label}</p>
        {sub && !loading && <p className={styles.statSub}>{sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stacked Progress Bar — shared for Report Status & Compliance
// ---------------------------------------------------------------------------
function StackedBar({ data, order, meta, emptyMessage, loading }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const segments = order.map(key => {
    const found = data.find(d => d.status === key);
    return { key, count: found?.count ?? 0, color: meta[key]?.color ?? '#94a3b8', label: meta[key]?.label ?? key };
  }).filter(s => total === 0 || s.count > 0);

  if (loading) return <SkeletonChart height={180} />;
  if (!data.length || total === 0) return <EmptyChart message={emptyMessage} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 'var(--text-3xl, 2rem)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>total</span>
      </div>
      <div style={{ display: 'flex', height: 32, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
        {segments.map(s => {
          const pct = ((s.count / total) * 100).toFixed(1);
          return (
            <div key={s.key} title={`${s.label}: ${s.count} (${pct}%)`}
              style={{ flex: s.count / total, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', minWidth: s.count > 0 ? 8 : 0 }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {pct >= 10 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', userSelect: 'none' }}>{pct}%</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {segments.map(s => {
          const pct = ((s.count / total) * 100).toFixed(1);
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{s.label}</span>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, background: `${s.color}18`, color: s.color, borderRadius: 99, padding: '2px 10px', whiteSpace: 'nowrap' }}>
                {s.count}&nbsp;<span style={{ opacity: 0.7 }}>({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// Analytics Page
// ---------------------------------------------------------------------------
export default function Analytics() {
  const { isDark } = useTheme();

  // ── Chart theme helpers — passed to Recharts to support dark mode ──────
  const tickColor   = isDark ? 'hsl(150,10%,55%)' : 'hsl(160,10%,40%)';
  const tooltipBg   = isDark ? 'hsl(160,14%,12%)' : '#ffffff';
  const tooltipText = isDark ? 'hsl(150,15%,90%)' : 'hsl(160,20%,10%)';

  // ── Filters ──────────────────────────────────────────────────────────────
  const [timeRange, setTimeRange]       = useState('ytd');
  const [livestockType, setLivestockType] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');

  // ── Reference data for filter dropdowns ─────────────────────────────────
  const [barangays, setBarangays] = useState([]);

  // ── Chart data ───────────────────────────────────────────────────────────
  const [monthlyData, setMonthlyData]     = useState([]);
  const [diseaseData, setDiseaseData]     = useState([]);
  const [barangayData, setBarangayData]   = useState([]);
  const [severityData, setSeverityData]   = useState([]);
  const [reportStatus, setReportStatus]   = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [activeOutbreaks, setActiveOutbreaks] = useState(null);
  const [lastUpdated, setLastUpdated]     = useState(null);

  // ── Loading flags ─────────────────────────────────────────────────────────
  const [loadingMonthly, setLoadingMonthly]   = useState(true);
  const [loadingDisease, setLoadingDisease]   = useState(true);
  const [loadingBarangay, setLoadingBarangay] = useState(true);
  const [loadingSeverity, setLoadingSeverity] = useState(true);
  const [loadingExtra, setLoadingExtra]       = useState(true);

  // ── Load reference data once ─────────────────────────────────────────────
  useEffect(() => {
    getBarangays().then(({ data }) => { if (data) setBarangays(data); });
    getActiveOutbreaks().then(({ count }) => setActiveOutbreaks(count));
    Promise.all([getReportStatusBreakdown(), getComplianceBreakdown()]).then(([rRes, cRes]) => {
      if (rRes.data) setReportStatus(rRes.data);
      if (cRes.data) setComplianceData(cRes.data);
      setLoadingExtra(false);
    });
  }, []);

  // ── Re-fetch monthly trends when timeRange or livestockType changes ──────
  useEffect(() => {
    setLoadingMonthly(true);
    getMonthlyTrends(timeRange, livestockType).then(({ data }) => {
      setMonthlyData(data ?? []);
      setLoadingMonthly(false);
      setLastUpdated(new Date());
    });
  }, [timeRange, livestockType]);

  // ── Re-fetch disease breakdown when filters change ───────────────────────
  useEffect(() => {
    setLoadingDisease(true);
    getDiseaseBreakdown({ timeRange, livestockType }).then(({ data }) => {
      setDiseaseData(data ?? []);
      setLoadingDisease(false);
    });
  }, [timeRange, livestockType]);

  // ── Re-fetch barangay hotspots when filters change ────────────────────────
  useEffect(() => {
    setLoadingBarangay(true);
    getBarangayHotspots({ timeRange, livestockType }).then(({ data }) => {
      setBarangayData(data ?? []);
      setLoadingBarangay(false);
    });
  }, [timeRange, livestockType]);

  // ── Re-fetch severity when filters change ──────────────────────────────────
  useEffect(() => {
    setLoadingSeverity(true);
    getSeverityBreakdown(timeRange, livestockType).then(({ data }) => {
      setSeverityData(data ?? []);
      setLoadingSeverity(false);
    });
  }, [timeRange, livestockType]);

  // ── Derived values ────────────────────────────────────────────────────────

  // Apply optional client-side barangay filter on already-fetched barangay data
  const filteredBarangays = useMemo(() => {
    if (barangayFilter === 'all') return barangayData.slice(0, 10);
    return barangayData.filter(b => String(b.barangay_id) === barangayFilter).slice(0, 10);
  }, [barangayData, barangayFilter]);

  // Trend badge: compare last 2 months
  const trendIndicator = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const last = monthlyData[monthlyData.length - 1]?.total_reports || 0;
    const prev = monthlyData[monthlyData.length - 2]?.total_reports || 0;
    if (prev === 0) return null;
    const pct = Math.round(((last - prev) / prev) * 100);
    return { pct, up: pct > 0, same: pct === 0 };
  }, [monthlyData]);

  const totalCases     = monthlyData.reduce((s, d) => s + (d.total_reports ?? 0), 0);
  const totalMortalities = monthlyData.reduce((s, d) => s + (d.total_mortalities ?? 0), 0);
  const topBarangay    = barangayData[0]?.barangay_name ?? '—';

  const totalPieSeverity  = severityData.reduce((s, d) => s + (d.total_reports ?? 0), 0);

  const compliantCount     = complianceData.find(d => d.status === 'Compliant')?.count ?? 0;
  const semiCompliantCount = complianceData.find(d => d.status === 'Semi-Compliant')?.count ?? 0;
  const nonCompliantCount  = complianceData.find(d => d.status === 'Non-Compliant')?.count ?? 0;
  const totalEvaluations   = complianceData.reduce((s, d) => s + d.count, 0);

  // Map severity data to consistent field names for PieCard
  const severityPieData = severityData.map(d => ({ status: d.severity, count: d.total_reports }));


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Analytics Hub</h1>
          <p className={styles.pageSubtitle}>
            Data-driven insights for outbreak prevention
            {lastUpdated && (
              <span className={styles.updatedAt}>
                · Updated {lastUpdated.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
      </header>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <Card className={styles.filterBar}>
        <div className={styles.filterBarInner}>

          {/* Time Range */}
          <div className={styles.filterGroup}>
            <Calendar size={14} className={styles.filterIcon} />
            <span className={styles.filterLabel}>Period:</span>
            {TIME_RANGES.map(r => (
              <button
                key={r.value}
                className={`${styles.filterPill} ${timeRange === r.value ? styles.filterPillActive : ''}`}
                onClick={() => setTimeRange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Livestock Type */}
          <div className={styles.filterGroup}>
            <Filter size={14} className={styles.filterIcon} />
            <span className={styles.filterLabel}>Livestock:</span>
            <select
              className={styles.filterSelect}
              value={livestockType}
              onChange={e => setLivestockType(e.target.value)}
              aria-label="Filter by livestock type"
            >
              {LIVESTOCK_TYPES.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>

          {/* Barangay */}
          <div className={styles.filterGroup}>
            <MapPin size={14} className={styles.filterIcon} />
            <span className={styles.filterLabel}>Barangay:</span>
            <select
              className={styles.filterSelect}
              value={barangayFilter}
              onChange={e => setBarangayFilter(e.target.value)}
              aria-label="Filter by barangay"
            >
              <option value="all">All Barangays</option>
              {barangays.map(b => (
                <option key={b.barangay_id} value={String(b.barangay_id)}>{b.barangay_name}</option>
              ))}
            </select>
          </div>

        </div>
      </Card>

      {/* ── Summary Stat Cards ────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <StatCard label="Total Cases (Period)"      value={totalCases}       icon={FileText}      iconBg="var(--icon-green-bg)"  iconColor="var(--icon-green-text)"  loading={loadingMonthly} />
        <StatCard label="Total Mortalities (Period)" value={totalMortalities} icon={Skull}         iconBg="var(--icon-red-bg)"    iconColor="var(--icon-red-text)"    loading={loadingMonthly}
          sub={totalMortalities > 0 ? 'Deaths in selected period' : 'No deaths recorded'} />
        <StatCard label="Active Outbreaks"           value={activeOutbreaks}  icon={AlertTriangle} iconBg="var(--icon-orange-bg)" iconColor="var(--icon-orange-text)" loading={activeOutbreaks === null}
          sub={activeOutbreaks > 0 ? 'Requires immediate attention' : 'No active outbreaks'} />
        <StatCard label="Hotspot Barangay"           value={topBarangay}      icon={MapPin}        iconBg="var(--icon-amber-bg)"  iconColor="var(--icon-amber-text)"  loading={loadingBarangay} />
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — Disease Analytics                                      */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>📊 Disease Analytics</span>
        <div className={styles.sectionLine} />
      </div>

      <div className={styles.grid}>

        {/* Area Chart — Monthly Trends (full width) */}
        <Card className={styles.fullCard}>
          <Card.Header
            title={
              <div className={styles.chartTitle}>
                <TrendingUp size={15} />
                <span>Monthly Case &amp; Mortality Trends</span>
                {trendIndicator && (
                  <span className={`${styles.trendBadge} ${trendIndicator.up ? styles.trendUp : styles.trendDown}`}>
                    {trendIndicator.up ? <ChevronUp size={12} /> : trendIndicator.same ? <Minus size={12} /> : <ChevronDown size={12} />}
                    {Math.abs(trendIndicator.pct)}% vs last month
                  </span>
                )}
              </div>
            }
          />
          <Card.Body>
            {loadingMonthly ? <SkeletonChart height={280} /> : monthlyData.length === 0 ? <EmptyChart message="No cases recorded in this period." /> : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="gradCases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(152,58%,28%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(152,58%,28%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradDeaths" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month_label" tick={{ fontSize: 12, fill: tickColor }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: tickColor }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', backgroundColor: tooltipBg, color: tooltipText }}
                      formatter={(value, name) => [value, name === 'total_reports' ? 'Cases' : 'Deaths']}
                    />
                    <Legend
                      iconType="circle" iconSize={9}
                      formatter={name => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{name === 'total_reports' ? 'Cases' : 'Deaths'}</span>}
                      wrapperStyle={{ paddingTop: 6 }}
                    />
                    <Area
                      type="monotone" dataKey="total_reports"
                      stroke="hsl(152,58%,28%)" strokeWidth={2.5}
                      fill="url(#gradCases)"
                      dot={{ r: 4, fill: 'hsl(152,58%,28%)' }} activeDot={{ r: 6 }}
                    />
                    <Area
                      type="monotone" dataKey="total_mortalities"
                      stroke="#ef4444" strokeWidth={2}
                      strokeDasharray="4 2"
                      fill="url(#gradDeaths)"
                      dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Bar Chart — Hotspots by Barangay (2/3 width) */}
        <Card className={styles.twoThirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><MapPin size={15} /><span>Disease Density by Barangay</span></div>} />
          <Card.Body>
            {loadingBarangay ? <SkeletonChart height={280} /> : filteredBarangays.length === 0 ? <EmptyChart message="No cases by location yet." /> : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredBarangays} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: tickColor }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="barangay_name" type="category" tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} width={90} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', backgroundColor: tooltipBg, color: tooltipText }}
                      formatter={(value, name) => [value, name === 'total_reports' ? 'Cases' : 'Deaths']}
                      cursor={{ fill: 'var(--color-overlay)' }}
                    />
                    <Legend
                      iconType="circle" iconSize={9}
                      formatter={name => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{name === 'total_reports' ? 'Cases' : 'Deaths'}</span>}
                      wrapperStyle={{ paddingTop: 6 }}
                    />
                    <Bar dataKey="total_reports"     name="total_reports"     radius={[0, 4, 4, 0]} barSize={12} fill="hsl(152,58%,40%)" />
                    <Bar dataKey="total_mortalities" name="total_mortalities" radius={[0, 4, 4, 0]} barSize={12} fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Bar Chart — Cases by Disease (1/3 width) */}
        <Card className={styles.thirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><BarChart2 size={15} /><span>Cases by Disease</span></div>} />
          <Card.Body>
            {loadingDisease ? <SkeletonChart height={220} /> : diseaseData.length === 0 ? <EmptyChart /> : (
              <div className={styles.chartWrapSm}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diseaseData.slice(0, 6)} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="disease_name" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', backgroundColor: tooltipBg, color: tooltipText }}
                      formatter={(v) => [`${v} cases`]}
                    />
                    <Bar dataKey="total_reports" radius={[4, 4, 0, 0]} barSize={28}>
                      {diseaseData.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Report Status Bar */}
        <Card className={styles.thirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><ClipboardList size={15} /><span>Report Status</span></div>} />
          <Card.Body>
            <StackedBar
              data={reportStatus}
              order={STATUS_ORDER}
              meta={STATUS_META}
              emptyMessage="No reports filed yet."
              loading={loadingExtra}
            />
          </Card.Body>
        </Card>

        {/* Stacked Bar — Severity Distribution (1/3 width) */}
        <Card className={styles.thirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><AlertTriangle size={15} /><span>Cases by Severity</span></div>} />
          <Card.Body>
            <StackedBar
              data={severityPieData}
              order={Object.keys(SEVERITY_COLORS)}
              meta={Object.fromEntries(Object.entries(SEVERITY_COLORS).map(([k, color]) => [k, { color, label: k }]))}
              emptyMessage="No severity data yet."
              loading={loadingSeverity}
            />
          </Card.Body>
        </Card>

      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Farm & Pest Compliance                                 */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>🛡️ Farm Compliance</span>
        <div className={styles.sectionLine} />
      </div>

      <div className={styles.statsRow}>
        <StatCard label="Compliant"        value={compliantCount}     icon={ShieldCheck}   iconBg="var(--badge-compliant-bg)"     iconColor="var(--badge-compliant-text)"     loading={loadingExtra} sub={compliantCount > 0 ? 'Fully compliant farms' : 'None recorded'} />
        <StatCard label="Semi-Compliant"   value={semiCompliantCount} icon={ShieldCheck}   iconBg="var(--badge-semi-bg)"          iconColor="var(--badge-semi-text)"          loading={loadingExtra} sub={semiCompliantCount > 0 ? 'Partially compliant' : 'None'} />
        <StatCard label="Non-Compliant"    value={nonCompliantCount}  icon={AlertTriangle} iconBg="var(--badge-noncompliant-bg)"  iconColor="var(--badge-noncompliant-text)"  loading={loadingExtra} sub={nonCompliantCount > 0 ? 'Requires follow-up' : 'All compliant'} />
        <StatCard label="Total Evaluations" value={totalEvaluations}  icon={ShieldCheck}   iconBg="var(--icon-green-bg)"          iconColor="var(--icon-green-text)"          loading={loadingExtra} />
      </div>

      <div className={styles.grid}>
        <Card className={styles.fullCard}>
          <Card.Header title={<div className={styles.chartTitle}><ShieldCheck size={15} /><span>Pest Control Compliance Breakdown</span></div>} />
          <Card.Body>
            <StackedBar
              data={complianceData}
              order={COMPLIANCE_ORDER}
              meta={Object.fromEntries(COMPLIANCE_ORDER.map(k => [k, { ...COMPLIANCE_META[k], label: k }]))}
              emptyMessage="No compliance evaluations recorded yet."
              loading={loadingExtra}
            />
          </Card.Body>
        </Card>
      </div>

    </div>
  );
}
