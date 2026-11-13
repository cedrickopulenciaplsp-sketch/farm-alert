import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  MagnifyingGlass as Search,
  Users,
  ShieldCheck,
  UserGear,
  Tractor,
  PencilSimple as Edit2,
  CheckCircle as CheckCircle2,
  Prohibit as Ban,
  ArrowsClockwise as RefreshCw,
} from '@phosphor-icons/react';
import {
  ROLE_LABELS,
  getAccounts,
  setAccountActive,
  normalizeEmail,
} from '../../services/accounts';
import { getFarms } from '../../services/farms';
import { writeAuditLog } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';
import { Select } from '../../components/shared/FormElements';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import AccountModal from '../../components/admin/AccountModal';
import styles from './UserManagement.module.css';

export default function UserManagement() {
  const { user, profile } = useAuth();
  const currentUserEmail = normalizeEmail(user?.email);

  const [accounts, setAccounts]       = useState([]);
  const [farms, setFarms]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  // Filters
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen]         = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [togglingId, setTogglingId]       = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [accRes, farmsRes] = await Promise.all([
      getAccounts(),
      getFarms(),
    ]);
    if (accRes.error) {
      setError(accRes.error.message);
    } else {
      setAccounts(accRes.data ?? []);
    }
    if (farmsRes.data) {
      setFarms(farmsRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName  = a.display_name?.toLowerCase().includes(q);
        const matchEmail = a.email?.toLowerCase().includes(q);
        const matchFarm  = a.farm_name?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchFarm) return false;
      }
      if (roleFilter && a.role !== roleFilter) return false;
      if (statusFilter === 'active' && !a.is_active) return false;
      if (statusFilter === 'inactive' && a.is_active) return false;
      return true;
    });
  }, [accounts, search, roleFilter, statusFilter]);

  // KPI counters
  const stats = useMemo(() => {
    const total   = accounts.length;
    const admins  = accounts.filter((a) => a.role === 'admin').length;
    const staff   = accounts.filter((a) => a.role === 'cvo_staff').length;
    const farmers = accounts.filter((a) => a.role === 'farmer').length;
    return { total, admins, staff, farmers };
  }, [accounts]);

  function handleOpenCreate() {
    setEditingAccount(null);
    setModalOpen(true);
  }

  function handleOpenEdit(account) {
    setEditingAccount(account);
    setModalOpen(true);
  }

  async function handleModalSuccess(saved, { previous }) {
    setModalOpen(false);
    await writeAuditLog({
      userId:      profile?.user_id,
      action:      previous
        ? `Updated account '${saved.email}' (role: ${ROLE_LABELS[saved.role] || saved.role})`
        : `Authorized new Google account '${saved.email}' as ${ROLE_LABELS[saved.role] || saved.role}`,
      targetTable: 'users',
      targetId:    String(saved.account_id),
    });
    loadData();
  }

  async function handleToggleStatus(acc) {
    setTogglingId(acc.account_id);
    const nextActive = !acc.is_active;
    const { error: toggleErr } = await setAccountActive(acc.account_id, nextActive, acc.email);
    if (!toggleErr) {
      setAccounts((prev) =>
        prev.map((row) =>
          row.account_id === acc.account_id ? { ...row, is_active: nextActive } : row
        )
      );
      await writeAuditLog({
        userId:      profile?.user_id,
        action:      `${nextActive ? 'Reactivated' : 'Suspended'} account '${acc.email}'`,
        targetTable: 'users',
        targetId:    String(acc.account_id),
      });
    }
    setTogglingId(null);
  }

  function renderRoleBadge(role) {
    const cls =
      role === 'admin'
        ? styles.roleAdmin
        : role === 'farmer'
        ? styles.roleFarmer
        : styles.roleStaff;
    return (
      <span className={`${styles.roleBadge} ${cls}`}>
        {ROLE_LABELS[role] || role}
      </span>
    );
  }

  function renderSourceTag(source) {
    const label =
      source === 'farm_registry'
        ? 'Farm Registry'
        : source === 'system'
        ? 'CVO Core Team'
        : 'Admin Authorized';
    return <span className={styles.sourceTag}>{label}</span>;
  }

  const hasFilters = !!(search || roleFilter || statusFilter);

  return (
    <div className={`${styles.page} page-enter`}>
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>User Accounts & Access Control</h1>
          <p className={styles.pageSubtitle}>
            Manage authorized Google accounts, assign CVO personnel roles, and link registered farm holdings.
          </p>
        </div>
        <Button
          id="authorize-account-btn"
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          Authorize Account
        </Button>
      </header>

      {/* ── KPI Summary Row ──────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
            <Users size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.total}</p>
            <p className={styles.statLabel}>Registered Accounts</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#fef3c7', color: '#b45309' }}>
            <ShieldCheck size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.admins}</p>
            <p className={styles.statLabel}>City Veterinarian (Admin)</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: '#dbeafe', color: '#1d4ed8' }}>
            <UserGear size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.staff}</p>
            <p className={styles.statLabel}>Veterinary Inspectors (Staff)</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: 'hsl(145, 55%, 92%)', color: 'hsl(145, 60%, 26%)' }}>
            <Tractor size={18} weight="duotone" />
          </div>
          <div>
            <p className={styles.statValue}>{stats.farmers}</p>
            <p className={styles.statLabel}>Linked Farmers (Mobile Portal)</p>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────── */}
      <Card className={styles.filtersCard}>
        <Card.Body className={styles.filtersBody}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              id="account-search"
              type="search"
              className={styles.searchInput}
              placeholder="Search name, Google email, or linked farm…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search user accounts"
            />
          </div>

          <Select
            id="filter-account-role"
            label=""
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter by role"
            className={styles.filterSelect}
          >
            <option value="">All Roles</option>
            <option value="admin">City Veterinarian (Admin)</option>
            <option value="cvo_staff">Veterinary Inspector (Staff)</option>
            <option value="farmer">Livestock Raiser (Farmer)</option>
          </Select>

          <Select
            id="filter-account-status"
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Suspended</option>
          </Select>

          {hasFilters && (
            <button
              id="clear-account-filters-btn"
              className={styles.clearBtn}
              onClick={() => {
                setSearch('');
                setRoleFilter('');
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
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <Card className={styles.tableCard}>
          <SkeletonLoader rows={6} columns={6} type="table" />
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="User accounts table">
              <thead>
                <tr>
                  <th className={styles.th}>Name / Google Account</th>
                  <th className={styles.th}>Assigned Role</th>
                  <th className={styles.th}>Linked Farm Holding</th>
                  <th className={styles.th}>Enrollment Source</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acc) => {
                  const isSelf = normalizeEmail(acc.email) === currentUserEmail;
                  return (
                    <tr key={acc.account_id} className={styles.row}>
                      <td className={styles.cell}>
                        <div className={styles.userCell}>
                          <span className={styles.userName}>
                            {acc.display_name}
                            {isSelf && (
                              <span style={{ fontSize: '11px', color: 'var(--color-brand)', marginLeft: 6, fontWeight: 600 }}>
                                (You)
                              </span>
                            )}
                          </span>
                          <span className={styles.userEmail}>{acc.email}</span>
                        </div>
                      </td>

                      <td className={styles.cell}>
                        {renderRoleBadge(acc.role)}
                      </td>

                      <td className={styles.cell}>
                        {acc.role === 'farmer' ? (
                          acc.farm_name ? (
                            <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                              {acc.farm_name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              Unlinked holding
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                        )}
                      </td>

                      <td className={styles.cell}>
                        {renderSourceTag(acc.source)}
                      </td>

                      <td className={styles.cell}>
                        <span className={`${styles.statusBadge} ${acc.is_active ? styles.statusActive : styles.statusInactive}`}>
                          {acc.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className={styles.cell}>
                        <div className={styles.actionsCell}>
                          <Button
                            id={`edit-account-${acc.account_id}`}
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(acc)}
                          >
                            <Edit2 size={13} aria-hidden="true" />
                            Edit
                          </Button>
                          {!isSelf && acc.role !== 'admin' && (
                            <Button
                              id={`toggle-account-${acc.account_id}`}
                              variant="ghost"
                              size="sm"
                              loading={togglingId === acc.account_id}
                              onClick={() => handleToggleStatus(acc)}
                            >
                              {acc.is_active ? (
                                <>
                                  <Ban size={13} aria-hidden="true" />
                                  Suspend
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} aria-hidden="true" />
                                  Activate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFooter}>
            Showing {filteredAccounts.length} of {accounts.length} registered accounts
          </div>
        </Card>
      )}

      {/* ── Authorize / Edit Account Modal ───────────────────────────────── */}
      <AccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialData={editingAccount}
        existingAccounts={accounts}
        farms={farms}
        currentUserEmail={currentUserEmail}
      />
    </div>
  );
}
