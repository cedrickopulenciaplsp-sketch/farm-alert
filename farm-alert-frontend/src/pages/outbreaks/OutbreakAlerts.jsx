import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  MapPin,
  Bug,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Filter,
  Siren,
} from 'lucide-react';
import { getOutbreaks, updateOutbreak } from '../../services/outbreaks';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Modal from '../../components/shared/Modal';
import { Select } from '../../components/shared/FormElements';
import styles from './OutbreakAlerts.module.css';

// ---------------------------------------------------------------------------
// Outbreak status badge
// ---------------------------------------------------------------------------
const STATUS_META = {
  Active:       { cls: 'statusActive',   label: 'Active'       },
  Acknowledged: { cls: 'statusAck',      label: 'Acknowledged' },
  Resolved:     { cls: 'statusResolved', label: 'Resolved'     },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.Active;
  return (
    <span className={`${styles.statusBadge} ${styles[meta.cls]}`}>
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Stat summary card at top of page
// ---------------------------------------------------------------------------
function SummaryStats({ outbreaks }) {
  const active       = outbreaks.filter(o => o.status === 'Active').length;
  const acknowledged = outbreaks.filter(o => o.status === 'Acknowledged').length;
  const resolved     = outbreaks.filter(o => o.status === 'Resolved').length;

  return (
    <div className={styles.statsRow}>
      <div className={`${styles.statCard} ${styles.statDanger}`}>
        <Siren size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{active}</p>
          <p className={styles.statLabel}>Active Outbreaks</p>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statWarning}`}>
        <Eye size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{acknowledged}</p>
          <p className={styles.statLabel}>Acknowledged</p>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statSuccess}`}>
        <CheckCircle2 size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{resolved}</p>
          <p className={styles.statLabel}>Resolved</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OutbreakCard — individual alert card
// ---------------------------------------------------------------------------
function OutbreakCard({ outbreak, onAction }) {
  const [actioning, setActioning] = useState(false);

  const isActive       = outbreak.status === 'Active';
  const isAcknowledged = outbreak.status === 'Acknowledged';
  const isResolved     = outbreak.status === 'Resolved';

  const dateDetected = outbreak.date_triggered
    ? new Date(outbreak.date_triggered).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : '—';

  async function handleAction(newStatus) {
    setActioning(true);
    await onAction(outbreak.outbreak_id, newStatus);
    setActioning(false);
  }

  return (
    <article
      className={`${styles.outbreakCard} ${isActive ? styles.outbreakCardActive : ''}`}
      aria-label={`Outbreak: ${outbreak.disease_name} in ${outbreak.barangay_name}`}
    >
      {/* Urgent pulse indicator for Active outbreaks */}
      {isActive && (
        <div className={styles.urgentBar} aria-hidden="true" />
      )}

      <div className={styles.cardContent}>
        {/* Header row */}
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={`${styles.outbreakIcon} ${isActive ? styles.outbreakIconActive : ''}`}>
              <ShieldAlert size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 className={styles.diseaseName}>{outbreak.disease_name}</h2>
              <div className={styles.locationRow}>
                <MapPin size={12} aria-hidden="true" className={styles.locationIcon} />
                <span className={styles.barangayName}>{outbreak.barangay_name}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={outbreak.status} />
        </div>

        {/* Meta row */}
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <Calendar size={12} aria-hidden="true" className={styles.metaIcon} />
            <span>Detected {dateDetected}</span>
          </div>
          <div className={styles.metaItem}>
            <Bug size={12} aria-hidden="true" className={styles.metaIcon} />
            <span>{outbreak.disease_name}</span>
          </div>
          <div className={styles.metaItem}>
            <Users size={12} aria-hidden="true" className={styles.metaIcon} />
            <span>{outbreak.farms_affected_count ?? '—'} farm{outbreak.farms_affected_count !== 1 ? 's' : ''} affected</span>
          </div>
          {outbreak.acknowledged_by_name && (
            <div className={styles.metaItem}>
              <Eye size={12} aria-hidden="true" className={styles.metaIcon} />
              <span>Acknowledged by {outbreak.acknowledged_by_name}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isResolved && (
          <div className={styles.cardActions}>
            {isActive && (
              <Button
                id={`acknowledge-outbreak-${outbreak.outbreak_id}`}
                variant="secondary"
                size="sm"
                loading={actioning}
                onClick={() => handleAction('Acknowledged')}
              >
                <Eye size={13} aria-hidden="true" />
                Acknowledge
              </Button>
            )}
            {(isActive || isAcknowledged) && (
              <Button
                id={`resolve-outbreak-${outbreak.outbreak_id}`}
                variant="primary"
                size="sm"
                loading={actioning}
                onClick={() => handleAction('Resolved')}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Mark Resolved
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters, onClear }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <ShieldAlert size={32} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? 'No outbreaks match your filter' : 'No outbreak alerts'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try clearing the status filter to see all alerts.'
          : 'Outbreak alerts are generated automatically when disease reports exceed the configured threshold.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-outbreak-filters-btn" onClick={onClear}>
          Clear filter
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm resolve modal
// ---------------------------------------------------------------------------
function ConfirmModal({ isOpen, onConfirm, onCancel, busy }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Resolve Outbreak?"
      size="sm"
      footer={
        <div className={styles.confirmFooter}>
          <Button id="confirm-cancel-btn" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button id="confirm-resolve-btn" variant="primary" loading={busy} onClick={onConfirm}>
            Yes, Resolve
          </Button>
        </div>
      }
    >
      <p className={styles.confirmText}>
        Resolving this outbreak marks it as contained. This action can be reviewed
        in the audit log but cannot be automatically undone.
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// OutbreakAlerts — main page
// ---------------------------------------------------------------------------
export default function OutbreakAlerts() {
  const { user } = useAuth();

  const [outbreaks, setOutbreaks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Confirm-resolve modal state
  const [pendingResolve, setPendingResolve] = useState(null); // { id, newStatus }
  const [resolving,      setResolving]      = useState(false);

  // ── Load outbreaks ────────────────────────────────────────────────────────
  const loadOutbreaks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getOutbreaks();
    if (fetchError) setError(fetchError.message);
    else            setOutbreaks(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadOutbreaks(); }, [loadOutbreaks]);

  // ── Handle action (acknowledge / resolve) ─────────────────────────────────
  async function handleAction(outbreakId, newStatus) {
    // Route "Resolved" through a confirmation modal
    if (newStatus === 'Resolved') {
      setPendingResolve({ id: outbreakId, newStatus });
      return;
    }
    await applyUpdate(outbreakId, newStatus);
  }

  async function applyUpdate(outbreakId, newStatus) {
    const payload = { status: newStatus };

    const { error: updateError } = await updateOutbreak(outbreakId, payload);
    if (!updateError) {
      // Optimistic update — mutate local state
      setOutbreaks(prev =>
        prev.map(o =>
          o.outbreak_id === outbreakId
            ? {
                ...o,
                status: newStatus,
                acknowledged_by_name:
                  newStatus === 'Acknowledged'
                    ? (user?.user_metadata?.full_name ?? o.acknowledged_by_name)
                    : o.acknowledged_by_name,
              }
            : o
        )
      );
    }
    return { error: updateError };
  }

  // Confirm modal — resolve
  async function confirmResolve() {
    if (!pendingResolve) return;
    setResolving(true);
    await applyUpdate(pendingResolve.id, pendingResolve.newStatus);
    setResolving(false);
    setPendingResolve(null);
  }

  const hasFilters = !!statusFilter;

  const ORDER = { Active: 0, Acknowledged: 1, Resolved: 2 };
  
  const filtered = statusFilter 
    ? outbreaks.filter(o => o.status === statusFilter)
    : outbreaks;

  const sorted = [...filtered].sort(
    (a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Outbreak Alerts</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${outbreaks.length} alert${outbreaks.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <Button
          id="refresh-outbreaks-btn"
          variant="secondary"
          size="md"
          onClick={loadOutbreaks}
          disabled={loading}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {/* ── Summary Stats ───────────────────────────────────────────────────── */}
      {!loading && !error && <SummaryStats outbreaks={outbreaks} />}

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <Filter size={14} className={styles.filterIcon} aria-hidden="true" />
          <span className={styles.filterLabel}>Filter by status</span>
          <Select
            id="filter-outbreak-status"
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter outbreaks by status"
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </Select>
          {hasFilters && (
            <button
              id="clear-outbreak-filter-btn"
              className={styles.clearBtn}
              onClick={() => setStatusFilter('')}
            >
              Clear
            </button>
          )}
        </Card.Body>
      </Card>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {error ? (
        <Card className={styles.errorCard}>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} className={styles.errorIcon} />
            <p className={styles.errorText}>{error}</p>
            <Button id="retry-outbreaks-btn" variant="ghost" size="sm" onClick={loadOutbreaks}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size={36} />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={() => setStatusFilter('')} />
      ) : (
        <div
          className={styles.outbreakList}
          role="list"
          aria-label="Outbreak alerts list"
        >
          {sorted.map(outbreak => (
            <OutbreakCard
              key={outbreak.outbreak_id}
              outbreak={outbreak}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {/* ── Confirm resolve modal ────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!pendingResolve}
        onConfirm={confirmResolve}
        onCancel={() => setPendingResolve(null)}
        busy={resolving}
      />
    </div>
  );
}
