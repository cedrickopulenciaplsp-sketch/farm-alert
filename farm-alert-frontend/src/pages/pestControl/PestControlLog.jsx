import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Filter,
  Edit2,
  Bug,
  MapPin,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getPestControlLogs } from '../../services/pestControl';
import { getFarms, getBarangays } from '../../services/farms';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Select } from '../../components/shared/FormElements';
import styles from './PestControlLog.module.css';

// ---------------------------------------------------------------------------
// Log row
// ---------------------------------------------------------------------------
function LogRow({ log }) {
  const navigate = useNavigate();
  const handleClick = () => navigate(`/pest-control/${log.log_id}/edit`);

  const date = log.date_of_intervention
    ? new Date(log.date_of_intervention).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <tr
      className={styles.row}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label={`View pest control log for ${log.farms?.farm_name}`}
    >
      {/* Farm / pest */}
      <td className={styles.cellMain}>
        <div className={styles.logInfo}>
          <div className={styles.logIcon}>
            <Bug size={14} aria-hidden="true" />
          </div>
          <div>
            <p className={styles.primaryText}>{log.pest_type}</p>
            <p className={styles.secondaryText}>{log.farms?.farm_name}</p>
          </div>
        </div>
      </td>

      {/* Barangay */}
      <td className={styles.cell}>
        <div className={styles.cellWithIcon}>
          <MapPin size={13} className={styles.cellIcon ?? ''} aria-hidden="true" color="var(--color-text-muted)" />
          <span>{log.farms?.barangays?.barangay_name ?? '—'}</span>
        </div>
      </td>

      {/* Treatment */}
      <td className={styles.cell}>{log.treatment_applied}</td>

      {/* Date */}
      <td className={styles.cell}>
        <span className={styles.dateText}>{date}</span>
      </td>

      {/* Encoder */}
      <td className={styles.cell}>
        <span className={styles.encodedBy}>{log.users?.full_name ?? '—'}</span>
      </td>

      {/* Action */}
      <td className={styles.cellAction} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.editBtn}
          onClick={() => navigate(`/pest-control/${log.log_id}/edit`)}
          aria-label={`Edit log for ${log.farms?.farm_name}`}
          title="Edit log"
        >
          <Edit2 size={14} />
        </button>
        <ChevronRight size={14} className={styles.chevron} aria-hidden="true" />
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
        <Bug size={28} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? 'No logs match your filters' : 'No pest control logs yet'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try adjusting or clearing your active filters.'
          : 'Record the first pest intervention using the button above.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-pest-filters-btn" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PestControlLog — main page
// ---------------------------------------------------------------------------
export default function PestControlLog() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [farms, setFarms] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [farmId, setFarmId] = useState('');
  const [barangayId, setBarangayId] = useState('');

  // Load reference dropdowns once
  useEffect(() => {
    async function loadRefs() {
      const [fRes, bRes] = await Promise.all([getFarms(), getBarangays()]);
      if (!fRes.error) setFarms(fRes.data ?? []);
      if (!bRes.error) setBarangays(bRes.data ?? []);
    }
    loadRefs();
  }, []);

  // Load logs whenever filters change
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getPestControlLogs({
      farmId: farmId || null,
      barangayId: barangayId || null,
    });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setLogs(data ?? []);
    }
    setLoading(false);
  }, [farmId, barangayId]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearFilters = () => {
    setFarmId('');
    setBarangayId('');
  };

  const hasFilters = !!(farmId || barangayId);

  return (
    <div className={styles.page}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pest Control Logs</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${logs.length} record${logs.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <Button
          id="add-pest-log-btn"
          variant="primary"
          size="md"
          onClick={() => navigate('/pest-control/new')}
        >
          <Plus size={16} aria-hidden="true" />
          Add Record
        </Button>
      </header>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <Select
            id="filter-pest-farm"
            label=""
            value={farmId}
            onChange={(e) => setFarmId(e.target.value)}
            aria-label="Filter by farm"
            className={styles.filterSelect}
          >
            <option value="">All Farms</option>
            {farms.map(f => (
              <option key={f.farm_id} value={f.farm_id}>{f.farm_name}</option>
            ))}
          </Select>

          <Select
            id="filter-pest-barangay"
            label=""
            value={barangayId}
            onChange={(e) => setBarangayId(e.target.value)}
            aria-label="Filter by barangay"
            className={styles.filterSelect}
          >
            <option value="">All Barangays</option>
            {barangays.map(b => (
              <option key={b.barangay_id} value={b.barangay_id}>{b.barangay_name}</option>
            ))}
          </Select>

          <div className={styles.filterActions}>
            <Filter size={15} className={styles.filterIcon ?? ''} aria-hidden="true" color="var(--color-text-muted)" />
            {hasFilters && (
              <button
                id="clear-pest-filters-inline-btn"
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

      {/* ── Table / States ──────────────────────────────────────────────── */}
      {error ? (
        <Card className={styles.errorCard}>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} className={styles.errorIcon} />
            <p className={styles.errorText}>{error}</p>
            <Button id="retry-pest-btn" variant="ghost" size="sm" onClick={loadLogs}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size={36} />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={handleClearFilters} />
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Pest control logs table">
              <thead>
                <tr>
                  <th className={styles.th}>Pest / Farm</th>
                  <th className={styles.th}>Barangay</th>
                  <th className={styles.th}>Treatment Applied</th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Encoded By</th>
                  <th className={`${styles.th} ${styles.thAction}`} />
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <LogRow key={log.log_id} log={log} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className={styles.tableFooter}>
            <span className={styles.recordCount}>
              Showing {logs.length} record{logs.length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtered)' : ''}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
