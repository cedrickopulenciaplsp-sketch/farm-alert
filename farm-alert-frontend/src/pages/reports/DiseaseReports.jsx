import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  MapPin,
  Bug,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { getReports } from '../../services/reports';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Select } from '../../components/shared/FormElements';
import Modal from '../../components/shared/Modal';
import ReportForm from '../../components/reports/ReportForm';
import styles from './DiseaseReports.module.css';

// ---------------------------------------------------------------------------
// Severity badge — colour-coded per level
// ---------------------------------------------------------------------------
const SEVERITY_COLORS = {
  Low:      { bg: 'hsl(145, 55%, 92%)', color: 'hsl(145, 60%, 28%)' },
  Medium:   { bg: 'hsl(48,  90%, 92%)', color: 'hsl(38,  80%, 32%)' },
  High:     { bg: 'hsl(25,  90%, 92%)', color: 'hsl(25,  80%, 35%)' },
  Critical: { bg: 'hsl(4,   74%, 94%)', color: 'hsl(4,   74%, 40%)' },
};

function SeverityBadge({ severity }) {
  const palette = SEVERITY_COLORS[severity] ?? { bg: 'hsl(0,0%,92%)', color: 'hsl(0,0%,40%)' };
  return (
    <span
      className={styles.badge}
      style={{ background: palette.bg, color: palette.color }}
    >
      <span
        className={styles.badgeDot}
        style={{ background: palette.color }}
        aria-hidden="true"
      />
      {severity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const cls =
    status === 'Active'   ? styles.statusActive   :
    status === 'Resolved' ? styles.statusResolved  :
                            styles.statusOther;
  return <span className={`${styles.statusBadge} ${cls}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// ReportRow — single table row
// ---------------------------------------------------------------------------
function ReportRow({ report }) {
  const navigate = useNavigate();
  const handleClick = () => navigate(`/reports/${report.report_id}`);

  const date = report.date_reported
    ? new Date(report.date_reported).toLocaleDateString('en-PH', {
        year:  'numeric',
        month: 'short',
        day:   'numeric',
      })
    : '—';

  return (
    <tr
      className={styles.row}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`View report for ${report.farm_name}`}
    >
      {/* Farm / disease */}
      <td className={styles.cellMain}>
        <div className={styles.reportInfo}>
          <div className={styles.reportIcon}>
            <Bug size={14} aria-hidden="true" />
          </div>
          <div>
            <p className={styles.primaryText}>{report.disease_name}</p>
            <p className={styles.secondaryText}>{report.farm_name}</p>
          </div>
        </div>
      </td>

      {/* Barangay */}
      <td className={styles.cell}>
        <div className={styles.cellWithIcon}>
          <MapPin size={13} className={styles.cellIcon} aria-hidden="true" />
          <span>{report.barangay_name}</span>
        </div>
      </td>

      {/* Severity */}
      <td className={styles.cell}>
        <SeverityBadge severity={report.severity} />
      </td>

      {/* Status */}
      <td className={styles.cell}>
        <StatusBadge status={report.status} />
      </td>

      {/* Date reported */}
      <td className={styles.cell}>
        <span className={styles.dateText}>{date}</span>
      </td>

      {/* Encoded by */}
      <td className={styles.cell}>
        <span className={styles.encodedBy}>{report.encoded_by_name ?? '—'}</span>
      </td>

      {/* Chevron */}
      <td className={styles.cellAction}>
        <ChevronRight size={15} className={styles.chevron} aria-hidden="true" />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters, onClear }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <ClipboardList size={32} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? 'No reports match your filters' : 'No disease reports yet'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try adjusting or clearing your active filters.'
          : 'Submit the first disease report using the button above.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-filters-btn" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiseaseReports — main page
// ---------------------------------------------------------------------------
export default function DiseaseReports() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Filter state
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [severity, setSeverity] = useState('');

  // New-report modal
  const [showModal, setShowModal] = useState(false);

  // ---------------------------------------------------------------------------
  // Load reports whenever filters change (client-side search on top of API filters)
  // ---------------------------------------------------------------------------
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getReports({
      status:   status   || null,
      severity: severity || null,
    });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    // Client-side search across farm_name, disease_name, barangay_name
    let result = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.farm_name?.toLowerCase().includes(q)    ||
          r.disease_name?.toLowerCase().includes(q) ||
          r.barangay_name?.toLowerCase().includes(q)
      );
    }

    setReports(result);
    setLoading(false);
  }, [search, status, severity]);

  // Debounce search field
  useEffect(() => {
    const timer = setTimeout(loadReports, 300);
    return () => clearTimeout(timer);
  }, [loadReports]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setSeverity('');
  };

  const handleReportSuccess = () => {
    setShowModal(false);
    loadReports();
  };

  const hasFilters = !!(search || status || severity);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.page}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Disease Reports</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${reports.length} report${reports.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <Button
          id="new-report-btn"
          variant="primary"
          size="md"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} aria-hidden="true" />
          New Report
        </Button>
      </header>

      {/* ── Filters Bar ──────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>

          {/* Search */}
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="report-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search farm, disease, or barangay…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search disease reports"
            />
          </div>

          {/* Status filter */}
          <Select
            id="filter-report-status"
            label=""
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by report status"
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
            <option value="Under Monitoring">Under Monitoring</option>
          </Select>

          {/* Severity filter */}
          <Select
            id="filter-report-severity"
            label=""
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            aria-label="Filter by severity"
            className={styles.filterSelect}
          >
            <option value="">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </Select>

          {/* Filter icon + clear */}
          <div className={styles.filterActions}>
            <Filter size={15} className={styles.filterIcon} aria-hidden="true" />
            {hasFilters && (
              <button
                id="clear-report-filters-btn"
                className={styles.clearBtn}
                onClick={handleClearFilters}
                aria-label="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* ── Table / States ───────────────────────────────────────────────── */}
      {error ? (
        <Card className={styles.errorCard}>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} className={styles.errorIcon} />
            <p className={styles.errorText}>{error}</p>
            <Button id="retry-reports-btn" variant="ghost" size="sm" onClick={loadReports}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size={36} />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={handleClearFilters} />
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Disease reports table">
              <thead>
                <tr>
                  <th className={styles.th}>Disease / Farm</th>
                  <th className={styles.th}>Barangay</th>
                  <th className={styles.th}>Severity</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Date Reported</th>
                  <th className={styles.th}>Encoded By</th>
                  <th className={`${styles.th} ${styles.thAction}`} />
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <ReportRow key={r.report_id} report={r} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className={styles.tableFooter}>
            <span className={styles.recordCount}>
              Showing {reports.length} record{reports.length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtered)' : ''}
            </span>
          </div>
        </Card>
      )}

      {/* ── New Report Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Log New Disease Report"
        size="lg"
      >
        <ReportForm
          onSuccess={handleReportSuccess}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
