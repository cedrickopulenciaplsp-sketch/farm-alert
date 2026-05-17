import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, RefreshCw, AlertCircle,
  CheckCircle2, XCircle, KeyRound, Edit2, X, Save, UserPlus,
} from 'lucide-react';
import { getUsers, getRoles, updateUser, flagPasswordReset, createUser } from '../../services/admin';
import { writeAuditLog } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { Input, Select } from '../../components/shared/FormElements';
import Modal from '../../components/shared/Modal';
import styles from './UserManagement.module.css';

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span className={`${styles.badge} ${isAdmin ? styles.badgeAdmin : styles.badgeOfficer}`}>
      {isAdmin ? 'Admin' : 'CVO Officer'}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ active }) {
  return (
    <span className={`${styles.statusBadge} ${active ? styles.statusActive : styles.statusInactive}`}>
      {active
        ? <><CheckCircle2 size={11} /> Active</>
        : <><XCircle size={11} /> Inactive</>
      }
    </span>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, roles, onSave, onClose }) {
  const [fullName, setFullName] = useState(user.full_name);
  const [username, setUsername] = useState(user.username);
  const [roleId,   setRoleId]   = useState(String(user.role_id));
  const [isActive, setIsActive] = useState(user.is_active);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    if (!fullName.trim() || !username.trim()) {
      setError('Full name and username are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: saveErr } = await updateUser(user.user_id, {
      full_name: fullName.trim(),
      username:  username.trim(),
      role_id:   Number(roleId),
      is_active: isActive,
    });
    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    onSave();
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit User — ${user.full_name}`} size="md"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button id="edit-user-cancel" variant="ghost" size="sm" onClick={onClose}>
            <X size={14} /> Cancel
          </Button>
          <Button id="edit-user-save" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} className={styles.spin} /> : <Save size={14} />}
            Save Changes
          </Button>
        </div>
      }
    >
      {error && (
        <div className={styles.modalError}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      <div className={styles.formGrid}>
        <Input
          id="edit-full-name"
          label="Full Name"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />
        <Input
          id="edit-username"
          label="Username / Email"
          required
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <Select
          id="edit-role"
          label="Role"
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
        >
          {roles.map(r => (
            <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
          ))}
        </Select>
        <div className={styles.toggleField}>
          <span className={styles.toggleLabel}>Account Status</span>
          <button
            id="edit-user-active-toggle"
            type="button"
            className={`${styles.toggle} ${isActive ? styles.toggleOn : ''}`}
            onClick={() => setIsActive(v => !v)}
            aria-checked={isActive}
            role="switch"
          >
            <span className={styles.toggleThumb} />
          </button>
          <span className={styles.toggleValue}>{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>
    </Modal>
  );
}

// ── Add User Modal ─────────────────────────────────────────────────────────────
function AddUserModal({ onCreated, onClose }) {
  const [email,    setEmail]    = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function handleCreate() {
    if (!email.trim() || !fullName.trim() || !password) {
      setError('Email, full name, and password are all required.');
      return;
    }
    if (password.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: createErr } = await createUser({
      email:    email.trim(),
      fullName: fullName.trim(),
      roleId:   1, // Always CVO Officer — change via Edit if needed
      password,
    });
    setSaving(false);
    if (createErr) { setError(createErr.message); return; }
    onCreated();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add New Officer Account"
      size="md"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button id="add-user-cancel" variant="ghost" size="sm" onClick={onClose}>
            <X size={14} /> Cancel
          </Button>
          <Button id="add-user-create" variant="primary" size="sm" onClick={handleCreate} disabled={saving}>
            {saving ? <RefreshCw size={14} className={styles.spin} /> : <UserPlus size={14} />}
            Create Account
          </Button>
        </div>
      }
    >
      {error && (
        <div className={styles.modalError}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      <div className={styles.formGrid}>
        <Input
          id="add-full-name"
          label="Full Name"
          required
          value={fullName}
          placeholder="e.g. Juan dela Cruz"
          onChange={e => setFullName(e.target.value)}
        />
        <Input
          id="add-email"
          label="Email Address"
          type="email"
          required
          value={email}
          placeholder="officer@sanpablocity.gov.ph"
          onChange={e => setEmail(e.target.value)}
        />
        <Input
          id="add-temp-password"
          label="Temporary Password"
          type="password"
          required
          value={password}
          placeholder="Min. 8 characters"
          onChange={e => setPassword(e.target.value)}
        />
      </div>
      <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
        💡 New accounts are created as <strong>CVO Officers</strong> by default. Use the <strong>Edit</strong> button to change the role after creation.
        The user will be required to set a new password on their first login.
      </p>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { profile: currentUserProfile } = useAuth();
  const [users,   setUsers]   = useState([]);
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [editTarget,   setEditTarget]   = useState(null);
  const [resetTarget,  setResetTarget]  = useState(null);
  const [showAddUser,  setShowAddUser]  = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: uData, error: uErr }, { data: rData }] = await Promise.all([
      getUsers(), getRoles(),
    ]);
    if (uErr) { setError(uErr.message); setLoading(false); return; }
    // Filter out any null entries Supabase might return (e.g. from RLS)
    setUsers((uData ?? []).filter(Boolean));
    setRoles((rData ?? []).filter(Boolean));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    if (!u) return false; // Prevent crash if Supabase returns a null row somehow
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.roles?.role_name || '').toLowerCase().includes(q)
    );
  });

  async function handleSaveEdit() {
    await writeAuditLog({
      userId:      currentUserProfile?.user_id,
      action:      `Updated user profile: ${editTarget?.full_name ?? 'Unknown'}`,
      targetTable: 'users',
      targetId:    editTarget?.user_id,
    });
    setEditTarget(null);
    showToast('User updated successfully.');
    load();
  }

  async function handleFlagReset() {
    setActionLoading(true);
    const { error: err } = await flagPasswordReset(resetTarget?.user_id);
    setActionLoading(false);
    if (err) { showToast(err.message, 'error'); }
    else {
      await writeAuditLog({
        userId:      currentUserProfile?.user_id,
        action:      `Flagged password reset for: ${resetTarget?.full_name ?? 'Unknown'}`,
        targetTable: 'users',
        targetId:    resetTarget?.user_id,
      });
      showToast(`Password reset flagged for ${resetTarget?.full_name ?? 'this user'}.`);
    }
    setResetTarget(null);
    load();
  }

  return (
    <div className={styles.page}>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.type === 'error' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            id="user-search"
            type="search"
            className={styles.searchInput}
            placeholder="Search by name, username, or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button id="add-user-btn" variant="primary" size="sm" onClick={() => setShowAddUser(true)}>
            <UserPlus size={14} /> Add User
          </Button>
          <Button id="refresh-users-btn" variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <Card>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} className={styles.errorIcon} />
            <p>{error}</p>
            <Button id="retry-users-btn" variant="ghost" size="sm" onClick={load}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <div className={styles.loadingWrapper}><LoadingSpinner size={36} /></div>
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table} aria-label="Users table">
              <thead>
                <tr>
                  <th className={styles.th}>User</th>
                  <th className={styles.th}>Username</th>
                  <th className={styles.th}>Role</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Pwd Reset?</th>
                  <th className={styles.th}>Joined</th>
                  <th className={styles.th} style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>
                      <Users size={24} />
                      <span>No users found</span>
                    </td>
                  </tr>
                ) : filtered.map(u => (
                  <tr key={u.user_id} className={styles.row}>
                    <td className={styles.cellMain}>
                      <div className={styles.avatar}>
                        {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className={styles.userName}>{u.full_name || 'Unknown User'}</span>
                    </td>
                    <td className={styles.cell}>{u.username}</td>
                    <td className={styles.cell}>
                      <RoleBadge role={u.roles?.role_name} />
                    </td>
                    <td className={styles.cell}>
                      <StatusBadge active={u.is_active} />
                    </td>
                    <td className={styles.cell}>
                      {u.requires_password_change
                        ? <span className={styles.flagOn}>Pending</span>
                        : <span className={styles.flagOff}>—</span>
                      }
                    </td>
                    <td className={styles.cell}>
                      {new Date(u.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td className={styles.cellActions}>
                      <button
                        id={`edit-user-${u.user_id}`}
                        className={styles.actionBtn}
                        title="Edit user"
                        onClick={() => setEditTarget(u)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        id={`reset-pwd-${u.user_id}`}
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        title="Flag for password reset"
                        onClick={() => setResetTarget(u)}
                        disabled={u.requires_password_change}
                      >
                        <KeyRound size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFooter}>
            <span className={styles.count}>
              {filtered.length} user{filtered.length !== 1 ? 's' : ''}
              {search ? ' (filtered)' : ''}
            </span>
          </div>
        </Card>
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditUserModal
          user={editTarget}
          roles={roles}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Reset password confirm modal */}
      {resetTarget && (
        <Modal
          isOpen
          onClose={() => setResetTarget(null)}
          title="Flag Password Reset"
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button id="reset-cancel-btn" variant="ghost" size="sm" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button
                id="reset-confirm-btn"
                variant="danger"
                size="sm"
                onClick={handleFlagReset}
                disabled={actionLoading}
              >
                {actionLoading ? <RefreshCw size={14} className={styles.spin} /> : <KeyRound size={14} />}
                Yes, Flag Reset
              </Button>
            </div>
          }
        >
          <p className={styles.confirmText}>
            This will require <strong>{resetTarget.full_name}</strong> to set a new password on their next login. Continue?
          </p>
        </Modal>
      )}

      {/* Add user modal */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onCreated={async () => {
            await writeAuditLog({
              userId:      currentUserProfile?.user_id,
              action:      'Created new user account via Admin Panel',
              targetTable: 'users',
              targetId:    null,
            });
            setShowAddUser(false);
            showToast('New user account created successfully!');
            load();
          }}
        />
      )}
    </div>
  );
}
