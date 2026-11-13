import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  MagnifyingGlass as Search,
  MapPin,
  PencilSimple as Edit2,
  CheckCircle as CheckCircle2,
  Prohibit as Ban,
  Buildings,
  TreeEvergreen as Trees,
  ArrowsClockwise as RefreshCw,
} from '@phosphor-icons/react';
import { getBarangays, toggleBarangayStatus } from '../../services/barangays';
import { writeAuditLog } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { Select } from '../../components/shared/FormElements';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import BarangayModal from '../../components/admin/BarangayModal';
import styles from './BarangayManagement.module.css';

export default function BarangayManagement() {
  const { profile } = useAuth();

  const [barangays, setBarangays]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Filters
  const [search, setSearch]             = useState('');
  const [classification, setClassification] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingBarangay, setEditingBarangay] = useState(null);
  const [togglingId, setTogglingId]     = useState(null);

  const loadBarangays = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getBarangays({ onlyActive: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setBarangays(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBarangays();
  }, [loadBarangays]);

  // Filtered list
  const filteredBarangays = useMemo(() => {
    return barangays.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = b.barangay_name?.toLowerCase().includes(q);
        const matchContact = b.contact_person?.toLowerCase().includes(q);
        if (!matchName && !matchContact) return false;
      }
      if (classification !== '' && String(b.classification) !== classification) {
        return false;
      }
      if (statusFilter === 'active' && !b.is_active) return false;
      if (statusFilter === 'inactive' && b.is_active) return false;
      return true;
    });
  }, [barangays, search, classification, statusFilter]);

  // KPI counters
  const stats = useMemo(() => {
    const total  = barangays.length;
    const rural  = barangays.filter((b) => Number(b.classification) === 0).length;
    const urban  = barangays.filter((b) => Number(b.classification) === 1).length;
    const active = barangays.filter((b) => b.is_active).length;
    return { total, rural, urban, active };
  }, [barangays]);

  function handleOpenCreate() {
    setEditingBarangay(null);
    setModalOpen(true);
  }

  function handleOpenEdit(barangay) {
    setEditingBarangay(barangay);
    setModalOpen(true);
  }

  async function handleModalSuccess(saved) {
    setModalOpen(false);
    await writeAuditLog({
      userId:      profile?.user_id,
      action:      editingBarangay
        ? `Updated barangay '${saved.barangay_name}' (${Number(saved.latitude).toFixed(4)}, ${Number(saved.longitude).toFixed(4)})`
        : `Added new barangay '${saved.barangay_name}' to Masterlist`,
      targetTable: 'barangays',
      targetId:    String(saved.barangay_id),
    });
    loadBarangays();
  }

  async function handleToggleStatus(b) {
    setTogglingId(b.barangay_id);
    const nextActive = !b.is_active;
    const { error: toggleErr } = await toggleBarangayStatus(b.barangay_id, nextActive);
    if (!toggleErr) {
      setBarangays((prev) =>
        prev.map((row) =>
          row.barangay_id === b.barangay_id ? { ...row, is_active: nextActive } : row
        )
      );
      await writeAuditLog({
        userId:      profile?.user_id,
        action:      `${nextActive ? 'Enabled' : 'Disabled'} barangay '${b.barangay_name}' in Masterlist`,
        targetTable: 'barangays',
        targetId:    String(b.barangay_id),
      });
    }
    setTogglingId(null);
  }

  const hasFilters = !!(search || classification !== '' || statusFilter !== '');

  return (
    <div className={`${styles.page} page-enter`}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Barangay Masterlist</h1>
          <p className={styles.pageSubtitle}>
            Manage San Pablo City barangays and official Barangay Hall GPS coordinates for automatic farm georeferencing.
          </p>
        </div>
        <Button
          id="add-barangay-btn"
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Add Barangay
        </Button>
      </header>

      {/* ── KPI Summary Row ──────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
            <MapPin size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.total}</p>
            <p className={styles.statLabel}>Total Barangays</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: 'hsl(145, 55%, 92%)', color: 'hsl(145, 60%, 26%)' }}>
            <Trees size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.rural}</p>
            <p className={styles.statLabel}>Rural (Agricultural)</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: 'hsl(212, 80%, 93%)', color: 'hsl(212, 75%, 34%)' }}>
            <Buildings size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.urban}</p>
            <p className={styles.statLabel}>Urban (Poblacion)</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: 'hsl(145, 55%, 92%)', color: 'hsl(145, 60%, 26%)' }}>
            <CheckCircle2 size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.active}</p>
            <p className={styles.statLabel}>Active in Dropdowns</p>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="barangay-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search barangay name or focal person…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search barangays"
            />
          </div>

          <Select
            id="filter-barangay-classification"
            label=""
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            aria-label="Filter by classification"
            className={styles.filterSelect}
          >
            <option value="">All Classifications</option>
            <option value="0">Rural (Agricultural)</option>
            <option value="1">Urban (Poblacion)</option>
          </Select>

          <Select
            id="filter-barangay-status"
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>

          {hasFilters && (
            <button
              id="clear-barangay-filters-btn"
              className={styles.clearBtn}
              onClick={() => {
                setSearch('');
                setClassification('');
                setStatusFilter('');
              }}
            >
              Clear
            </button>
          )}
        </Card.Body>
      </Card>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {error ? (
        <Card className={styles.tableCard}>
          <Card.Body style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ color: 'var(--color-danger)' }}>{error}</span>
            <Button variant="ghost" size="sm" onClick={loadBarangays}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <Card className={styles.tableCard}>
          <SkeletonLoader rows={8} columns={6} type="table" />
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Barangay masterlist table">
              <thead>
                <tr>
                  <th className={styles.th}>Barangay Name</th>
                  <th className={styles.th}>Classification</th>
                  <th className={styles.th}>Barangay Hall Coordinates</th>
                  <th className={styles.th}>Focal Person / Contact</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBarangays.map((b) => {
                  const isRural = Number(b.classification) === 0;
                  return (
                    <tr key={b.barangay_id} className={styles.row}>
                      <td className={styles.cell}>
                        <span className={styles.brgyName}>{b.barangay_name}</span>
                      </td>

                      <td className={styles.cell}>
                        <span className={`${styles.classBadge} ${isRural ? styles.classRural : styles.classUrban}`}>
                          {isRural ? 'Rural' : 'Urban'}
                        </span>
                      </td>

                      <td className={styles.cell}>
                        <span className={styles.coordsCell}>
                          <MapPin size={12} style={{ color: 'var(--color-brand)' }} aria-hidden="true" />
                          {Number(b.latitude).toFixed(6)}, {Number(b.longitude).toFixed(6)}
                        </span>
                      </td>

                      <td className={styles.cell}>
                        {b.contact_person || b.contact_number ? (
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              {b.contact_person || '—'}
                            </div>
                            {b.contact_number && (
                              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                {b.contact_number}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>

                      <td className={styles.cell}>
                        <span className={`${styles.statusBadge} ${b.is_active ? styles.statusActive : styles.statusInactive}`}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className={styles.cell}>
                        <div className={styles.actionsCell}>
                          <Button
                            id={`edit-barangay-${b.barangay_id}`}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(b)}
                          >
                            <Edit2 size={13} aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            id={`toggle-barangay-${b.barangay_id}`}
                            variant="ghost"
                            size="sm"
                            loading={togglingId === b.barangay_id}
                            onClick={() => handleToggleStatus(b)}
                          >
                            {b.is_active ? (
                              <>
                                <Ban size={13} aria-hidden="true" />
                                Disable
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} aria-hidden="true" />
                                Enable
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFooter}>
            Showing {filteredBarangays.length} of {barangays.length} barangays
          </div>
        </Card>
      )}

      {/* ── Add / Edit Barangay Modal ────────────────────────────────────── */}
      <BarangayModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialData={editingBarangay}
        existingBarangays={barangays}
      />
    </div>
  );
}
