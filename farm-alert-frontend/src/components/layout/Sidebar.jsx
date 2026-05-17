import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  Bug,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/auth';
import { getActiveOutbreakCount } from '../../services/outbreaks';
import styles from './Sidebar.module.css';

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------
const CVO_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farms',       icon: Tractor,         label: 'Farms' },
  { to: '/diseases',    icon: BookOpen,         label: 'Disease Library' },
  { to: '/reports',     icon: FileText,         label: 'Disease Reports' },
  { to: '/outbreaks',   icon: AlertTriangle,    label: 'Outbreak Alerts' },
  { to: '/map',         icon: Map,              label: 'Disease Map' },
  { to: '/pest-control', icon: Bug,        label: 'Pest Control' },
  { to: '/pest-library', icon: BookOpen,   label: 'Pest Library' },
  { to: '/analytics',   icon: BarChart2,   label: 'Analytics' },
];

// Exclusive admin-only tools — shown below a divider for admins only
const ADMIN_TOOLS = [
  { to: '/admin', icon: Settings, label: 'Admin Settings' },
];

// ---------------------------------------------------------------------------
// NavItem — standard nav link
// ---------------------------------------------------------------------------
function NavItem({ to, icon: Icon, label }) {
  return (
    <li>
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
  );
}

// ---------------------------------------------------------------------------
// OutbreakNavItem — special nav item with live active-outbreak badge
// ---------------------------------------------------------------------------
function OutbreakNavItem() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    // Fetch immediately on mount, then poll every 60 seconds
    async function fetchCount() {
      const { count } = await getActiveOutbreakCount();
      setActiveCount(count);
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <li>
      <NavLink
        to="/outbreaks"
        className={({ isActive }) =>
          `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
        }
        aria-label={`Outbreak Alerts${activeCount > 0 ? ` — ${activeCount} active` : ''}`}
      >
        <AlertTriangle size={18} className={styles.navIcon} aria-hidden="true" />
        Outbreak Alerts
        {activeCount > 0 && (
          <span className={styles.outbreakBadge} aria-hidden="true">
            {activeCount > 9 ? '9+' : activeCount}
          </span>
        )}
      </NavLink>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------
export default function Sidebar() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

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

      {/* Primary nav links — same for both roles */}
      <nav>
        <ul className={styles.navList}>
          {CVO_ITEMS.map(item =>
            item.to === '/outbreaks'
              ? <OutbreakNavItem key="/outbreaks" />
              : <NavItem key={item.to} {...item} />
          )}

          {/* Admin-only tools section — shown below a divider */}
          {isAdmin && (
            <>
              <li aria-hidden="true">
                <div style={{
                  height: '1px',
                  background: 'var(--color-border)',
                  margin: '8px 12px',
                }} />
              </li>
              <li>
                <span style={{
                  display: 'block',
                  padding: '4px 16px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                }}>
                  Admin Tools
                </span>
              </li>
              {ADMIN_TOOLS.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}
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

