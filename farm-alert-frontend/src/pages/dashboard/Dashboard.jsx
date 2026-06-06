import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, getMapFarms } from '../../services/analytics';
import { getReports } from '../../services/reports';
import { getOutbreaks } from '../../services/outbreaks';
import { useRealtime } from '../../hooks/useRealtime';
import { Tractor, ShieldAlert, FileText, Activity, AlertCircle, Plus, Skull } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import MapWidget from '../../components/map/MapWidget';
import MiniTrendChart from '../../components/analytics/MiniTrendChart';
import MiniDiseaseChart from '../../components/analytics/MiniDiseaseChart';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [mapFarms, setMapFarms] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derived client-side from allReports — same logic as Analytics.jsx
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

  // Derived: disease breakdown from allReports
  const diseaseData = useMemo(() => {
    const map = {};
    allReports.forEach(r => {
      if (r.disease_name) map[r.disease_name] = (map[r.disease_name] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([disease_name, case_count]) => ({ disease_name, case_count }));
  }, [allReports]);

  const loadDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setLoadingCharts(true);
    }
    
    try {
      const [summaryRes, reportsRes, outbreaksRes, mapRes] = await Promise.all([
        getDashboardSummary(),
        getReports(),
        getOutbreaks(),
        getMapFarms(),
      ]);

      if (summaryRes.error) {
        setError('Failed to load dashboard summary.');
        setLoading(false);
        return;
      }
      setSummary(summaryRes);

      if (reportsRes.data) setAllReports(reportsRes.data);
      if (mapRes.data) setMapFarms(mapRes.data);

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

  if (loading) {
    return (
      <div className={styles.centeredPage}>
        <LoadingSpinner size={40} />
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
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Overview of San Pablo City Livestock Health</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => navigate('/reports')}>
            <FileText size={15} /> View Reports
          </Button>
          <Button variant="primary" onClick={() => navigate('/farms/new')}>
            <Plus size={15} /> Register Farm
          </Button>
        </div>
      </header>

      {/* ── Metric Cards ────────────────────────────────────────── */}
      <div className={styles.metricsGrid}>
        <Card className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: 'hsl(152,58%,28%)', background: 'hsl(152,55%,92%)' }}>
            <Tractor size={22} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.totalFarms}</p>
            <p className={styles.metricLabel}>Total Registered Farms</p>
          </div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: 'hsl(38,92%,38%)', background: 'hsl(38,92%,92%)' }}>
            <Activity size={22} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.activeReports}</p>
            <p className={styles.metricLabel}>Active Disease Reports</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} ${summary?.activeOutbreaks > 0 ? styles.pulseDanger : ''}`}>
          <div className={styles.metricIconBox} style={{ color: 'hsl(4,74%,44%)', background: 'hsl(4,74%,93%)' }}>
            <ShieldAlert size={22} />
          </div>
          <div className={styles.metricContent}>
            <p
              className={styles.metricValue}
              style={{ color: summary?.activeOutbreaks > 0 ? 'hsl(4,74%,44%)' : 'inherit' }}
            >
              {summary?.activeOutbreaks}
            </p>
            <p className={styles.metricLabel}>Active Outbreaks</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} ${summary?.totalMortalities > 0 ? styles.pulseDanger : ''}`}>
          <div className={styles.metricIconBox} style={{ color: 'hsl(0,72%,38%)', background: 'hsl(0,72%,93%)' }}>
            <Skull size={22} />
          </div>
          <div className={styles.metricContent}>
            <p
              className={styles.metricValue}
              style={{ color: summary?.totalMortalities > 0 ? 'hsl(0,72%,38%)' : 'inherit' }}
            >
              {summary?.totalMortalities}
            </p>
            <p className={styles.metricLabel}>Total Mortalities (Active)</p>
          </div>
        </Card>
      </div>

      {/* ── Analytics Charts ────────────────────────────────────── */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Analytics Overview</h2>
        <span className={styles.sectionLink} onClick={() => navigate('/analytics')}>View Full Analytics →</span>
      </div>
      <div className={styles.chartsRow}>
        <Card className={styles.chartCard}>
          <p className={styles.chartTitle}>Monthly Case &amp; Mortality Trend</p>
          <p className={styles.chartSubtitle}>All-time reported cases and deaths per month</p>
          <MiniTrendChart trends={trends} loading={loadingCharts} height={240} />
        </Card>
        <Card className={styles.chartCard}>
          <p className={styles.chartTitle}>Cases by Disease</p>
          <p className={styles.chartSubtitle}>Distribution across all recorded diseases</p>
          <MiniDiseaseChart data={diseaseData} loading={loadingCharts} height={240} />
        </Card>
      </div>

      {/* ── Map + Activity ───────────────────────────────────────── */}
      <div className={styles.bottomRow}>

        {/* Map */}
        <Card className={styles.mapCard}>
          <div className={styles.sectionHeader}>
            <p className={styles.chartTitle}>Farm Disease Map</p>
            <span className={styles.sectionLink} onClick={() => navigate('/map')}>Open Full Map →</span>
          </div>
          <p className={styles.chartSubtitle}>Real-time farm health status across San Pablo City</p>
          <div className={styles.mapEmbed}>
            <MapWidget farms={mapFarms} zoom={13} />
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <p className={styles.chartTitle}>Recent Activity</p>
          </div>
          {recentActivity.length === 0 ? (
            <div className={styles.emptyState}>No recent activity found.</div>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map((act) => (
                <li key={act.id} className={styles.activityItem} onClick={() => navigate(act.path)}>
                  <div className={styles.activityIconWrapper}>
                    {act.type === 'Outbreak'
                      ? <ShieldAlert size={15} color="hsl(4,74%,44%)" />
                      : <FileText size={15} color="hsl(152,58%,28%)" />
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

      </div>
    </div>
  );
}
