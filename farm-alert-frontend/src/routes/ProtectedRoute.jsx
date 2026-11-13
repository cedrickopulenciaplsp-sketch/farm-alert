import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Wraps routes that require authentication (and optionally a specific role).
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 *   // Role-restricted route (admin only):
 *   <Route element={<ProtectedRoute requiredRole="admin" />}>
 *     <Route path="/admin" element={<Admin />} />
 *   </Route>
 *
 * @param {string} [requiredRole] - Optional role required to access the route.
 *                                  If omitted, any authenticated user can access.
 */
const ADMIN_ONLY_PATHS = ['/settings', '/logs'];
const FARMER_ALLOWED_PATHS = ['/farmer-portal', '/diseases'];

export default function ProtectedRoute() {
  const { session, loading, profileLoaded, isAuthorized, userRole } = useAuth();
  const location = useLocation();

  // While the session / account access check is still running, render nothing.
  if (loading || (session && !profileLoaded)) {
    return null;
  }

  // Not logged in, not registered, or suspended → send to login page (preserve error parameters if any)
  if (!session || !isAuthorized) {
    const search = location.search;
    const hash = window.location.hash ? `?${window.location.hash.replace(/^#/, '')}` : '';
    const query = search || hash;
    return <Navigate to={`/login${query}`} replace />;
  }

  const pathname = location.pathname;

  // Task 3.3: Farmers are scoped to /farmer-portal (and /diseases library)
  if (userRole === 'farmer' && !FARMER_ALLOWED_PATHS.some((p) => pathname.startsWith(p))) {
    return <Navigate to="/farmer-portal" replace />;
  }

  // Task 3.3: Non-admins cannot access /settings/* (incl. Barangay Masterlist, User Accounts) or /logs
  if (userRole !== 'admin' && ADMIN_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return <Navigate to={userRole === 'farmer' ? '/farmer-portal' : '/dashboard'} replace />;
  }

  // Authorised → render child routes
  return <Outlet />;
}
