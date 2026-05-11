import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  MapPin,
  User,
  Calendar,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Activity,
  Clock,
} from 'lucide-react';
import { getReportById, updateReport } from '../../services/reports';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import styles from './ReportDetail.module.css';

// ---------------------------------------------------------------------------
// Severity colour map
// ---------------------------------------------------------------------------
const SEVERITY_COLORS = {
  Low:      { bg: 'hsl(145, 55%, 92%)', color: 'hsl(145, 60%, 28%)' },
  Medium:   { bg: 'hsl(48,  90%, 92%)', color: 'hsl(38,  80%, 32%)' },
  High:     { bg: 'hsl(25,  90%, 92%)', color: 'hsl(25,  80%, 35%)' },
  Critical: { bg: 'hsl(4,   74%, 94%)', color: 'hsl(4,   74%, 40%)' },
};

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------
function SeverityBadge({ severity }) {
  const p = SEVERITY_COLORS[severity] ?? { bg: 'hsl(0,0%,92%)', color: 'hsl(0,0%,40%)' };
  return (
    <span className={styles.severityBadge} style={{ background: p.bg, color: p.color }}>
      <span className={styles.badgeDot} style={{ background: p.color }} aria-hidden="true" />
      {severity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const STATUS_META = {
  Active:             { icon: Activity,      cls: 'statusActive'   },
  Resolved:           { icon: CheckCircle2,  cls: 'statusResolved' },
  'Under Monitoring': { icon: Clock,         cls: 'statusMonitor'  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { icon: Activity, cls: 'statusActive' };
  const Icon = meta.icon;
  return (
    <span className={`${styles.statusBadge} ${styles[meta.cls]}`}>
      <Icon size={12} aria-hidden="true" />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Info row — label + value pair used inside the detail grid
// ---------------------------------------------------------------------------
function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className={styles.infoRow}>
      <div className={styles.infoLabel}>
        <Icon size={14} className={styles.infoIcon} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className={styles.infoValue}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReportDetail — main page
// ---------------------------------------------------------------------------
export default function ReportDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [updating,    setUpdating]    = useState(false);
  const [updateError, setUpdateError] = useState('');

  // ── Load report ───────────────────────────────────────────────────────────
  async function loadReport() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getReportById(id);
    if (fetchError) setError(fetchError.message);
    else            setReport(data);
    setLoading(false);
  }

  useEffect(() => { loadReport(); }, [id]); // eslint-disable-line

  // ── Status update ─────────────────────────────────────────────────────────
  async function handleStatusChange(newStatus) {
    if (updating || report?.status === newStatus) return;
    setUpdating(true);
    setUpdateError('');

    const { data, error: updateErr } = await updateReport(id, { status: newStatus });

    if (updateErr) {
      setUpdateError(updateErr.message ?? 'Failed to update status.');
    } else {
      // Merge updated fields so we don't need a full re-fetch
      setReport(prev => ({ ...prev, ...data, status: newStatus }));
    }
    setUpdating(false);
  }

  // ── Format date ───────────────────────────────────────────────────────────
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size={40} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorWrapper}>
          <AlertCircle size={24} className={styles.errorIcon} />
          <p className={styles.errorText}>{error}</p>
          <Button id="retry-report-detail-btn" variant="ghost" size="sm" onClick={loadReport}>
            <RefreshCw size={14} /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const isResolved = report.status === 'Resolved';

  // ── Full render ───────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── Back nav ───────────────────────────────────────────────────────── */}
      <div className={styles.backNav}>
        <button
          id="back-to-reports-btn"
          className={styles.backBtn}
          onClick={() => navigate('/reports')}
          aria-label="Back to Disease Reports"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Disease Reports
        </button>
      </div>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <div className={styles.reportIconWrap}>
            <Bug size={18} aria-hidden="true" />
          </div>
          <div>
            <h1 className={styles.pageTitle}>{report.disease_name}</h1>
            <p className={styles.pageSubtitle}>{report.farm_name}</p>
          </div>
        </div>
        <StatusBadge status={report.status} />
      </header>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className={styles.grid}>

        {/* ── Left — report info ─────────────────────────────────────────── */}
        <div className={styles.leftColumn}>
          <Card className={styles.infoCard}>
            <Card.Header title="Report Information" className={styles.cardHeader} />
            <Card.Body className={styles.infoBody}>
              <InfoRow icon={Bug} label="Disease">
                <span className={styles.valueText}>{report.disease_name}</span>
              </InfoRow>
              <InfoRow icon={MapPin} label="Farm">
                <div>
                  <span className={styles.valueText}>{report.farm_name}</span>
                  <span className={styles.valueSub}>{report.owner_name}</span>
                </div>
              </InfoRow>
              <InfoRow icon={MapPin} label="Barangay">
                <span className={styles.valueText}>{report.barangay_name}</span>
              </InfoRow>
              <InfoRow icon={Activity} label="Severity">
                <SeverityBadge severity={report.severity} />
              </InfoRow>
              <InfoRow icon={Calendar} label="Date Reported">
                <span className={styles.valueText}>{fmtDate(report.date_reported)}</span>
              </InfoRow>
              <InfoRow icon={User} label="Encoded By">
                <span className={styles.valueText}>{report.encoded_by_name ?? '—'}</span>
              </InfoRow>
              <InfoRow icon={Clock} label="Submitted At">
                <span className={styles.valueText}>{fmtDate(report.created_at)}</span>
              </InfoRow>
            </Card.Body>
          </Card>

          {/* Clinical notes */}
          {report.additional_notes && (
            <Card className={styles.notesCard}>
              <Card.Header className={styles.cardHeader}>
                <div className={styles.cardHeaderInner}>
                  <ClipboardList size={15} className={styles.headerIcon} aria-hidden="true" />
                  <span>Clinical Notes</span>
                </div>
              </Card.Header>
              <Card.Body>
                <p className={styles.clinicalNotes}>{report.additional_notes}</p>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* ── Right — status management ───────────────────────────────────── */}
        <div className={styles.rightColumn}>
          <Card className={styles.statusCard}>
            <Card.Header title="Status Management" className={styles.cardHeader} />
            <Card.Body className={styles.statusBody}>

              <p className={styles.statusHelp}>
                Update the status of this disease report. Resolving a report indicates
                the case has been addressed.
              </p>

              {/* Status action buttons */}
              <div className={styles.statusActions}>
                <button
                  id="set-status-active"
                  className={`${styles.statusBtn} ${report.status === 'Active' ? styles.statusBtnActive : ''}`}
                  onClick={() => handleStatusChange('Active')}
                  disabled={updating || report.status === 'Active'}
                  aria-pressed={report.status === 'Active'}
                >
                  <Activity size={14} aria-hidden="true" />
                  Active
                </button>

                <button
                  id="set-status-monitoring"
                  className={`${styles.statusBtn} ${report.status === 'Under Monitoring' ? styles.statusBtnMonitor : ''}`}
                  onClick={() => handleStatusChange('Under Monitoring')}
                  disabled={updating || report.status === 'Under Monitoring'}
                  aria-pressed={report.status === 'Under Monitoring'}
                >
                  <Clock size={14} aria-hidden="true" />
                  Under Monitoring
                </button>

                <button
                  id="set-status-resolved"
                  className={`${styles.statusBtn} ${isResolved ? styles.statusBtnResolved : ''}`}
                  onClick={() => handleStatusChange('Resolved')}
                  disabled={updating || isResolved}
                  aria-pressed={isResolved}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Mark as Resolved
                </button>
              </div>

              {updateError && (
                <div className={styles.updateError} role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{updateError}</span>
                </div>
              )}

              {updating && (
                <div className={styles.updatingMsg} aria-live="polite">
                  <LoadingSpinner size={14} />
                  <span>Updating…</span>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Quick summary card */}
          <Card className={styles.summaryCard}>
            <Card.Body className={styles.summaryBody}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Livestock Type</span>
                <span className={styles.summaryValue}>{report.livestock_type_name ?? '—'}</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Current Status</span>
                <StatusBadge status={report.status} />
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Severity</span>
                <SeverityBadge severity={report.severity} />
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}
