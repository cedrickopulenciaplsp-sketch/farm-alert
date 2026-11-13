import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from '../../hooks/useRealtime';
import {
  ShieldWarning as ShieldAlert,
  MapPin,
  Calendar,
  Users,
  Skull,
  CheckCircle as CheckCircle2,
  WarningCircle as AlertCircle,
  ArrowsClockwise as RefreshCw,
  Funnel as Filter,
  Siren,
  Tractor,
  MagnifyingGlass,
  Flask,
  PaperPlaneTilt,
  ShieldCheck,
} from '@phosphor-icons/react';
import { supabase } from '../../lib/supabase';
import { getOutbreaks, updateOutbreak } from '../../services/outbreaks';
import { writeAuditLog } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import Modal from '../../components/shared/Modal';
import { Select } from '../../components/shared/FormElements';
import styles from './OutbreakAlerts.module.css';

// ---------------------------------------------------------------------------
// Incident stage — derived from DB status + RADDL lab result.
//
//   DB status      lab_result   ->  Stage shown
//   Active         (any*)       ->  Suspected Incident (awaiting dispatch)
//   Acknowledged   Pending      ->  Under Investigation
//   any open       Positive     ->  Confirmed Outbreak
//   any open       Negative     ->  Lab Negative (awaiting case closure)
//   Resolved       Negative     ->  Lab Cleared (closed)
//   Resolved       other        ->  Resolved (closed)
// ---------------------------------------------------------------------------
function getStage(o) {
  const lab = o.lab_result || 'Pending';
  if (o.status === 'Resolved') return lab === 'Negative' ? 'cleared' : 'resolved';
  if (o.status === 'Active')   return 'suspected';
  if (lab === 'Positive')      return 'confirmed';
  if (lab === 'Negative')      return 'negative';
  return 'investigating';
}

const STAGE_META = {
  suspected: {
    label: 'Suspected Incident',
    cls:   'stageSuspected',
    note:  'Report received. Not yet an outbreak — awaiting the City Veterinarian\'s dispatch order for field investigation.',
  },
  investigating: {
    label: 'Under Investigation',
    cls:   'stageInvestigating',
    note:  'Veterinary Inspector dispatched. Samples are collected on-site and submitted to RADDL for laboratory confirmation.',
  },
  confirmed: {
    label: 'Confirmed Outbreak',
    cls:   'stageConfirmed',
    note:  'RADDL result is POSITIVE. 1 km Quarantine and 7 km Surveillance zones are projected on the Disease Map.',
  },
  negative: {
    label: 'Lab Negative',
    cls:   'stageCleared',
    note:  'RADDL result is NEGATIVE — no outbreak. Awaiting the City Veterinarian to formally close the case.',
  },
  cleared: {
    label: 'Lab Cleared — Closed',
    cls:   'stageResolved',
    note:  'Laboratory ruled out the disease. Case closed by the City Veterinarian.',
  },
  resolved: {
    label: 'Resolved — Quarantine Lifted',
    cls:   'stageResolved',
    note:  'Quarantine lifted and case closed by the City Veterinarian.',
  },
};

const STAGE_ORDER = { suspected: 0, confirmed: 1, investigating: 2, negative: 3, resolved: 4, cleared: 5 };
const isClosedStage = (stage) => stage === 'cleared' || stage === 'resolved';

function StageBadge({ stage }) {
  const meta = STAGE_META[stage];
  return (
    <span className={`${styles.statusBadge} ${styles[meta.cls]}`}>
      {meta.label}
    </span>
  );
}

function formatDate(value, withTime = false) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------
function SummaryStats({ outbreaks }) {
  const counts = outbreaks.reduce((acc, o) => {
    const s = getStage(o);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const awaitingClosure = counts.negative ?? 0;
  const closed          = (counts.cleared ?? 0) + (counts.resolved ?? 0);

  return (
    <div className={`${styles.statsRow} ${styles.statsRowFour}`}>
      <div className={`${styles.statCard} ${styles.statWarning}`}>
        <Siren size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{counts.suspected ?? 0}</p>
          <p className={styles.statLabel}>Suspected Incidents</p>
          <p className={styles.statHint}>Awaiting dispatch</p>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statInfo}`}>
        <MagnifyingGlass size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{counts.investigating ?? 0}</p>
          <p className={styles.statLabel}>Under Investigation</p>
          <p className={styles.statHint}>Awaiting RADDL result</p>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statDanger}`}>
        <ShieldAlert size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{counts.confirmed ?? 0}</p>
          <p className={styles.statLabel}>Confirmed Outbreaks</p>
          <p className={styles.statHint}>Lab positive · quarantine</p>
        </div>
      </div>
      <div className={`${styles.statCard} ${styles.statSuccess}`}>
        <CheckCircle2 size={18} aria-hidden="true" className={styles.statIcon} />
        <div>
          <p className={styles.statValue}>{closed}</p>
          <p className={styles.statLabel}>Cleared / Resolved</p>
          <p className={styles.statHint}>
            {awaitingClosure > 0
              ? `${awaitingClosure} lab negative awaiting closure`
              : 'Lab negative or lifted'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step wrapper
// ---------------------------------------------------------------------------
function Step({ num, title, authority, state = '', children }) {
  const authCls =
    authority === 'City Veterinarian' ? styles.authorityAdmin : styles.authorityStaff;
  return (
    <div className={`${styles.sopStep} ${state}`}>
      <div className={styles.stepHeaderRow}>
        <div className={styles.stepHeader}>
          <span className={styles.stepNum}>{num}</span>
          <span className={styles.stepName}>{title}</span>
        </div>
        <span className={`${styles.authorityTag} ${authCls}`}>{authority}</span>
      </div>
      <div className={styles.stepBody}>{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IncidentCard
// ---------------------------------------------------------------------------
function IncidentCard({ outbreak, onDispatch, onResolve, onSopUpdate, isAdmin }) {
  const [busy, setBusy]               = useState(false);
  const [sopUpdating, setSopUpdating] = useState(false);
  const [bloodDate, setBloodDate]     = useState(outbreak.blood_sample_taken_date || '');
  const [labResult, setLabResult]     = useState(outbreak.lab_result || 'Pending');
  const [checkpoint, setCheckpoint]   = useState(Boolean(outbreak.checkpoint_issued));

  // Keep local inputs in sync with realtime updates from other tabs/users
  useEffect(() => { setBloodDate(outbreak.blood_sample_taken_date || ''); }, [outbreak.blood_sample_taken_date]);
  useEffect(() => { setLabResult(outbreak.lab_result || 'Pending'); }, [outbreak.lab_result]);
  useEffect(() => { setCheckpoint(Boolean(outbreak.checkpoint_issued)); }, [outbreak.checkpoint_issued]);

  const stage       = getStage(outbreak);
  const meta        = STAGE_META[stage];
  const isClosed    = stage === 'cleared' || stage === 'resolved';
  const isDispatched = outbreak.status !== 'Active';
  const farmLabel   = outbreak.farm_name || outbreak.affected_farms_list || 'Affected Farm';
  const sick        = Number(outbreak.total_animals_affected) || 0;
  const dead        = Number(outbreak.total_mortalities) || 0;

  async function handleDispatch() {
    setBusy(true);
    await onDispatch(outbreak);
    setBusy(false);
  }

  async function handleSopChange(field, value) {
    const payload = {};
    if (field === 'bloodDate') {
      setBloodDate(value);
      payload.blood_sample_taken_date = value || null;
    }
    if (field === 'labResult') {
      setLabResult(value);
      payload.lab_result = value;
      // A quarantine checkpoint only exists for a confirmed (positive) outbreak
      if (value !== 'Positive' && checkpoint) {
        setCheckpoint(false);
        payload.checkpoint_issued = false;
      }
    }
    if (field === 'checkpoint') {
      setCheckpoint(value);
      payload.checkpoint_issued = value;
    }

    setSopUpdating(true);
    await onSopUpdate(outbreak, field, payload);
    setSopUpdating(false);
  }

  const cardAccent =
    stage === 'suspected' ? styles.cardSuspected :
    stage === 'confirmed' ? styles.cardConfirmed : '';

  const showUrgentBar = stage === 'suspected' || stage === 'confirmed';

  return (
    <article
      className={`${styles.outbreakCard} ${cardAccent}`}
      aria-label={`${meta.label}: ${outbreak.disease_name} at ${farmLabel}`}
    >
      {showUrgentBar && (
        <div
          className={`${styles.urgentBar} ${stage === 'suspected' ? styles.urgentBarSuspected : ''}`}
          aria-hidden="true"
        />
      )}

      <div className={styles.cardContent}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleGroup}>
            <div className={`${styles.outbreakIcon} ${stage === 'confirmed' ? styles.outbreakIconActive : ''}`}>
              <ShieldAlert size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 className={styles.diseaseName}>
                {stage === 'suspected' || stage === 'investigating' ? 'Suspected ' : ''}
                {outbreak.disease_name} — <span style={{ color: 'var(--color-brand)' }}>{farmLabel}</span>
              </h2>
              <div className={styles.locationRow}>
                <MapPin size={12} aria-hidden="true" className={styles.locationIcon} />
                <span className={styles.barangayName}>Brgy. {outbreak.barangay_name}</span>
              </div>
            </div>
          </div>
          <StageBadge stage={stage} />
        </div>

        {/* Meta */}
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <Calendar size={12} aria-hidden="true" className={styles.metaIcon} />
            <span>Reported {formatDate(outbreak.date_triggered)}</span>
          </div>
          <div className={styles.metaItem}>
            <Tractor size={12} aria-hidden="true" className={styles.metaIcon} />
            <span>{farmLabel}</span>
          </div>
          <div className={styles.metaItem}>
            <Users size={12} aria-hidden="true" className={styles.metaIcon} />
            <span>
              {sick > 0
                ? `${sick} head${sick !== 1 ? 's' : ''} sick (reported)`
                : 'Head count to be verified on-site'}
            </span>
          </div>
          {dead > 0 && (
            <div className={styles.metaItem} style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
              <Skull size={12} aria-hidden="true" className={styles.metaIcon} />
              <span>{dead} mortalit{dead !== 1 ? 'ies' : 'y'}</span>
            </div>
          )}
        </div>

        {/* What this stage means — answers "is this an outbreak?" at a glance */}
        <p className={styles.stageNote}>
          <strong>{meta.label}:</strong> {meta.note}
        </p>

        {/* Field Response Protocol */}
        <div className={styles.sopSection}>
          <div className={styles.sopHeader}>
            <h4 className={styles.sopTitle}>Field Response Protocol (DA-BAI SOP)</h4>
            {checkpoint && !isClosed && (
              <span className={styles.checkpointBadge}>CHECKPOINT ACTIVE</span>
            )}
          </div>

          <div className={styles.sopSteps}>
            {/* Step 1 — Dispatch order */}
            <Step
              num={1}
              title="Dispatch Order"
              authority="City Veterinarian"
              state={isDispatched ? styles.stepDone : ''}
            >
              {isDispatched ? (
                <span className={styles.stepText}>
                  <PaperPlaneTilt size={14} aria-hidden="true" style={{ color: 'hsl(145, 60%, 36%)' }} />
                  Inspector dispatched {outbreak.dispatched_at ? formatDate(outbreak.dispatched_at, true) : ''}
                  {(outbreak.dispatched_by_name || outbreak.acknowledged_by_name) &&
                    ` by ${outbreak.dispatched_by_name || outbreak.acknowledged_by_name}`}
                </span>
              ) : isAdmin ? (
                <Button
                  id={`dispatch-inspector-${outbreak.outbreak_id}`}
                  variant="primary"
                  size="sm"
                  loading={busy}
                  onClick={handleDispatch}
                >
                  <PaperPlaneTilt size={13} aria-hidden="true" />
                  Dispatch Inspector
                </Button>
              ) : (
                <span className={styles.stepTextMuted}>
                  Awaiting dispatch order from the City Veterinarian.
                </span>
              )}
            </Step>

            {/* Step 2 — Blood sample collection */}
            <Step
              num={2}
              title="Blood Sample Collection"
              authority="Veterinary Inspector"
              state={
                !isDispatched ? `${styles.stepDisabled} ${styles.stepPending}` :
                bloodDate ? styles.stepDone : ''
              }
            >
              <input
                type="date"
                className={styles.sopInput}
                value={bloodDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => handleSopChange('bloodDate', e.target.value)}
                disabled={!isDispatched || sopUpdating || isClosed}
                aria-label="Blood sample collection date"
              />
            </Step>

            {/* Step 3 — RADDL laboratory result */}
            <Step
              num={3}
              title="RADDL Laboratory Result"
              authority="Veterinary Inspector"
              state={
                !bloodDate || !isDispatched ? `${styles.stepDisabled} ${styles.stepPending}` :
                labResult === 'Positive' ? styles.stepDanger :
                labResult === 'Negative' ? styles.stepDone : ''
              }
            >
              <select
                className={styles.sopInput}
                value={labResult}
                onChange={(e) => handleSopChange('labResult', e.target.value)}
                disabled={!isDispatched || !bloodDate || sopUpdating || isClosed}
                aria-label="RADDL laboratory result"
              >
                <option value="Pending">Pending — samples at laboratory</option>
                <option value="Positive">Positive — Confirmed Outbreak</option>
                <option value="Negative">Negative — Lab Cleared (no outbreak)</option>
              </select>
            </Step>

            {/* Step 4 — Quarantine checkpoint (confirmed outbreaks only) */}
            {labResult === 'Positive' && (
              <Step
                num={4}
                title="Quarantine Checkpoint Order"
                authority="City Veterinarian"
                state={isClosed ? styles.stepDone : styles.stepDanger}
              >
                {isAdmin && !isClosed ? (
                  <label className={styles.checkpointToggle}>
                    <input
                      type="checkbox"
                      checked={checkpoint}
                      onChange={(e) => handleSopChange('checkpoint', e.target.checked)}
                      disabled={sopUpdating}
                    />
                    <span>Order a physical movement checkpoint within the 1 km quarantine zone</span>
                  </label>
                ) : (
                  <span className={styles.stepText}>
                    {isClosed
                      ? (checkpoint
                          ? 'Checkpoint order lifted upon outbreak resolution.'
                          : 'Quarantine protocol completed and lifted upon resolution.')
                      : (checkpoint
                          ? 'Checkpoint ordered by the City Veterinarian.'
                          : 'Awaiting checkpoint order from the City Veterinarian.')}
                  </span>
                )}
              </Step>
            )}
          </div>
        </div>

        {/* Executive resolution — City Veterinarian only */}
        {!isClosed && (stage === 'negative' || stage === 'confirmed') && (
          <div className={styles.cardActions}>
            {isAdmin ? (
              <Button
                id={`resolve-incident-${outbreak.outbreak_id}`}
                variant={stage === 'negative' ? 'primary' : 'secondary'}
                size="sm"
                loading={busy}
                onClick={() => onResolve(outbreak)}
              >
                <ShieldCheck size={13} aria-hidden="true" />
                {stage === 'negative' ? 'Close Case (Lab Cleared)' : 'Lift Quarantine & Resolve'}
              </Button>
            ) : (
              <span className={styles.awaitingPill}>
                Awaiting City Veterinarian resolution
              </span>
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
function EmptyState({ hasFilters, onClear, viewMode, archiveCount, onOpenArchive }) {
  const isActiveClear = !hasFilters && viewMode === 'active';
  return (
    <div className={styles.emptyState}>
      <div className={`${styles.emptyIcon} ${isActiveClear ? styles.emptyIconClear : ''}`}>
        {isActiveClear
          ? <ShieldCheck size={32} aria-hidden="true" />
          : <ShieldAlert size={32} aria-hidden="true" />}
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters
          ? 'No incidents match your filter'
          : viewMode === 'active'
          ? 'No active disease incidents'
          : 'No archived cases yet'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try clearing the stage filter to see all cases in this view.'
          : viewMode === 'active'
          ? 'All reported incidents have been triaged and resolved. San Pablo City is under normal surveillance.'
          : 'Resolved and lab-cleared cases will be stored here for audit and epidemiological review.'}
      </p>
      {hasFilters ? (
        <Button variant="ghost" size="sm" id="clear-outbreak-filters-btn" onClick={onClear}>
          Clear filter
        </Button>
      ) : viewMode === 'active' && archiveCount > 0 && (
        <Button variant="secondary" size="sm" id="view-case-archive-btn" onClick={onOpenArchive}>
          <CheckCircle2 size={14} aria-hidden="true" />
          View Case Archive ({archiveCount})
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm resolution modal
// ---------------------------------------------------------------------------
function ConfirmModal({ incident, onConfirm, onCancel, busy }) {
  const isNegative = incident && getStage(incident) === 'negative';
  return (
    <Modal
      isOpen={!!incident}
      onClose={onCancel}
      title={isNegative ? 'Close Case — Lab Cleared?' : 'Lift Quarantine & Resolve Outbreak?'}
      size="sm"
      footer={
        <div className={styles.confirmFooter}>
          <Button id="confirm-cancel-btn" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button id="confirm-resolve-btn" variant="primary" loading={busy} onClick={onConfirm}>
            {isNegative ? 'Yes, Close Case' : 'Yes, Lift Quarantine'}
          </Button>
        </div>
      }
    >
      <p className={styles.confirmText}>
        {isNegative
          ? 'The RADDL laboratory ruled out the disease. Closing this case will:'
          : 'Only lift the quarantine after terminal disinfection and the required clean monitoring period. This will:'}
      </p>
      <ul className={styles.confirmList}>
        <li>Mark the linked <strong>disease report(s)</strong> as <strong>Resolved</strong>.</li>
        <li>Restore the <strong>farm</strong> to <strong>Active</strong> status (unless it has other open reports).</li>
        {!isNegative && <li>Remove the <strong>1 km / 7 km zones</strong> from the Disease Map.</li>}
        <li>Record this executive action in the <strong>Audit Logs</strong>.</li>
      </ul>
      <p className={styles.confirmText} style={{ marginTop: '0.75rem' }}>
        This action is reserved for the City Veterinarian and cannot be automatically undone.
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function OutbreakAlerts() {
  const { user, role, profile } = useAuth();
  const isAdmin = role === 'admin';

  const [outbreaks, setOutbreaks] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [viewMode,    setViewMode]    = useState('active');
  const [stageFilter, setStageFilter] = useState('');

  const [pendingResolve, setPendingResolve] = useState(null);
  const [resolving,      setResolving]      = useState(false);

  const loadOutbreaks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getOutbreaks();
    if (fetchError) setError(fetchError.message);
    else            setOutbreaks(data ?? []);
    setLoading(false);
  }, []);

  const silentRefresh = useCallback(async () => {
    const { data, error: fetchError } = await getOutbreaks();
    if (!fetchError && data) setOutbreaks(data);
  }, []);

  useEffect(() => { loadOutbreaks(); }, [loadOutbreaks]);

  useEffect(() => {
    const onFocus = () => silentRefresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [silentRefresh]);

  useRealtime('outbreak_alerts', silentRefresh);
  useRealtime('disease_reports', silentRefresh);

  function patchLocal(outbreakId, patch) {
    setOutbreaks(prev => prev.map(o => (o.outbreak_id === outbreakId ? { ...o, ...patch } : o)));
  }

  function describe(o) {
    return `${o.disease_name} at ${o.farm_name || 'farm'} (Brgy. ${o.barangay_name})`;
  }

  // Step 1 — City Veterinarian issues the dispatch order
  async function handleDispatch(o) {
    const { error: updateError } = await updateOutbreak(o.outbreak_id, { status: 'Acknowledged' });
    if (updateError) return;

    patchLocal(o.outbreak_id, {
      status:             'Acknowledged',
      dispatched_at:      new Date().toISOString(),
      dispatched_by_name: profile?.full_name ?? user?.user_metadata?.full_name ?? null,
    });

    await writeAuditLog({
      userId:      profile?.user_id,
      action:      `Dispatched veterinary inspector for suspected ${describe(o)}`,
      targetTable: 'outbreak_alerts',
      targetId:    o.outbreak_id,
    });
  }

  // Steps 2–4 — field data and checkpoint order
  async function handleSopUpdate(o, field, payload) {
    const { error: updateError } = await updateOutbreak(o.outbreak_id, payload);
    if (updateError) return;
    patchLocal(o.outbreak_id, payload);

    let action = null;
    if (field === 'bloodDate' && payload.blood_sample_taken_date) {
      action = `Recorded blood sample collection (${payload.blood_sample_taken_date}) for ${describe(o)}`;
    }
    if (field === 'labResult') {
      action =
        payload.lab_result === 'Positive' ? `RADDL result POSITIVE — Confirmed outbreak: ${describe(o)}` :
        payload.lab_result === 'Negative' ? `RADDL result NEGATIVE — Lab cleared: ${describe(o)}` :
                                            `RADDL result set to Pending for ${describe(o)}`;
    }
    if (field === 'checkpoint') {
      action = `${payload.checkpoint_issued ? 'Ordered' : 'Withdrew'} quarantine checkpoint for ${describe(o)}`;
    }

    if (action) {
      await writeAuditLog({
        userId:      profile?.user_id,
        action,
        targetTable: 'outbreak_alerts',
        targetId:    o.outbreak_id,
      });
    }
  }

  // Final step — executive resolution (City Veterinarian only)
  async function confirmResolve() {
    if (!pendingResolve || !isAdmin) return;
    setResolving(true);
    const o = pendingResolve;
    const wasNegative = getStage(o) === 'negative';
    const { error: updateError } = await updateOutbreak(o.outbreak_id, { status: 'Resolved' });
    if (!updateError) {
      if (o.report_id) {
        await supabase.from('disease_reports').update({ status: 'Resolved' }).eq('report_id', o.report_id);
      }
      if (o.farm_id && o.disease_id) {
        await supabase.from('disease_reports').update({ status: 'Resolved' }).eq('farm_id', o.farm_id).eq('disease_id', o.disease_id).neq('status', 'Resolved');
      }
      patchLocal(o.outbreak_id, { status: 'Resolved' });
      await writeAuditLog({
        userId:      profile?.user_id,
        action:      wasNegative
          ? `City Veterinarian closed case (lab cleared): ${describe(o)}`
          : `City Veterinarian lifted quarantine and resolved outbreak: ${describe(o)}`,
        targetTable: 'outbreak_alerts',
        targetId:    o.outbreak_id,
      });
    }
    setResolving(false);
    setPendingResolve(null);
  }

  const activeList  = outbreaks.filter(o => !isClosedStage(getStage(o)));
  const archiveList = outbreaks.filter(o => isClosedStage(getStage(o)));
  const scopedList  = viewMode === 'active' ? activeList : archiveList;

  const switchView = (mode) => {
    setViewMode(mode);
    setStageFilter('');
  };

  const hasFilters = !!stageFilter;

  const filtered = stageFilter
    ? scopedList.filter(o => getStage(o) === stageFilter)
    : scopedList;

  const sorted = [...filtered].sort(
    (a, b) => (STAGE_ORDER[getStage(a)] ?? 9) - (STAGE_ORDER[getStage(b)] ?? 9)
  );

  return (
    <div className={`${styles.page} page-enter`}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Disease Incidents &amp; Outbreak Response</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${activeList.length} active · ${archiveList.length} archived · An incident becomes an outbreak only when RADDL confirms a positive result.`}
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

      {!loading && !error && <SummaryStats outbreaks={outbreaks} />}

      <div className={styles.viewTabs} role="tablist" aria-label="Incident queue view">
        <button
          id="tab-active-incidents"
          type="button"
          role="tab"
          aria-selected={viewMode === 'active'}
          className={`${styles.viewTab} ${viewMode === 'active' ? styles.viewTabActive : ''}`}
          onClick={() => switchView('active')}
        >
          <Siren size={14} aria-hidden="true" />
          Active Incidents
          <span className={styles.viewTabCount}>{activeList.length}</span>
        </button>
        <button
          id="tab-case-archive"
          type="button"
          role="tab"
          aria-selected={viewMode === 'archive'}
          className={`${styles.viewTab} ${viewMode === 'archive' ? styles.viewTabActive : ''}`}
          onClick={() => switchView('archive')}
        >
          <CheckCircle2 size={14} aria-hidden="true" />
          Case Archive
          <span className={styles.viewTabCount}>{archiveList.length}</span>
        </button>
      </div>

      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <Filter size={14} className={styles.filterIcon} aria-hidden="true" />
          <span className={styles.filterLabel}>Filter by stage</span>
          <Select
            id="filter-outbreak-status"
            label=""
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            aria-label="Filter incidents by stage"
            className={styles.filterSelect}
          >
            {viewMode === 'active' ? (
              <>
                <option value="">All Active Stages</option>
                <option value="suspected">Suspected Incident</option>
                <option value="investigating">Under Investigation</option>
                <option value="confirmed">Confirmed Outbreak</option>
                <option value="negative">Lab Negative (Awaiting Closure)</option>
              </>
            ) : (
              <>
                <option value="">All Archived Cases</option>
                <option value="cleared">Lab Cleared — Closed</option>
                <option value="resolved">Resolved — Quarantine Lifted</option>
              </>
            )}
          </Select>
          {hasFilters && (
            <button
              id="clear-outbreak-filter-btn"
              className={styles.clearBtn}
              onClick={() => setStageFilter('')}
            >
              Clear
            </button>
          )}
          <span className={styles.filterLabel} style={{ marginLeft: 'auto' }}>
            <Flask size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
            {viewMode === 'active'
              ? 'Lab-confirmed outbreaks only appear in red'
              : 'Historical resolved & lab-cleared incidents on record'}
          </span>
        </Card.Body>
      </Card>

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
        <EmptyState
          hasFilters={hasFilters}
          onClear={() => setStageFilter('')}
          viewMode={viewMode}
          archiveCount={archiveList.length}
          onOpenArchive={() => switchView('archive')}
        />
      ) : (
        <div className={styles.outbreakList} role="list" aria-label="Disease incidents list">
          {sorted.map(outbreak => (
            <IncidentCard
              key={outbreak.outbreak_id}
              outbreak={outbreak}
              onDispatch={handleDispatch}
              onResolve={setPendingResolve}
              onSopUpdate={handleSopUpdate}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        incident={pendingResolve}
        onConfirm={confirmResolve}
        onCancel={() => setPendingResolve(null)}
        busy={resolving}
      />
    </div>
  );
}
