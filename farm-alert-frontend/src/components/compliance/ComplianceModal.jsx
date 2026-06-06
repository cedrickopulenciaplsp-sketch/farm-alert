import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Input, Select, Textarea } from '../shared/FormElements';
import Button from '../shared/Button';
import { getFarms } from '../../services/farms';
import {
  createComplianceLog,
  updateComplianceLog,
} from '../../services/compliance';
import styles from './ComplianceModal.module.css';

// ---------------------------------------------------------------------------
// Status options with pill-style visual metadata
// ---------------------------------------------------------------------------
const STATUS_OPTIONS = [
  { value: 'Compliant',       label: 'Compliant',       color: 'var(--color-success)' },
  { value: 'Semi-Compliant',  label: 'Semi-Compliant',  color: 'hsl(38, 92%, 50%)' },
  { value: 'Non-Compliant',   label: 'Non-Compliant',   color: 'var(--color-danger)' },
];

const INITIAL_FORM = {
  farm_id:           '',
  compliance_status: '',
  evaluation_date:   new Date().toISOString().slice(0, 10),
  notes:             '',
};

const INITIAL_ERRORS = {
  farm_id:           '',
  compliance_status: '',
  evaluation_date:   '',
};

// ---------------------------------------------------------------------------
// ComplianceModal
//
// @param {function} onSuccess  - called after successful create/update
// @param {function} onCancel   - called when user dismisses the form
// @param {object}   [existing] - if provided, we're editing this record
// @param {string}   [farmId]   - pre-select a farm (e.g. from FarmProfile)
// ---------------------------------------------------------------------------
export default function ComplianceModal({ onSuccess, onCancel, existing = null, farmId = null }) {
  const isEdit = !!existing;

  const [form, setForm]       = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState(INITIAL_ERRORS);
  const [farms, setFarms]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [submit, setSubmit]   = useState(false);
  const [apiError, setApiError] = useState('');

  // ── Load dropdown data + prefill ────────────────────────────────────────
  useEffect(() => {
    async function loadDropdowns() {
      setLoading(true);
      const { data } = await getFarms();
      if (data) setFarms(data);
      setLoading(false);
    }
    loadDropdowns();

    // Prefill for edit mode
    if (existing) {
      setForm({
        farm_id:           existing.farm_id           ?? '',
        compliance_status: existing.compliance_status  ?? '',
        evaluation_date:   existing.evaluation_date    ?? new Date().toISOString().slice(0, 10),
        notes:             existing.notes              ?? '',
      });
    } else if (farmId) {
      setForm(prev => ({ ...prev, farm_id: farmId }));
    }
  }, [existing, farmId]);

  // ── Handle field changes ────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError)     setApiError('');
  }

  // ── Validate ────────────────────────────────────────────────────────────
  function validate() {
    const newErrors = { ...INITIAL_ERRORS };
    let valid = true;

    if (!form.farm_id) {
      newErrors.farm_id = 'Please select a farm.';
      valid = false;
    }
    if (!form.compliance_status) {
      newErrors.compliance_status = 'Please select a compliance status.';
      valid = false;
    }
    if (!form.evaluation_date) {
      newErrors.evaluation_date = 'Please provide the evaluation date.';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmit(true);
    setApiError('');

    const payload = { ...form };

    const { data, error } = isEdit
      ? await updateComplianceLog(existing.log_id, payload)
      : await createComplianceLog(payload);

    if (error) {
      setApiError(error.message ?? 'Failed to save. Please try again.');
      setSubmit(false);
      return;
    }

    onSuccess?.(data);
  }

  // ── Status pill selector ────────────────────────────────────────────────
  function StatusPills() {
    return (
      <div className={styles.statusGroup}>
        {STATUS_OPTIONS.map(opt => {
          const active = form.compliance_status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              id={`status-${opt.value.toLowerCase().replace('-', '')}`}
              className={`${styles.statusPill} ${active ? styles.statusActive : ''}`}
              style={active ? { borderColor: opt.color, color: opt.color, background: `${opt.color}18` } : {}}
              onClick={() => {
                setForm(prev => ({ ...prev, compliance_status: opt.value }));
                if (errors.compliance_status) setErrors(prev => ({ ...prev, compliance_status: '' }));
              }}
              aria-pressed={active}
            >
              <span
                className={styles.statusDot}
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

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <form
      id="compliance-form"
      onSubmit={handleSubmit}
      noValidate
      className={styles.form}
      aria-label={isEdit ? 'Edit Compliance Record' : 'New Compliance Record'}
    >
      {/* Section header */}
      <div className={styles.sectionHeader}>
        <span className={styles.sectionIcon}>
          <ShieldCheck size={16} aria-hidden="true" />
        </span>
        <span className={styles.sectionLabel}>Evaluation Details</span>
      </div>

      {/* Farm select */}
      <Select
        id="compliance-farm"
        name="farm_id"
        label="Farm"
        required
        value={form.farm_id}
        onChange={handleChange}
        error={errors.farm_id}
        disabled={loading || submit || !!farmId}
      >
        <option value="" disabled>
          {loading ? 'Loading farms…' : 'Select a farm'}
        </option>
        {farms.map(f => (
          <option key={f.farm_id} value={f.farm_id}>
            {f.farm_name} — {f.owner_name}
          </option>
        ))}
      </Select>

      {/* Status pill selector */}
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel}>
          Compliance Status <span className={styles.required} aria-hidden="true">*</span>
        </label>
        <StatusPills />
        {errors.compliance_status && (
          <span role="alert" className={styles.fieldError}>
            {errors.compliance_status}
          </span>
        )}
      </div>

      {/* Evaluation date */}
      <Input
        id="compliance-date"
        name="evaluation_date"
        type="date"
        label="Evaluation Date"
        required
        value={form.evaluation_date}
        onChange={handleChange}
        error={errors.evaluation_date}
        disabled={submit}
        max={new Date().toISOString().slice(0, 10)}
      />

      {/* Notes */}
      <Textarea
        id="compliance-notes"
        name="notes"
        label="Notes"
        placeholder="Observations, recommendations, follow-up actions…"
        value={form.notes}
        onChange={handleChange}
        disabled={submit}
        rows={3}
      />

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
          id="compliance-cancel-btn"
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submit}
        >
          Cancel
        </Button>
        <Button
          id="compliance-submit-btn"
          type="submit"
          variant="primary"
          loading={submit}
        >
          {isEdit ? 'Save Changes' : 'Record Evaluation'}
        </Button>
      </div>
    </form>
  );
}
