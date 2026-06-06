import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';

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

  // Enforce a 2-minute inactivity auto-logout (for demo/security purposes)
  useInactivityTimeout(2);

  // While the initial session check is still running, render nothing.
  if (loading) {
    return null;
  }

  // Not logged in → send to login page
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Authorised → render child routes
  return <Outlet />;
}
