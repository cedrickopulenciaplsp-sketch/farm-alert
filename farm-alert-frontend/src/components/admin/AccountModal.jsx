import { useState, useEffect } from 'react';
import { Warning as AlertTriangle, Info } from '@phosphor-icons/react';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { Input, Select } from '../shared/FormElements';
import {
  ROLE_LABELS,
  createAccount,
  updateAccount,
  isValidEmail,
  normalizeEmail,
} from '../../services/accounts';

const BLANK = {
  email:     '',
  full_name: '',
  role:      'cvo_staff',
  farm_id:   '',
  notes:     '',
};

export default function AccountModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  existingAccounts = [],
  farms = [],
  currentUserEmail = '',
}) {
  const isEdit = Boolean(initialData?.account_id);
  const isSelf = isEdit && normalizeEmail(initialData.email) === normalizeEmail(currentUserEmail);

  const [form, setForm]             = useState(BLANK);
  const [errors, setErrors]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]     = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setApiError('');
    setForm(
      initialData
        ? {
            email:     initialData.email ?? '',
            full_name: initialData.full_name ?? '',
            role:      initialData.role ?? 'cvo_staff',
            farm_id:   initialData.farm_id ?? '',
            notes:     initialData.notes ?? '',
          }
        : BLANK
    );
  }, [isOpen, initialData]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  }

  function validate() {
    const next = {};
    const email = normalizeEmail(form.email);

    if (!isEdit) {
      if (!email) {
        next.email = 'Google email is required.';
      } else if (!isValidEmail(email)) {
        next.email = 'Enter a valid email address (e.g. juan.delacruz@gmail.com).';
      } else if (existingAccounts.some((a) => a.email === email)) {
        next.email = 'This email is already registered.';
      }
    }

    if (form.role === 'farmer' && !form.farm_id) {
      next.farm_id = 'Select the registered farm this raiser owns.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');

    const payload = {
      email:     form.email,
      full_name: form.full_name,
      role:      form.role,
      farm_id:   form.farm_id || null,
      notes:     form.notes,
    };

    const { data, error } = isEdit
      ? await updateAccount(initialData.account_id, payload)
      : await createAccount(payload);

    setSubmitting(false);

    if (error) {
      setApiError(
        error.code === '42P01'
          ? 'The account registry table is missing. Please run migration 037_account_access_management.sql in Supabase.'
          : error.message ?? 'Failed to save account.'
      );
      return;
    }

    onSuccess?.(data, { previous: initialData });
  }

  const sortedFarms = [...farms].sort((a, b) => (a.farm_name ?? '').localeCompare(b.farm_name ?? ''));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Account — ${initialData.email}` : 'Authorize Google Account'}
      size="md"
    >
      <form
        id="account-modal-form"
        onSubmit={handleSubmit}
        noValidate
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <Input
          id="account-email-input"
          name="email"
          type="email"
          label="Google Email"
          placeholder="e.g. pedro.inspector@gmail.com"
          required={!isEdit}
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          disabled={submitting || isEdit}
          hint={isEdit ? 'Email cannot be changed. Suspend this account and authorize a new one instead.' : 'The person signs in with this exact Google account.'}
          autoComplete="off"
        />

        <Input
          id="account-name-input"
          name="full_name"
          label="Full Name"
          placeholder="e.g. Pedro Santos"
          value={form.full_name}
          onChange={handleChange}
          disabled={submitting}
          hint="Optional — filled in automatically from the Google profile on first sign-in."
          maxLength={150}
        />

        <Select
          id="account-role-select"
          name="role"
          label="Role"
          required
          value={form.role}
          onChange={handleChange}
          disabled={submitting || isSelf || initialData?.role === 'admin'}
        >
          {initialData?.role === 'admin' && (
            <option value="admin">{ROLE_LABELS.admin}</option>
          )}
          <option value="cvo_staff">{ROLE_LABELS.cvo_staff}</option>
          <option value="farmer">{ROLE_LABELS.farmer}</option>
        </Select>

        {initialData?.role === 'admin' && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '-0.5rem 0 0' }}>
            The City Veterinarian is the sole Administrator of the system.
          </p>
        )}

        {form.role === 'farmer' && (
          <Select
            id="account-farm-select"
            name="farm_id"
            label="Linked Farm Holding"
            required
            value={form.farm_id}
            onChange={handleChange}
            error={errors.farm_id}
            disabled={submitting}
          >
            <option value="">Select registered farm</option>
            {sortedFarms.map((f) => (
              <option key={f.farm_id} value={f.farm_id}>
                {f.farm_name} — {f.barangay_name ?? f.owner_name}
              </option>
            ))}
          </Select>
        )}

        <Input
          id="account-notes-input"
          name="notes"
          label="Notes"
          placeholder="e.g. Field inspector assigned to Districts I–III"
          value={form.notes}
          onChange={handleChange}
          disabled={submitting}
          maxLength={255}
        />

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
            padding: '0.625rem 0.75rem',
            background: 'var(--color-overlay)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <Info size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--color-brand)' }} aria-hidden="true" />
          <span>
            Farmers registered with a Google email in the Farm Registry are authorized automatically.
            Use this form for CVO personnel, or to link a raiser who was registered without an email.
          </span>
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
            id="account-modal-cancel-btn"
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            id="account-modal-save-btn"
            type="submit"
            variant="primary"
            loading={submitting}
          >
            {isEdit ? 'Save Changes' : 'Authorize Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
