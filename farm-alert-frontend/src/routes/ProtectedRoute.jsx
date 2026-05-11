import { Navigate, Outlet } from 'react-router-dom';
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
export default function ProtectedRoute({ requiredRole }) {
  const { session, role, loading } = useAuth();

  // While the initial session check is still running, render nothing.
  // This prevents a redirect flash before we know if the user is logged in.
  if (loading) {
    return null;
  }

  // Not logged in → send to login page
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → send back to dashboard (access denied)
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // All checks passed → render the child route
  return <Outlet />;
}
