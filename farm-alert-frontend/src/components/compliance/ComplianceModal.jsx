import { useState, useEffect } from 'react';
import { Warning as AlertTriangle, CheckCircle as CheckCircle2, ShieldCheck } from '@phosphor-icons/react';
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
  { value: 'Non-Compliant',   label: 'Non-Compliant',   color: 'var(--color-danger)' },
];

const INITIAL_FORM = {
  farm_id:                      '',
  passed_physical_inspection:   false,
  passed_documentation:         false,
  compliance_status:            'Non-Compliant',
  evaluation_date:              new Date().toISOString().slice(0, 10),
  notes:                        '',
};

const INITIAL_ERRORS = {
  farm_id:           '',
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
      const physical = existing.passed_physical_inspection ?? false;
      const docs     = existing.passed_documentation ?? false;
      setForm({
        farm_id:                      existing.farm_id           ?? '',
        passed_physical_inspection:   physical,
        passed_documentation:         docs,
        compliance_status:            (physical && docs) ? 'Compliant' : 'Non-Compliant',
        evaluation_date:              existing.evaluation_date   ?? new Date().toISOString().slice(0, 10),
        notes:                        existing.notes             ?? '',
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
    if (!form.evaluation_date) {
      newErrors.evaluation_date = 'Please provide the inspection date.';
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

  // ── Two-pronged compliance evaluation ─────────────────────────────────
  function handleCheckboxChange(field) {
    setForm(prev => {
      const next = { ...prev, [field]: !prev[field] };
      // Auto-compute compliance status
      next.compliance_status = (next.passed_physical_inspection && next.passed_documentation)
        ? 'Compliant'
        : 'Non-Compliant';
      return next;
    });
  }

  const computedStatus = form.passed_physical_inspection && form.passed_documentation
    ? 'Compliant' : 'Non-Compliant';
  const statusColor = computedStatus === 'Compliant' ? 'var(--color-success)' : 'var(--color-danger)';

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
        <span className={styles.sectionLabel}>Inspection Details</span>
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

      {/* Two-pronged evaluation checkboxes */}
      <div className={styles.fieldBlock}>
        <label className={styles.fieldLabel}>
          Inspection Criteria <span className={styles.required} aria-hidden="true">*</span>
        </label>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.passed_physical_inspection}
              onChange={() => handleCheckboxChange('passed_physical_inspection')}
              disabled={submit}
            />
            <span>Physical Inspection Passed</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.passed_documentation}
              onChange={() => handleCheckboxChange('passed_documentation')}
              disabled={submit}
            />
            <span>Documentation Complete</span>
          </label>
        </div>
        <div className={styles.computedStatus}>
          <span
            className={styles.statusDot}
            style={{ background: statusColor }}
            aria-hidden="true"
          />
          <span style={{ color: statusColor, fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {computedStatus}
          </span>
        </div>
      </div>

      {/* Evaluation date */}
      <Input
        id="compliance-date"
        name="evaluation_date"
        type="date"
        label="Inspection Date"
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
          {isEdit ? 'Save Changes' : 'Record Inspection'}
        </Button>
      </div>
    </form>
  );
}
