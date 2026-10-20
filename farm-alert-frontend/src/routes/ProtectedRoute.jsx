import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';
import { isAuthorizedEmail } from '../services/auth';

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
export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Enforce a 4-minute inactivity auto-logout (for demo/security purposes)
  useInactivityTimeout(4);

  // While the initial session check is still running, render nothing.
  if (loading) {
    return null;
  }

  // Not logged in or unauthorized email → send to login page (preserve error parameters if any)
  if (!session || (session?.user?.email && !isAuthorizedEmail(session.user.email))) {
    const search = location.search;
    const hash = window.location.hash ? `?${window.location.hash.replace(/^#/, '')}` : '';
    const query = search || hash;
    return <Navigate to={`/login${query}`} replace />;
  }

  // Authorised → render child routes
  return <Outlet />;
}
