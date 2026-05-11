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
} from 'lucide-react';
import { getDiseases, getDiseaseById } from '../../services/diseases';
import { getLivestockTypes } from '../../services/farms';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import Modal from '../../components/shared/Modal';
import { Select } from '../../components/shared/FormElements';
import styles from './DiseaseLibrary.module.css';

// ---------------------------------------------------------------------------
// Severity badge — maps livestock_type to a colour tag
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
// Detail section row inside the modal
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
// Disease Card — accordion style with expand/collapse
// ---------------------------------------------------------------------------
function DiseaseCard({ disease, onViewFull }) {
  const [open, setOpen] = useState(false);
  const typeName = disease.livestock_types?.type_name ?? '—';

  return (
    <article className={styles.diseaseCard} aria-label={disease.disease_name}>
      {/* Card header — always visible */}
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
          <span className={styles.viewFull}
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

      {/* Accordion body */}
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
// Full detail modal
// ---------------------------------------------------------------------------
function DiseaseDetailModal({ diseaseId, onClose }) {
  const [disease, setDisease]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

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
        <div className={styles.modalLoading}>
          <LoadingSpinner size={24} />
        </div>
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
            <DetailSection
              icon={Bug}
              label="Common Symptoms"
              content={disease.common_symptoms}
            />
            <DetailSection
              icon={FileText}
              label="Causes"
              content={disease.causes}
            />
            <DetailSection
              icon={ShieldCheck}
              label="Control & Prevention"
              content={disease.control_prevention}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters, onClear }) {
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
          : 'Diseases can be added by an administrator.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-disease-filters-btn" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiseaseLibrary — main page
// ---------------------------------------------------------------------------
export default function DiseaseLibrary() {
  const [diseases, setDiseases]             = useState([]);
  const [livestockTypes, setLivestockTypes] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  // Filters
  const [search, setSearch]               = useState('');
  const [livestockTypeId, setLivestockTypeId] = useState('');

  // Detail modal
  const [activeDiseaseId, setActiveDiseaseId] = useState(null);

  // ---------------------------------------------------------------------------
  // Load livestock types once
  // ---------------------------------------------------------------------------
  useEffect(() => {
    getLivestockTypes().then(({ data }) => setLivestockTypes(data ?? []));
  }, []);

  // ---------------------------------------------------------------------------
  // Load (and re-load on filter change)
  // ---------------------------------------------------------------------------
  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: e } = await getDiseases({
      livestockTypeId: livestockTypeId || null,
    });
    if (e) {
      setError(e.message);
    } else {
      setDiseases(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [livestockTypeId]); // eslint-disable-line

  // ---------------------------------------------------------------------------
  // Client-side search filter (avoids extra Supabase calls on every keystroke)
  // ---------------------------------------------------------------------------
  const displayed = search
    ? diseases.filter(d =>
        d.disease_name.toLowerCase().includes(search.toLowerCase()) ||
        (d.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : diseases;

  const hasFilters = !!(search || livestockTypeId);

  const handleClear = () => {
    setSearch('');
    setLivestockTypeId('');
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.page}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Disease Library</h1>
          <p className={styles.pageSubtitle}>
            {loading
              ? 'Loading…'
              : `${displayed.length} disease${displayed.length !== 1 ? 's' : ''} in reference`}
          </p>
        </div>
        <div className={styles.headerBadge}>
          <BookOpen size={15} aria-hidden="true" />
          Read-only reference
        </div>
      </header>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
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
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </Card.Body>
      </Card>

      {/* ── Content ─────────────────────────────────────────────────────── */}
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
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size={36} />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={handleClear} />
      ) : (
        <div className={styles.diseaseList} role="list" aria-label="Disease reference list">
          {displayed.map(disease => (
            <DiseaseCard
              key={disease.disease_id}
              disease={disease}
              onViewFull={setActiveDiseaseId}
            />
          ))}
        </div>
      )}

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <DiseaseDetailModal
        diseaseId={activeDiseaseId}
        onClose={() => setActiveDiseaseId(null)}
      />
    </div>
  );
}
