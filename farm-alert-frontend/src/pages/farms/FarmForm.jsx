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
import { getComplianceLogs } from '../../services/compliance';
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

function validate(fields, typeName) {
  const errors = {};
  const isPoultryFarm = typeName === 'Poultry' || typeName === 'Both';
  const isSwineAnimal = typeName === 'Swine'  || typeName === 'Both';

  if (!fields.farm_name.trim())
    errors.farm_name = 'Farm name is required.';

  if (!fields.owner_name.trim())
    errors.owner_name = 'Owner name is required.';

  if (!fields.barangay_id)
    errors.barangay_id = 'Please select a barangay.';

  if (!fields.livestock_type_id)
    errors.livestock_type_id = 'Please select a livestock type.';

  if (fields.contact_number && !PH_PHONE_RE.test(fields.contact_number.trim()))
    errors.contact_number = 'Enter a valid PH number (e.g. 09171234567).';

  if (fields.latitude && (isNaN(Number(fields.latitude)) ||
      Number(fields.latitude) < -90 || Number(fields.latitude) > 90))
    errors.latitude = 'Latitude must be between –90 and 90.';

  if (fields.longitude && (isNaN(Number(fields.longitude)) ||
      Number(fields.longitude) < -180 || Number(fields.longitude) > 180))
    errors.longitude = 'Longitude must be between –180 and 180.';

  // Swine sex-disaggregated validation (Swine or Both)
  if (isSwineAnimal) {
    if (fields.male_swine_population !== '' && (isNaN(Number(fields.male_swine_population)) || Number(fields.male_swine_population) < 0))
      errors.male_swine_population = 'Male swine population must be 0 or more.';
    if (fields.female_swine_population !== '' && (isNaN(Number(fields.female_swine_population)) || Number(fields.female_swine_population) < 0))
      errors.female_swine_population = 'Female swine population must be 0 or more.';
  }

  // Poultry-specific validation (Poultry or Both)
  if (isPoultryFarm) {
    if (!fields.production_type)
      errors.production_type = 'Please select a production type.';
    if (fields.production_type === 'Others' && !fields.production_type_other.trim())
      errors.production_type_other = 'Please specify the production type.';
    if (!fields.facility_status)
      errors.facility_status = 'Please select facility status.';
    if (fields.male_population !== '' && (isNaN(Number(fields.male_population)) || Number(fields.male_population) < 0))
      errors.male_population = 'Male bird population must be 0 or more.';
    if (fields.female_population !== '' && (isNaN(Number(fields.female_population)) || Number(fields.female_population) < 0))
      errors.female_population = 'Female bird population must be 0 or more.';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Initial form state factory
// ---------------------------------------------------------------------------
function blankForm() {
  return {
    farm_name:                '',
    owner_name:               '',
    facility_address:         '',
    barangay_id:              '',
    livestock_type_id:        '',
    head_count:               '',
    contact_number:           '',
    latitude:                 '',
    longitude:                '',
    status:                   'Active/Quarantine',
    // Swine sex-disaggregated (nullable)
    male_swine_population:    '',
    female_swine_population:  '',
    // Poultry-specific (nullable)
    production_type:          '',
    production_type_other:    '',
    facility_status:          '',
    male_population:          '',
    female_population:        '',
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
  const [complianceLogs, setComplianceLogs] = useState([]);

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
            farm_name:               data.farm_name               ?? '',
            owner_name:              data.owner_name              ?? '',
            facility_address:        data.facility_address        ?? '',
            barangay_id:             String(data.barangay_id      ?? ''),
            livestock_type_id:       String(data.livestock_type_id ?? ''),
            head_count:              data.head_count    != null  ? String(data.head_count)    : '',
            contact_number:          data.contact_number          ?? '',
            latitude:                data.latitude      != null  ? String(data.latitude)      : '',
            longitude:               data.longitude     != null  ? String(data.longitude)     : '',
            status:                  data.status                  ?? 'Active',
            // Swine sex-disaggregated
            male_swine_population:   data.male_swine_population   != null ? String(data.male_swine_population)   : '',
            female_swine_population: data.female_swine_population != null ? String(data.female_swine_population) : '',
            // Poultry-specific
            production_type:         data.production_type         ?? '',
            production_type_other:   data.production_type_other   ?? '',
            facility_status:         data.facility_status         ?? '',
            male_population:         data.male_population     != null ? String(data.male_population)   : '',
            female_population:       data.female_population   != null ? String(data.female_population) : '',
          });
        }
        
        const { data: logsData } = await getComplianceLogs({ farmId: id });
        if (logsData) setComplianceLogs(logsData);
        
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
    const updatedFields = { ...fields, [name]: value };
    setFields(updatedFields);
    // Re-validate just this field on change if already touched
    if (touched[name]) {
      const tn = livestockTypes.find(lt => String(lt.livestock_type_id) === String(updatedFields.livestock_type_id))?.type_name ?? '';
      const newErrors = validate(updatedFields, tn);
      setErrors(prev => ({ ...prev, [name]: newErrors[name] }));
    }
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const updatedFields = { ...fields, [name]: e.target.value };
    const tn = livestockTypes.find(lt => String(lt.livestock_type_id) === String(updatedFields.livestock_type_id))?.type_name ?? '';
    const newErrors = validate(updatedFields, tn);
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
    const allErrors = validate(fields, selectedType?.type_name);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) return;

    setLoading(true);
    setSubmitError(null);

    // Auto-calculate head_count
    const maleSwine   = isSwineAnimal ? (Number(fields.male_swine_population)   || 0) : 0;
    const femaleSwine = isSwineAnimal ? (Number(fields.female_swine_population) || 0) : 0;
    const maleBirds   = isPoultryFarm ? (Number(fields.male_population)         || 0) : 0;
    const femaleBirds = isPoultryFarm ? (Number(fields.female_population)       || 0) : 0;
    const totalHead   = maleSwine + femaleSwine + maleBirds + femaleBirds;

    // Build payload
    const payload = {
      farm_name:         fields.farm_name.trim(),
      owner_name:        fields.owner_name.trim(),
      facility_address:  fields.facility_address.trim() || null,
      barangay_id:       Number(fields.barangay_id),
      livestock_type_id: Number(fields.livestock_type_id),
      head_count:        totalHead,
      status:            fields.status,
      contact_number:    fields.contact_number.trim() || null,
      latitude:          fields.latitude  !== '' ? Number(fields.latitude)  : null,
      longitude:         fields.longitude !== '' ? Number(fields.longitude) : null,
      // Swine sex-disaggregated
      male_swine_population:   isSwineAnimal && fields.male_swine_population   !== '' ? maleSwine   : null,
      female_swine_population: isSwineAnimal && fields.female_swine_population !== '' ? femaleSwine : null,
      swine_population:        isSwineAnimal ? (maleSwine + femaleSwine) : null,
      // Poultry-specific
      production_type:       isPoultryFarm ? (fields.production_type || null)       : null,
      production_type_other: isPoultryFarm && fields.production_type === 'Others'
                               ? fields.production_type_other.trim() || null
                               : null,
      facility_status:       isPoultryFarm ? (fields.facility_status || null)       : null,
      male_population:       isPoultryFarm && fields.male_population   !== '' ? maleBirds   : null,
      female_population:     isPoultryFarm && fields.female_population !== '' ? femaleBirds : null,
    };

    const { error } = isEdit
      ? await updateFarm(id, payload)
      : await createFarm(payload);

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
    } else {
      setSubmitSuccess(true);
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

  // Derived livestock type flags
  const selectedType  = livestockTypes.find(
    lt => String(lt.livestock_type_id) === String(fields.livestock_type_id)
  );
  const typeName      = selectedType?.type_name ?? '';
  const isPoultryFarm = typeName === 'Poultry' || typeName === 'Both';
  const isSwineAnimal = typeName === 'Swine'   || typeName === 'Both';
  const isBoth        = typeName === 'Both';
  const hasType       = !!typeName; // any livestock type selected

  // Auto-calculated totals for display
  const swineTotal   = (Number(fields.male_swine_population) || 0) + (Number(fields.female_swine_population) || 0);
  const poultryTotal = (Number(fields.male_population)       || 0) + (Number(fields.female_population)       || 0);
  const computedHeadCount = hasType
    ? (isSwineAnimal ? swineTotal : 0) + (isPoultryFarm ? poultryTotal : 0)
    : null;

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
                <option value="Active/Quarantine">Active / Quarantine</option>
                <option value="Inactive">Inactive</option>
                <option value="Temporarily Closed">Temporarily Closed</option>
              </Select>
            </Card.Body>
          </Card>

          {/* ── Column 2: Location & Livestock ────────────────────────── */}
          <Card className={styles.formCard}>
            <Card.Header title="Location & Livestock" />
            <Card.Body className={styles.cardBody}>
              <Input
                id="facility_address"
                name="facility_address"
                label="Facility Address (Street / Purok)"
                placeholder="e.g. Purok 4, Sitio Looban"
                value={fields.facility_address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={fieldError('facility_address')}
                hint="Optional — specific street or purok location"
                maxLength={255}
              />
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
              {/* Auto-calculated Head Count — shown whenever a type is selected */}
              {hasType && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
                    Total Head Count <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(auto-calculated)</span>
                  </label>
                  <div style={{
                    padding: '0.6rem 0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '0.02em',
                  }}>
                    {computedHeadCount ?? 0}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                    {isBoth ? 'Male Swine + Female Swine + Male Birds + Female Birds'
                      : isSwineAnimal ? 'Male Swine + Female Swine'
                      : 'Male Birds + Female Birds'}
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* ── Swine Details (Swine or Both) ─────────────────────────── */}
          {isSwineAnimal && (
            <Card className={`${styles.formCard} ${styles.swineCard}`}>
              <Card.Header title="🐷 Swine Details" />
              <Card.Body className={styles.cardBody}>
                <Input
                  id="male_swine_population"
                  name="male_swine_population"
                  label="Male Swine Population"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={fields.male_swine_population}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('male_swine_population')}
                  hint="Number of male swine (boars/barrows)"
                />
                <Input
                  id="female_swine_population"
                  name="female_swine_population"
                  label="Female Swine Population"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={fields.female_swine_population}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('female_swine_population')}
                  hint="Number of female swine (sows/gilts)"
                />
              </Card.Body>
            </Card>
          )}

          {/* ── Poultry Details (Poultry or Both) ───────────────────────── */}
          {isPoultryFarm && (
            <Card className={`${styles.formCard} ${styles.poultryCard}`}>
              <Card.Header title="🐔 Poultry Details" />
              <Card.Body className={styles.cardBody}>
                <Select
                  id="production_type"
                  name="production_type"
                  label="Type of Production"
                  required
                  value={fields.production_type}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('production_type')}
                >
                  <option value="">— Select type —</option>
                  <option value="Broiler">Broiler</option>
                  <option value="Layer">Layer</option>
                  <option value="Quail">Quail</option>
                  <option value="Duck">Duck</option>
                  <option value="Broiler Breeder">Broiler Breeder</option>
                  <option value="Layer Breeder">Layer Breeder</option>
                  <option value="Others">Others (please specify)</option>
                </Select>

                {fields.production_type === 'Others' && (
                  <Input
                    id="production_type_other"
                    name="production_type_other"
                    label="Please Specify Production Type"
                    required
                    placeholder="e.g. Free-range native chicken"
                    value={fields.production_type_other}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={fieldError('production_type_other')}
                    maxLength={150}
                  />
                )}

                <Select
                  id="facility_status"
                  name="facility_status"
                  label="Status of Facility"
                  required
                  value={fields.facility_status}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('facility_status')}
                >
                  <option value="">— Select status —</option>
                  <option value="Owned">Owned</option>
                  <option value="Rented/Leased">Rented / Leased</option>
                </Select>

                <Input
                  id="male_population"
                  name="male_population"
                  label="Male Bird Population"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={fields.male_population}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('male_population')}
                  hint="Number of male birds on this farm"
                />

                <Input
                  id="female_population"
                  name="female_population"
                  label="Female Bird Population"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={fields.female_population}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={fieldError('female_population')}
                  hint="Number of female birds on this farm"
                />
              </Card.Body>
            </Card>
          )}

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
                  const latStr = lat != null ? String(lat) : '';
                  const lngStr = lng != null ? String(lng) : '';
                  setFields(prev => ({
                    ...prev,
                    latitude: latStr,
                    longitude: lngStr,
                  }));
                  // Revalidate
                  const newErrors = validate({ ...fields, latitude: latStr, longitude: lngStr }, typeName);
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

          {/* ── Compliance History (Edit Mode Only) ────────────────── */}
          {isEdit && (
            <Card className={`${styles.formCard} ${styles.fullWidth}`}>
              <Card.Header title="Compliance History" />
              <Card.Body className={styles.cardBody}>
                {complianceLogs.length === 0 ? (
                  <p className={styles.coordsHint}>No compliance evaluations recorded for this farm.</p>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th className={styles.th}>Date</th>
                          <th className={styles.th}>Status</th>
                          <th className={styles.th}>Notes</th>
                          <th className={styles.th}>Encoder</th>
                        </tr>
                      </thead>
                      <tbody>
                        {complianceLogs.map(log => (
                          <tr key={log.log_id} className={styles.row}>
                            <td className={styles.cell}>{new Date(log.evaluation_date).toLocaleDateString()}</td>
                            <td className={styles.cell}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.65rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 600,
                                background: log.compliance_status === 'Compliant' ? 'hsl(145,55%,92%)'
                                  : log.compliance_status === 'Semi-Compliant' ? 'hsl(48,90%,92%)'
                                  : 'hsl(4,74%,94%)',
                                color: log.compliance_status === 'Compliant' ? 'hsl(145,60%,28%)'
                                  : log.compliance_status === 'Semi-Compliant' ? 'hsl(38,80%,32%)'
                                  : 'hsl(4,74%,40%)',
                              }}>
                                {log.compliance_status}
                              </span>
                            </td>
                            <td className={styles.cell}>{log.notes || '—'}</td>
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
                    onClick={() => navigate('/compliance')}
                  >
                    Manage Compliance Logs
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
