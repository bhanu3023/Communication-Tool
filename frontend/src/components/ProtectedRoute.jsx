import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { homeForRole, isManagerPortalUser } from '../utils/auth';

/** Roles that satisfy a given required role. ADMIN spans both employee and manager areas. */
const satisfies = (profile, required) => {
  const actual = profile?.role;
  if (actual === required) return true;
  if (required === 'MANAGER' && (actual === 'ADMIN' || profile?.admin)) return true;
  if (required === 'EMPLOYEE' && actual === 'ADMIN') return true;
  return false;
};

/** Guards routes by authentication and (optionally) role. */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role && !satisfies(profile, role)) {
    return <Navigate to={homeForRole(profile)} replace />;
  }
  return children;
}

export { isManagerPortalUser };
