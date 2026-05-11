import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

// ---------------------------------------------------------------------------
// Derive initials from an email for the avatar fallback
// ---------------------------------------------------------------------------
function getInitials(email) {
  if (!email) return 'U';
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Derive a friendly role label
// ---------------------------------------------------------------------------
function getRoleLabel(role) {
  if (role === 'admin') return 'Administrator';
  if (role === 'cvo_officer') return 'CVO Officer';
  return 'Staff';
}

// ---------------------------------------------------------------------------
// Navbar component
// ---------------------------------------------------------------------------
export default function Navbar({ title = 'Dashboard' }) {
  const { user, role } = useAuth();
  const initials = getInitials(user?.email);
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User';

  return (
    <header className={styles.navbar} role="banner">
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.actions}>
        {/* Notifications */}
        <button
          id="navbar-notifications-btn"
          className={styles.iconBtn}
          aria-label="View notifications"
        >
          <Bell size={16} aria-hidden="true" />
        </button>

        {/* Profile chip */}
        <div
          id="navbar-profile-chip"
          className={styles.profile}
          role="button"
          tabIndex={0}
          aria-label={`Profile: ${displayName}`}
        >
          <div className={styles.avatar} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{displayName}</span>
            <span className={styles.profileRole}>{getRoleLabel(role)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
