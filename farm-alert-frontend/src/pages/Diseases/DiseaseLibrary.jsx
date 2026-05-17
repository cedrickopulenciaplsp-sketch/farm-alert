import { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Bug,
  ShieldCheck,
  FileText,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { getDiseases, getDiseaseById, createDisease, updateDisease, deleteDisease } from '../../services/diseases';
import { getLivestockTypes } from '../../services/farms';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Modal from '../../components/shared/Modal';
import { Input, Select } from '../../components/shared/FormElements';
import styles from './DiseaseLibrary.module.css';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
function TypeBadge({ typeName }) {
  const isPoultry = typeName?.toLowerCase().includes('poultry');
  const isSwine   = typeName?.toLowerCase().includes('swine');
  return (
    <span className={`${styles.typeBadge} ${
      isPoultry ? styles.typeBadgePoultry :
      isSwine   ? styles.typeBadgeSwine   :
                  styles.typeBadgeBoth
    }`}>
      {typeName ?? '—'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail section row inside the view modal
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
// Disease Card — accordion with optional admin action buttons
// ---------------------------------------------------------------------------
function DiseaseCard({ disease, isAdmin, onViewFull, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const typeName = disease.livestock_types?.type_name ?? '—';

  return (
    <article className={styles.diseaseCard} aria-label={disease.disease_name}>
      <button
        id={`toggle-disease-${disease.disease_id}`}
        className={styles.cardHeader}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className={styles.cardHeaderLeft}>
          <div className={styles.diseaseIcon}>
            <Stethoscope size={16} aria-hidden="true" />
          </div>
          <div className={styles.cardTitleGroup}>
            <h2 className={styles.diseaseName}>{disease.disease_name}</h2>
            <TypeBadge typeName={typeName} />
          </div>
        </div>
        <div className={styles.cardHeaderRight}>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
              <button
                id={`edit-disease-${disease.disease_id}`}
                className={styles.iconBtn}
                onClick={() => onEdit(disease)}
                title="Edit disease"
                aria-label={`Edit ${disease.disease_name}`}
              >
                <Edit2 size={14} />
              </button>
              <button
                id={`delete-disease-${disease.disease_id}`}
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={() => onDelete(disease)}
                title="Delete disease"
                aria-label={`Delete ${disease.disease_name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <span
            className={styles.viewFull}
            onClick={(e) => { e.stopPropagation(); onViewFull(disease.disease_id); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onViewFull(disease.disease_id))}
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
          {disease.description && (
            <p className={styles.description}>{disease.description}</p>
          )}
          <div className={styles.snippetGrid}>
            {disease.common_symptoms && (
              <div className={styles.snippet}>
                <span className={styles.snippetLabel}>
                  <Bug size={12} aria-hidden="true" /> Common Symptoms
                </span>
                <p className={styles.snippetText}>{disease.common_symptoms}</p>
              </div>
            )}
            {disease.causes && (
              <div className={styles.snippet}>
                <span className={styles.snippetLabel}>
                  <FileText size={12} aria-hidden="true" /> Causes
                </span>
                <p className={styles.snippetText}>{disease.causes}</p>
              </div>
            )}
          </div>
          <button
            id={`view-full-${disease.disease_id}`}
            className={styles.viewFullBtn}
            onClick={() => onViewFull(disease.disease_id)}
          >
            View full reference →
          </button>
        </div>
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Full detail modal (read-only view)
// ---------------------------------------------------------------------------
function DiseaseDetailModal({ diseaseId, onClose }) {
  const [disease, setDisease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!diseaseId) return;
    setLoading(true);
    setError(null);
    getDiseaseById(diseaseId).then(({ data, error: e }) => {
      if (e) setError(e.message);
      else   setDisease(data);
      setLoading(false);
    });
  }, [diseaseId]);

  return (
    <Modal
      id="disease-detail-modal"
      isOpen={!!diseaseId}
      onClose={onClose}
      title={disease?.disease_name ?? 'Disease Details'}
      size="lg"
    >
      {loading ? (
        <div className={styles.modalLoading}><LoadingSpinner size={24} /></div>
      ) : error ? (
        <p className={styles.modalError}>{error}</p>
      ) : disease ? (
        <div className={styles.modalBody}>
          <div className={styles.modalMeta}>
            <TypeBadge typeName={disease.livestock_types?.type_name} />
          </div>
          {disease.description && (
            <p className={styles.modalDesc}>{disease.description}</p>
          )}
          <div className={styles.detailGrid}>
            <DetailSection icon={Bug}        label="Common Symptoms"    content={disease.common_symptoms} />
            <DetailSection icon={FileText}   label="Causes"             content={disease.causes} />
            <DetailSection icon={ShieldCheck}label="Control & Prevention" content={disease.control_prevention} />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit Disease Modal (Admin only)
// ---------------------------------------------------------------------------
function DiseaseFormModal({ disease, livestockTypes, onSave, onClose }) {
  const isEdit = !!disease;
  const [name,        setName]        = useState(disease?.disease_name       ?? '');
  const [typeId,      setTypeId]      = useState(String(disease?.livestock_type_id ?? ''));
  const [description, setDescription] = useState(disease?.description        ?? '');
  const [symptoms,    setSymptoms]    = useState(disease?.common_symptoms     ?? '');
  const [causes,      setCauses]      = useState(disease?.causes              ?? '');
  const [prevention,  setPrevention]  = useState(disease?.control_prevention  ?? '');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  async function handleSave() {
    if (!name.trim() || !typeId) {
      setError('Disease name and livestock type are required.');
      return;
    }
    setSaving(true);
    setError('');
    const fields = {
      disease_name:       name.trim(),
      livestock_type_id:  Number(typeId),
      description:        description.trim() || null,
      common_symptoms:    symptoms.trim()    || null,
      causes:             causes.trim()      || null,
      control_prevention: prevention.trim()  || null,
    };
    const { error: saveErr } = isEdit
      ? await updateDisease(disease.disease_id, fields)
      : await createDisease(fields);
    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    onSave();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? `Edit — ${disease.disease_name}` : 'Add New Disease'}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button id="disease-form-cancel" variant="ghost" size="sm" onClick={onClose}>
            <X size={14} /> Cancel
          </Button>
          <Button id="disease-form-save" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} /> : <Save size={14} />}
            {isEdit ? 'Save Changes' : 'Add Disease'}
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
        <Input
          id="disease-name"
          label="Disease Name"
          required
          value={name}
          placeholder="e.g. Avian Influenza"
          onChange={e => setName(e.target.value)}
        />
        <Select
          id="disease-livestock-type"
          label="Livestock Type"
          value={typeId}
          onChange={e => setTypeId(e.target.value)}
        >
          <option value="">Select livestock type…</option>
          {livestockTypes.map(lt => (
            <option key={lt.livestock_type_id} value={lt.livestock_type_id}>
              {lt.type_name}
            </option>
          ))}
        </Select>
        <div style={{ gridColumn: '1 / -1' }}>
          <Input
            id="disease-description"
            label="Description"
            value={description}
            placeholder="Brief overview of the disease…"
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        <Input
          id="disease-symptoms"
          label="Common Symptoms"
          value={symptoms}
          placeholder="e.g. Fever, lethargy, loss of appetite…"
          onChange={e => setSymptoms(e.target.value)}
        />
        <Input
          id="disease-causes"
          label="Causes"
          value={causes}
          placeholder="e.g. Virus, bacteria, parasite…"
          onChange={e => setCauses(e.target.value)}
        />
        <div style={{ gridColumn: '1 / -1' }}>
          <Input
            id="disease-prevention"
            label="Control & Prevention"
            value={prevention}
            placeholder="e.g. Vaccination, quarantine, sanitation…"
            onChange={e => setPrevention(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------
function DeleteDiseaseModal({ disease, onConfirm, onClose, loading }) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Delete Disease"
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button id="delete-disease-cancel" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button id="delete-disease-confirm" variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw size={14} /> : <Trash2 size={14} />}
            Yes, Delete
          </Button>
        </div>
      }
    >
      <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        Are you sure you want to delete <strong>{disease?.disease_name}</strong>?
        This cannot be undone and may affect existing disease reports that reference it.
      </p>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters, onClear, isAdmin, onAdd }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <BookOpen size={30} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? 'No diseases match your filters' : 'Disease library is empty'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try clearing your search or changing the livestock type filter.'
          : isAdmin
            ? 'Click "Add Disease" to add the first entry.'
            : 'Diseases can be added by an administrator.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-disease-filters-btn" onClick={onClear}>
          Clear filters
        </Button>
      )}
      {!hasFilters && isAdmin && (
        <Button variant="primary" size="sm" id="empty-add-disease-btn" onClick={onAdd}>
          <Plus size={14} /> Add Disease
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiseaseLibrary — main page
// ---------------------------------------------------------------------------
export default function DiseaseLibrary() {
  const { role } = useAuth();
  const isAdmin  = role === 'admin';

  const [diseases,      setDiseases]      = useState([]);
  const [livestockTypes,setLivestockTypes]= useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // Filters
  const [search,          setSearch]          = useState('');
  const [livestockTypeId, setLivestockTypeId] = useState('');

  // Modals
  const [activeDiseaseId, setActiveDiseaseId] = useState(null); // view full
  const [editTarget,      setEditTarget]      = useState(null); // add/edit form
  const [deleteTarget,    setDeleteTarget]    = useState(null); // delete confirm
  const [showForm,        setShowForm]        = useState(false);
  const [deleteLoading,   setDeleteLoading]   = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    getLivestockTypes().then(({ data }) => setLivestockTypes(data ?? []));
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: e } = await getDiseases({ livestockTypeId: livestockTypeId || null });
    if (e) setError(e.message);
    else   setDiseases(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [livestockTypeId]); // eslint-disable-line

  const displayed = search
    ? diseases.filter(d =>
        d.disease_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : diseases;

  const hasFilters = !!(search || livestockTypeId);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error: delErr } = await deleteDisease(deleteTarget.disease_id);
    setDeleteLoading(false);
    if (delErr) { showToast(`Error: ${delErr.message}`); return; }
    setDeleteTarget(null);
    showToast(`"${deleteTarget.disease_name}" deleted.`);
    load();
  }

  function handleOpenAdd() {
    setEditTarget(null);
    setShowForm(true);
  }

  function handleOpenEdit(disease) {
    setEditTarget(disease);
    setShowForm(true);
  }

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
          <h1 className={styles.pageTitle}>Disease Library</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${displayed.length} disease${displayed.length !== 1 ? 's' : ''} in reference`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin ? (
            <Button id="add-disease-btn" variant="primary" size="sm" onClick={handleOpenAdd}>
              <Plus size={14} /> Add Disease
            </Button>
          ) : (
            <div className={styles.headerBadge}>
              <BookOpen size={15} aria-hidden="true" />
              Read-only reference
            </div>
          )}
        </div>
      </header>

      {/* Filters Bar */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <div className={styles.searchWrapper}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="disease-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search by disease name or description…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search diseases"
            />
          </div>
          <Select
            id="filter-livestock-type"
            label=""
            value={livestockTypeId}
            onChange={e => setLivestockTypeId(e.target.value)}
            aria-label="Filter by livestock type"
            className={styles.filterSelect}
          >
            <option value="">All Livestock Types</option>
            {livestockTypes.map(lt => (
              <option key={lt.livestock_type_id} value={lt.livestock_type_id}>
                {lt.type_name}
              </option>
            ))}
          </Select>
          {hasFilters && (
            <button
              id="clear-disease-filters-btn"
              className={styles.clearBtn}
              onClick={() => { setSearch(''); setLivestockTypeId(''); }}
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
            <Button id="retry-diseases-btn" variant="ghost" size="sm" onClick={load}>
              <RefreshCw size={13} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}><LoadingSpinner size={36} /></div>
      ) : displayed.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onClear={() => { setSearch(''); setLivestockTypeId(''); }}
          isAdmin={isAdmin}
          onAdd={handleOpenAdd}
        />
      ) : (
        <div className={styles.diseaseList} role="list" aria-label="Disease reference list">
          {displayed.map(disease => (
            <DiseaseCard
              key={disease.disease_id}
              disease={disease}
              isAdmin={isAdmin}
              onViewFull={setActiveDiseaseId}
              onEdit={handleOpenEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* View detail modal */}
      <DiseaseDetailModal
        diseaseId={activeDiseaseId}
        onClose={() => setActiveDiseaseId(null)}
      />

      {/* Add/Edit form modal (Admin only) */}
      {showForm && (
        <DiseaseFormModal
          disease={editTarget}
          livestockTypes={livestockTypes}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            showToast(editTarget ? 'Disease updated!' : 'New disease added!');
            load();
          }}
        />
      )}

      {/* Delete confirm modal (Admin only) */}
      {deleteTarget && (
        <DeleteDiseaseModal
          disease={deleteTarget}
          loading={deleteLoading}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
