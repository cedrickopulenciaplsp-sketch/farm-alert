import { useState, useEffect, useMemo } from 'react';
import {
  getFilteredReports,
  getDiseaseBreakdown,
  getBarangayHotspots,
  getSeverityBreakdown,
  getPestControlActivity,
  getFarmStatusBreakdown,
  getReportStatusBreakdown,
  getActiveOutbreaks,
} from '../../services/analytics';
import { getDiseases } from '../../services/diseases';
import {
  AreaChart, Area,
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Legend, Tooltip as RechartsTooltip,
  RadialBarChart, RadialBar,
  LineChart, Line,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, MapPin, AlertTriangle, FileText,
  PieChart as PieIcon, Activity, Filter, Calendar,
  ChevronUp, ChevronDown, Minus, Bug, Tractor, ClipboardList, Skull,
} from 'lucide-react';
import Card from '../../components/shared/Card';
import styles from './Analytics.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DATE_RANGES = [
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last year',    days: 365 },
  { label: 'All time',     days: null },
];

const DISEASE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
const SEVERITY_COLORS = { Mild: '#10b981', Moderate: '#f59e0b', Severe: '#f97316', Critical: '#ef4444' };
const FARM_STATUS_COLORS = { Active: '#10b981', Inactive: '#94a3b8', Quarantine: '#f97316' };
const REPORT_STATUS_COLORS = { 'Active': '#ef4444', 'Under Monitoring': '#f59e0b', 'Resolved': '#10b981' };
const PEST_COLORS = ['#f59e0b','#f97316','#ef4444','#8b5cf6','#3b82f6','#14b8a6','#10b981','#ec4899','#64748b','#a3e635'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSinceDate(days) {
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function rankColor(index, total) {
  if (total <= 1) return '#ef4444';
  const t = index / (total - 1);
  if (t < 0.5) {
    const local = t / 0.5;
    return `rgb(${Math.round(239+(245-239)*local)},${Math.round(68+(158-68)*local)},${Math.round(68+(11-68)*local)})`;
  } else {
    const local = (t - 0.5) / 0.5;
    return `rgb(${Math.round(245+(16-245)*local)},${Math.round(158+(185-158)*local)},${Math.round(11+(129-11)*local)})`;
  }
}

// ---------------------------------------------------------------------------
// Custom Tooltips
// ---------------------------------------------------------------------------
function CustomTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : null;
  return (
    <div className={styles.tooltip}>
      {label && <p className={styles.tooltipLabel}>{label}</p>}
      <p className={styles.tooltipValue}>{value} case{value !== 1 ? 's' : ''}</p>
      {pct && <p className={styles.tooltipPct}>{pct}% of total</p>}
    </div>
  );
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{name}</p>
      <p className={styles.tooltipValue}>{value} case{value !== 1 ? 's' : ''}</p>
      {pct && <p className={styles.tooltipPct}>{pct}% of total</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton & Empty
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
function StatCard({ label, value, sub, icon: Icon, color, loading }) {
  return (
    <Card className={styles.statCard}>
      <div className={styles.statIconBox} style={{ color, background: `${color}18` }}>
        <Icon size={22} />
      </div>
      <div>
        {loading
          ? <div className={styles.skeletonBar} style={{ width: 60, height: 28, marginBottom: 6 }} />
          : <p className={styles.statValue}>{value ?? '—'}</p>
        }
        <p className={styles.statLabel}>{label}</p>
        {sub && !loading && <p className={styles.statSub}>{sub}</p>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Report Status — Stacked Progress Bar
// ---------------------------------------------------------------------------
const STATUS_ORDER = ['Active', 'Under Monitoring', 'Resolved'];
const STATUS_META  = {
  'Active':          { color: '#ef4444', label: 'Active' },
  'Under Monitoring':{ color: '#f59e0b', label: 'Monitoring' },
  'Resolved':        { color: '#10b981', label: 'Resolved' },
};

function ReportStatusBar({ data, loading }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  // Normalise to STATUS_ORDER so segments always appear in the same sequence
  const segments = STATUS_ORDER.map(status => {
    const found = data.find(d => d.status === status);
    return { status, count: found?.count ?? 0, color: STATUS_META[status]?.color ?? '#94a3b8', label: STATUS_META[status]?.label ?? status };
  }).filter(s => total === 0 || s.count > 0);

  if (loading) return <SkeletonChart height={180} />;
  if (!data.length || total === 0) return <EmptyChart message="No reports filed yet." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 0' }}>

      {/* Total badge */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 'var(--text-3xl, 2rem)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>total reports</span>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 32, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
        {segments.map(s => {
          const pct = ((s.count / total) * 100).toFixed(1);
          return (
            <div
              key={s.status}
              title={`${s.label}: ${s.count} (${pct}%)`}
              style={{
                flex: s.count / total,
                background: s.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s',
                cursor: 'default',
                minWidth: s.count > 0 ? 8 : 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {pct >= 10 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', userSelect: 'none' }}>{pct}%</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend + count badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {segments.map(s => {
          const pct = ((s.count / total) * 100).toFixed(1);
          return (
            <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{s.label}</span>
              <span style={{
                fontSize: 'var(--text-xs)', fontWeight: 700,
                background: `${s.color}18`, color: s.color,
                borderRadius: 99, padding: '2px 10px', whiteSpace: 'nowrap'
              }}>
                {s.count} &nbsp;<span style={{ opacity: 0.7 }}>({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable Pie Chart Card
// ---------------------------------------------------------------------------
function PieCard({ className, title, icon: Icon, loading, data, dataKey, nameKey, colors, colorMap, total, unitLabel = 'case' }) {
  return (
    <Card className={className}>
      <Card.Header title={<div className={styles.chartTitle}><Icon size={15} /><span>{title}</span></div>} />
      <Card.Body>
        {loading
          ? <SkeletonChart height={280} />
          : !data?.length
          ? <EmptyChart />
          : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="42%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey={dataKey} nameKey={nameKey}>
                    {data.map((entry, i) => (
                      <Cell key={i} fill={colorMap ? (colorMap[entry[nameKey]] || '#94a3b8') : colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(v, name) => [`${v} ${unitLabel}${v !== 1 ? 's' : ''}`, name]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Legend
                    iconType="circle" iconSize={9}
                    formatter={name => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{name}</span>}
                    wrapperStyle={{ paddingTop: 6 }}
                    payload={data.map((d, i) => ({
                      value: d[nameKey],
                      type: 'circle',
                      color: colorMap ? (colorMap[d[nameKey]] || '#94a3b8') : colors[i % colors.length],
                    }))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )
        }
      </Card.Body>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Analytics Page
// ---------------------------------------------------------------------------
export default function Analytics() {
  // Filters
  const [rangeDays, setRangeDays] = useState(null);
  const [diseaseFilter, setDiseaseFilter] = useState('');
  const [diseases, setDiseases] = useState([]);

  // Data
  const [reports, setReports]               = useState([]);
  const [allDiseases, setAllDiseases]       = useState([]);
  const [hotspots, setHotspots]             = useState([]);
  const [pestActivity, setPestActivity]     = useState([]);
  const [farmStatus, setFarmStatus]         = useState([]);
  const [reportStatus, setReportStatus]     = useState([]);
  const [activeOutbreaks, setActiveOutbreaks] = useState(null);
  const [lastUpdated, setLastUpdated]       = useState(null);

  // Loading
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingStatic, setLoadingStatic]   = useState(true);
  const [loadingExtra, setLoadingExtra]     = useState(true);

  // Load static data (no date filter)
  useEffect(() => {
    async function loadStatic() {
      const [hRes, sRes, dRes] = await Promise.all([
        getBarangayHotspots(), getSeverityBreakdown(), getDiseases(),
      ]);
      if (hRes.data) setHotspots(hRes.data.slice(0, 10));
      if (dRes.data) setDiseases(dRes.data);
      setLoadingStatic(false);
    }
    async function loadAllDiseases() {
      const { data } = await getDiseaseBreakdown();
      if (data) setAllDiseases(data);
    }
    async function loadExtra() {
      const [pRes, fRes, rRes] = await Promise.all([
        getPestControlActivity(), getFarmStatusBreakdown(), getReportStatusBreakdown(),
      ]);
      if (pRes.data) setPestActivity(pRes.data);
      if (fRes.data) setFarmStatus(fRes.data);
      if (rRes.data) setReportStatus(rRes.data);
      setLoadingExtra(false);
    }
    loadStatic();
    loadAllDiseases();
    loadExtra();
    // Fetch active outbreaks count for stat card
    getActiveOutbreaks().then(({ count }) => setActiveOutbreaks(count));
  }, []);

  // Load filtered reports
  useEffect(() => {
    async function loadReports() {
      setLoadingReports(true);
      const { data } = await getFilteredReports({
        since: getSinceDate(rangeDays),
        diseaseId: diseaseFilter || null,
      });
      if (data) { setReports(data); setLastUpdated(new Date()); }
      setLoadingReports(false);
    }
    loadReports();
  }, [rangeDays, diseaseFilter]);

  // Derived: monthly trends with BOTH cases and deaths per month
  const trends = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      const month = r.date_reported.slice(0, 7);
      if (!map[month]) map[month] = { cases: 0, deaths: 0 };
      map[month].cases  += 1;
      map[month].deaths += (r.mortalities || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      cases:  data.cases,
      deaths: data.deaths,
    }));
  }, [reports]);

  // Total mortalities for the selected period
  const totalMortalitiesPeriod = useMemo(() =>
    reports.reduce((sum, r) => sum + (r.mortalities || 0), 0)
  , [reports]);

  const filteredDiseases = useMemo(() => {
    const map = {};
    reports.forEach(r => { map[r.disease_name] = (map[r.disease_name] || 0) + 1; });
    return Object.entries(map).sort(([,a],[,b]) => b-a).map(([disease_name, case_count]) => ({ disease_name, case_count }));
  }, [reports]);

  const filteredSeverity = useMemo(() => {
    const map = {};
    reports.forEach(r => { if (r.severity) map[r.severity] = (map[r.severity] || 0) + 1; });
    return Object.entries(map).map(([severity, case_count]) => ({ severity, case_count }));
  }, [reports]);

  const trendIndicator = useMemo(() => {
    if (trends.length < 2) return null;
    const last = trends[trends.length - 1]?.cases || 0;
    const prev = trends[trends.length - 2]?.cases || 0;
    if (prev === 0) return null;
    const pct = Math.round(((last - prev) / prev) * 100);
    return { pct, up: pct > 0, same: pct === 0 };
  }, [trends]);

  const totalCases       = reports.length;
  const topDisease       = filteredDiseases[0]?.disease_name ?? allDiseases[0]?.disease_name ?? '—';
  const topBarangay      = hotspots[0]?.barangay_name ?? '—';
  const totalPieDiseases = filteredDiseases.reduce((s, d) => s + d.case_count, 0);
  const totalPieSeverity = filteredSeverity.reduce((s, d) => s + d.case_count, 0);

  // Pest / Farm derived stats
  const totalFarms         = farmStatus.reduce((s, d) => s + d.count, 0);
  const quarantinedFarms   = farmStatus.find(d => d.status === 'Quarantine')?.count ?? 0;
  const totalInterventions = pestActivity.reduce((s, d) => s + d.count, 0);
  const topPest            = pestActivity[0]?.pest_type ?? '—';

  return (
    <div className={styles.page}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
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

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <Card className={styles.filterBar}>
        <div className={styles.filterBarInner}>
          <div className={styles.filterGroup}>
            <Calendar size={14} className={styles.filterIcon} />
            <span className={styles.filterLabel}>Period:</span>
            {DATE_RANGES.map(r => (
              <button
                key={r.label}
                className={`${styles.filterPill} ${rangeDays === r.days ? styles.filterPillActive : ''}`}
                onClick={() => setRangeDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <Filter size={14} className={styles.filterIcon} />
            <span className={styles.filterLabel}>Disease:</span>
            <select className={styles.filterSelect} value={diseaseFilter} onChange={e => setDiseaseFilter(e.target.value)}>
              <option value="">All Diseases</option>
              {diseases.map(d => <option key={d.disease_id} value={d.disease_id}>{d.disease_name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* ── Summary Stat Cards ────────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <StatCard label="Total Cases (Period)"     value={totalCases}               icon={FileText}      color="hsl(152,58%,28%)" loading={loadingReports} />
        <StatCard label="Total Mortalities (Period)" value={totalMortalitiesPeriod} icon={Skull}         color="#ef4444"          loading={loadingReports}
          sub={totalMortalitiesPeriod > 0 ? 'Deaths in selected period' : 'No deaths recorded'} />
        <StatCard label="Active Outbreaks"          value={activeOutbreaks}         icon={AlertTriangle} color="#f97316"          loading={activeOutbreaks === null}
          sub={activeOutbreaks > 0 ? 'Requires immediate attention' : 'No active outbreaks'} />
        <StatCard label="Hotspot Barangay"          value={topBarangay}             icon={MapPin}         color="#f59e0b"          loading={loadingStatic} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — Disease Analytics                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>📊 Disease Analytics</span>
        <div className={styles.sectionLine} />
      </div>

      <div className={styles.grid}>

        {/* Monthly Trend — spans all 3 columns, now shows CASES + DEATHS */}
        <Card className={styles.fullCard}>
          <Card.Header
            title={
              <div className={styles.chartTitle}>
                <TrendingUp size={15} />
                <span>Monthly Case & Mortality Trends</span>
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
            {loadingReports ? <SkeletonChart height={280} /> : trends.length === 0 ? <EmptyChart message="No cases recorded in this period." /> : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(152,58%,28%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(152,58%,28%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                      formatter={(value, name) => [
                        value,
                        name === 'cases' ? 'Cases' : 'Deaths',
                      ]}
                    />
                    <Legend
                      iconType="circle" iconSize={9}
                      formatter={name => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{name === 'cases' ? 'Cases' : 'Deaths'}</span>}
                      wrapperStyle={{ paddingTop: 6 }}
                    />
                    <Line
                      type="monotone" dataKey="cases"
                      stroke="hsl(152,58%,28%)" strokeWidth={2.5}
                      dot={{ r: 4, fill: 'hsl(152,58%,28%)' }} activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone" dataKey="deaths"
                      stroke="#ef4444" strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Hotspot Bar — spans 2 columns, now grouped: cases + deaths */}
        <Card className={styles.twoThirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><MapPin size={15} /><span>Hotspots by Barangay — Cases & Deaths</span></div>} />
          <Card.Body>
            {loadingStatic ? <SkeletonChart height={280} /> : hotspots.length === 0 ? <EmptyChart message="No cases by location yet." /> : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hotspots} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="barangay_name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                      formatter={(value, name) => [value, name === 'case_count' ? 'Cases' : 'Deaths']}
                      cursor={{ fill: 'var(--color-overlay)' }}
                    />
                    <Legend
                      iconType="circle" iconSize={9}
                      formatter={name => <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{name === 'case_count' ? 'Cases' : 'Deaths'}</span>}
                      wrapperStyle={{ paddingTop: 6 }}
                    />
                    <Bar dataKey="case_count" name="case_count" radius={[0, 4, 4, 0]} barSize={12} fill="hsl(152,58%,40%)" />
                    <Bar dataKey="total_mortalities" name="total_mortalities" radius={[0, 4, 4, 0]} barSize={12} fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>


        {/* Cases by Disease — 1 column */}
        <PieCard
          className={styles.thirdCard}
          title="Cases by Disease"
          icon={PieIcon}
          loading={loadingReports}
          data={filteredDiseases}
          dataKey="case_count"
          nameKey="disease_name"
          colors={DISEASE_COLORS}
          total={totalPieDiseases}
        />

        {/* Report Status — Stacked Progress Bar */}
        <Card className={styles.thirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><ClipboardList size={15} /><span>Report Status</span></div>} />
          <Card.Body>
            <ReportStatusBar data={reportStatus} loading={loadingExtra} />
          </Card.Body>
        </Card>

        {/* Cases by Severity — 1 column */}
        <PieCard
          className={styles.thirdCard}
          title="Cases by Severity"
          icon={AlertTriangle}
          loading={loadingReports}
          data={filteredSeverity}
          dataKey="case_count"
          nameKey="severity"
          colorMap={SEVERITY_COLORS}
          colors={[]}
          total={totalPieSeverity}
        />

      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — Farm & Pest Operations                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>🐛 Farm & Pest Operations</span>
        <div className={styles.sectionLine} />
      </div>

      {/* Pest / Farm Summary Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Total Farms Registered" value={totalFarms}         icon={Tractor}      color="#10b981" loading={loadingExtra} />
        <StatCard label="Quarantined Farms"       value={quarantinedFarms}  icon={AlertTriangle} color="#f97316" loading={loadingExtra} sub={quarantinedFarms > 0 ? 'Requires attention' : 'None currently'} />
        <StatCard label="Pest Interventions"      value={totalInterventions} icon={Bug}          color="#f59e0b" loading={loadingExtra} />
        <StatCard label="Most Treated Pest"       value={topPest}           icon={Activity}     color="#8b5cf6" loading={loadingExtra} />
      </div>

      <div className={styles.grid}>

        {/* Farm Status — 1 column */}
        <PieCard
          className={styles.thirdCard}
          title="Farm Status"
          icon={Tractor}
          loading={loadingExtra}
          data={farmStatus}
          dataKey="count"
          nameKey="status"
          colorMap={FARM_STATUS_COLORS}
          colors={[]}
          unitLabel="farm"
        />

        {/* Pest Control Interventions — 2 columns */}
        <Card className={styles.twoThirdCard}>
          <Card.Header title={<div className={styles.chartTitle}><Bug size={15} /><span>Pest Control Interventions by Pest Type</span></div>} />
          <Card.Body>
            {loadingExtra ? <SkeletonChart height={280} /> : pestActivity.length === 0 ? <EmptyChart message="No pest control logs recorded yet." /> : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pestActivity} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="pest_type" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                    <RechartsTooltip
                      formatter={(v) => [`${v} intervention${v !== 1 ? 's' : ''}`, 'Count']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                      cursor={{ fill: 'var(--color-overlay)' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {pestActivity.map((_, i) => <Cell key={i} fill={PEST_COLORS[i % PEST_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card.Body>
        </Card>

      </div>

    </div>
  );
}
