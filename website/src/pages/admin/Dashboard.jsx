import { Link } from 'react-router-dom';
import { CalendarCheck, CreditCard, Building2, Users, Wallet, UserCog } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { bookingsApi } from '../../api/bookings.api';
import { providersApi } from '../../api/providers.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAdminGym } from '../../contexts/AdminGymContext';
import GymGate from '../../components/common/GymGate';
import { Card, PageHeader, StatCard } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import StatusBadge from '../../components/common/StatusBadge';
import { formatRange } from '../../utils/format';

function Content({ gym }) {
  const totals = useAsync(() => adminApi.dashboard(), []);
  const stats = useAsync(() => bookingsApi.stats(), []);
  const providers = useAsync(() => providersApi.adminList({ gymId: gym.id, limit: 1 }), [gym.id]);
  const payouts = useAsync(() => adminApi.payouts('PENDING'), []); // unverified endpoint: card hidden if unavailable
  const bookings = useAsync(() => bookingsApi.forGym(gym.id), [gym.id]);

  const t = totals.data || {};
  const s = stats.data || {};
  const pending = payouts.data ? asList(payouts.data, 'payouts').length : null;
  const recent = [...(bookings.data || [])].sort((a, b) => new Date(b.slotStart) - new Date(a.slotStart)).slice(0, 6);

  return (
    <>
      <PageHeader title="Overview" subtitle={`Booking and provider details are for ${gym.name}.`} />
      {totals.error && !totals.data ? <ErrorState error={totals.error} onRetry={totals.reload} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Gyms on the platform" value={t.totalGyms} icon={Building2} loading={totals.loading && !totals.data} />
          <StatCard label="Members" value={t.totalUsers} icon={Users} loading={totals.loading && !totals.data} />
          <StatCard label="Bookings" value={t.totalBookings} hint={stats.data ? `${s.confirmed ?? 0} confirmed · ${s.pending ?? 0} awaiting payment` : undefined} icon={CalendarCheck} loading={totals.loading && !totals.data} />
          <StatCard label="Payments" value={t.totalPayments} icon={CreditCard} loading={totals.loading && !totals.data} />
          <StatCard label="Trainers and physios here" value={providers.data?.total ?? '-'} icon={UserCog} loading={providers.loading && !providers.data} />
          {pending !== null && <StatCard label="Payout requests waiting" value={pending} icon={Wallet} />}
        </div>
      )}
      <Card title={`Latest bookings at ${gym.name}`} className="mt-6" actions={<Link to="/admin/bookings" className="text-sm font-medium text-brand hover:underline">All bookings</Link>}>
        {bookings.loading && !bookings.data ? <SkeletonList rows={3} /> : bookings.error ? <ErrorState error={bookings.error} onRetry={bookings.reload} /> : recent.length === 0 ? <EmptyState title="No bookings yet" /> : (
          <ul className="divide-y divide-ink-100">
            {recent.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <span>{b.user?.name || 'Member'}<span className="block text-sm text-ink-500">{formatRange(b.slotStart, b.slotEnd)} · {b.package?.name || 'No package'}</span></span>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function AdminDashboard() {
  useAdminGym();
  return <GymGate>{(gym) => <Content gym={gym} />}</GymGate>;
}
