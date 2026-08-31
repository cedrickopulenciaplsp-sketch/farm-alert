import { Bell, Sun, Moon, X, CheckCheck, ShieldAlert, FileText, Clock, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { getActiveOutbreakCount } from '../../services/outbreaks';
import { supabase } from '../../lib/supabase';
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
// Format a notification timestamp as a human-readable relative time
// ---------------------------------------------------------------------------
function formatTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Single notification row inside the dropdown
// ---------------------------------------------------------------------------
function NotificationItem({ notif, onRead, onClear, onNavigate }) {
  const isOutbreak = notif.type === 'outbreak';
  const isCritical = notif.severity === 'critical';

  return (
    <div
      className={`${styles.notifItem} ${notif.read ? styles.notifRead : styles.notifUnread} ${isCritical ? styles.notifCritical : styles.notifSevere}`}
      onClick={() => {
        onRead(notif.id);
        onNavigate(notif.link);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') { onRead(notif.id); onNavigate(notif.link); }}}
    >
      {/* Unread indicator dot */}
      {!notif.read && <span className={styles.unreadDot} aria-label="Unread" />}

      {/* Icon */}
      <div className={`${styles.notifIcon} ${isOutbreak ? styles.notifIconOutbreak : styles.notifIconReport}`}>
        {isOutbreak ? <ShieldAlert size={15} /> : <FileText size={15} />}
      </div>

      {/* Content */}
      <div className={styles.notifContent}>
        <p className={styles.notifTitle}>{notif.title}</p>
        <p className={styles.notifMessage}>{notif.message}</p>
        <span className={styles.notifTime}>
          <Clock size={10} />
          {formatTime(notif.timestamp)}
        </span>
      </div>

      {/* Dismiss button */}
      <button
        className={styles.notifDismiss}
        onClick={(e) => { e.stopPropagation(); onClear(notif.id); }}
        aria-label="Dismiss notification"
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notifications dropdown panel
// ---------------------------------------------------------------------------
function NotificationsPanel({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const navigate = useNavigate();

  function handleNavigate(link) {
    navigate(link);
    onClose();
  }

  return (
    <div className={styles.notifPanel} role="dialog" aria-label="Notifications">
      {/* Header */}
      <div className={styles.notifHeader}>
        <div className={styles.notifHeaderLeft}>
          <Bell size={15} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className={styles.notifHeaderBadge}>{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            className={styles.markAllBtn}
            onClick={markAllAsRead}
            title="Mark all as read"
          >
            <CheckCheck size={13} />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className={styles.notifList}>
        {notifications.length === 0 ? (
          <div className={styles.notifEmpty}>
            <Bell size={28} />
            <p>No active alerts</p>
            <span>Notifications will appear here when outbreaks or critical reports are detected.</span>
          </div>
        ) : (
          notifications.map(notif => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onRead={markAsRead}
              onClear={clearNotification}
              onNavigate={handleNavigate}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className={styles.notifFooter}>
          <button
            className={styles.viewAllBtn}
            onClick={() => handleNavigate('/outbreaks')}
          >
            View all outbreak alerts →
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navbar component
// ---------------------------------------------------------------------------
export default function Navbar({ title = 'Dashboard' }) {
  const { user, role } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const initials = getInitials(user?.email);
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User';

  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // ── Global Threat Level — driven by active outbreak count ──────────────
  const [activeOutbreaks, setActiveOutbreaks] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      const { count } = await getActiveOutbreakCount();
      setActiveOutbreaks(count ?? 0);
    }
    fetchCount();

    const channel = supabase
      .channel('navbar-threat-level')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outbreak_alerts' },
        () => fetchCount()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // Derive threat level
  const threatLevel =
    activeOutbreaks >= 3 ? 'critical' :
    activeOutbreaks >= 1 ? 'elevated' :
                           'normal';

  const THREAT_META = {
    normal:   { label: 'Normal Surveillance',      cls: styles.threatNormal   },
    elevated: { label: `Elevated — ${activeOutbreaks} Active`,  cls: styles.threatElevated },
    critical: { label: `Critical — ${activeOutbreaks} Active`,  cls: styles.threatCritical },
  };
  const threat = THREAT_META[threatLevel];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.titleGroup}>
        <h1 className={styles.title}>{title}</h1>

        {/* Global System Status Indicator */}
        <div
          className={`${styles.threatBadge} ${threat.cls}`}
          title={`System Status: ${threat.label}`}
          aria-label={`System threat level: ${threat.label}`}
        >
          <Shield size={12} aria-hidden="true" />
          <span>{threat.label}</span>
        </div>
      </div>

      <div className={styles.actions}>
        {/* Dark / Light mode toggle */}
        <button
          id="navbar-theme-toggle-btn"
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark
            ? <Sun  size={16} aria-hidden="true" />
            : <Moon size={16} aria-hidden="true" />}
        </button>

        {/* Notifications */}
        <div className={styles.notifWrapper} ref={notifRef}>
          <button
            id="navbar-notifications-btn"
            className={`${styles.iconBtn} ${notifOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setNotifOpen(prev => !prev)}
            aria-label={`View notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-haspopup="dialog"
            aria-expanded={notifOpen}
          >
            <Bell size={16} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className={styles.badge} aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotificationsPanel onClose={() => setNotifOpen(false)} />
          )}
        </div>

        {/* Profile chip */}
        <div className={styles.profile} title={`${displayName} · ${getRoleLabel(role)}`}>
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={displayName}
              className={styles.avatar}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={styles.avatar}>{initials}</div>
          )}
          <div className={styles.profileInfo}>
            <span className={styles.profileName}>{displayName}</span>
            <span className={styles.profileRole}>{getRoleLabel(role)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
