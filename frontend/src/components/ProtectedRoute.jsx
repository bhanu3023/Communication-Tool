import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/** Guards routes by authentication and (optionally) role. */
export default function ProtectedRoute({ role, children }) {
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (role && profile?.role !== role) {
    // Send users to their own landing page if they hit the wrong area.
    return <Navigate to={profile?.role === 'MANAGER' ? '/manager' : '/dashboard'} replace />;
  }
  return children;
}
