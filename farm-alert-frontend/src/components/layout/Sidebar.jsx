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
  Shield,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react';
import { signOut } from '../../services/auth';
import { getActiveOutbreakCount } from '../../services/outbreaks';
import { supabase } from '../../lib/supabase';
import styles from './Sidebar.module.css';

// ---------------------------------------------------------------------------
// Navigation items — single flat list for all authenticated users
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/farms',          icon: Tractor,         label: 'Farms' },
  { to: '/diseases',       icon: BookOpen,        label: 'Disease Library' },
  { to: '/reports',        icon: FileText,        label: 'Disease Reports' },
  { to: '/outbreaks',      icon: AlertTriangle,   label: 'Outbreak Alerts' },
  { to: '/map',            icon: Map,             label: 'Disease Map' },
  { to: '/compliance',     icon: ShieldCheck,     label: 'Compliance Logs' },
  { to: '/analytics',      icon: BarChart2,       label: 'Analytics' },
  { to: '/settings',      icon: Settings,        label: 'System Settings' },
  { to: '/logs',          icon: ClipboardList,   label: 'Audit Logs' },
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
    // Initial fetch
    async function fetchCount() {
      const { count } = await getActiveOutbreakCount();
      setActiveCount(count);
    }
    fetchCount();

    // Realtime subscription — re-fetch count on any INSERT, UPDATE, or DELETE
    const channel = supabase
      .channel('outbreak-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outbreak_alerts' },
        () => fetchCount()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
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
  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className={styles.sidebar}>
      {/* Brand / CVO Institutional Crest */}
      <NavLink to="/dashboard" className={styles.brand}>
        <div className={styles.brandCrest}>
          <Shield size={22} aria-hidden="true" />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>FarmAlert</span>
          <span className={styles.brandSub}>City Veterinary Office</span>
        </div>
      </NavLink>

      {/* Primary nav links */}
      <nav>
        <ul className={styles.navList}>
          {NAV_ITEMS.map(item =>
            item.to === '/outbreaks'
              ? <OutbreakNavItem key="/outbreaks" />
              : <NavItem key={item.to} {...item} />
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
