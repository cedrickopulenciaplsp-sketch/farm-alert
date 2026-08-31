import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  MapPin,
  Bug,
  Calendar,
  Users,
  Skull,
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
import SkeletonLoader from '../../components/shared/SkeletonLoader';
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

const DEFAULT_PROTOCOL = [
  { id: 'step_1', text: 'Issue 1km Animal Movement Ban & Checkpoints', completed: false },
  { id: 'step_2', text: 'Notify Barangay Captain & Municipal Health', completed: false },
  { id: 'step_3', text: 'Dispatch CVO Disinfection & Biosecurity Team', completed: false },
  { id: 'step_4', text: 'Conduct Ring Surveillance in 3km Buffer', completed: false },
  { id: 'step_5', text: 'Issue Terminal Disinfection Clearance', completed: false },
];

// ---------------------------------------------------------------------------
// OutbreakCard — individual alert card
// ---------------------------------------------------------------------------
function OutbreakCard({ outbreak, onAction, onChecklistUpdate }) {
  const [actioning, setActioning] = useState(false);
  const [checklistUpdating, setChecklistUpdating] = useState(false);

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

  // Seed checklist from prop — fall back to DEFAULT_PROTOCOL if empty/null
  const initChecklist = () => {
    if (Array.isArray(outbreak.response_checklist) && outbreak.response_checklist.length > 0) {
      return outbreak.response_checklist;
    }
    return DEFAULT_PROTOCOL.map(item => ({ ...item }));
  };

  const [checklist, setChecklist] = useState(initChecklist);

  const completedCount = checklist.filter(c => c.completed).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  async function toggleCheck(stepId) {
    // Immediately update local state so checkbox responds visually
    const updated = checklist.map(item =>
      item.id === stepId ? { ...item, completed: !item.completed } : item
    );
    setChecklist(updated);

    // Persist to Supabase in background
    setChecklistUpdating(true);
    await onChecklistUpdate(outbreak.outbreak_id, updated);
    setChecklistUpdating(false);
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
          {Number(outbreak.total_mortalities) > 0 && (
            <div className={styles.metaItem} style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
              <Skull size={12} aria-hidden="true" className={styles.metaIcon} />
              <span>{outbreak.total_mortalities} death{outbreak.total_mortalities !== 1 ? 's' : ''} recorded</span>
            </div>
          )}
          {outbreak.acknowledged_by_name && (
            <div className={styles.metaItem}>
              <Eye size={12} aria-hidden="true" className={styles.metaIcon} />
              <span>Acknowledged by {outbreak.acknowledged_by_name}</span>
            </div>
          )}
        </div>

        {/* ── Protocol Checklist Section ── */}
        <div className={styles.checklistSection}>
          <div className={styles.checklistHeader}>
            <h4 className={styles.checklistTitle}>Containment Protocol</h4>
            <span className={styles.checklistProgressText}>{progressPercent}% Completed</span>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%`, backgroundColor: progressPercent === 100 ? 'var(--color-success)' : 'var(--color-brand)' }}
            />
          </div>
          
          <ul className={styles.checklist}>
            {checklist.map(item => (
              <li key={item.id} className={styles.checklistItem}>
                <label className={`${styles.checkboxLabel} ${item.completed ? styles.checkboxCompleted : ''}`}>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleCheck(item.id)}
                    disabled={checklistUpdating || isResolved}
                    className={styles.checkboxInput}
                  />
                  <span className={styles.checkboxText}>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
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
                disabled={progressPercent < 100}
                title={progressPercent < 100 ? "Complete the protocol checklist before resolving" : "Resolve Outbreak"}
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
        Resolving this outbreak will automatically:
      </p>
      <ul className={styles.confirmList}>
        <li>Mark all linked <strong>disease reports</strong> for this disease as <strong>Resolved</strong>.</li>
        <li>Reset affected <strong>farms</strong> back to <strong>Active</strong> status — unless they have other active disease reports.</li>
        <li>Update the <strong>map pins</strong> to reflect the new farm statuses.</li>
      </ul>
      <p className={styles.confirmText} style={{ marginTop: '0.75rem' }}>
        This action cannot be automatically undone.
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

  async function handleChecklistUpdate(outbreakId, updatedChecklist) {
    const payload = { response_checklist: updatedChecklist };
    const { error } = await updateOutbreak(outbreakId, payload);
    if (!error) {
      setOutbreaks(prev =>
        prev.map(o =>
          o.outbreak_id === outbreakId
            ? { ...o, response_checklist: updatedChecklist }
            : o
        )
      );
    }
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
    <div className={`${styles.page} page-enter`}>

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
        <SkeletonLoader rows={4} columns={4} type="card" />
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
              onChecklistUpdate={handleChecklistUpdate}
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
