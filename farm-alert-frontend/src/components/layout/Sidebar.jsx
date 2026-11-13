import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  SquaresFour as LayoutDashboard,
  Tractor,
  BookOpenText as BookOpen,
  FileText,
  Warning as AlertTriangle,
  MapTrifold as Map,
  ChartBar as BarChart2,
  Gear as Settings,
  MapPin,
  Users,
  SignOut as LogOut,
  Shield,
  ShieldCheck,
  ClipboardText as ClipboardList,
  X,
} from '@phosphor-icons/react';
import { signOut } from '../../services/auth';
import { getActiveOutbreakCount } from '../../services/outbreaks';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import styles from './Sidebar.module.css';

// ---------------------------------------------------------------------------
// Navigation items with allowed roles (Task 3.2)
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { to: '/dashboard',          icon: LayoutDashboard, label: 'Dashboard',              roles: ['admin', 'cvo_staff'] },
  { to: '/farmer-portal',      icon: Tractor,         label: 'My Farm Portal',         roles: ['farmer'] },
  { to: '/farms',              icon: Tractor,         label: 'Farms',                  roles: ['admin', 'cvo_staff'] },
  { to: '/diseases',           icon: BookOpen,        label: 'Disease Library',        roles: ['admin', 'cvo_staff', 'farmer'] },
  { to: '/reports',            icon: FileText,        label: 'Disease Reports',        roles: ['admin', 'cvo_staff'] },
  { to: '/outbreaks',          icon: AlertTriangle,   label: 'Incident Response',      roles: ['admin', 'cvo_staff'] },
  { to: '/map',                icon: Map,             label: 'Disease Map',            roles: ['admin', 'cvo_staff'] },
  { to: '/compliance',         icon: ShieldCheck,     label: 'Biosecurity Compliance', roles: ['admin', 'cvo_staff'] },
  { to: '/settings/barangays', icon: MapPin,          label: 'Barangay Masterlist',    roles: ['admin'] },
  { to: '/settings/users',     icon: Users,           label: 'User Accounts',          roles: ['admin'] },
  { to: '/settings',           icon: Settings,        label: 'System Settings',        roles: ['admin'], end: true },
  { to: '/logs',               icon: ClipboardList,   label: 'Audit Logs',             roles: ['admin'] },
];

// ---------------------------------------------------------------------------
// NavItem — standard nav link
// ---------------------------------------------------------------------------
function NavItem({ to, icon: Icon, label, end, onNavigate }) {
  return (
    <li>
      <NavLink
        to={to}
        end={end ?? to === '/settings'}
        onClick={onNavigate}
        className={({ isActive }) =>
          `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
        }
      >
        <Icon size={18} className={styles.navIcon} aria-hidden="true" weight="duotone" />
        {label}
      </NavLink>
    </li>
  );
}

// ---------------------------------------------------------------------------
// OutbreakNavItem — special nav item with live active-outbreak badge
// ---------------------------------------------------------------------------
function OutbreakNavItem({ onNavigate }) {
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
        onClick={onNavigate}
        className={({ isActive }) =>
          `${styles.navItem}${isActive ? ` ${styles.active}` : ''}`
        }
        aria-label={`Incident Response${activeCount > 0 ? ` — ${activeCount} pending` : ''}`}
      >
        <AlertTriangle size={18} className={styles.navIcon} aria-hidden="true" weight="duotone" />
        Incident Response
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
export default function Sidebar({ isOpen = false, onClose }) {
  const { userRole } = useAuth();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole || 'admin'));

  const handleLogout = async () => {
    onClose?.();
    await signOut();
  };

  return (
    <>
      {isOpen && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={`${styles.sidebar}${isOpen ? ` ${styles.sidebarOpen}` : ''}`}>
        {/* Brand / CVO Institutional Crest */}
        <div className={styles.brandRow}>
          <NavLink
            to={userRole === 'farmer' ? '/farmer-portal' : '/dashboard'}
            className={styles.brand}
            onClick={onClose}
          >
            <div className={styles.brandCrest}>
              <Shield size={22} aria-hidden="true" weight="duotone" />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>FarmAlert</span>
              <span className={styles.brandSub}>
                {userRole === 'farmer' ? 'Farmer Portal' : 'City Veterinary Office'}
              </span>
            </div>
          </NavLink>
          {onClose && (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Primary nav links */}
        <nav className={styles.navScroll}>
          <ul className={styles.navList}>
            {visibleItems.map(item =>
              item.to === '/outbreaks'
                ? <OutbreakNavItem key="/outbreaks" onNavigate={onClose} />
                : <NavItem key={item.to} {...item} onNavigate={onClose} />
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
            <LogOut size={18} className={styles.navIcon} aria-hidden="true" weight="duotone" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
