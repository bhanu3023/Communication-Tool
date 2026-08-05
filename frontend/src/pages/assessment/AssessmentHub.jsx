import { Navigate, useLocation } from 'react-router-dom';

/** Legacy `/assessment` URLs → Test hub (preserves `?level=`). */
export default function AssessmentRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/test${search || '?level=1'}`} replace />;
}
