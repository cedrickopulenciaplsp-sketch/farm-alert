import { useState, useEffect } from 'react';
import { AlertTriangle, FileText, ClipboardList } from 'lucide-react';
import { Input, Select } from '../shared/FormElements';
import Button from '../shared/Button';
import { getFarms } from '../../services/farms';
import { getDiseases } from '../../services/diseases';
import { createReport } from '../../services/reports';
import { useAuth } from '../../context/AuthContext';
import styles from './ReportForm.module.css';

// ---------------------------------------------------------------------------
// Severity options with associated visual metadata
// ---------------------------------------------------------------------------
const SEVERITY_OPTIONS = [
  { value: 'Mild',      label: 'Mild',      color: 'var(--color-success)' },
  { value: 'Moderate',  label: 'Moderate',  color: 'hsl(38, 92%, 50%)' },
  { value: 'Severe',    label: 'Severe',    color: 'hsl(25, 95%, 53%)' },
  { value: 'Critical',  label: 'Critical',  color: 'var(--color-danger)' },
];

const INITIAL_FORM = {
  farm_id:          '',
  disease_id:       '',
  severity:         '',
  animals_affected: '',
  date_reported:    new Date().toISOString().slice(0, 10), // today
  additional_notes: '',
  status:           'Active',
};

const INITIAL_ERRORS = {
  farm_id:          '',
  disease_id:       '',
  severity:         '',
  animals_affected: '',
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

  const [form,    setForm]    = useState(INITIAL_FORM);
  const [errors,  setErrors]  = useState(INITIAL_ERRORS);
  const [farms,   setFarms]   = useState([]);
  const [diseases,setDiseases]= useState([]);
  const [loading, setLoading] = useState(false);
  const [submit,  setSubmit]  = useState(false);
  const [apiError,setApiError]= useState('');

  // ── Load dropdown data ──────────────────────────────────────────────────
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

  // ── Handle field changes ─────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError)     setApiError('');
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
    if (!form.severity) {
      newErrors.severity = 'Please select a severity level.';
      valid = false;
    }
    
    // Validate animals_affected
    const selectedFarm = farms.find(f => f.farm_id === form.farm_id);
    if (!form.animals_affected || Number(form.animals_affected) < 0) {
      newErrors.animals_affected = 'Please provide a valid number of animals affected.';
      valid = false;
    } else if (selectedFarm && Number(form.animals_affected) > selectedFarm.head_count) {
      newErrors.animals_affected = `Cannot exceed the farm's total head count (${selectedFarm.head_count}).`;
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

    const payload = { ...form };

    const { data, error } = await createReport(payload);

    if (error) {
      setApiError(error.message ?? 'Failed to submit the report. Please try again.');
      setSubmit(false);
      return;
    }

    onSuccess?.(data);
  }

  // ── Severity pill selector ────────────────────────────────────────────────
  function SeverityPills() {
    return (
      <div className={styles.severityGroup}>
        {SEVERITY_OPTIONS.map(opt => {
          const active = form.severity === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              id={`severity-${opt.value.toLowerCase()}`}
              className={`${styles.severityPill} ${active ? styles.severityActive : ''}`}
              style={active ? { borderColor: opt.color, color: opt.color, background: `${opt.color}18` } : {}}
              onClick={() => {
                setForm(prev => ({ ...prev, severity: opt.value }));
                if (errors.severity) setErrors(prev => ({ ...prev, severity: '' }));
              }}
              aria-pressed={active}
            >
              <span
                className={styles.severityDot}
                style={{ background: opt.color }}
                aria-hidden="true"
              />
              {opt.label}
            </button>
          );
        })}
      </div>
    );
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
      {/* Section header */}
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

      {/* Severity pill selector */}
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel}>
          Severity <span className={styles.required} aria-hidden="true">*</span>
        </label>
        <SeverityPills />
        {errors.severity && (
          <span role="alert" className={styles.fieldError}>
            {errors.severity}
          </span>
        )}
      </div>

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

      {/* Section header — additional notes */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <FileText size={16} aria-hidden="true" />
        </span>
        <span className={styles.sectionLabel}>Additional Notes</span>
      </div>

      {/* Additional notes textarea */}
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
