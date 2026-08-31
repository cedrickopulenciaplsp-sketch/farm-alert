import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, getMapFarms } from '../../services/analytics';
import { getReports } from '../../services/reports';
import { getOutbreaks } from '../../services/outbreaks';
import { useRealtime } from '../../hooks/useRealtime';
import { Warehouse, Siren, FileText, Thermometer, AlertCircle, Plus, HeartPulse } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
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
        <Card className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: 'var(--icon-green-text)', background: 'var(--icon-green-bg)' }}>
            <Warehouse size={20} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.totalFarms}</p>
            <p className={styles.metricLabel}>Registered Farms</p>
          </div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: 'var(--icon-amber-text)', background: 'var(--icon-amber-bg)' }}>
            <Thermometer size={20} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.activeReports}</p>
            <p className={styles.metricLabel}>Active Cases</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} ${styles.metricCardDominant} ${summary?.activeOutbreaks > 0 ? styles.pulseDanger : ''}`}>
          <div className={styles.metricIconBox}>
            <Siren size={22} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>
              {summary?.activeOutbreaks}
            </p>
            <p className={styles.metricLabel}>Active Outbreaks</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} ${summary?.totalMortalities > 0 ? styles.pulseDanger : ''}`}>
          <div className={styles.metricIconBox} style={{ color: 'var(--icon-red-text)', background: 'var(--icon-red-bg)' }}>
            <HeartPulse size={20} />
          </div>
          <div className={styles.metricContent}>
            <p
              className={styles.metricValue}
              style={{ color: summary?.totalMortalities > 0 ? 'var(--color-danger)' : 'inherit' }}
            >
              {summary?.totalMortalities}
            </p>
            <p className={styles.metricLabel}>Livestock Deaths</p>
          </div>
        </Card>
      </div>

      {/* ── Analytics Charts ────────────────────────────────────── */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Epidemiological Trend</h2>
        <span className={styles.sectionLink} onClick={() => navigate('/analytics')}>Full Analytics &rarr;</span>
      </div>
      <div className={styles.chartsRow}>
        <Card className={styles.chartCard}>
          <p className={styles.chartTitle}>Monthly Case &amp; Mortality Trend</p>
          <p className={styles.chartSubtitle}>Reported cases and livestock deaths across all barangays</p>
          <MiniTrendChart trends={trends} loading={loadingCharts} height={240} />
        </Card>
        <Card className={styles.chartCard}>
          <p className={styles.chartTitle}>Cases by Disease</p>
          <p className={styles.chartSubtitle}>Top diseases reported in San Pablo City</p>
          <MiniDiseaseChart data={diseaseData} loading={loadingCharts} height={240} />
        </Card>
      </div>

      {/* ── Map + Activity ───────────────────────────────────────── */}
      <div className={styles.bottomRow}>

        {/* Map */}
        <Card className={styles.mapCard}>
          <div className={styles.sectionHeader}>
            <p className={styles.chartTitle}>Barangay Disease Map</p>
            <span className={styles.sectionLink} onClick={() => navigate('/map')}>Expand Map &rarr;</span>
          </div>
          <p className={styles.chartSubtitle}>Active farm health status across San Pablo City barangays</p>
          <div className={styles.mapEmbed}>
            <MapWidget farms={mapFarms} zoom={13} />
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className={styles.activityCard}>
          <div className={styles.activityHeader}>
            <p className={styles.chartTitle}>Field Activity Log</p>
          </div>
          {recentActivity.length === 0 ? (
            <div className={styles.emptyState}>No recent activity found.</div>
          ) : (
            <ul className={styles.activityList}>
              {recentActivity.map((act) => (
                <li key={act.id} className={styles.activityItem} onClick={() => navigate(act.path)}>
                  <div className={styles.activityIconWrapper}>
                    {act.type === 'Outbreak'
                      ? <Siren size={15} color="#e07a5f" />
                      : <FileText size={15} color="#1d3557" />
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
