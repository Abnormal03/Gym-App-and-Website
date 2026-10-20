import { Link } from 'react-router-dom';
import { Award, CalendarClock, CheckCircle2, Star, Wallet } from 'lucide-react';
import { sessionsApi } from '../../api/sessions.api';
import { providersApi } from '../../api/providers.api';
import { meApi } from '../../api/me.api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../contexts/AuthContext';
import { Card, PageHeader, StatCard } from '../../components/common/Layout';
import { ErrorState } from '../../components/common/states';
import StatusBadge from '../../components/common/StatusBadge';
import { formatMoney, formatRange, isFuture } from '../../utils/format';
import { normalizeEarnings } from './earningsShape';

export default function ProviderDashboard({ base }) {
  const { user } = useAuth();
  const sessions = useAsync(() => sessionsApi.list(), []);
  const reviews = useAsync(() => providersApi.reviews(user.id, { limit: 50 }), [user.id]);
  const earnings = useAsync(() => meApi.earnings(), []);
  const badges = useAsync(() => meApi.badges(), []);

  const all = sessions.data || [];
  const upcoming = all.filter((s) => ['SCHEDULED', 'HELD'].includes(s.status) && isFuture(s.startsAt)).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const completed = all.filter((s) => s.status === 'COMPLETED').length;
  const items = reviews.data?.items || [];
  const avg = items.length ? items.reduce((n, r) => n + r.rating, 0) / items.length : null;
  const bal = earnings.data ? normalizeEarnings(earnings.data).balance : null;
  const earned = badges.data?.earned || (Array.isArray(badges.data) ? badges.data : badges.data?.badges) || [];

  return (
    <>
      <PageHeader title={`Welcome, ${user.name?.split(' ')[0]}`} subtitle="Sessions, ratings and earnings from the live API." />
      {sessions.error && !sessions.data && <div className="mb-6"><ErrorState error={sessions.error} onRetry={sessions.reload} /></div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming sessions" value={upcoming.length} icon={CalendarClock} loading={sessions.loading && !sessions.data} />
        <StatCard label="Sessions completed" value={completed} icon={CheckCircle2} loading={sessions.loading && !sessions.data} />
        <StatCard label="Average rating" value={avg ? avg.toFixed(1) : '-'} hint={items.length ? `from ${items.length} review${items.length > 1 ? 's' : ''}` : 'No reviews yet'} icon={Star} loading={reviews.loading && !reviews.data} />
        {bal ? <StatCard label="Available balance" value={formatMoney(bal.available)} icon={Wallet} /> : <StatCard label="Badges" value={earned.length || '-'} icon={Award} loading={badges.loading && !badges.data} />}
      </div>
      <Card title="Next sessions" className="mt-6" actions={<Link to={`${base}/sessions`} className="text-sm font-medium text-brand hover:underline">All sessions</Link>}>
        {upcoming.length === 0 ? <p className="text-ink-500">No upcoming sessions.</p> : (
          <ul className="divide-y divide-ink-100">
            {upcoming.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5"><span>{s.member?.name || s.user?.name || 'Member'}<span className="block text-sm text-ink-500">{formatRange(s.startsAt, s.endsAt)}</span></span><StatusBadge status={s.status} /></li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
