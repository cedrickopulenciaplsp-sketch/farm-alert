import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Tractor,
  BookOpen,
  FileText,
  AlertTriangle,
  Map,
  BarChart2,
  Settings,
  LogOut,
  Leaf,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/auth';
import styles from './Sidebar.module.css';

// ---------------------------------------------------------------------------
// Navigation items — extend when new pages are added in later phases
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farms',     icon: Tractor,         label: 'Farms' },
  { to: '/diseases',  icon: BookOpen,         label: 'Disease Library' },
  { to: '/reports',   icon: FileText,         label: 'Disease Reports' },
  { to: '/outbreaks', icon: AlertTriangle,    label: 'Outbreak Alerts' },
  { to: '/map',       icon: Map,              label: 'Disease Map' },
  { to: '/analytics', icon: BarChart2,        label: 'Analytics' },
];

const ADMIN_ITEMS = [
  { to: '/admin', icon: Settings, label: 'Admin Settings' },
];

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
export default function Sidebar() {
  const { role } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className={styles.sidebar}>
      {/* Brand / Logo */}
      <NavLink to="/dashboard" className={styles.brand}>
        <Leaf size={20} className={styles.brandIcon} />
        FarmAlert
      </NavLink>

      {/* Primary nav links */}
      <nav>
        <ul className={styles.navList}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
                }
              >
                <Icon size={18} className={styles.navIcon} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}

          {/* Admin-only section */}
          {role === 'admin' && ADMIN_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
                }
              >
                <Icon size={18} className={styles.navIcon} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout at the bottom */}
      <div className={styles.footer}>
        <button
          id="sidebar-logout-btn"
          className={styles.logoutBtn}
          onClick={handleLogout}
          aria-label="Sign out"
        >
          <LogOut size={18} className={styles.navIcon} aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
