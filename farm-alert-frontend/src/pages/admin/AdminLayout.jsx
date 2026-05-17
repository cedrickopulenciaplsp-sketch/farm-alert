import { NavLink, Outlet } from 'react-router-dom';
import { Users, Settings, ClipboardList, ShieldCheck } from 'lucide-react';
import styles from './AdminLayout.module.css';

const TABS = [
  { to: '/admin/users',    label: 'User Management', icon: Users },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
  { to: '/admin/logs',     label: 'Audit Logs',      icon: ClipboardList },
];

export default function AdminLayout() {
  return (
    <div className={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Admin Panel</h1>
            <p className={styles.pageSubtitle}>
              Manage users, system settings, and activity logs
            </p>
          </div>
        </div>
      </header>

      {/* ── Tab navigation ──────────────────────────────────────────────── */}
      <nav className={styles.tabs} aria-label="Admin sections">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            id={`admin-tab-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
            aria-current={({ isActive }) => (isActive ? 'page' : undefined)}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── Sub-page content ─────────────────────────────────────────────── */}
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
