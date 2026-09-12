import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getDashboardSummary, getMapFarms } from '../../services/analytics';
import { getReports } from '../../services/reports';
import { getOutbreaks } from '../../services/outbreaks';
import { useRealtime } from '../../hooks/useRealtime';
import { 
  Warehouse, Siren, FileText, Thermometer, AlertCircle, Plus, HeartPulse, 
  TrendingUp, MapPin, AlertTriangle, BarChart2, Filter, Calendar, 
  ChevronUp, ChevronDown, Minus, ClipboardList, Skull, ShieldCheck, Lock
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell, Legend, Tooltip as RechartsTooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import MapWidget from '../../components/map/MapWidget';
import MiniTrendChart from '../../components/analytics/MiniTrendChart';
import MiniDiseaseChart from '../../components/analytics/MiniDiseaseChart';

import {
  getMonthlyTrends, getDiseaseBreakdown, getBarangayHotspots, 
  getSeverityBreakdown, getReportStatusBreakdown, getActiveOutbreaks, 
  getComplianceBreakdown, getRecentLogins
} from '../../services/analytics';
import { getDiseases } from '../../services/diseases';
import { getBarangays } from '../../services/farms';

import styles from './Dashboard.module.css';
import analyticsStyles from '../Analytics/Analytics.module.css';

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
    <div className={analyticsStyles.skeleton} style={{ height }}>
      <div className={analyticsStyles.skeletonBar} style={{ width: '70%', height: 16, marginBottom: 12 }} />
      <div className={analyticsStyles.skeletonBar} style={{ width: '40%', height: 12, marginBottom: 24 }} />
      <div className={analyticsStyles.skeletonChart} />
    </div>
  );
}

function EmptyChart({ message = 'No data available for this period.' }) {
  return (
    <div className={analyticsStyles.emptyChart}>
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
    <div className={analyticsStyles.statCard}>
      <div className={analyticsStyles.statIconBox} style={{ color: iconColor, background: iconBg }}>
        <Icon size={22} />
      </div>
      <div className={analyticsStyles.statContent}>
        {loading
          ? <div className={analyticsStyles.skeletonBar} style={{ width: 60, height: 28, marginBottom: 6 }} />
          : <p className={analyticsStyles.statValue}>{value ?? '—'}</p>
        }
        <p className={analyticsStyles.statLabel}>{label}</p>
        {sub && !loading && <p className={analyticsStyles.statSub}>{sub}</p>}
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState('operational');

  // Operational Dashboard State
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [mapFarms, setMapFarms] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Analytics State
  const [timeRange, setTimeRange] = useState('ytd');
  const [livestockType, setLivestockType] = useState('all');
  const [barangayFilter, setBarangayFilter] = useState('all');
  const [barangays, setBarangays] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [diseaseDataAnalytics, setDiseaseDataAnalytics] = useState([]);
  const [barangayData, setBarangayData] = useState([]);
  const [severityData, setSeverityData] = useState([]);
  const [reportStatus, setReportStatus] = useState([]);
  const [complianceData, setComplianceData] = useState([]);
  const [activeOutbreaksAnalytics, setActiveOutbreaksAnalytics] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [loadingMonthly, setLoadingMonthly] = useState(true);
  const [loadingDisease, setLoadingDisease] = useState(true);
  const [loadingBarangay, setLoadingBarangay] = useState(true);
  const [loadingSeverity, setLoadingSeverity] = useState(true);
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Derived from operational
  const trends = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      const month = (r.date_reported || r.created_at || '').slice(0, 7);
      if (!month) return;
      if (!map[month]) map[month] = { cases: 0, deaths: 0 };
      map[month].cases  += 1;
      map[month].deaths += (r.mortalities || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        cases:  data.cases,
        deaths: data.deaths,
      }));
  }, [allReports]);

  const diseaseData = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      if (r.disease_name) map[r.disease_name] = (map[r.disease_name] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([disease_name, case_count]) => ({ disease_name, case_count }));
  }, [allReports]);

  // Load Operational Dashboard Data
  const loadDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setLoadingCharts(true);
    }
    
    try {
      const [summaryRes, reportsRes, outbreaksRes, mapRes, loginsRes] = await Promise.all([
        getDashboardSummary(),
        getReports(),
        getOutbreaks(),
        getMapFarms(),
        getRecentLogins(),
      ]);

      if (summaryRes.error) {
        setError('Failed to load dashboard summary.');
        setLoading(false);
        return;
      }
      setSummary(summaryRes);

      if (reportsRes.data) setAllReports(reportsRes.data);
      if (mapRes.data) setMapFarms(mapRes.data);
      if (loginsRes.data) setLoginLogs(loginsRes.data);

      const activities = [];
      
      if (reportsRes.data) {
        reportsRes.data.slice(0, 5).forEach(r => {
          activities.push({
            id: `report-${r.report_id}`,
            type: 'Report',
            date: new Date(r.created_at),
            title: `New Disease Report: ${r.disease_name}`,
            subtitle: `Farm: ${r.farm_name} (${r.barangay_name}) — ${r.animals_affected} affected${r.mortalities > 0 ? ` · ${r.mortalities} dead` : ''}`,
            status: r.status,
            path: `/reports/${r.report_id}`,
            mortalities: r.mortalities || 0,
          });
        });
      }

      if (outbreaksRes.data) {
        outbreaksRes.data.slice(0, 5).forEach(o => {
          activities.push({
            id: `outbreak-${o.outbreak_id}`,
            type: 'Outbreak',
            date: new Date(o.date_triggered),
            title: `Outbreak Alert: ${o.disease_name}`,
            subtitle: `${o.barangay_name} — ${o.farms_affected_count} farms affected`,
            status: o.status,
            path: `/outbreaks`
          });
        });
      }

      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 8));
      setError(null);
    } catch (err) {
      console.error('Dashboard reload error:', err);
      if (isInitial) setError('Failed to load dashboard data.');
    } finally {
      if (isInitial) {
        setLoading(false);
        setLoadingCharts(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  useRealtime('disease_reports', () => loadDashboardData());
  useRealtime('outbreak_alerts', () => loadDashboardData());
  useRealtime('farms', () => loadDashboardData());

  // Load Analytics Reference Data
  useEffect(() => {
    getBarangays().then(({ data }) => { if (data) setBarangays(data); });
    getActiveOutbreaks().then(({ count }) => setActiveOutbreaksAnalytics(count));
    Promise.all([getReportStatusBreakdown(), getComplianceBreakdown()]).then(([rRes, cRes]) => {
      if (rRes.data) setReportStatus(rRes.data);
      if (cRes.data) setComplianceData(cRes.data);
      setLoadingExtra(false);
    });
  }, []);

  // Fetch Analytics data on filter changes
  useEffect(() => {
    setLoadingMonthly(true);
    getMonthlyTrends(timeRange, livestockType).then(({ data }) => {
      setMonthlyData(data ?? []);
      setLoadingMonthly(false);
      setLastUpdated(new Date());
    });
  }, [timeRange, livestockType]);

  useEffect(() => {
    setLoadingDisease(true);
    getDiseaseBreakdown({ timeRange, livestockType }).then(({ data }) => {
      setDiseaseDataAnalytics(data ?? []);
      setLoadingDisease(false);
    });
  }, [timeRange, livestockType]);

  useEffect(() => {
    setLoadingBarangay(true);
    getBarangayHotspots({ timeRange, livestockType }).then(({ data }) => {
      setBarangayData(data ?? []);
      setLoadingBarangay(false);
    });
  }, [timeRange, livestockType]);

  useEffect(() => {
    setLoadingSeverity(true);
    getSeverityBreakdown(timeRange, livestockType).then(({ data }) => {
      setSeverityData(data ?? []);
      setLoadingSeverity(false);
    });
  }, [timeRange, livestockType]);

  // Derived Analytics Values
  const filteredBarangays = useMemo(() => {
    if (barangayFilter === 'all') return barangayData.slice(0, 10);
    return barangayData.filter(b => String(b.barangay_id) === barangayFilter).slice(0, 10);
  }, [barangayData, barangayFilter]);

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

  const compliantCount     = complianceData.find(d => d.status === 'Compliant')?.count ?? 0;
  const semiCompliantCount = complianceData.find(d => d.status === 'Semi-Compliant')?.count ?? 0;
  const nonCompliantCount  = complianceData.find(d => d.status === 'Non-Compliant')?.count ?? 0;
  const totalEvaluations   = complianceData.reduce((s, d) => s + d.count, 0);

  const severityPieData = severityData.map(d => ({ status: d.severity, count: d.total_reports }));

  const tickColor   = isDark ? 'hsl(150,10%,55%)' : 'hsl(160,10%,40%)';
  const tooltipBg   = isDark ? 'hsl(160,14%,12%)' : '#ffffff';
  const tooltipText = isDark ? 'hsl(150,15%,90%)' : 'hsl(160,20%,10%)';

  if (loading) {
    return (
      <div className={`${styles.page} page-enter`}>
        <div className={styles.metricsGrid}>
          <SkeletonLoader rows={1} columns={2} type="card" />
          <SkeletonLoader rows={1} columns={2} type="card" />
          <SkeletonLoader rows={1} columns={2} type="card" />
          <SkeletonLoader rows={1} columns={2} type="card" />
        </div>
        <SkeletonLoader rows={6} columns={5} type="list" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centeredPage}>
        <AlertCircle size={32} className={styles.errorIcon} />
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Situational Overview</h1>
          <p className={styles.pageSubtitle}>San Pablo City Veterinary Office — Livestock Health Monitoring</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => navigate('/reports')}>
            <FileText size={15} /> Disease Reports
          </Button>
          <Button variant="primary" onClick={() => navigate('/farms/new')}>
            <Plus size={15} /> Register Farm
          </Button>
        </div>
      </header>

      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className={styles.metricsGrid}>
        <Card className={`${styles.metricCard} anim-pop delay-1`}>
          <div className={styles.metricIconBox} style={{ color: 'var(--color-text-secondary)', background: 'var(--color-overlay)' }}>
            <Warehouse size={20} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.totalFarms}</p>
            <p className={styles.metricLabel}>Registered Farms</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} anim-pop delay-2`}>
          <div className={styles.metricIconBox} style={{ color: 'var(--color-text-secondary)', background: 'var(--color-overlay)' }}>
            <Thermometer size={20} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.activeReports}</p>
            <p className={styles.metricLabel}>Active Cases</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} anim-pop delay-3`}>
          <div className={styles.metricIconBox} style={{ color: '#c0392b', background: 'rgba(192, 57, 43, 0.1)' }}>
            <Siren size={20} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue} style={{ color: summary?.activeOutbreaks > 0 ? '#c0392b' : 'inherit' }}>
              {summary?.activeOutbreaks}
            </p>
            <p className={styles.metricLabel}>Active Outbreaks</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} anim-pop delay-4`}>
          <div className={styles.metricIconBox} style={{ color: 'var(--icon-red-text)', background: 'var(--icon-red-bg)' }}>
            <Skull size={20} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue} style={{ color: summary?.totalMortalities > 0 ? 'var(--color-danger)' : 'inherit' }}>
              {summary?.totalMortalities}
            </p>
            <p className={styles.metricLabel}>Livestock Deaths</p>
          </div>
        </Card>
      </div>

      {/* ── Tab Switcher ──────────────────────────────────────── */}
      <div className={`${styles.tabBar} anim-fade delay-5`}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'operational' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('operational')}
        >
          <MapPin size={16} />
          Operational
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'analytics' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart2 size={16} />
          Data & Analytics
        </button>
      </div>

      {/* ── Tab Content ────────────────────────────────────────── */}
      {activeTab === 'operational' && (
        <>
          <div className={styles.contentRow}>
            {/* Map */}
            <Card className={`${styles.mapCard} anim-fade delay-6`}>
              <div className={styles.sectionHeader}>
                <p className={styles.chartTitle}>Barangay Disease Map</p>
                <span className={styles.sectionLink} onClick={() => navigate('/map')}>Expand Map &rarr;</span>
              </div>
              <p className={styles.chartSubtitle}>Active farm health status across San Pablo City barangays</p>
              <div className={styles.mapEmbed}>
                <MapWidget farms={mapFarms} zoom={13} />
              </div>
            </Card>

            <div className={styles.rightColumn}>
              {/* Recent Activity */}
              <Card className={`${styles.activityCard} anim-slide-right delay-7`}>
                <div className={styles.activityHeader}>
                  <p className={styles.chartTitle}>Field Activity Log</p>
                </div>
                {recentActivity.length === 0 ? (
                  <div className={styles.emptyState}>No recent activity found.</div>
                ) : (
                  <ul className={styles.activityList} style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {recentActivity.map((act) => (
                      <li key={act.id} className={styles.activityItem} onClick={() => navigate(act.path)}>
                        <div className={styles.activityIconWrapper}>
                          {act.type === 'Outbreak'
                            ? <Siren size={15} color="#e07a5f" />
                            : <FileText size={15} color="#166534" />
                          }
                        </div>
                        <div className={styles.activityDetails}>
                          <p className={styles.activityTitle}>{act.title}</p>
                          <p className={styles.activitySubtitle}>{act.subtitle}</p>
                          <p className={styles.activityDate}>
                            {act.date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className={styles.activityStatus}>
                          <span className={`${styles.statusBadge} ${styles[act.status?.toLowerCase().replace(/\s+/g, '_')] || styles.defaultStatus}`}>
                            {act.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Security Access Logs */}
              <Card className={`${styles.activityCard} anim-slide-right delay-8`}>
                <div className={styles.activityHeader}>
                  <p className={styles.chartTitle}>Security & Access Logs</p>
                </div>
                {loginLogs.length === 0 ? (
                  <div className={styles.emptyState}>No login history found.</div>
                ) : (
                  <ul className={styles.activityList} style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {loginLogs.slice(0, 5).map((log, i) => (
                      <li key={i} className={styles.activityItem}>
                        <div className={styles.activityIconWrapper} style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                          <Lock size={14} color="var(--color-text-secondary)" />
                        </div>
                        <div className={styles.activityDetails}>
                          <p className={styles.activityTitle}>System Login</p>
                          <p className={styles.activitySubtitle}>IP: {log.ip_address}{log.device_info ? ` · ${log.device_info}` : ''}</p>
                        </div>
                        <div className={styles.activityStatus}>
                          <span className={styles.activityDate}>
                            {new Date(log.login_time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <div className={styles.contentRow}>
            <Card className={`${styles.chartCard} anim-slide-left delay-9`}>
              <p className={styles.chartTitle}>Monthly Case &amp; Mortality Trend</p>
              <p className={styles.chartSubtitle}>Reported cases and livestock deaths across all barangays</p>
              <MiniTrendChart trends={trends} loading={loadingCharts} height={240} />
            </Card>
            <Card className={`${styles.chartCard} anim-slide-right delay-10`}>
              <p className={styles.chartTitle}>Cases by Disease</p>
              <p className={styles.chartSubtitle}>Top diseases reported in San Pablo City</p>
              <MiniDiseaseChart data={diseaseData} loading={loadingCharts} height={240} />
            </Card>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className={analyticsStyles.page} style={{ paddingTop: 0, animation: 'none' }}>
          {/* Filter Bar */}
          <Card className={`${analyticsStyles.filterBar} anim-fade delay-1`}>
            <div className={analyticsStyles.filterBarInner}>
              <div className={analyticsStyles.filterGroup}>
                <Calendar size={14} className={analyticsStyles.filterIcon} />
                <span className={analyticsStyles.filterLabel}>Period:</span>
                {TIME_RANGES.map(r => (
                  <button
                    key={r.value}
                    className={`${analyticsStyles.filterPill} ${timeRange === r.value ? analyticsStyles.filterPillActive : ''}`}
                    onClick={() => setTimeRange(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className={analyticsStyles.filterGroup}>
                <Filter size={14} className={analyticsStyles.filterIcon} />
                <span className={analyticsStyles.filterLabel}>Livestock:</span>
                <select
                  className={analyticsStyles.filterSelect}
                  value={livestockType}
                  onChange={e => setLivestockType(e.target.value)}
                  aria-label="Filter by livestock type"
                >
                  {LIVESTOCK_TYPES.map(t => (
                    <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
                  ))}
                </select>
              </div>

              <div className={analyticsStyles.filterGroup}>
                <MapPin size={14} className={analyticsStyles.filterIcon} />
                <span className={analyticsStyles.filterLabel}>Barangay:</span>
                <select
                  className={analyticsStyles.filterSelect}
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

          {/* Summary Stats */}
          <div className={`${analyticsStyles.statsRow} anim-pop delay-2`}>
            <StatCard label="Total Cases (Period)"      value={totalCases}       icon={FileText}      iconBg="var(--icon-green-bg)"  iconColor="var(--icon-green-text)"  loading={loadingMonthly} />
            <StatCard label="Total Mortalities (Period)" value={totalMortalities} icon={Skull}         iconBg="var(--icon-red-bg)"    iconColor="var(--icon-red-text)"    loading={loadingMonthly} sub={totalMortalities > 0 ? 'Deaths in selected period' : 'No deaths recorded'} />
            <StatCard label="Active Outbreaks"           value={activeOutbreaksAnalytics}  icon={AlertTriangle} iconBg="var(--icon-orange-bg)" iconColor="var(--icon-orange-text)" loading={activeOutbreaksAnalytics === null} sub={activeOutbreaksAnalytics > 0 ? 'Requires immediate attention' : 'No active outbreaks'} />
            <StatCard label="Hotspot Barangay"           value={topBarangay}      icon={MapPin}        iconBg="var(--icon-amber-bg)"  iconColor="var(--icon-amber-text)"  loading={loadingBarangay} />
          </div>

          <div className={`${analyticsStyles.sectionHeader} anim-fade delay-3`}>
            <span className={analyticsStyles.sectionTitle}>📊 Disease Analytics</span>
            <div className={analyticsStyles.sectionLine} />
          </div>

          <div className={analyticsStyles.grid}>
            {/* Monthly Case & Mortality Trends */}
            <Card className={`${analyticsStyles.fullCard} anim-slide-left delay-4`}>
              <Card.Header
                title={
                  <div className={analyticsStyles.chartTitle}>
                    <TrendingUp size={15} />
                    <span>Monthly Case &amp; Mortality Trends</span>
                    {trendIndicator && (
                      <span className={`${analyticsStyles.trendBadge} ${trendIndicator.up ? analyticsStyles.trendUp : analyticsStyles.trendDown}`}>
                        {trendIndicator.up ? <ChevronUp size={12} /> : trendIndicator.same ? <Minus size={12} /> : <ChevronDown size={12} />}
                        {Math.abs(trendIndicator.pct)}% vs last month
                      </span>
                    )}
                  </div>
                }
              />
              <Card.Body>
                {loadingMonthly ? <SkeletonChart height={280} /> : monthlyData.length === 0 ? <EmptyChart message="No cases recorded in this period." /> : (
                  <div className={analyticsStyles.chartWrap}>
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
                        <Area type="monotone" dataKey="total_reports" stroke="hsl(152,58%,28%)" strokeWidth={2.5} fill="url(#gradCases)" dot={{ r: 4, fill: 'hsl(152,58%,28%)' }} activeDot={{ r: 6 }} />
                        <Area type="monotone" dataKey="total_mortalities" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" fill="url(#gradDeaths)" dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Disease Density by Barangay */}
            <Card className={`${analyticsStyles.twoThirdCard} anim-slide-left delay-5`}>
              <Card.Header title={<div className={analyticsStyles.chartTitle}><MapPin size={15} /><span>Disease Density by Barangay</span></div>} />
              <Card.Body>
                {loadingBarangay ? <SkeletonChart height={280} /> : filteredBarangays.length === 0 ? <EmptyChart message="No cases by location yet." /> : (
                  <div className={analyticsStyles.chartWrap}>
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

            {/* Cases by Disease */}
            <Card className={`${analyticsStyles.thirdCard} anim-slide-right delay-6`}>
              <Card.Header title={<div className={analyticsStyles.chartTitle}><BarChart2 size={15} /><span>Cases by Disease</span></div>} />
              <Card.Body>
                {loadingDisease ? <SkeletonChart height={220} /> : diseaseDataAnalytics.length === 0 ? <EmptyChart /> : (
                  <div className={analyticsStyles.chartWrapSm}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diseaseDataAnalytics.slice(0, 6)} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                        <XAxis dataKey="disease_name" tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" interval={0} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: tickColor }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', backgroundColor: tooltipBg, color: tooltipText }}
                          formatter={(v) => [`${v} cases`]}
                        />
                        <Bar dataKey="total_reports" radius={[4, 4, 0, 0]} barSize={28}>
                          {diseaseDataAnalytics.slice(0, 6).map((_, i) => (
                            <Cell key={i} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Report Status */}
            <Card className={`${analyticsStyles.thirdCard} anim-pop delay-7`}>
              <Card.Header title={<div className={analyticsStyles.chartTitle}><ClipboardList size={15} /><span>Report Status</span></div>} />
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

            {/* Cases by Severity */}
            <Card className={`${analyticsStyles.thirdCard} anim-pop delay-8`}>
              <Card.Header title={<div className={analyticsStyles.chartTitle}><AlertTriangle size={15} /><span>Cases by Severity</span></div>} />
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

            {/* Security Access Logs (Filling the 1/3 empty space) */}
            <Card className={`${analyticsStyles.thirdCard} anim-slide-right delay-9`}>
              <Card.Header title={<div className={analyticsStyles.chartTitle}><Lock size={15} /><span>Security Logs</span></div>} />
              <Card.Body>
                {loginLogs.length === 0 ? (
                  <div className={analyticsStyles.emptyChart} style={{ height: '180px' }}>
                    <p>No login history found.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.25rem 0' }}>
                    {loginLogs.slice(0, 5).map((log, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i !== 4 ? '1px solid var(--color-border)' : 'none', paddingBottom: i !== 4 ? '0.65rem' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--color-overlay)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={12} color="var(--color-text-secondary)" />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>System Login</p>
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>IP: {log.ip_address}{log.device_info ? ` · ${log.device_info}` : ''}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', fontWeight: 600, background: 'var(--color-overlay)', padding: '2px 8px', borderRadius: '12px' }}>
                          {new Date(log.login_time).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          <div className={`${analyticsStyles.sectionHeader} anim-fade delay-10`}>
            <span className={analyticsStyles.sectionTitle}>🛡️ Farm Compliance</span>
            <div className={analyticsStyles.sectionLine} />
          </div>

          <div className={`${analyticsStyles.statsRow} anim-pop delay-10`}>
            <StatCard label="Compliant"        value={compliantCount}     icon={ShieldCheck}   iconBg="var(--badge-compliant-bg)"     iconColor="var(--badge-compliant-text)"     loading={loadingExtra} sub={compliantCount > 0 ? 'Fully compliant farms' : 'None recorded'} />
            <StatCard label="Semi-Compliant"   value={semiCompliantCount} icon={ShieldCheck}   iconBg="var(--badge-semi-bg)"          iconColor="var(--badge-semi-text)"          loading={loadingExtra} sub={semiCompliantCount > 0 ? 'Partially compliant' : 'None'} />
            <StatCard label="Non-Compliant"    value={nonCompliantCount}  icon={AlertTriangle} iconBg="var(--badge-noncompliant-bg)"  iconColor="var(--badge-noncompliant-text)"  loading={loadingExtra} sub={nonCompliantCount > 0 ? 'Requires follow-up' : 'All compliant'} />
            <StatCard label="Total Evaluations" value={totalEvaluations}  icon={ShieldCheck}   iconBg="var(--icon-green-bg)"          iconColor="var(--icon-green-text)"          loading={loadingExtra} />
          </div>

          <div className={`${analyticsStyles.grid} anim-slide-left delay-10`}>
            <Card className={analyticsStyles.fullCard}>
              <Card.Header title={<div className={analyticsStyles.chartTitle}><ShieldCheck size={15} /><span>Pest Control Compliance Breakdown</span></div>} />
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
      )}

    </div>
  );
}

