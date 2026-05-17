import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bug,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  getPestControlLogById,
  createPestControlLog,
  updatePestControlLog,
  deletePestControlLog,
} from '../../services/pestControl';
import { getFarms } from '../../services/farms';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { Input, Select, Textarea } from '../../components/shared/FormElements';
import Modal from '../../components/shared/Modal';
import styles from './PestControlForm.module.css';

// ---------------------------------------------------------------------------
// PestControlForm — create & edit mode (mirrors FarmForm structure)
// ---------------------------------------------------------------------------
export default function PestControlForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  // Form state
  const [fields, setFields] = useState({
    farm_id: '',
    pest_type: '',
    treatment_applied: '',
    date_of_intervention: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Reference data
  const [farms, setFarms] = useState([]);

  // Page state
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [pageError, setPageError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Load farms + (if edit) existing log
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      const { data: farmsData } = await getFarms();
      setFarms(farmsData ?? []);

      if (isEdit) {
        const { data, error } = await getPestControlLogById(id);
        if (error) {
          setPageError(error.message);
        } else if (data) {
          setFields({
            farm_id:              data.farm_id             ?? '',
            pest_type:            data.pest_type           ?? '',
            treatment_applied:    data.treatment_applied   ?? '',
            date_of_intervention: data.date_of_intervention ?? new Date().toISOString().split('T')[0],
            notes:                data.notes               ?? '',
          });
        }
        setPageLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  // ---------------------------------------------------------------------------
  // Field change handler
  // ---------------------------------------------------------------------------
  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    const { error } = isEdit
      ? await updatePestControlLog(id, fields)
      : await createPestControlLog(fields);

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
      setTimeout(() => navigate('/pest-control'), 1200);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    setDeleting(true);
    const { error } = await deletePestControlLog(id);
    setDeleting(false);
    if (error) {
      setSubmitError(error.message);
      setShowDeleteModal(false);
    } else {
      navigate('/pest-control');
    }
  }

  // ---------------------------------------------------------------------------
  // Page-level loading / error
  // ---------------------------------------------------------------------------
  if (pageLoading) {
    return (
      <div className={styles.centeredPage}>
        <div className={styles.loadingPulse} aria-label="Loading log data…" />
        <p className={styles.loadingText}>Loading log data…</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className={styles.centeredPage}>
        <AlertCircle size={28} className={styles.pageErrorIcon} />
        <p className={styles.pageErrorText}>{pageError}</p>
        <Button variant="ghost" id="back-from-error-btn" onClick={() => navigate('/pest-control')}>
          <ArrowLeft size={14} /> Back to Logs
        </Button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.page}>
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <button
          id="back-btn"
          className={styles.backBtn}
          onClick={() => navigate('/pest-control')}
          aria-label="Back to Pest Control Logs"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Pest Control Logs
        </button>
        <div className={styles.headerMeta}>
          <div className={styles.headerIcon}>
            <Bug size={18} aria-hidden="true" />
          </div>
          <div>
            <h1 className={styles.pageTitle}>
              {isEdit ? 'Edit Pest Control Log' : 'New Pest Control Log'}
            </h1>
            <p className={styles.pageSubtitle}>
              {isEdit
                ? 'Update the details of this pest control intervention.'
                : 'Record a new pest intervention for a farm.'}
            </p>
          </div>
        </div>
      </header>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <form
        id="pest-control-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label={isEdit ? 'Edit pest control log form' : 'New pest control log form'}
      >
        {/* Global success / error banners */}
        {submitSuccess && (
          <div className={styles.successBanner} role="alert">
            <CheckCircle2 size={16} aria-hidden="true" />
            {isEdit ? 'Log updated successfully!' : 'Log recorded successfully!'} Redirecting…
          </div>
        )}
        {submitError && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {submitError}
          </div>
        )}

        <div className={styles.formGrid}>
          {/* ── Column 1: Incident Details ─────────────────────────────── */}
          <Card className={styles.formCard}>
            <Card.Header title="Incident Details" />
            <Card.Body className={styles.cardBody}>
              <Select
                id="farm_id"
                name="farm_id"
                label="Farm"
                required
                value={fields.farm_id}
                onChange={handleChange}
              >
                <option value="">— Select a farm —</option>
                {farms.map(f => (
                  <option key={f.farm_id} value={f.farm_id}>
                    {f.farm_name} — {f.owner_name}
                  </option>
                ))}
              </Select>

              <Input
                id="pest_type"
                name="pest_type"
                label="Pest Type"
                required
                placeholder="e.g. Ticks, Fall Armyworm, Mites"
                value={fields.pest_type}
                onChange={handleChange}
                maxLength={100}
              />

              <Input
                id="date_of_intervention"
                name="date_of_intervention"
                label="Date of Intervention"
                type="date"
                required
                value={fields.date_of_intervention}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
              />
            </Card.Body>
          </Card>

          {/* ── Column 2: Treatment Details ────────────────────────────── */}
          <Card className={styles.formCard}>
            <Card.Header title="Treatment Details" />
            <Card.Body className={styles.cardBody}>
              <Input
                id="treatment_applied"
                name="treatment_applied"
                label="Treatment Applied"
                required
                placeholder="e.g. Cypermethrin spray, Ivermectin injection"
                value={fields.treatment_applied}
                onChange={handleChange}
                maxLength={200}
              />

              <Textarea
                id="notes"
                name="notes"
                label="Additional Notes"
                placeholder="Observations, dosage details, follow-up instructions…"
                value={fields.notes}
                onChange={handleChange}
                rows={5}
              />
            </Card.Body>
          </Card>
        </div>

        {/* ── Footer Actions ─────────────────────────────────────────── */}
        <div className={styles.formFooter}>
          {isEdit && (
            <Button
              id="delete-log-btn"
              type="button"
              variant="danger"
              size="md"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete Log
            </Button>
          )}
          <div className={styles.footerRight}>
            <Button
              id="cancel-btn"
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate('/pest-control')}
            >
              Cancel
            </Button>
            <Button
              id="submit-log-btn"
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={submitSuccess}
            >
              <Save size={15} aria-hidden="true" />
              {isEdit ? 'Save Changes' : 'Record Log'}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Delete confirmation modal ──────────────────────────────────── */}
      <Modal
        id="delete-confirm-modal"
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Pest Control Log"
      >
        <p className={styles.modalBody}>
          Are you sure you want to delete this log for <strong>{fields.pest_type}</strong>?
          This action cannot be undone.
        </p>
        <div className={styles.modalFooter}>
          <Button
            id="cancel-delete-btn"
            variant="ghost"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            id="confirm-delete-btn"
            variant="danger"
            loading={deleting}
            onClick={handleDelete}
          >
            <Trash2 size={14} /> Yes, Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
