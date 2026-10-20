import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/common/Layout';
import { EmptyState } from '../../components/common/states';
import CheckinDesk from '../../components/common/CheckinDesk';

export default function StaffCheckin() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Check-in" subtitle="Admit members at the front desk. Check-ins count towards their streaks and package visits." />
      {user.gymId ? <CheckinDesk gymId={user.gymId} /> : <EmptyState title="No gym linked to this account" />}
    </>
  );
}
