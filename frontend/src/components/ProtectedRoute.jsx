import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Roles that satisfy a given required role. ADMIN is a superset of MANAGER. */
const satisfies = (actual, required) =>
  actual === required || (required === 'MANAGER' && actual === 'ADMIN');

/** Where a role belongs when it lands in the wrong area. */
const homeFor = (role) => (role === 'MANAGER' || role === 'ADMIN' ? '/manager' : '/dashboard');

/** Guards routes by authentication and (optionally) role. */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role && !satisfies(profile?.role, role)) {
    // Send users to their own landing page if they hit the wrong area.
    return <Navigate to={homeFor(profile?.role)} replace />;
  }
  return children;
}
