import { useState, useEffect } from 'react';
import { Warning as AlertTriangle, MapPin } from '@phosphor-icons/react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { Input, Select } from '../shared/FormElements';
import LocationPicker from '../shared/LocationPicker';
import { createBarangay, updateBarangay } from '../../services/barangays';

const DEFAULT_COORDS = {
  latitude:  '14.069300',
  longitude: '121.326500',
};

export default function BarangayModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  existingBarangays = [],
}) {
  const isEdit = Boolean(initialData?.barangay_id);

  const [form, setForm] = useState({
    barangay_name:  '',
    classification: '0',
    contact_person: '',
    contact_number: '',
    latitude:       DEFAULT_COORDS.latitude,
    longitude:      DEFAULT_COORDS.longitude,
    is_active:      true,
  });

  const [errors, setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setApiError('');

    if (initialData) {
      setForm({
        barangay_name:  initialData.barangay_name ?? '',
        classification: String(initialData.classification ?? 0),
        contact_person: initialData.contact_person ?? '',
        contact_number: initialData.contact_number ?? '',
        latitude:       initialData.latitude  != null ? String(Number(initialData.latitude).toFixed(6))  : DEFAULT_COORDS.latitude,
        longitude:      initialData.longitude != null ? String(Number(initialData.longitude).toFixed(6)) : DEFAULT_COORDS.longitude,
        is_active:      initialData.is_active ?? true,
      });
    } else {
      setForm({
        barangay_name:  '',
        classification: '0',
        contact_person: '',
        contact_number: '',
        latitude:       DEFAULT_COORDS.latitude,
        longitude:      DEFAULT_COORDS.longitude,
        is_active:      true,
      });
    }
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  }

  function validate() {
    const nextErrors = {};
    const trimmedName = form.barangay_name.trim();

    if (!trimmedName) {
      nextErrors.barangay_name = 'Barangay name is required.';
    } else {
      const duplicate = existingBarangays.find(
        (b) =>
          b.barangay_name?.toLowerCase() === trimmedName.toLowerCase() &&
          (!isEdit || b.barangay_id !== initialData.barangay_id)
      );
      if (duplicate) {
        nextErrors.barangay_name = `Barangay "${trimmedName}" already exists in the masterlist.`;
      }
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      nextErrors.coords = 'Please provide a valid latitude (-90 to 90).';
    } else if (isNaN(lng) || lng < -180 || lng > 180) {
      nextErrors.coords = 'Please provide a valid longitude (-180 to 180).';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');

    const payload = {
      barangay_name:  form.barangay_name.trim(),
      classification: Number(form.classification),
      contact_person: form.contact_person.trim() || null,
      contact_number: form.contact_number.trim() || null,
      latitude:       Number(form.latitude),
      longitude:      Number(form.longitude),
      is_active:      Boolean(form.is_active),
    };

    const { data, error } = isEdit
      ? await updateBarangay(initialData.barangay_id, payload)
      : await createBarangay(payload);

    if (error) {
      setApiError(error.message ?? 'Failed to save barangay.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess?.(data);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Barangay — ${initialData.barangay_name}` : 'Add New Barangay'}
      size="lg"
    >
      <form
        id="barangay-modal-form"
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Input
            id="barangay-name-input"
            name="barangay_name"
            label="Barangay Name"
            placeholder="e.g. San Lucas 2"
            required
            value={form.barangay_name}
            onChange={handleChange}
            error={errors.barangay_name}
            disabled={submitting}
          />

          <Select
            id="barangay-classification-select"
            name="classification"
            label="Classification"
            required
            value={form.classification}
            onChange={handleChange}
            disabled={submitting}
          >
            <option value="0">Rural (Agricultural)</option>
            <option value="1">Urban (Poblacion)</option>
          </Select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
          <Input
            id="barangay-contact-person"
            name="contact_person"
            label="Barangay Captain / Focal Person"
            placeholder="e.g. Hon. Juan Dela Cruz"
            value={form.contact_person}
            onChange={handleChange}
            disabled={submitting}
          />

          <Input
            id="barangay-contact-number"
            name="contact_number"
            label="Contact Number"
            placeholder="e.g. 0917-123-4567"
            value={form.contact_number}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
            <MapPin size={16} style={{ color: 'var(--color-brand)' }} aria-hidden="true" />
            <span>Barangay Hall / Centroid GPS Coordinates</span>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: 0 }}>
            Click anywhere on the map or drag the pin to set the official Barangay Hall coordinates. Selecting this barangay during Farm Registration will automatically pan to this pin.
          </p>

          <LocationPicker
            latitude={form.latitude !== '' ? Number(form.latitude) : null}
            longitude={form.longitude !== '' ? Number(form.longitude) : null}
            disabled={submitting}
            onChange={(lat, lng) => {
              setForm((prev) => ({
                ...prev,
                latitude:  lat != null ? String(Number(lat).toFixed(6)) : '',
                longitude: lng != null ? String(Number(lng).toFixed(6)) : '',
              }));
              if (errors.coords) setErrors((prev) => ({ ...prev, coords: '' }));
            }}
          />

          {errors.coords && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>
              {errors.coords}
            </span>
          )}
        </div>

        {apiError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.875rem',
              background: 'var(--color-danger-light)',
              border: '1px solid hsl(4, 74%, 86%)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-danger)',
            }}
          >
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{apiError}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', paddingTop: '0.25rem' }}>
          <Button
            id="barangay-modal-cancel-btn"
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            id="barangay-modal-save-btn"
            type="submit"
            variant="primary"
            loading={submitting}
          >
            {isEdit ? 'Save Changes' : 'Add Barangay'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
