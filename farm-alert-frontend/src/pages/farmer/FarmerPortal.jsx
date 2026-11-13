import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Siren,
  ShieldCheck,
  ShieldWarning as ShieldAlert,
  Tractor,
  MapPin,
  CheckCircle as CheckCircle2,
  Clock,
  Flask,
  ClipboardText as ClipboardList,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../hooks/useRealtime';
import { getFarms } from '../../services/farms';
import { getReports } from '../../services/reports';
import { getOutbreaks } from '../../services/outbreaks';
import { getComplianceLogs } from '../../services/compliance';
import Card from '../../components/shared/Card';
import Modal from '../../components/shared/Modal';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ReportForm from '../../components/reports/ReportForm';
import styles from './FarmerPortal.module.css';

export default function FarmerPortal() {
  const { userFarmId } = useAuth();

  const [farms, setFarms]               = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState(userFarmId || '');
  const [reports, setReports]           = useState([]);
  const [outbreaks, setOutbreaks]       = useState([]);
  const [complianceLogs, setComplianceLogs] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const loadPortalData = useCallback(async () => {
    const [fRes, rRes, oRes, cRes] = await Promise.all([
      getFarms(),
      getReports(),
      getOutbreaks(),
      getComplianceLogs(),
    ]);

    // Data privacy: a registered farmer only ever sees their own linked holding.
    const allFarms = fRes.data ?? [];
    const farmList = userFarmId
      ? allFarms.filter((f) => f.farm_id === userFarmId)
      : [];
    setFarms(farmList);
    setReports(rRes.data ?? []);
    setOutbreaks(oRes.data ?? []);
    setComplianceLogs(cRes.data ?? []);

    setSelectedFarmId((prev) => {
      if (prev && farmList.some((f) => f.farm_id === prev)) return prev;
      if (userFarmId && farmList.some((f) => f.farm_id === userFarmId)) return userFarmId;
      return farmList[0]?.farm_id ?? '';
    });

    setLoading(false);
  }, [userFarmId]);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  // Live Realtime updates when Inspector/Admin updates blood sample, lab result, or resolves outbreak
  useRealtime('disease_reports', () => loadPortalData());
  useRealtime('outbreak_alerts', () => loadPortalData());
  useRealtime('farms',           () => loadPortalData());

  const selectedFarm = useMemo(
    () => farms.find((f) => f.farm_id === selectedFarmId) ?? farms[0] ?? null,
    [farms, selectedFarmId]
  );

  // Reports belonging to this farmer's holding
  const myReports = useMemo(() => {
    if (!selectedFarm) return [];
    return reports.filter((r) => r.farm_id === selectedFarm.farm_id);
  }, [reports, selectedFarm]);

  // Active outbreaks in the farmer's barangay (Task 4.5)
  const barangayOutbreaks = useMemo(() => {
    if (!selectedFarm) return [];
    return outbreaks.filter(
      (o) =>
        o.status !== 'Resolved' &&
        o.lab_result !== 'Negative' &&
        (o.barangay_id === selectedFarm.barangay_id ||
          o.barangay_name === selectedFarm.barangay_name)
    );
  }, [outbreaks, selectedFarm]);

  // Latest biosecurity compliance inspection for this farm (Task 4.2)
  const latestCompliance = useMemo(() => {
    if (!selectedFarm) return null;
    const farmLogs = complianceLogs.filter((c) => c.farm_id === selectedFarm.farm_id);
    return farmLogs[0] ?? null;
  }, [complianceLogs, selectedFarm]);

  function handleFarmChange(e) {
    setSelectedFarmId(e.target.value);
  }

  if (loading) {
    return (
      <div className={styles.page} style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <LoadingSpinner size={40} />
      </div>
    );
  }

  const bioStatus = latestCompliance?.status || 'Compliant';
  const bioCls =
    bioStatus === 'Compliant'
      ? styles.bioCompliant
      : bioStatus === 'Non-Compliant'
      ? styles.bioNonCompliant
      : styles.bioPending;

  return (
    <div className={`${styles.page} page-enter`}>
      {/* ── Hero Banner & Quick Report Button (Tasks 4.1 & 4.3) ──────────── */}
      <section className={styles.heroBanner}>
        <div className={styles.heroLeft}>
          <span className={styles.roleTag}>
            <Tractor size={13} weight="duotone" />
            Livestock Raiser Portal
          </span>
          <h1 className={styles.heroTitle}>
            {selectedFarm ? selectedFarm.farm_name : 'My Registered Farm'}
          </h1>
          <p className={styles.heroSub}>
            {selectedFarm
              ? `Owner: ${selectedFarm.owner_name} · Brgy. ${selectedFarm.barangay_name}, San Pablo City`
              : 'Direct CVO Disease Reporting & Barangay Biosecurity Advisory'}
          </p>
        </div>

        <div className={styles.heroActions}>
          {farms.length > 1 && (
            <select
              id="farmer-portal-farm-select"
              className={styles.farmSwitchSelect}
              value={selectedFarm?.farm_id || ''}
              onChange={handleFarmChange}
              aria-label="Select registered farm"
              title="Switch farm holding"
            >
              {farms.map((f) => (
                <option key={f.farm_id} value={f.farm_id}>
                  {f.farm_name} (Brgy. {f.barangay_name})
                </option>
              ))}
            </select>
          )}

          <button
            id="farmer-report-sick-animals-btn"
            type="button"
            className={styles.reportEmergencyBtn}
            onClick={() => setReportModalOpen(true)}
          >
            <Siren size={18} weight="fill" aria-hidden="true" />
            + Report Sick Animals
          </button>
        </div>
      </section>

      {/* ── Task 4.5: Localized Barangay Disease Advisory Card ───────────── */}
      {barangayOutbreaks.length > 0 ? (
        <div className={styles.advisoryAlert} role="alert">
          <ShieldAlert size={24} weight="duotone" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 className={styles.advisoryTitle}>
              Active Disease Advisory in Barangay {selectedFarm?.barangay_name}
            </h2>
            <p className={styles.advisoryDesc}>
              The City Veterinary Office is currently monitoring{' '}
              <strong>
                {barangayOutbreaks.map((o) => o.disease_name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}
              </strong>{' '}
              in <strong>Brgy. {selectedFarm?.barangay_name}</strong>. Strictly enforce footbaths, restrict visitor and livestock transport within the <strong>1km Quarantine / 7km Surveillance Zone</strong>, and immediately report any fever or mortality using the red button above.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.advisorySafe}>
          <CheckCircle2 size={22} weight="duotone" style={{ flexShrink: 0 }} />
          <div>
            <h2 className={styles.advisoryTitle}>
              No Active Disease Alerts in Barangay {selectedFarm?.barangay_name || 'Your Area'}
            </h2>
            <p className={styles.advisoryDesc}>
              Your barangay is currently clear of active livestock disease outbreaks. Continue routine disinfection and biosecurity protocols.
            </p>
          </div>
        </div>
      )}

      {/* ── Task 4.2: My Farm Dossier & Biosecurity Status Card ──────────── */}
      {selectedFarm && (
        <div className={styles.topGrid}>
          <Card>
            <Card.Header title="My Farm Dossier" />
            <Card.Body>
              <div className={styles.dossierGrid}>
                <div className={styles.dossierItem}>
                  <span className={styles.dossierLabel}>Farm Name</span>
                  <span className={styles.dossierValue}>{selectedFarm.farm_name}</span>
                </div>
                <div className={styles.dossierItem}>
                  <span className={styles.dossierLabel}>Barangay</span>
                  <span className={styles.dossierValue}>
                    <MapPin size={13} style={{ display: 'inline', marginRight: 4, color: 'var(--color-brand)' }} />
                    {selectedFarm.barangay_name}
                  </span>
                </div>
                <div className={styles.dossierItem}>
                  <span className={styles.dossierLabel}>Livestock Raised</span>
                  <span className={styles.dossierValue}>{selectedFarm.livestock_type_name || 'Livestock'}</span>
                </div>
                <div className={styles.dossierItem}>
                  <span className={styles.dossierLabel}>Registered Head Count</span>
                  <span className={styles.dossierValue}>{selectedFarm.head_count ?? 0} heads</span>
                </div>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header title="Biosecurity & Quarantine Status" />
            <Card.Body className={styles.bioStatusBox}>
              <div>
                <span className={`${styles.bioBadge} ${bioCls}`}>
                  <ShieldCheck size={16} weight="duotone" />
                  Biosecurity: {bioStatus}
                </span>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.6rem', lineHeight: 1.5 }}>
                  {latestCompliance?.notes
                    ? `Latest CVO Inspector Note: "${latestCompliance.notes}"`
                    : 'Regularly maintain perimeter fencing, footbaths, and visitor logbooks as required by the San Pablo City Veterinary Office.'}
                </p>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                Holding Status: <strong style={{ color: 'var(--color-text-primary)' }}>{selectedFarm.status || 'Active'}</strong>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* ── Task 4.4: My Reports Live Tracker (4-Step Timeline) ──────────── */}
      <Card>
        <Card.Header title={`My Submitted Disease Reports (${myReports.length})`} />
        <Card.Body>
          {myReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
              <ClipboardList size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
              <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                No disease reports submitted for {selectedFarm?.farm_name}
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                If you notice sick animals or unusual mortalities, click <strong>+ Report Sick Animals</strong> above to alert CVO inspectors immediately.
              </p>
            </div>
          ) : (
            <div className={styles.trackerList}>
              {myReports.map((report) => {
                // Match corresponding outbreak alert for this farm + disease
                const linkedAlert = outbreaks.find(
                  (o) =>
                    (o.report_id && o.report_id === report.report_id) ||
                    (o.farm_id === report.farm_id && o.disease_id === report.disease_id)
                );

                const isResolved     = report.status === 'Resolved' || linkedAlert?.status === 'Resolved' || linkedAlert?.lab_result === 'Negative';
                const hasBloodSample = Boolean(linkedAlert?.blood_sample_taken_date) || linkedAlert?.status === 'Acknowledged' || isResolved;
                const labResult      = linkedAlert?.lab_result || (isResolved ? 'Negative' : 'Pending');

                const dateStr = report.date_reported
                  ? new Date(report.date_reported).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })
                  : '—';

                return (
                  <div key={report.report_id} className={styles.trackerCard}>
                    <div className={styles.trackerHeader}>
                      <div>
                        <h3 className={styles.trackerDisease}>{report.disease_name}</h3>
                        <span className={styles.trackerMeta}>
                          Reported {dateStr} · <strong>{report.animals_affected ?? 0} sick</strong>
                          {Number(report.mortalities) > 0 ? ` · ${report.mortalities} dead` : ''}
                        </span>
                      </div>
                      <span
                        className={styles.bioBadge}
                        style={
                          isResolved
                            ? { background: 'hsl(145, 55%, 92%)', color: 'hsl(145, 65%, 24%)' }
                            : labResult === 'Positive'
                            ? { background: '#fef2f2', color: '#b91c1c' }
                            : { background: 'hsl(42, 95%, 90%)', color: 'hsl(35, 90%, 28%)' }
                        }
                      >
                        {isResolved
                          ? 'Cleared / Resolved'
                          : labResult === 'Positive'
                          ? 'Confirmed Positive (Quarantine)'
                          : hasBloodSample
                          ? 'Inspector Dispatched / Lab Testing'
                          : 'Received by CVO'}
                      </span>
                    </div>

                    {/* 4-Step Live Progress Stepper */}
                    <div className={styles.stepperGrid}>
                      {/* Step 1 */}
                      <div className={`${styles.stepBox} ${styles.stepDone}`}>
                        <span className={styles.stepNum}>Step 1</span>
                        <span className={styles.stepTitle}>Report Submitted</span>
                        <span className={styles.stepSub}>Received by CVO ({dateStr})</span>
                      </div>

                      {/* Step 2 */}
                      <div className={`${styles.stepBox} ${hasBloodSample ? styles.stepDone : styles.stepActive}`}>
                        <span className={styles.stepNum}>Step 2</span>
                        <span className={styles.stepTitle}>Blood Sampling</span>
                        <span className={styles.stepSub}>
                          {linkedAlert?.blood_sample_taken_date
                            ? `Sampled on ${linkedAlert.blood_sample_taken_date}`
                            : hasBloodSample
                            ? 'Inspector Acknowledged'
                            : 'Awaiting Inspector Dispatch'}
                        </span>
                      </div>

                      {/* Step 3 */}
                      <div
                        className={`${styles.stepBox} ${
                          labResult === 'Positive'
                            ? styles.stepAlert
                            : labResult === 'Negative'
                            ? styles.stepDone
                            : hasBloodSample
                            ? styles.stepActive
                            : ''
                        }`}
                      >
                        <span className={styles.stepNum}>Step 3</span>
                        <span className={styles.stepTitle}>
                          <Flask size={13} style={{ display: 'inline', marginRight: 3 }} />
                          Lab Result: {labResult}
                        </span>
                        <span className={styles.stepSub}>
                          {labResult === 'Positive'
                            ? '1km/7km Quarantine Active'
                            : labResult === 'Negative'
                            ? 'Negative — No Infection'
                            : 'Laboratory analysis in progress'}
                        </span>
                      </div>

                      {/* Step 4 */}
                      <div className={`${styles.stepBox} ${isResolved ? styles.stepDone : ''}`}>
                        <span className={styles.stepNum}>Step 4</span>
                        <span className={styles.stepTitle}>
                          {isResolved ? 'Resolved & Cleared' : 'Final Resolution'}
                        </span>
                        <span className={styles.stepSub}>
                          {isResolved
                            ? 'Alert lifted by City Veterinarian'
                            : 'Pending City Veterinarian clearance'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ── Task 4.3: Report Sick Animals Modal ──────────────────────────── */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={`Report Sick Animals — ${selectedFarm?.farm_name || 'My Farm'}`}
        size="lg"
      >
        <ReportForm
          prefilledFarmId={selectedFarm?.farm_id || ''}
          onSuccess={() => {
            setReportModalOpen(false);
            loadPortalData();
          }}
          onCancel={() => setReportModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
