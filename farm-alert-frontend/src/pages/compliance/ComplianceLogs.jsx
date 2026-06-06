import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Filter,
  Edit2,
  ShieldCheck,
  MapPin,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { getComplianceLogs, deleteComplianceLog } from '../../services/compliance';
import { getFarms, getBarangays } from '../../services/farms';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Select } from '../../components/shared/FormElements';
import Modal from '../../components/shared/Modal';
import ComplianceModal from '../../components/compliance/ComplianceModal';
import styles from './ComplianceLogs.module.css';

// ---------------------------------------------------------------------------
// Compliance status badge — colour-coded
// ---------------------------------------------------------------------------
const STATUS_COLORS = {
  'Compliant':       { bg: 'hsl(145, 55%, 92%)', color: 'hsl(145, 60%, 28%)' },
  'Semi-Compliant':  { bg: 'hsl(48,  90%, 92%)', color: 'hsl(38,  80%, 32%)' },
  'Non-Compliant':   { bg: 'hsl(4,   74%, 94%)', color: 'hsl(4,   74%, 40%)' },
};

function ComplianceBadge({ status }) {
  const palette = STATUS_COLORS[status] ?? { bg: 'hsl(0,0%,92%)', color: 'hsl(0,0%,40%)' };
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
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Log row
// ---------------------------------------------------------------------------
function LogRow({ log, onEdit }) {
  const date = log.evaluation_date
    ? new Date(log.evaluation_date).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

  return (
    <tr
      className={styles.row}
      onClick={() => onEdit(log)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(log)}
      aria-label={`View compliance record for ${log.farms?.farm_name}`}
    >
      {/* Farm */}
      <td className={styles.cellMain}>
        <div className={styles.logInfo}>
          <div className={styles.logIcon}>
            <ShieldCheck size={14} aria-hidden="true" />
          </div>
          <div>
            <p className={styles.primaryText}>{log.farms?.farm_name}</p>
            <p className={styles.secondaryText}>{log.farms?.barangays?.barangay_name ?? '—'}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className={styles.cell}>
        <ComplianceBadge status={log.compliance_status} />
      </td>

      {/* Date */}
      <td className={styles.cell}>
        <span className={styles.dateText}>{date}</span>
      </td>

      {/* Notes */}
      <td className={styles.cell}>
        <span className={styles.notesText}>{log.notes || '—'}</span>
      </td>

      {/* Encoder */}
      <td className={styles.cell}>
        <span className={styles.encodedBy}>{log.users?.full_name ?? '—'}</span>
      </td>

      {/* Action */}
      <td className={styles.cellAction} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.editBtn}
          onClick={() => onEdit(log)}
          aria-label={`Edit record for ${log.farms?.farm_name}`}
          title="Edit record"
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
        <ShieldCheck size={28} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? 'No records match your filters' : 'No compliance evaluations yet'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try adjusting or clearing your active filters.'
          : 'Record the first pest control evaluation using the button above.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-compliance-filters-btn" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComplianceLogs — main page
// ---------------------------------------------------------------------------
export default function ComplianceLogs() {
  const [logs, setLogs]           = useState([]);
  const [farms, setFarms]         = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const [farmId, setFarmId]         = useState('');
  const [barangayId, setBarangayId] = useState('');

  // Modal state
  const [showModal, setShowModal]     = useState(false);
  const [editingLog, setEditingLog]   = useState(null); // null = create, object = edit
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    const { data, error: fetchError } = await getComplianceLogs({
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

  const handleAddNew = () => {
    setEditingLog(null);
    setShowModal(true);
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setEditingLog(null);
    loadLogs();
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editingLog) return;
    setDeleting(true);
    const { error } = await deleteComplianceLog(editingLog.log_id);
    setDeleting(false);
    if (!error) {
      setShowDeleteModal(false);
      setShowModal(false);
      setEditingLog(null);
      loadLogs();
    }
  };

  const hasFilters = !!(farmId || barangayId);

  return (
    <div className={styles.page}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pest Control Compliance</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${logs.length} evaluation${logs.length !== 1 ? 's' : ''}${hasFilters ? ' (filtered)' : ''}`}
          </p>
        </div>
        <Button
          id="add-compliance-btn"
          variant="primary"
          size="md"
          onClick={handleAddNew}
        >
          <Plus size={16} aria-hidden="true" />
          New Evaluation
        </Button>
      </header>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <Select
            id="filter-compliance-farm"
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
            id="filter-compliance-barangay"
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
            <Filter size={15} aria-hidden="true" color="var(--color-text-muted)" />
            {hasFilters && (
              <button
                id="clear-compliance-filters-inline-btn"
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
            <Button id="retry-compliance-btn" variant="ghost" size="sm" onClick={loadLogs}>
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
            <table className={styles.table} aria-label="Pest control compliance table">
              <thead>
                <tr>
                  <th className={styles.th}>Farm</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Evaluation Date</th>
                  <th className={styles.th}>Notes</th>
                  <th className={styles.th}>Encoded By</th>
                  <th className={`${styles.th} ${styles.thAction}`} />
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <LogRow key={log.log_id} log={log} onEdit={handleEdit} />
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

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingLog(null); }}
        title={editingLog ? 'Edit Compliance Record' : 'Log New Evaluation'}
        size="md"
      >
        <ComplianceModal
          existing={editingLog}
          onSuccess={handleModalSuccess}
          onCancel={() => { setShowModal(false); setEditingLog(null); }}
        />
        {editingLog && (
          <div className={styles.deleteRow}>
            <button
              className={styles.deleteLink}
              type="button"
              onClick={handleDeleteClick}
            >
              <Trash2 size={13} /> Delete this record
            </button>
          </div>
        )}
      </Modal>

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Compliance Record"
      >
        <p className={styles.deleteModalBody}>
          Are you sure you want to delete this evaluation record? This action cannot be undone.
        </p>
        <div className={styles.deleteModalFooter}>
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" loading={deleting} onClick={handleDeleteConfirm}>
            <Trash2 size={14} /> Yes, Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
