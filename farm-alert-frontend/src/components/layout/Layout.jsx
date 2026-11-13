import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import styles from './Layout.module.css';

// ---------------------------------------------------------------------------
// Map route paths to human-readable page titles for the Navbar
// ---------------------------------------------------------------------------
const PAGE_TITLES = {
  '/dashboard':          'Dashboard',
  '/farmer-portal':      'My Farm Portal',
  '/farms':              'Farm Registry',
  '/diseases':           'Disease Library',
  '/reports':            'Disease Reports',
  '/outbreaks':          'Incident & Outbreak Response',
  '/map':                'Disease Map',
  '/compliance':         'Biosecurity Compliance',
  '/settings/barangays': 'Barangay Masterlist',
  '/settings/users':     'User Accounts',
  '/settings':           'System Settings',
  '/logs':               'Audit Logs',
  '/analytics':          'Analytics',
  '/admin':              'Admin Settings',
};

function getPageTitle(pathname) {
  // Exact match first, then prefix match for nested routes (e.g. /farms/123)
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(PAGE_TITLES).find((key) => pathname.startsWith(key));
  return prefix ? PAGE_TITLES[prefix] : 'FarmAlert';
}

// ---------------------------------------------------------------------------
// Layout — orchestrates Sidebar + Navbar + page content
// ---------------------------------------------------------------------------
export default function Layout() {
  const { pathname } = useLocation();
  const title = getPageTitle(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className={styles.layoutContainer}>
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className={styles.mainContent}>
        <Navbar title={title} onMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />

        {/* Page content rendered via React Router's <Outlet> */}
        <main id="main-content" className={styles.pageContent} role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
