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
// Form initial state
// ---------------------------------------------------------------------------
const INITIAL_FORM = {
  farm_id:          '',
  disease_id:       '',
  animals_affected: 0,
  mortalities:      0,
  severity:         'Severe',
  date_reported:    new Date().toISOString().slice(0, 10),
  additional_notes: '',
  status:           'Active',
};

const INITIAL_ERRORS = {
  farm_id:          '',
  disease_id:       '',
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

  const selectedFarm = farms.find(f => f.farm_id === form.farm_id) ?? null;

  const filteredDiseases = useMemo(() => {
    if (!selectedFarm) return diseases;
    if (selectedFarm.livestock_type_id === 3) return diseases; // Farm raises 'Both', show all
    return diseases.filter(d => 
      d.livestock_type_id === selectedFarm.livestock_type_id || d.livestock_type_id === 3
    );
  }, [diseases, selectedFarm]);

  // ── Handle field changes ────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    if (apiError) setApiError('');

    setForm(prev => {
      const next = { ...prev, [name]: value };

      // Real-time: animals_affected cannot exceed farm head count
      if (name === 'animals_affected') {
        const affected = value !== '' ? Number(value) : null;
        if (affected !== null && selectedFarm && affected > selectedFarm.head_count) {
          setErrors(e => ({ ...e, animals_affected: `Cannot exceed the farm's total head count (${selectedFarm.head_count}).` }));
        } else {
          setErrors(e => ({ ...e, animals_affected: '' }));
        }
      }

      // Real-time cross-field: mortalities must not exceed animals_affected
      if (name === 'mortalities' || name === 'animals_affected') {
        const affected   = next.animals_affected !== '' ? Number(next.animals_affected) : null;
        const deaths     = next.mortalities      !== '' ? Number(next.mortalities)      : null;
        const bothFilled = affected !== null && deaths !== null;

        if (bothFilled && deaths > affected) {
          setErrors(e => ({ ...e, mortalities: 'Mortalities cannot exceed the number of animals affected.' }));
        } else {
          setErrors(e => ({ ...e, mortalities: '', ...(name === 'animals_affected' ? {} : {}) }));
        }
      } else if (name !== 'animals_affected') {
        setErrors(e => ({ ...e, [name]: '' }));
      }

      // Smart Filtering: if farm changes, clear disease if the new farm's livestock type is incompatible
      if (name === 'farm_id') {
        const newFarm = farms.find(f => f.farm_id === value);
        if (newFarm && prev.disease_id) {
          const currentDisease = diseases.find(d => d.disease_id === prev.disease_id);
          if (
            currentDisease &&
            newFarm.livestock_type_id !== 3 && // If farm is not 'Both'
            currentDisease.livestock_type_id !== 3 && // If disease is not 'Both'
            currentDisease.livestock_type_id !== newFarm.livestock_type_id
          ) {
            next.disease_id = ''; // Clear incompatible disease
          }
        }
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
    const payload = {
      ...form,
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
        label="Suspected Disease"
        required
        value={form.disease_id}
        onChange={handleChange}
        error={errors.disease_id}
        disabled={loading || submit}
      >
        <option value="" disabled>
          {loading ? 'Loading diseases…' : 'Select a suspected disease'}
        </option>
        {filteredDiseases.map(d => (
          <option key={d.disease_id} value={d.disease_id}>
            {d.disease_name}
          </option>
        ))}
      </Select>

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
