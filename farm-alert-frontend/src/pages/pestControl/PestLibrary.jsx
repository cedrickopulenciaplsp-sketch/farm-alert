import { useState, useEffect } from 'react';
import {
  Search,
  Bug,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Eye,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  BookOpen,
} from 'lucide-react';
import { getPests, getPestById, createPest, updatePest, deletePest } from '../../services/pests';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Modal from '../../components/shared/Modal';
import { Input } from '../../components/shared/FormElements';
import styles from './PestLibrary.module.css';

// ---------------------------------------------------------------------------
// Detail section inside the view modal
// ---------------------------------------------------------------------------
function DetailSection({ icon: Icon, label, content }) {
  if (!content) return null;
  return (
    <div className={styles.detailSection}>
      <div className={styles.detailHeader}>
        <Icon size={15} className={styles.detailIcon} aria-hidden="true" />
        <span className={styles.detailLabel}>{label}</span>
      </div>
      <p className={styles.detailContent}>{content}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pest Card — accordion with optional admin action buttons
// ---------------------------------------------------------------------------
function PestCard({ pest, isAdmin, onViewFull, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={styles.pestCard} aria-label={pest.pest_name}>
      <button
        id={`toggle-pest-${pest.pest_id}`}
        className={styles.cardHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className={styles.cardHeaderLeft}>
          <div className={styles.pestIcon}>
            <Bug size={16} aria-hidden="true" />
          </div>
          <h2 className={styles.pestName}>{pest.pest_name}</h2>
        </div>
        <div className={styles.cardHeaderRight}>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <button
                id={`edit-pest-${pest.pest_id}`}
                className={styles.iconBtn}
                onClick={() => onEdit(pest)}
                title="Edit pest"
                aria-label={`Edit ${pest.pest_name}`}
              >
                <Edit2 size={14} />
              </button>
              <button
                id={`delete-pest-${pest.pest_id}`}
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={() => onDelete(pest)}
                title="Delete pest"
                aria-label={`Delete ${pest.pest_name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <span
            className={styles.viewFull}
            onClick={(e) => { e.stopPropagation(); onViewFull(pest.pest_id); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onViewFull(pest.pest_id))}
          >
            Full details
          </span>
          {open
            ? <ChevronUp  size={16} className={styles.chevron} aria-hidden="true" />
            : <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
          }
        </div>
      </button>

      {open && (
        <div className={styles.cardBody}>
          {pest.description && (
            <p className={styles.description}>{pest.description}</p>
          )}
          <div className={styles.snippetGrid}>
            {pest.signs_of_infestation && (
              <div className={styles.snippet}>
                <span className={styles.snippetLabel}>
                  <Eye size={12} aria-hidden="true" /> Signs of Infestation
                </span>
                <p className={styles.snippetText}>{pest.signs_of_infestation}</p>
              </div>
            )}
            {pest.control_methods && (
              <div className={styles.snippet}>
                <span className={styles.snippetLabel}>
                  <ShieldCheck size={12} aria-hidden="true" /> Control Methods
                </span>
                <p className={styles.snippetText}>{pest.control_methods}</p>
              </div>
            )}
          </div>
          <button
            id={`view-full-${pest.pest_id}`}
            className={styles.viewFullBtn}
            onClick={() => onViewFull(pest.pest_id)}
          >
            View full reference →
          </button>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Full detail modal (read-only)
// ---------------------------------------------------------------------------
function PestDetailModal({ pestId, onClose }) {
  const [pest, setPest]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!pestId) return;
    setLoading(true);
    setError(null);
    getPestById(pestId).then(({ data, error: e }) => {
      if (e) setError(e.message);
      else   setPest(data);
      setLoading(false);
    });
  }, [pestId]);

  return (
    <Modal
      id="pest-detail-modal"
      isOpen={!!pestId}
      onClose={onClose}
      title={pest?.pest_name ?? 'Pest Details'}
      size="lg"
    >
      {loading ? (
        <div className={styles.modalLoading}><LoadingSpinner size={24} /></div>
      ) : error ? (
        <p className={styles.modalError}>{error}</p>
      ) : pest ? (
        <div className={styles.modalBody}>
          {pest.description && (
            <p className={styles.modalDesc}>{pest.description}</p>
          )}
          <div className={styles.detailGrid}>
            <DetailSection icon={Eye}        label="Signs of Infestation" content={pest.signs_of_infestation} />
            <DetailSection icon={ShieldCheck} label="Control Methods"     content={pest.control_methods} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit Pest Modal (Admin only)
// ---------------------------------------------------------------------------
function PestFormModal({ pest, onSave, onClose }) {
  const isEdit = !!pest;
  const [name,        setName]        = useState(pest?.pest_name            ?? '');
  const [description, setDescription] = useState(pest?.description          ?? '');
  const [signs,       setSigns]       = useState(pest?.signs_of_infestation ?? '');
  const [control,     setControl]     = useState(pest?.control_methods      ?? '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSave() {
    if (!name.trim()) {
      setError('Pest name is required.');
      return;
    }
    setSaving(true);
    setError('');
    const fields = {
      pest_name:            name.trim(),
      description:          description.trim() || null,
      signs_of_infestation: signs.trim()       || null,
      control_methods:      control.trim()     || null,
    };
    const { error: saveErr } = isEdit
      ? await updatePest(pest.pest_id, fields)
      : await createPest(fields);
    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    onSave();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit — ${pest.pest_name}` : 'Add New Pest'}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button id="pest-form-cancel" variant="ghost" size="sm" onClick={onClose}>
            <X size={14} /> Cancel
          </Button>
          <Button id="pest-form-save" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} /> : <Save size={14} />}
            {isEdit ? 'Save Changes' : 'Add Pest'}
          </Button>
        </div>
      }
    >
      {error && (
        <div className={styles.modalError} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          <AlertCircle size={14} /><span>{error}</span>
        </div>
      )}
      <div className={styles.formGrid}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input
            id="pest-name"
            label="Pest Name"
            required
            value={name}
            placeholder="e.g. Brown Rats (Rattus norvegicus)"
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input
            id="pest-description"
            label="Description"
            value={description}
            placeholder="Brief overview of this pest and its impact on farms…"
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <Input
          id="pest-signs"
          label="Signs of Infestation"
          value={signs}
          placeholder="e.g. Burrows, gnaw marks, droppings…"
          onChange={e => setSigns(e.target.value)}
        />
        <Input
          id="pest-control"
          label="Control Methods"
          value={control}
          placeholder="e.g. Snap traps, bait stations, seal entry points…"
          onChange={e => setControl(e.target.value)}
        />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------
function DeletePestModal({ pest, onConfirm, onClose, loading }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Delete Pest"
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button id="delete-pest-cancel" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button id="delete-pest-confirm" variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw size={14} /> : <Trash2 size={14} />}
            Yes, Delete
          </Button>
        </div>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        Are you sure you want to delete <strong>{pest?.pest_name}</strong>?
        This cannot be undone.
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasSearch, onClear, isAdmin, onAdd }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Bug size={28} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasSearch ? 'No pests match your search' : 'Pest library is empty'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasSearch
          ? 'Try a different keyword.'
          : isAdmin
            ? 'Click "Add Pest" to add the first entry.'
            : 'Pest entries can be added by an administrator.'}
      </p>
      {hasSearch && (
        <Button variant="ghost" size="sm" id="clear-pest-search-btn" onClick={onClear}>
          Clear search
        </Button>
      )}
      {!hasSearch && isAdmin && (
        <Button variant="primary" size="sm" id="empty-add-pest-btn" onClick={onAdd}>
          <Plus size={14} /> Add Pest
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PestLibrary — main page
// ---------------------------------------------------------------------------
export default function PestLibrary() {
  const { role } = useAuth();
  const isAdmin  = role === 'admin';

  const [pests,   setPests]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');

  // Modals
  const [activePestId,  setActivePestId]  = useState(null);  // view full
  const [editTarget,    setEditTarget]    = useState(null);  // add/edit form
  const [deleteTarget,  setDeleteTarget]  = useState(null);  // delete confirm
  const [showForm,      setShowForm]      = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: e } = await getPests();
    if (e) setError(e.message);
    else   setPests(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Client-side search filter
  const displayed = search.trim()
    ? pests.filter(p =>
        p.pest_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : pests;

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error: delErr } = await deletePest(deleteTarget.pest_id);
    setDeleteLoading(false);
    if (delErr) { showToast(`Error: ${delErr.message}`); return; }
    setDeleteTarget(null);
    showToast(`"${deleteTarget.pest_name}" deleted.`);
    load();
  }

  function handleOpenAdd() { setEditTarget(null); setShowForm(true); }
  function handleOpenEdit(pest) { setEditTarget(pest); setShowForm(true); }

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', padding: '12px 18px',
          boxShadow: 'var(--shadow-md)', fontSize: 'var(--text-sm)',
          color: 'var(--color-text-primary)',
        }}>
          {toast}
        </div>
      )}

      {/* Page Header */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pest Library</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${displayed.length} pest${displayed.length !== 1 ? 's' : ''} in reference`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin ? (
            <Button id="add-pest-btn" variant="primary" size="sm" onClick={handleOpenAdd}>
              <Plus size={14} /> Add Pest
            </Button>
          ) : (
            <div className={styles.headerBadge}>
              <BookOpen size={15} aria-hidden="true" />
              Read-only reference
            </div>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="pest-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search by pest name or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search pests"
            />
          </div>
          {search && (
            <button
              id="clear-pest-search-btn"
              className={styles.clearBtn}
              onClick={() => setSearch('')}
            >
              Clear
            </button>
          )}
        </Card.Body>
      </Card>

      {/* Content */}
      {error ? (
        <Card className={styles.errorCard}>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={18} className={styles.errorIcon} />
            <p className={styles.errorText}>{error}</p>
            <Button id="retry-pests-btn" variant="ghost" size="sm" onClick={load}>
              <RefreshCw size={13} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}><LoadingSpinner size={36} /></div>
      ) : displayed.length === 0 ? (
        <EmptyState
          hasSearch={!!search}
          onClear={() => setSearch('')}
          isAdmin={isAdmin}
          onAdd={handleOpenAdd}
        />
      ) : (
        <div className={styles.pestList} role="list" aria-label="Pest reference list">
          {displayed.map(pest => (
            <PestCard
              key={pest.pest_id}
              pest={pest}
              isAdmin={isAdmin}
              onViewFull={setActivePestId}
              onEdit={handleOpenEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* View detail modal */}
      <PestDetailModal
        pestId={activePestId}
        onClose={() => setActivePestId(null)}
      />

      {/* Add/Edit form modal */}
      {showForm && (
        <PestFormModal
          pest={editTarget}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            showToast(editTarget ? 'Pest updated!' : 'New pest added!');
            load();
          }}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeletePestModal
          pest={deleteTarget}
          loading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
