import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, FileText, ClipboardList, Activity } from 'lucide-react';
import { Input, Select } from '../shared/FormElements';
import Button from '../shared/Button';
import { getFarms } from '../../services/farms';
import { getDiseases } from '../../services/diseases';
import { createReport } from '../../services/reports';
import { useAuth } from '../../context/AuthContext';
import styles from './ReportForm.module.css';

// ---------------------------------------------------------------------------
// Severity matrix — mirrors the DB trigger trg_calculate_report_severity()
// Morbidity % = (animals_affected / head_count) * 100
// Mortality % = (mortalities      / head_count) * 100
// ---------------------------------------------------------------------------
const SEVERITY_META = {
  Critical: { color: 'var(--color-danger)',           bg: 'hsl(4, 74%, 94%)' },
  Severe:   { color: 'hsl(25, 95%, 53%)',             bg: 'hsl(25, 90%, 92%)' },
  Moderate: { color: 'hsl(38, 80%, 38%)',             bg: 'hsl(48, 90%, 92%)' },
  Mild:     { color: 'var(--color-success)',           bg: 'hsl(145, 55%, 92%)' },
};

function calculateSeverity(animalsAffected, mortalities, headCount) {
  // Guard: need a farm selected and a non-empty animals_affected value
  if (!headCount || headCount === 0) return null;
  if (animalsAffected === '' || animalsAffected === null || animalsAffected === undefined) return null;

  const affected = Number(animalsAffected);
  const deaths   = mortalities === '' || mortalities === null ? 0 : Number(mortalities);

  if (isNaN(affected) || affected < 0) return null;
  if (isNaN(deaths)   || deaths   < 0) return null;

  const morbidity = (affected / headCount) * 100;
  const mortality  = (deaths   / headCount) * 100;

  let level;
  if (mortality > 20 || morbidity > 60)        level = 'Critical';
  else if (mortality >= 6 || morbidity >= 30)  level = 'Severe';
  else if (mortality >= 1 || morbidity >= 10)  level = 'Moderate';
  else                                          level = 'Mild';

  return { level, morbidity: morbidity.toFixed(1), mortality: mortality.toFixed(1) };
}


// ---------------------------------------------------------------------------
// Read-only severity display panel
// ---------------------------------------------------------------------------
function SeverityDisplay({ result }) {
  if (!result) {
    return (
      <div className={styles.severityPending}>
        <Activity size={14} aria-hidden="true" className={styles.severityPendingIcon} />
        <span>Severity calculated automatically after entering affected animals &amp; farm</span>
      </div>
    );
  }

  const meta = SEVERITY_META[result.level];
  return (
    <div
      className={styles.severityResult}
      style={{ background: meta.bg, borderColor: `${meta.color}40` }}
      role="status"
      aria-live="polite"
    >
      {/* Badge */}
      <div className={styles.severityBadge} style={{ color: meta.color }}>
        <span className={styles.severityDot} style={{ background: meta.color }} aria-hidden="true" />
        {result.level}
      </div>

      {/* Calculated percentages */}
      <div className={styles.severityStats}>
        <span className={styles.severityStat}>
          <strong>Morbidity:</strong> {result.morbidity}%
        </span>
        <span className={styles.severityStatDivider} aria-hidden="true">·</span>
        <span className={styles.severityStat}>
          <strong>Mortality:</strong> {result.mortality}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form initial state
// ---------------------------------------------------------------------------
const INITIAL_FORM = {
  farm_id:          '',
  disease_id:       '',
  animals_affected: '',
  mortalities:      '',
  date_reported:    new Date().toISOString().slice(0, 10),
  additional_notes: '',
  status:           'Active',
};

const INITIAL_ERRORS = {
  farm_id:          '',
  disease_id:       '',
  animals_affected: '',
  mortalities:      '',
  date_reported:    '',
};

// ---------------------------------------------------------------------------
// ReportForm
//
// @param {function} onSuccess  - called with the created report after success
// @param {function} onCancel   - called when the user dismisses the form
// ---------------------------------------------------------------------------
export default function ReportForm({ onSuccess, onCancel }) {
  const { user } = useAuth();

  const [form,     setForm]     = useState(INITIAL_FORM);
  const [errors,   setErrors]   = useState(INITIAL_ERRORS);
  const [farms,    setFarms]    = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [submit,   setSubmit]   = useState(false);
  const [apiError, setApiError] = useState('');

  // ── Load dropdown data ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadDropdowns() {
      setLoading(true);
      const [farmsRes, diseasesRes] = await Promise.all([
        getFarms(),
        getDiseases(),
      ]);
      if (farmsRes.data)    setFarms(farmsRes.data);
      if (diseasesRes.data) setDiseases(diseasesRes.data);
      setLoading(false);
    }
    loadDropdowns();
  }, []);

  // ── Auto-calculate severity from inputs ──────────────────────────────────
  // Use primitive head_count so useMemo re-runs reliably on value changes
  const selectedFarm   = farms.find(f => f.farm_id === form.farm_id) ?? null;
  const headCount      = selectedFarm?.head_count ?? 0;
  const severityResult = useMemo(
    () => calculateSeverity(form.animals_affected, form.mortalities, headCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.animals_affected, form.mortalities, headCount],
  );

  // ── Handle field changes ────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    if (apiError) setApiError('');

    setForm(prev => {
      const next = { ...prev, [name]: value };

      // Real-time cross-field: mortalities must not exceed animals_affected
      if (name === 'mortalities' || name === 'animals_affected') {
        const affected   = next.animals_affected !== '' ? Number(next.animals_affected) : null;
        const deaths     = next.mortalities      !== '' ? Number(next.mortalities)      : null;
        const bothFilled = affected !== null && deaths !== null;

        if (bothFilled && deaths > affected) {
          setErrors(e => ({ ...e, mortalities: 'Mortalities cannot exceed the number of animals affected.' }));
        } else {
          setErrors(e => ({ ...e, mortalities: '', animals_affected: name === 'animals_affected' ? '' : e.animals_affected }));
        }
      } else {
        setErrors(e => ({ ...e, [name]: '' }));
      }

      return next;
    });
  }

  // ── Validate ─────────────────────────────────────────────────────────────
  function validate() {
    const newErrors = { ...INITIAL_ERRORS };
    let valid = true;

    if (!form.farm_id) {
      newErrors.farm_id = 'Please select a farm.';
      valid = false;
    }
    if (!form.disease_id) {
      newErrors.disease_id = 'Please select a disease.';
      valid = false;
    }

    // animals_affected
    if (!form.animals_affected || Number(form.animals_affected) < 0) {
      newErrors.animals_affected = 'Please provide a valid number of animals affected.';
      valid = false;
    } else if (selectedFarm && Number(form.animals_affected) > selectedFarm.head_count) {
      newErrors.animals_affected = `Cannot exceed the farm's total head count (${selectedFarm.head_count}).`;
      valid = false;
    }

    // mortalities — cannot exceed animals_affected
    if (form.mortalities !== '' && Number(form.mortalities) < 0) {
      newErrors.mortalities = 'Mortalities cannot be a negative number.';
      valid = false;
    } else if (
      form.animals_affected !== '' &&
      form.mortalities !== '' &&
      Number(form.mortalities) > Number(form.animals_affected)
    ) {
      newErrors.mortalities = 'Mortalities cannot exceed the number of animals affected.';
      valid = false;
    }

    if (!form.date_reported) {
      newErrors.date_reported = 'Please provide the date this was reported.';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmit(true);
    setApiError('');

    // Severity is determined server-side by the DB trigger.
    // We pass a placeholder so the NOT NULL constraint is satisfied
    // in the rare case the trigger does not fire (edge case guard).
    const payload = {
      ...form,
      mortalities: form.mortalities === '' ? 0 : Number(form.mortalities),
      severity: severityResult?.level ?? 'Mild',
    };

    const { data, error } = await createReport(payload);

    if (error) {
      setApiError(error.message ?? 'Failed to submit the report. Please try again.');
      setSubmit(false);
      return;
    }

    onSuccess?.(data);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      id="report-form"
      onSubmit={handleSubmit}
      noValidate
      className={styles.form}
      aria-label="New Disease Report"
    >
      {/* ── Section: Incident Details ─────────────────────────────────────── */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <ClipboardList size={16} aria-hidden="true" />
        </span>
        <span className={styles.sectionLabel}>Incident Details</span>
      </div>

      {/* Farm select */}
      <Select
        id="report-farm"
        name="farm_id"
        label="Farm"
        required
        value={form.farm_id}
        onChange={handleChange}
        error={errors.farm_id}
        disabled={loading || submit}
      >
        <option value="" disabled>
          {loading ? 'Loading farms…' : 'Select a farm'}
        </option>
        {farms.map(f => (
          <option key={f.farm_id} value={f.farm_id}>
            {f.farm_name} — {f.barangay_name}
          </option>
        ))}
      </Select>

      {/* Disease select */}
      <Select
        id="report-disease"
        name="disease_id"
        label="Disease"
        required
        value={form.disease_id}
        onChange={handleChange}
        error={errors.disease_id}
        disabled={loading || submit}
      >
        <option value="" disabled>
          {loading ? 'Loading diseases…' : 'Select a disease'}
        </option>
        {diseases.map(d => (
          <option key={d.disease_id} value={d.disease_id}>
            {d.disease_name}
          </option>
        ))}
      </Select>

      {/* Animals affected */}
      <Input
        id="report-animals"
        name="animals_affected"
        type="number"
        min="0"
        label="Animals Affected"
        required
        value={form.animals_affected}
        onChange={handleChange}
        error={errors.animals_affected}
        disabled={submit}
        placeholder="E.g., 10"
      />

      {/* Mortalities (deaths) */}
      <Input
        id="report-mortalities"
        name="mortalities"
        type="number"
        min="0"
        label="Mortalities (Deaths)"
        value={form.mortalities}
        onChange={handleChange}
        error={errors.mortalities}
        disabled={submit}
        placeholder="E.g., 2  (0 if none)"
      />

      {/* Auto-calculated severity display */}
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel}>
          Severity
          <span className={styles.autoTag} aria-label="Auto-calculated">Auto</span>
        </label>
        <SeverityDisplay result={severityResult} />
      </div>

      {/* Date reported */}
      <Input
        id="report-date"
        name="date_reported"
        type="date"
        label="Date Reported"
        required
        value={form.date_reported}
        onChange={handleChange}
        error={errors.date_reported}
        disabled={submit}
        max={new Date().toISOString().slice(0, 10)}
      />

      {/* ── Section: Additional Notes ─────────────────────────────────────── */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <FileText size={16} aria-hidden="true" />
        </span>
        <span className={styles.sectionLabel}>Additional Notes</span>
      </div>

      <div className={styles.fieldBlock}>
        <label htmlFor="report-notes" className={styles.fieldLabel}>
          Observations &amp; Notes
        </label>
        <textarea
          id="report-notes"
          name="additional_notes"
          className={styles.textarea}
          rows={4}
          placeholder="Describe symptoms, affected animals, treatments given…"
          value={form.additional_notes}
          onChange={handleChange}
          disabled={submit}
        />
      </div>

      {/* API-level error */}
      {apiError && (
        <div className={styles.apiError} role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          id="report-cancel-btn"
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submit}
        >
          Cancel
        </Button>
        <Button
          id="report-submit-btn"
          type="submit"
          variant="primary"
          loading={submit}
        >
          Submit Report
        </Button>
      </div>
    </form>
  );
}
