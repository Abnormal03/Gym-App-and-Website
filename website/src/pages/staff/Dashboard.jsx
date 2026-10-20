import { Link } from 'react-router-dom';
import { ScanLine, UserCheck } from 'lucide-react';
import { gymsApi } from '../../api/gyms.api';
import { checkinsApi } from '../../api/checkins.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../contexts/AuthContext';
import { Card, InfoRow, PageHeader, StatCard } from '../../components/common/Layout';
import { ErrorState, SkeletonList } from '../../components/common/states';
import { GymPhoto } from '../../components/common/GymParts';
import Button from '../../components/common/Button';

export default function StaffDashboard() {
  const { user } = useAuth();
  const enabled = Boolean(user.gymId);
  const gym = useAsync(() => gymsApi.get(user.gymId), [user.gymId], { enabled });
  const today = useAsync(() => checkinsApi.today(user.gymId), [user.gymId], { enabled });
  return (
    <>
      <PageHeader title={`Welcome, ${user.name?.split(' ')[0]}`} subtitle="Front desk for your gym." actions={<Button as={Link} to="/staff/checkin" icon={ScanLine}>Open check-in</Button>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Checked in today" value={today.data ? asList(today.data).length : '-'} icon={UserCheck} loading={today.loading && !today.data} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your account">
          <dl className="divide-y divide-ink-100">
            <InfoRow label="Name">{user.name}</InfoRow>
            <InfoRow label="Email">{user.email}</InfoRow>
            <InfoRow label="Phone">{user.phone}</InfoRow>
          </dl>
        </Card>
        <Card title="Your gym">
          {!enabled ? <p className="text-ink-500">No gym is linked to this account.</p> : gym.loading && !gym.data ? <SkeletonList rows={1} /> : gym.error ? <ErrorState error={gym.error} onRetry={gym.reload} title="Gym details are not available to staff accounts" /> : (
            <div className="overflow-hidden rounded-md">
              <GymPhoto photos={gym.data.photos} name={gym.data.name} className="h-32" />
              <p className="mt-3 text-xl font-medium">{gym.data.name}</p>
              <p className="text-sm text-ink-500">{gym.data.address}</p>
              <p className="text-sm text-ink-600">Open {gym.data.openingTime} - {gym.data.closingTime}</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
