import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAdminGym } from '../../contexts/AdminGymContext';
import { EmptyState, ErrorState, SkeletonList } from './states';
import Button from './Button';

/** Renders children(gym) once the admin's active gym is known. */
export default function GymGate({ children }) {
  const { gym, gyms, loading, error, reload } = useAdminGym();
  if (loading && !gyms.length) return <SkeletonList rows={3} />;
  if (error && !gyms.length) return <ErrorState error={error} onRetry={reload} title="Could not load your gyms" />;
  if (!gym) return <EmptyState icon={Building2} title="Add your first gym" message="Gym packages, bookings and team members belong to a gym." action={<Button as={Link} to="/admin/gyms">Create a gym</Button>} />;
  return children(gym);
}
