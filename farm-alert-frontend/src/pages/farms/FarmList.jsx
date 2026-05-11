import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Tractor,
  MapPin,
  Phone,
  Edit2,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getFarms, getBarangays, getLivestockTypes } from '../../services/farms';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Select } from '../../components/shared/FormElements';
import styles from './FarmList.module.css';

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const cls =
    status === 'Active'     ? styles.badgeActive     :
    status === 'Quarantine' ? styles.badgeQuarantine :
                              styles.badgeInactive;
  return (
    <span className={`${styles.badge} ${cls}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FarmRow — single table row
// ---------------------------------------------------------------------------
function FarmRow({ farm, onEdit }) {
  const navigate = useNavigate();

  const handleRowClick = () => navigate(`/farms/${farm.farm_id}/edit`);

  return (
    <tr className={styles.row} onClick={handleRowClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleRowClick()}
      aria-label={`View details for ${farm.farm_name}`}
    >
      <td className={styles.cellMain}>
        <div className={styles.farmName}>
          <div className={styles.farmIcon}>
            <Tractor size={14} aria-hidden="true" />
          </div>
          <div>
            <p className={styles.nameText}>{farm.farm_name}</p>
            <p className={styles.ownerText}>{farm.owner_name}</p>
          </div>
        </div>
      </td>
      <td className={styles.cell}>
        <div className={styles.cellWithIcon}>
          <MapPin size={13} className={styles.cellIcon} aria-hidden="true" />
          <span>{farm.barangay_name}</span>
        </div>
      </td>
      <td className={styles.cell}>
        <span className={styles.typeTag}>{farm.livestock_type_name}</span>
      </td>
      <td className={styles.cell}>
        {farm.contact_number ? (
          <div className={styles.cellWithIcon}>
            <Phone size={13} className={styles.cellIcon} aria-hidden="true" />
            <span>{farm.contact_number}</span>
          </div>
        ) : (
          <span className={styles.noData}>—</span>
        )}
      </td>
      <td className={styles.cell}>
        {farm.head_count != null
          ? <span className={styles.animalCount}>{farm.head_count.toLocaleString()}</span>
          : <span className={styles.noData}>—</span>
        }
      </td>
      <td className={styles.cell}>
        <StatusBadge status={farm.status} />
      </td>
      <td className={styles.cellAction} onClick={(e) => e.stopPropagation()}>
        <button
          id={`edit-farm-${farm.farm_id}`}
          className={styles.editBtn}
          onClick={() => onEdit(farm.farm_id)}
          aria-label={`Edit ${farm.farm_name}`}
          title="Edit farm"
        >
          <Edit2 size={14} />
        </button>
        <ChevronRight size={14} className={styles.chevron} aria-hidden="true" />
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters, onClear }) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Tractor size={32} aria-hidden="true" />
      </div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? 'No farms match your filters' : 'No farms registered yet'}
      </h3>
      <p className={styles.emptyDesc}>
        {hasFilters
          ? 'Try adjusting your search or clearing filters.'
          : 'Get started by registering the first farm in the system.'}
      </p>
      {hasFilters && (
        <Button variant="ghost" size="sm" id="clear-filters-btn" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FarmList — main page
// ---------------------------------------------------------------------------
export default function FarmList() {
  const navigate = useNavigate();

  // Data state
  const [farms, setFarms]               = useState([]);
  const [barangays, setBarangays]       = useState([]);
  const [livestockTypes, setLivestockTypes] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Filter state
  const [search, setSearch]             = useState('');
  const [barangayId, setBarangayId]     = useState('');
  const [livestockTypeId, setLivestockTypeId] = useState('');
  const [status, setStatus]             = useState('');

  // ---------------------------------------------------------------------------
  // Load reference data (barangays, livestock types) once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadRefs() {
      const [bRes, ltRes] = await Promise.all([getBarangays(), getLivestockTypes()]);
      if (!bRes.error)  setBarangays(bRes.data ?? []);
      if (!ltRes.error) setLivestockTypes(ltRes.data ?? []);
    }
    loadRefs();
  }, []);

  // ---------------------------------------------------------------------------
  // Load farms whenever filters change (debounced for search)
  // ---------------------------------------------------------------------------
  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getFarms({
      search,
      barangayId: barangayId || null,
      status: status || null,
    });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      // Client-side livestock type filter (PostgREST can't filter on the view's
      // joined column by FK id directly without extra setup)
      let result = data ?? [];
      if (livestockTypeId) {
        result = result.filter(f => String(f.livestock_type_id) === String(livestockTypeId));
      }
      setFarms(result);
    }
    setLoading(false);
  }, [search, barangayId, livestockTypeId, status]);

  // Debounce the search input so we don't fire on every keystroke
  useEffect(() => {
    const timer = setTimeout(loadFarms, 300);
    return () => clearTimeout(timer);
  }, [loadFarms]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleClearFilters = () => {
    setSearch('');
    setBarangayId('');
    setLivestockTypeId('');
    setStatus('');
  };

  const hasFilters = !!(search || barangayId || livestockTypeId || status);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.page}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Farm Registry</h1>
          <p className={styles.pageSubtitle}>
            {loading ? 'Loading…' : `${farms.length} farm${farms.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
        <Button
          id="add-farm-btn"
          variant="primary"
          size="md"
          onClick={() => navigate('/farms/new')}
        >
          <Plus size={16} aria-hidden="true" />
          Register Farm
        </Button>
      </header>

      {/* ── Filters Bar ─────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="farm-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search by farm name or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search farms"
            />
          </div>

          {/* Barangay filter */}
          <Select
            id="filter-barangay"
            label=""
            value={barangayId}
            onChange={(e) => setBarangayId(e.target.value)}
            aria-label="Filter by barangay"
            className={styles.filterSelect}
          >
            <option value="">All Barangays</option>
            {barangays.map(b => (
              <option key={b.barangay_id} value={b.barangay_id}>
                {b.barangay_name}
              </option>
            ))}
          </Select>

          {/* Livestock type filter */}
          <Select
            id="filter-livestock-type"
            label=""
            value={livestockTypeId}
            onChange={(e) => setLivestockTypeId(e.target.value)}
            aria-label="Filter by livestock type"
            className={styles.filterSelect}
          >
            <option value="">All Types</option>
            {livestockTypes.map(lt => (
              <option key={lt.livestock_type_id} value={lt.livestock_type_id}>
                {lt.type_name}
              </option>
            ))}
          </Select>

          {/* Status filter */}
          <Select
            id="filter-status"
            label=""
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className={styles.filterSelect}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Quarantine">Quarantine</option>
          </Select>

          {/* Filter icon + clear */}
          <div className={styles.filterActions}>
            <Filter size={15} className={styles.filterIcon} aria-hidden="true" />
            {hasFilters && (
              <button
                id="clear-filters-inline-btn"
                className={styles.clearBtn}
                onClick={handleClearFilters}
                aria-label="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* ── Table / States ──────────────────────────────────────────────── */}
      {error ? (
        <Card className={styles.errorCard}>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} className={styles.errorIcon} />
            <p className={styles.errorText}>{error}</p>
            <Button
              id="retry-farms-btn"
              variant="ghost"
              size="sm"
              onClick={loadFarms}
            >
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}>
          <LoadingSpinner size={36} />
        </div>
      ) : farms.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={handleClearFilters} />
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Farm registry table">
              <thead>
                <tr>
                  <th className={styles.th}>Farm / Owner</th>
                  <th className={styles.th}>Barangay</th>
                  <th className={styles.th}>Livestock</th>
                  <th className={styles.th}>Contact</th>
                  <th className={styles.th}>Animals</th>
                  <th className={styles.th}>Status</th>
                  <th className={`${styles.th} ${styles.thAction}`}></th>
                </tr>
              </thead>
              <tbody>
                {farms.map(farm => (
                  <FarmRow
                    key={farm.farm_id}
                    farm={farm}
                    onEdit={(id) => navigate(`/farms/${id}/edit`)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer — record count */}
          <div className={styles.tableFooter}>
            <span className={styles.recordCount}>
              Showing {farms.length} record{farms.length !== 1 ? 's' : ''}
              {hasFilters ? ' (filtered)' : ''}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
