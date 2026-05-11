import { useState } from 'react';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import Modal from '../../components/shared/Modal';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Input, Select, Label } from '../../components/shared/FormElements';

// ---------------------------------------------------------------------------
// Section wrapper — keeps sandbox readable
// ---------------------------------------------------------------------------
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-lg)',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UI Sandbox page
// ---------------------------------------------------------------------------
export default function UiSandbox() {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [inputVal, setInputVal]   = useState('');
  const [inputErr, setInputErr]   = useState('');

  const simulateLoad = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  const validateInput = (val) => {
    setInputVal(val);
    setInputErr(val.length > 0 && val.length < 3 ? 'Minimum 3 characters required.' : '');
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>

      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          marginBottom: '0.375rem',
        }}>
          UI Sandbox
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Phase 4 component verification. All design tokens and interactions tested here.
        </p>
      </div>

      <Section title="Buttons">
        <Button id="sb-btn-primary"   variant="primary">   Primary   </Button>
        <Button id="sb-btn-secondary" variant="secondary"> Secondary </Button>
        <Button id="sb-btn-danger"    variant="danger">    Danger    </Button>
        <Button id="sb-btn-ghost"     variant="ghost">     Ghost     </Button>
        <Button id="sb-btn-sm"        size="sm">           Small     </Button>
        <Button id="sb-btn-lg"        size="lg">           Large     </Button>
        <Button id="sb-btn-disabled"  disabled>            Disabled  </Button>
        <Button id="sb-btn-loading" loading={loading} onClick={simulateLoad}>
          {loading ? 'Saving...' : 'Simulate Load'}
        </Button>
      </Section>

      <Section title="Cards">
        <Card id="sb-card-basic" style={{ width: '220px' }}>
          <Card.Header title="Basic Card" />
          <Card.Body>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Standard card with header and body.
            </p>
          </Card.Body>
        </Card>

        <Card id="sb-card-hoverable" hoverable style={{ width: '220px' }}>
          <Card.Header title="Hoverable Card" />
          <Card.Body>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Hover me for lift effect.
            </p>
          </Card.Body>
          <Card.Footer>
            <Button id="sb-card-action" size="sm" variant="secondary">Action</Button>
          </Card.Footer>
        </Card>
      </Section>

      <Section title="Modal">
        <Button id="sb-modal-open-btn" onClick={() => setModalOpen(true)}>
          Open Modal
        </Button>
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm Action"
          footer={
            <>
              <Button id="sb-modal-cancel" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button id="sb-modal-confirm" variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            This modal uses a React Portal, animated backdrop, and traps focus.
            Press Escape or click outside to close.
          </p>
        </Modal>
      </Section>

      <Section title="Loading Spinner">
        <LoadingSpinner size={20} />
        <LoadingSpinner size={32} />
        <LoadingSpinner size={48} />
      </Section>

      <Section title="Form Elements">
        <div style={{ width: '280px' }}>
          <Input
            id="sb-input-normal"
            label="Farm Name"
            placeholder="e.g. Dela Cruz Farm"
            value={inputVal}
            onChange={(e) => validateInput(e.target.value)}
            error={inputErr}
            hint="Enter the registered name of the farm."
          />
        </div>
        <div style={{ width: '280px' }}>
          <Input
            id="sb-input-error"
            label="Required Field"
            required
            placeholder="This field has an error"
            defaultValue="x"
            error="This field is required and must be valid."
          />
        </div>
        <div style={{ width: '220px' }}>
          <Select id="sb-select" label="Livestock Type" required>
            <option value="">Select type...</option>
            <option value="cattle">Cattle</option>
            <option value="swine">Swine</option>
            <option value="poultry">Poultry</option>
          </Select>
        </div>
      </Section>

    </div>
  );
}
