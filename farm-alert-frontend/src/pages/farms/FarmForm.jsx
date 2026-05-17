import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Tractor,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  getFarmById,
  createFarm,
  updateFarm,
  deleteFarm,
  getBarangays,
  getLivestockTypes,
} from '../../services/farms';
import { getPestControlLogs } from '../../services/pestControl';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { Input, Select } from '../../components/shared/FormElements';
import Modal from '../../components/shared/Modal';
import LocationPicker from '../../components/shared/LocationPicker';
import styles from './FarmForm.module.css';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const PH_PHONE_RE = /^(09|\+639)\d{9}$/;

function validate(fields) {
  const errors = {};

  if (!fields.farm_name.trim())
    errors.farm_name = 'Farm name is required.';
  else if (fields.farm_name.trim().length < 3)
    errors.farm_name = 'Farm name must be at least 3 characters.';

  if (!fields.owner_name.trim())
    errors.owner_name = 'Owner name is required.';

  if (!fields.barangay_id)
    errors.barangay_id = 'Please select a barangay.';

  if (!fields.livestock_type_id)
    errors.livestock_type_id = 'Please select a livestock type.';

  const count = Number(fields.head_count);
  if (fields.head_count === '' || isNaN(count))
    errors.head_count = 'Head count is required.';
  else if (!Number.isInteger(count) || count < 0)
    errors.head_count = 'Head count must be a whole number (0 or more).';

  if (fields.contact_number && !PH_PHONE_RE.test(fields.contact_number.trim()))
    errors.contact_number = 'Enter a valid PH number (e.g. 09171234567).';

  if (fields.latitude && (isNaN(Number(fields.latitude)) ||
      Number(fields.latitude) < -90 || Number(fields.latitude) > 90))
    errors.latitude = 'Latitude must be between –90 and 90.';

  if (fields.longitude && (isNaN(Number(fields.longitude)) ||
      Number(fields.longitude) < -180 || Number(fields.longitude) > 180))
    errors.longitude = 'Longitude must be between –180 and 180.';

  return errors;
}

// ---------------------------------------------------------------------------
// Initial form state factory
// ---------------------------------------------------------------------------
function blankForm() {
  return {
    farm_name:         '',
    owner_name:        '',
    barangay_id:       '',
    livestock_type_id: '',
    head_count:        '',
    contact_number:    '',
    latitude:          '',
    longitude:         '',
    status:            'Active',
  };
}

// ---------------------------------------------------------------------------
// FarmForm — create & edit mode
// ---------------------------------------------------------------------------
export default function FarmForm() {
  const navigate  = useNavigate();
  const { id }    = useParams();   // undefined when creating
  const isEdit    = !!id;

  // Form state
  const [fields, setFields]         = useState(blankForm());
  const [errors, setErrors]         = useState({});
  const [touched, setTouched]       = useState({});

  // Reference data
  const [barangays, setBarangays]           = useState([]);
  const [livestockTypes, setLivestockTypes] = useState([]);
  const [pestLogs, setPestLogs]             = useState([]);

  // Page state
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [pageError, setPageError]     = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting]               = useState(false);

  // ---------------------------------------------------------------------------
  // Load reference data + (if edit) existing farm data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      // Always load dropdowns
      const [bRes, ltRes] = await Promise.all([getBarangays(), getLivestockTypes()]);
      if (!bRes.error)  setBarangays(bRes.data ?? []);
      if (!ltRes.error) setLivestockTypes(ltRes.data ?? []);

      // If editing, also fetch farm data
      if (isEdit) {
        const { data, error } = await getFarmById(id);
        if (error) {
          setPageError(error.message);
        } else if (data) {
          setFields({
            farm_name:         data.farm_name         ?? '',
            owner_name:        data.owner_name        ?? '',
            barangay_id:       String(data.barangay_id ?? ''),
            livestock_type_id: String(data.livestock_type_id ?? ''),
            head_count:        data.head_count != null ? String(data.head_count) : '',
            contact_number:    data.contact_number    ?? '',
            latitude:          data.latitude  != null ? String(data.latitude)  : '',
            longitude:         data.longitude != null ? String(data.longitude) : '',
            status:            data.status            ?? 'Active',
          });
        }
        
        const { data: logsData } = await getPestControlLogs({ farmId: id });
        if (logsData) setPestLogs(logsData);
        
        setPageLoading(false);
      }
    }
    load();
  }, [id, isEdit]);

  // ---------------------------------------------------------------------------
  // Field change handler — clears the touched+error for that field on change
  // ---------------------------------------------------------------------------
  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    // Re-validate just this field on change if already touched
    if (touched[name]) {
      const newErrors = validate({ ...fields, [name]: value });
      setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
    }
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const newErrors = validate({ ...fields, [name]: e.target.value });
    setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    // Mark all fields as touched and validate all
    const allTouched = Object.fromEntries(Object.keys(fields).map(k => [k, true]));
    setTouched(allTouched);
    const allErrors = validate(fields);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) return;

    setLoading(true);
    setSubmitError(null);

    // Build payload — strip empty optional strings; cast numerics
    const payload = {
      farm_name:         fields.farm_name.trim(),
      owner_name:        fields.owner_name.trim(),
      barangay_id:       Number(fields.barangay_id),
      livestock_type_id: Number(fields.livestock_type_id),
      head_count:        Number(fields.head_count),
      status:            fields.status,
      contact_number:    fields.contact_number.trim() || null,
      latitude:          fields.latitude  !== '' ? Number(fields.latitude)  : null,
      longitude:         fields.longitude !== '' ? Number(fields.longitude) : null,
    };

    const { error } = isEdit
      ? await updateFarm(id, payload)
      : await createFarm(payload);

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
      // Navigate back to list after short delay so user sees the success state
      setTimeout(() => navigate('/farms'), 1200);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------
  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteFarm(id);
    setDeleting(false);
    if (error) {
      setSubmitError(error.message);
      setShowDeleteModal(false);
    } else {
      navigate('/farms');
    }
  }

  // ---------------------------------------------------------------------------
  // Error message helper (only show when field is touched)
  // ---------------------------------------------------------------------------
  const fieldError = (name) => (touched[name] ? errors[name] : undefined);

  // ---------------------------------------------------------------------------
  // Page-level loading / error
  // ---------------------------------------------------------------------------
  if (pageLoading) {
    return (
      <div className={styles.centeredPage}>
        <div className={styles.loadingPulse} aria-label="Loading farm data…" />
        <p className={styles.loadingText}>Loading farm data…</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className={styles.centeredPage}>
        <AlertCircle size={28} className={styles.pageErrorIcon} />
        <p className={styles.pageErrorText}>{pageError}</p>
        <Button variant="ghost" id="back-from-error-btn" onClick={() => navigate('/farms')}>
          <ArrowLeft size={14} /> Back to Farms
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
          onClick={() => navigate('/farms')}
          aria-label="Back to Farm Registry"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Farm Registry
        </button>
        <div className={styles.headerMeta}>
          <div className={styles.headerIcon}>
            <Tractor size={18} aria-hidden="true" />
          </div>
          <div>
            <h1 className={styles.pageTitle}>
              {isEdit ? 'Edit Farm' : 'Register New Farm'}
            </h1>
            <p className={styles.pageSubtitle}>
              {isEdit
                ? 'Update the details of this registered farm.'
                : 'Add a new farm to the registry.'}
            </p>
          </div>
        </div>
      </header>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <form
        id="farm-form"
        onSubmit={handleSubmit}
        noValidate
        aria-label={isEdit ? 'Edit farm form' : 'Register farm form'}
      >
        {/* Global success / error banners */}
        {submitSuccess && (
          <div className={styles.successBanner} role="alert">
            <CheckCircle2 size={16} aria-hidden="true" />
            {isEdit ? 'Farm updated successfully!' : 'Farm registered successfully!'} Redirecting…
          </div>
        )}
        {submitError && (
          <div className={styles.errorBanner} role="alert">
            <AlertCircle size={16} aria-hidden="true" />
            {submitError}
          </div>
        )}

        <div className={styles.formGrid}>
          {/* ── Column 1: Core Details ─────────────────────────────────── */}
          <Card className={styles.formCard}>
            <Card.Header title="Core Details" />
            <Card.Body className={styles.cardBody}>
              <Input
                id="farm_name"
                name="farm_name"
                label="Farm Name"
                required
                placeholder="e.g. San Pedro Swine Farm"
                value={fields.farm_name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('farm_name')}
                maxLength={150}
              />
              <Input
                id="owner_name"
                name="owner_name"
                label="Owner Name"
                required
                placeholder="e.g. Juan dela Cruz"
                value={fields.owner_name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('owner_name')}
                maxLength={150}
              />
              <Input
                id="contact_number"
                name="contact_number"
                label="Contact Number"
                placeholder="09171234567"
                value={fields.contact_number}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('contact_number')}
                hint="Optional — Philippine mobile format (09xxxxxxxxx)"
                maxLength={20}
              />
              <Select
                id="status"
                name="status"
                label="Farm Status"
                required
                value={fields.status}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('status')}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Quarantine">Quarantine</option>
              </Select>
            </Card.Body>
          </Card>

          {/* ── Column 2: Location & Livestock ────────────────────────── */}
          <Card className={styles.formCard}>
            <Card.Header title="Location & Livestock" />
            <Card.Body className={styles.cardBody}>
              <Select
                id="barangay_id"
                name="barangay_id"
                label="Barangay"
                required
                value={fields.barangay_id}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('barangay_id')}
              >
                <option value="">— Select barangay —</option>
                {barangays.map(b => (
                  <option key={b.barangay_id} value={b.barangay_id}>
                    {b.barangay_name}
                  </option>
                ))}
              </Select>
              <Select
                id="livestock_type_id"
                name="livestock_type_id"
                label="Livestock Type"
                required
                value={fields.livestock_type_id}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('livestock_type_id')}
              >
                <option value="">— Select type —</option>
                {livestockTypes.map(lt => (
                  <option key={lt.livestock_type_id} value={lt.livestock_type_id}>
                    {lt.type_name}
                  </option>
                ))}
              </Select>
              <Input
                id="head_count"
                name="head_count"
                label="Head Count"
                required
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={fields.head_count}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('head_count')}
                hint="Total number of animals on this farm"
              />
            </Card.Body>
          </Card>

          {/* ── Column 3: Map Coordinates (optional) ──────────────────── */}
          <Card className={`${styles.formCard} ${styles.fullWidth}`}>
            <Card.Header title="Map Coordinates" />
            <Card.Body className={`${styles.cardBody} ${styles.coordsBody}`}>
              <p className={styles.coordsHint}>
                Optional. Type the latitude &amp; longitude directly to auto-pin the location, or click anywhere on the map below.
              </p>
              <LocationPicker
                latitude={fields.latitude !== '' ? Number(fields.latitude) : null}
                longitude={fields.longitude !== '' ? Number(fields.longitude) : null}
                onChange={(lat, lng) => {
                  setFields(prev => ({
                    ...prev,
                    latitude: String(lat),
                    longitude: String(lng)
                  }));
                  // Revalidate
                  const newErrors = validate({ ...fields, latitude: String(lat), longitude: String(lng) });
                  setErrors(prev => ({ ...prev, latitude: newErrors.latitude, longitude: newErrors.longitude }));
                }}
              />
              {(fieldError('latitude') || fieldError('longitude')) && (
                <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', marginTop: '0.5rem' }}>
                  {fieldError('latitude') || fieldError('longitude')}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* ── Pest Control History (Edit Mode Only) ────────────────── */}
          {isEdit && (
            <Card className={`${styles.formCard} ${styles.fullWidth}`}>
              <Card.Header title="Pest Control History" />
              <Card.Body className={styles.cardBody}>
                {pestLogs.length === 0 ? (
                  <p className={styles.coordsHint}>No pest control interventions recorded for this farm.</p>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Date</th>
                          <th className={styles.th}>Pest Type</th>
                          <th className={styles.th}>Treatment</th>
                          <th className={styles.th}>Encoder</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pestLogs.map(log => (
                          <tr key={log.log_id} className={styles.row}>
                            <td className={styles.cell}>{new Date(log.date_of_intervention).toLocaleDateString()}</td>
                            <td className={styles.cell}>{log.pest_type}</td>
                            <td className={styles.cell}>{log.treatment_applied}</td>
                            <td className={styles.cell}>{log.users?.full_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div style={{ marginTop: '1rem' }}>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/pest-control')}
                  >
                    Manage Pest Control Logs
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </div>

        {/* ── Footer Actions ─────────────────────────────────────────── */}
        <div className={styles.formFooter}>
          {isEdit && (
            <Button
              id="delete-farm-btn"
              type="button"
              variant="danger"
              size="md"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete Farm
            </Button>
          )}
          <div className={styles.footerRight}>
            <Button
              id="cancel-btn"
              type="button"
              variant="ghost"
              size="md"
              onClick={() => navigate('/farms')}
            >
              Cancel
            </Button>
            <Button
              id="submit-farm-btn"
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={submitSuccess}
            >
              <Save size={15} aria-hidden="true" />
              {isEdit ? 'Save Changes' : 'Register Farm'}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Delete confirmation modal ──────────────────────────────────── */}
      <Modal
        id="delete-confirm-modal"
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Farm"
      >
        <p className={styles.modalBody}>
          Are you sure you want to delete <strong>{fields.farm_name}</strong>?
          This action cannot be undone and may affect linked disease reports.
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
