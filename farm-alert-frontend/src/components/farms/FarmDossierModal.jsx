/**
 * FarmDossierModal.jsx
 * Farm 360° Dossier — comprehensive farm history modal.
 * Shows full profile, livestock details, and a chronological
 * disease report timeline for the selected farm.
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Warehouse,
  MapPin,
  Phone,
  User,
  Stethoscope,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Navigation,
  Loader2,
  FileText,
} from 'lucide-react';
import { getFarmDossier } from '../../services/farms';
import styles from './FarmDossierModal.module.css';

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------
const SEVERITY_META = {
  Mild:     { cls: styles.sevMild,     label: 'Mild'     },
  Moderate: { cls: styles.sevModerate, label: 'Moderate' },
  Severe:   { cls: styles.sevSevere,   label: 'Severe'   },
  Critical: { cls: styles.sevCritical, label: 'Critical' },
};

function SeverityBadge({ severity }) {
  const meta = SEVERITY_META[severity] ?? { cls: styles.sevMild, label: severity };
  return <span className={`${styles.badge} ${meta.cls}`}>{meta.label}</span>;
}

// ---------------------------------------------------------------------------
// Report status icon on the timeline
// ---------------------------------------------------------------------------
function TimelineIcon({ status }) {
  if (status === 'Resolved') return <CheckCircle2 size={15} className={styles.iconResolved} />;
  if (status === 'Active')   return <AlertTriangle size={15} className={styles.iconActive} />;
  return <Clock size={15} className={styles.iconDefault} />;
}

// ---------------------------------------------------------------------------
// Farm status badge
// ---------------------------------------------------------------------------
function FarmStatusBadge({ status }) {
  const cls =
    status === 'Active'              ? styles.farmStatusActive :
    status === 'Quarantine'          ? styles.farmStatusQuarantine :
    status === 'Temporarily Closed'  ? styles.farmStatusClosed :
                                       styles.farmStatusDefault;
  return <span className={`${styles.farmStatusBadge} ${cls}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Info Row helper
// ---------------------------------------------------------------------------
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className={styles.infoRow}>
      <Icon size={14} className={styles.infoIcon} aria-hidden="true" />
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value ?? '—'}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FarmDossierModal
// ---------------------------------------------------------------------------
export default function FarmDossierModal({ farmId, onClose }) {
  const [farm,    setFarm]    = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!farmId) return;
    setLoading(true);
    setError(null);

    getFarmDossier(farmId).then(({ farm: f, reports: r, error: e }) => {
      if (e) { setError('Failed to load farm dossier.'); }
      else   { setFarm(f); setReports(r); }
      setLoading(false);
    });
  }, [farmId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!farmId) return null;

  const totalCases      = reports.length;
  const activeCases     = reports.filter(r => r.status === 'Active').length;
  const resolvedCases   = reports.filter(r => r.status === 'Resolved').length;
  const totalMortalities = reports.reduce((s, r) => s + (r.mortalities || 0), 0);

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={farm ? `${farm.farm_name} 360° Dossier` : 'Farm Dossier'}
      >
        {/* ── Modal Header ───────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <Warehouse size={18} />
            </div>
            <div>
              <p className={styles.headerEyebrow}>Farm 360° Dossier</p>
              <h2 className={styles.headerTitle}>
                {loading ? 'Loading…' : (farm?.farm_name ?? 'Farm Details')}
              </h2>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dossier"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={28} className={styles.spinner} />
              <p>Loading farm dossier…</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <AlertTriangle size={24} />
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* ── Farm Profile ─────────────────────────────────── */}
              <section className={styles.profileSection}>
                <div className={styles.profileTop}>
                  <div>
                    <FarmStatusBadge status={farm.status} />
                    <p className={styles.farmType}>{farm.livestock_type_name}</p>
                  </div>
                  {farm.latitude && farm.longitude && (
                    <a
                      className={styles.coordsBadge}
                      href={`https://maps.google.com/?q=${farm.latitude},${farm.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Google Maps"
                    >
                      <Navigation size={12} />
                      {Number(farm.latitude).toFixed(4)}, {Number(farm.longitude).toFixed(4)}
                    </a>
                  )}
                </div>

                <div className={styles.infoGrid}>
                  <InfoRow icon={User}    label="Farm Owner"  value={farm.owner_name} />
                  <InfoRow icon={MapPin}  label="Barangay"    value={farm.barangay_name} />
                  <InfoRow icon={Phone}   label="Contact"     value={farm.contact_number} />
                  <InfoRow icon={Warehouse} label="Head Count" value={farm.head_count != null ? `${farm.head_count.toLocaleString()} head` : null} />
                </div>
              </section>

              {/* ── Stats Strip ──────────────────────────────────── */}
              <section className={styles.statsStrip}>
                <div className={styles.statItem}>
                  <p className={styles.statValue}>{totalCases}</p>
                  <p className={styles.statLabel}>Total Cases</p>
                </div>
                <div className={`${styles.statItem} ${activeCases > 0 ? styles.statDanger : ''}`}>
                  <p className={styles.statValue}>{activeCases}</p>
                  <p className={styles.statLabel}>Active Now</p>
                </div>
                <div className={styles.statItem}>
                  <p className={styles.statValue}>{resolvedCases}</p>
                  <p className={styles.statLabel}>Resolved</p>
                </div>
                <div className={`${styles.statItem} ${totalMortalities > 0 ? styles.statDanger : ''}`}>
                  <p className={styles.statValue}>{totalMortalities}</p>
                  <p className={styles.statLabel}>Deaths Recorded</p>
                </div>
              </section>

              {/* ── Chronological Timeline ───────────────────────── */}
              <section className={styles.timelineSection}>
                <div className={styles.timelineTitleRow}>
                  <Stethoscope size={15} className={styles.timelineTitleIcon} />
                  <h3 className={styles.timelineTitle}>Disease Incident History</h3>
                  <span className={styles.timelineCount}>{totalCases} record{totalCases !== 1 ? 's' : ''}</span>
                </div>

                {reports.length === 0 ? (
                  <div className={styles.timelineEmpty}>
                    <FileText size={24} className={styles.timelineEmptyIcon} />
                    <p>No disease reports on record for this farm.</p>
                    <p className={styles.timelineEmptySubtext}>This farm has a clean health history.</p>
                  </div>
                ) : (
                  <ol className={styles.timeline}>
                    {reports.map((report, idx) => {
                      const date = report.date_reported
                        ? new Date(report.date_reported).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : '—';
                      return (
                        <li key={report.report_id} className={styles.timelineItem}>
                          <div className={styles.timelineIconCol}>
                            <div className={`${styles.timelineDot} ${report.status === 'Active' ? styles.dotActive : styles.dotResolved}`}>
                              <TimelineIcon status={report.status} />
                            </div>
                            {idx < reports.length - 1 && <div className={styles.timelineConnector} />}
                          </div>
                          <div className={styles.timelineContent}>
                            <div className={styles.timelineHeader}>
                              <span className={styles.timelineDisease}>{report.disease_name}</span>
                              <SeverityBadge severity={report.severity} />
                            </div>
                            <div className={styles.timelineMeta}>
                              <span><Calendar size={11} /> {date}</span>
                              {report.animals_affected > 0 && (
                                <span>{report.animals_affected} affected</span>
                              )}
                              {report.mortalities > 0 && (
                                <span className={styles.mortalityBadge}>{report.mortalities} dead</span>
                              )}
                            </div>
                            {report.additional_notes && (
                              <p className={styles.timelineNotes}>{report.additional_notes}</p>
                            )}
                            <p className={styles.timelineEncodedBy}>
                              Encoded by {report.encoded_by_name ?? 'Unknown'}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
