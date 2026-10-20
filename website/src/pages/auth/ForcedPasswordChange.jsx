import { Navigate, useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';
import Logo from '../../components/layout/Logo';
import Button from '../../components/common/Button';

export default function ForcedPasswordChange() {
  const { isAuthenticated, mustChangePassword, home, passwordChanged, logout } = useAuth();
  const navigate = useNavigate();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to={home} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-50 text-signal"><ShieldAlert className="h-5 w-5" aria-hidden="true" /></span>
            <h1 className="text-2xl">Choose a new password</h1>
          </div>
          <p className="mb-5 text-ink-500">Your account uses a temporary password. Set your own to continue.</p>
          <ChangePasswordForm mode="portal" onDone={() => { passwordChanged(); navigate(home, { replace: true }); }} />
          <Button variant="ghost" size="sm" onClick={logout} className="mt-4">Sign out instead</Button>
        </div>
      </div>
    </div>
  );
}
