import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/common/states';

/**
 * Frontend guard (UX only: the backend enforces real authorization).
 * - waits for session restore
 * - anonymous -> /login (remembers where they were going)
 * - provider/staff still on a temporary password -> /change-password
 * - wrong role -> /unauthorized
 */
export default function ProtectedRoute({ roles }) {
  const { status, isAuthenticated, role, mustChangePassword } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center"><Spinner label="Restoring your session" /></div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(role)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
