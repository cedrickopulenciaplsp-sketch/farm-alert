import { useState, useEffect, useMemo } from 'react';
import {
  getFilteredReports,
  getDiseaseBreakdown,
  getBarangayHotspots,
  getSeverityBreakdown,
} from '../../services/analytics';
import { getDiseases } from '../../services/diseases';
import {
  AreaChart, Area,
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Legend, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, MapPin, AlertTriangle, FileText,
  PieChart as PieIcon, Activity, Filter, Calendar,
  ChevronUp, ChevronDown, Minus
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
const SEVERITY_COLORS = {
  Mild:     '#10b981',
  Moderate: '#f59e0b',
  Severe:   '#f97316',
  Critical: '#ef4444',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getSinceDate(days) {
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Interpolate color from green → yellow → red based on rank (0 = highest)
function rankColor(index, total) {
  if (total <= 1) return '#ef4444';
  const t = index / (total - 1);
  // 0 = red, 0.5 = amber, 1 = green
  if (t < 0.5) {
    const local = t / 0.5;
    const r = Math.round(239 + (245 - 239) * local);
    const g = Math.round(68  + (158 - 68)  * local);
    const b = Math.round(68  + (11  - 68)  * local);
    return `rgb(${r},${g},${b})`;
  } else {
    const local = (t - 0.5) / 0.5;
    const r = Math.round(245 + (16  - 245) * local);
    const g = Math.round(158 + (185 - 158) * local);
    const b = Math.round(11  + (129 - 11)  * local);
    return `rgb(${r},${g},${b})`;
  }
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
function CustomTooltip({ active, payload, label, total }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '—';
  return (
    <div className={styles.tooltip}>
      {label && <p className={styles.tooltipLabel}>{label}</p>}
      <p className={styles.tooltipValue}>{value} case{value !== 1 ? 's' : ''}</p>
      {total > 0 && <p className={styles.tooltipPct}>{pct}% of total</p>}
    </div>
  );
}

function PieTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '—';
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{name}</p>
      <p className={styles.tooltipValue}>{value} case{value !== 1 ? 's' : ''}</p>
      <p className={styles.tooltipPct}>{pct}% of total</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Card
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

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------
function EmptyChart({ message = 'No data available for this period.' }) {
  return (
    <div className={styles.emptyChart}>
      <FileText size={28} />
      <p>{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Stat Cards
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
// Analytics Page
// ---------------------------------------------------------------------------
export default function Analytics() {
  // ── Filters ────────────────────────────────────────────────────────────────
  const [rangeDays, setRangeDays] = useState(null);   // null = all time
  const [diseaseFilter, setDiseaseFilter] = useState('');  // disease_id UUID
  const [diseases, setDiseases] = useState([]);

  // ── Raw data ───────────────────────────────────────────────────────────────
  const [reports, setReports]       = useState([]);
  const [allDiseases, setAllDiseases] = useState([]);
  const [hotspots, setHotspots]     = useState([]);
  const [severities, setSeverities] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Loading state per section ──────────────────────────────────────────────
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingStatic, setLoadingStatic]   = useState(true);

  // ── Load static data once ──────────────────────────────────────────────────
  useEffect(() => {
    async function loadStatic() {
      const [hRes, sRes, dRes] = await Promise.all([
        getBarangayHotspots(),
        getSeverityBreakdown(),
        getDiseases(),
      ]);
      if (hRes.data) setHotspots(hRes.data.slice(0, 10));
      if (sRes.data) setSeverities(sRes.data);
      if (dRes.data) setDiseases(dRes.data);
      setLoadingStatic(false);
    }
    async function loadAllDiseases() {
      const { data } = await getDiseaseBreakdown();
      if (data) setAllDiseases(data);
    }
    loadStatic();
    loadAllDiseases();
  }, []);

  // ── Load filtered reports when filters change ──────────────────────────────
  useEffect(() => {
    async function loadReports() {
      setLoadingReports(true);
      const since = getSinceDate(rangeDays);
      const { data } = await getFilteredReports({
        since,
        diseaseId: diseaseFilter || null,
      });
      if (data) {
        setReports(data);
        setLastUpdated(new Date());
      }
      setLoadingReports(false);
    }
    loadReports();
  }, [rangeDays, diseaseFilter]);

  // ── Derived: monthly trends from filtered reports ──────────────────────────
  const trends = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      const month = r.date_reported.slice(0, 7); // "YYYY-MM"
      map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, cases]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cases,
      }));
  }, [reports]);

  // ── Derived: disease breakdown from filtered reports ───────────────────────
  const filteredDiseases = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      map[r.disease_name] = (map[r.disease_name] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ disease_name: name, case_count: count }));
  }, [reports]);

  // ── Derived: severity breakdown from filtered reports ──────────────────────
  const filteredSeverity = useMemo(() => {
    const map = {};
    reports.forEach(r => {
      if (r.severity) map[r.severity] = (map[r.severity] || 0) + 1;
    });
    return Object.entries(map).map(([severity, case_count]) => ({ severity, case_count }));
  }, [reports]);

  // ── Derived: trend indicator vs previous period ────────────────────────────
  const trendIndicator = useMemo(() => {
    if (trends.length < 2) return null;
    const last = trends[trends.length - 1]?.cases || 0;
    const prev = trends[trends.length - 2]?.cases || 0;
    if (prev === 0) return null;
    const pct = Math.round(((last - prev) / prev) * 100);
    return { pct, up: pct > 0, same: pct === 0 };
  }, [trends]);

  const totalCases = reports.length;
  const topDisease  = filteredDiseases[0]?.disease_name ?? allDiseases[0]?.disease_name ?? '—';
  const topBarangay = hotspots[0]?.barangay_name ?? '—';
  const totalPieDiseases = filteredDiseases.reduce((s, d) => s + d.case_count, 0);
  const totalPieSeverity = filteredSeverity.reduce((s, d) => s + d.case_count, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
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

      {/* Filter Bar */}
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
            <select
              className={styles.filterSelect}
              value={diseaseFilter}
              onChange={e => setDiseaseFilter(e.target.value)}
            >
              <option value="">All Diseases</option>
              {diseases.map(d => (
                <option key={d.disease_id} value={d.disease_id}>{d.disease_name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Summary Stat Cards */}
      <div className={styles.statsRow}>
        <StatCard
          label="Total Cases (Period)"
          value={totalCases}
          icon={FileText}
          color="hsl(152, 58%, 28%)"
          loading={loadingReports}
        />
        <StatCard
          label="Active Outbreaks"
          value="—"
          sub="See Dashboard"
          icon={AlertTriangle}
          color="#ef4444"
          loading={false}
        />
        <StatCard
          label="Dominant Disease"
          value={topDisease}
          icon={Activity}
          color="#8b5cf6"
          loading={loadingReports && !allDiseases.length}
        />
        <StatCard
          label="Hotspot Barangay"
          value={topBarangay}
          icon={MapPin}
          color="#f59e0b"
          loading={loadingStatic}
        />
      </div>

      {/* Main Chart Grid */}
      <div className={styles.grid}>

        {/* ── Area Trend Chart (full width) ─────────────────────────────────── */}
        <Card className={styles.fullCard}>
          <Card.Header
            title={
              <div className={styles.chartTitle}>
                <TrendingUp size={15} />
                <span>Monthly Case Trends</span>
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
            {loadingReports
              ? <SkeletonChart height={280} />
              : trends.length === 0
              ? <EmptyChart message="No cases recorded in this period." />
              : (
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
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
                        content={<CustomTooltip total={totalCases} />}
                        cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cases"
                        stroke="hsl(152,58%,28%)"
                        strokeWidth={2.5}
                        fill="url(#areaGradient)"
                        dot={{ r: 4, fill: 'hsl(152,58%,28%)' }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </Card.Body>
        </Card>

        {/* ── Hotspot Bar Chart ─────────────────────────────────────────────── */}
        <Card className={styles.halfCard}>
          <Card.Header title={<div className={styles.chartTitle}><MapPin size={15} /><span>Hotspots by Barangay</span></div>} />
          <Card.Body>
            {loadingStatic
              ? <SkeletonChart height={280} />
              : hotspots.length === 0
              ? <EmptyChart message="No cases by location yet." />
              : (
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hotspots} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="barangay_name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                      <RechartsTooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: 'var(--color-overlay)' }}
                      />
                      <Bar dataKey="case_count" radius={[0, 4, 4, 0]} barSize={18}>
                        {hotspots.map((_, i) => (
                          <Cell key={i} fill={rankColor(i, hotspots.length)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </Card.Body>
        </Card>

        {/* ── Disease Pie Chart ─────────────────────────────────────────────── */}
        <Card className={styles.halfCard}>
          <Card.Header title={<div className={styles.chartTitle}><PieIcon size={15} /><span>Cases by Disease</span></div>} />
          <Card.Body>
            {loadingReports
              ? <SkeletonChart height={280} />
              : filteredDiseases.length === 0
              ? <EmptyChart message="No disease data for this period." />
              : (
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredDiseases}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="case_count"
                        nameKey="disease_name"
                      >
                        {filteredDiseases.map((_, i) => (
                          <Cell key={i} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<PieTooltip total={totalPieDiseases} />} />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={name => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{name}</span>}
                        wrapperStyle={{ paddingTop: 8 }}
                        payload={filteredDiseases.map((d, i) => ({
                          value: d.disease_name,
                          type: 'circle',
                          color: DISEASE_COLORS[i % DISEASE_COLORS.length],
                        }))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </Card.Body>
        </Card>

        {/* ── Severity Pie Chart ────────────────────────────────────────────── */}
        <Card className={styles.halfCard}>
          <Card.Header title={<div className={styles.chartTitle}><AlertTriangle size={15} /><span>Cases by Severity</span></div>} />
          <Card.Body>
            {loadingReports
              ? <SkeletonChart height={280} />
              : filteredSeverity.length === 0
              ? <EmptyChart message="No severity data for this period." />
              : (
                <div className={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredSeverity}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="case_count"
                        nameKey="severity"
                      >
                        {filteredSeverity.map((entry, i) => (
                          <Cell key={i} fill={SEVERITY_COLORS[entry.severity] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<PieTooltip total={totalPieSeverity} />} />
                      <Legend
                        iconType="circle"
                        iconSize={10}
                        formatter={name => <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{name}</span>}
                        wrapperStyle={{ paddingTop: 8 }}
                        payload={filteredSeverity.map(d => ({
                          value: d.severity,
                          type: 'circle',
                          color: SEVERITY_COLORS[d.severity] || '#94a3b8',
                        }))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </Card.Body>
        </Card>

      </div>
    </div>
  );
}
