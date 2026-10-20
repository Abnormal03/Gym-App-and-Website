import { Link, Navigate, useParams } from 'react-router-dom';
import { Compass, Lock, ShieldX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import { EmptyState } from '../../components/common/states';

export function NotFound() {
  const { isAuthenticated, home } = useAuth();
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <EmptyState icon={Compass} title="Page not found" message="The page you opened does not exist or has moved." action={<Button as={Link} to={isAuthenticated ? home : '/'}>Go back</Button>} />
    </div>
  );
}

export function Unauthorized() {
  const { isAuthenticated, home } = useAuth();
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <EmptyState icon={ShieldX} title="This area is not for your account" message="Your role does not include this page. The server enforces this too, so there is nothing to retry." action={<Button as={Link} to={isAuthenticated ? home : '/login'}>{isAuthenticated ? 'Back to my dashboard' : 'Sign in'}</Button>} />
    </div>
  );
}

/** /gyms and /gyms/:id. The backend requires a token for every gym endpoint, so there is no public data. */
export function GymsGate() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated && role === 'MEMBER') return <Navigate to={id ? `/app/gyms/${id}` : '/app/gyms'} replace />;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={Lock}
        title={isAuthenticated ? 'Gym discovery is for members' : 'Sign in to browse gyms'}
        message="The gym, package and coach listings are served only to signed-in accounts, so they cannot be shown to visitors."
        action={isAuthenticated ? <Button as={Link} to="/">Back to home</Button> : (
          <div className="flex flex-wrap justify-center gap-2">
            <Button as={Link} to="/login" state={{ from: id ? `/app/gyms/${id}` : '/app/gyms' }}>Sign in</Button>
            <Button as={Link} to="/register" variant="secondary">Create an account</Button>
          </div>
        )}
      />
    </div>
  );
}
