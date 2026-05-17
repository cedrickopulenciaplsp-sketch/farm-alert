import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary } from '../../services/analytics';
import { getReports } from '../../services/reports';
import { getOutbreaks } from '../../services/outbreaks';
import { useRealtime } from '../../hooks/useRealtime';
import { Tractor, ShieldAlert, FileText, Activity, AlertCircle, Plus, Skull } from 'lucide-react';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    
    try {
      // Load summary counts
      const summaryRes = await getDashboardSummary();
      if (summaryRes.error) {
        setError('Failed to load dashboard summary.');
        setLoading(false);
        return;
      }
      setSummary(summaryRes);

      // Load recent reports and outbreaks for the activity feed
      const [reportsRes, outbreaksRes] = await Promise.all([
        getReports(), // Get all, we will slice
        getOutbreaks()
      ]);

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

      // Sort combined activity by date descending
      activities.sort((a, b) => b.date - a.date);
      setRecentActivity(activities.slice(0, 8)); // Keep top 8
      setError(null);
    } catch (err) {
      console.error('Dashboard reload error:', err);
      // We don't necessarily want to show a big error screen if a background refresh fails
      if (isInitial) setError('Failed to load dashboard data.');
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Subscribe to real-time changes
  useRealtime('disease_reports', () => loadDashboardData());
  useRealtime('outbreak_alerts', () => loadDashboardData());

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

      {/* Metric Cards */}
      <div className={styles.metricsGrid}>
        <Card className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: 'var(--color-brand)', background: 'var(--color-brand-light)' }}>
            <Tractor size={24} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.totalFarms}</p>
            <p className={styles.metricLabel}>Total Registered Farms</p>
          </div>
        </Card>

        <Card className={styles.metricCard}>
          <div className={styles.metricIconBox} style={{ color: 'hsl(38, 92%, 50%)', background: 'hsl(38, 92%, 95%)' }}>
            <Activity size={24} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue}>{summary?.activeReports}</p>
            <p className={styles.metricLabel}>Active Disease Reports</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} ${summary?.activeOutbreaks > 0 ? styles.pulseDanger : ''}`}>
          <div className={styles.metricIconBox} style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)' }}>
            <ShieldAlert size={24} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue} style={{ color: summary?.activeOutbreaks > 0 ? 'var(--color-danger)' : 'inherit' }}>
              {summary?.activeOutbreaks}
            </p>
            <p className={styles.metricLabel}>Active Outbreaks</p>
          </div>
        </Card>

        <Card className={`${styles.metricCard} ${summary?.totalMortalities > 0 ? styles.pulseDanger : ''}`}>
          <div className={styles.metricIconBox} style={{ color: 'hsl(0, 72%, 35%)', background: 'hsl(0, 72%, 95%)' }}>
            <Skull size={24} />
          </div>
          <div className={styles.metricContent}>
            <p className={styles.metricValue} style={{ color: summary?.totalMortalities > 0 ? 'hsl(0, 72%, 35%)' : 'inherit' }}>
              {summary?.totalMortalities}
            </p>
            <p className={styles.metricLabel}>Total Mortalities (Active)</p>
          </div>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <h2 className={styles.sectionTitle}>Recent Activity</h2>
      <Card className={styles.activityCard}>
        {recentActivity.length === 0 ? (
          <div className={styles.emptyState}>No recent activity found.</div>
        ) : (
          <ul className={styles.activityList}>
            {recentActivity.map((act) => (
              <li key={act.id} className={styles.activityItem} onClick={() => navigate(act.path)}>
                <div className={styles.activityIconWrapper}>
                  {act.type === 'Outbreak' 
                    ? <ShieldAlert size={16} color="var(--color-danger)" />
                    : <FileText size={16} color="var(--color-brand)" />
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
                  <span className={`${styles.statusBadge} ${styles[act.status.toLowerCase()] || styles.defaultStatus}`}>
                    {act.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
