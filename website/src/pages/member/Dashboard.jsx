import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarClock, Clock, Flame, Plus } from 'lucide-react';
import { bookingsApi } from '../../api/bookings.api';
import { sessionsApi } from '../../api/sessions.api';
import { meApi } from '../../api/me.api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../contexts/AuthContext';
import { Card, PageHeader, StatCard } from '../../components/common/Layout';
import { ErrorState } from '../../components/common/states';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import { formatDateTime, formatRange, isFuture } from '../../utils/format';

export default function MemberDashboard() {
  const { user } = useAuth();
  const bookings = useAsync(() => bookingsApi.list(), []);
  const sessions = useAsync(() => sessionsApi.list(), []);
  const stats = useAsync(() => meApi.stats(), []); // optional: hidden if the endpoint is unavailable

  const upcoming = (bookings.data || []).filter((b) => b.status === 'confirmed' && isFuture(b.slotStart)).sort((a, b) => new Date(a.slotStart) - new Date(b.slotStart));
  const awaiting = (bookings.data || []).filter((b) => b.status === 'pending');
  const upcomingSessions = (sessions.data || []).filter((s) => ['SCHEDULED', 'HELD'].includes(s.status) && isFuture(s.startsAt)).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const st = stats.data?.stats || stats.data;

  // Simple activity feed derived from existing lists (no notifications endpoint exists).
  const activity = [
    ...(bookings.data || []).map((b) => ({ key: `b${b.id}`, when: b.slotStart, text: `${b.gym?.name || 'Gym'} booking is ${b.status === 'checked_in' ? 'marked attended' : b.status.replace('_', ' ')}` })),
    ...(sessions.data || []).map((s) => ({ key: `s${s.id}`, when: s.startsAt, text: `Session with ${s.provider?.name || 'coach'} is ${s.status.toLowerCase().replace('_', ' ')}` })),
  ].sort((a, b) => new Date(b.when) - new Date(a.when)).slice(0, 6);

  return (
    <>
      <PageHeader title={`Hello, ${user?.name?.split(' ')[0] || 'there'}`} subtitle="Your training at a glance." actions={<Button as={Link} to="/app/gyms" icon={Plus}>Book a gym</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Upcoming bookings" value={upcoming.length} icon={CalendarCheck} loading={bookings.loading && !bookings.data} />
        <StatCard label="Awaiting payment" value={awaiting.length} icon={Clock} loading={bookings.loading && !bookings.data} />
        <StatCard label="Upcoming sessions" value={upcomingSessions.length} icon={CalendarClock} loading={sessions.loading && !sessions.data} />
        {st && typeof st.currentStreak === 'number' && <StatCard label="Current streak" value={`${st.currentStreak} day${st.currentStreak === 1 ? '' : 's'}`} hint={`Longest ${st.longestStreak ?? 0}`} icon={Flame} />}
      </div>

      {bookings.error && !bookings.data && <div className="mt-6"><ErrorState error={bookings.error} onRetry={bookings.reload} /></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Next bookings" actions={<Link to="/app/bookings" className="text-sm font-medium text-brand hover:underline">All bookings</Link>}>
          {upcoming.length === 0 ? <p className="text-ink-500">Nothing booked. Pick a gym to get started.</p> : (
            <ul className="divide-y divide-ink-100">
              {upcoming.slice(0, 3).map((b) => (
                <li key={b.id}><Link to={`/app/bookings/${b.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand"><span>{b.gym?.name}<span className="block text-sm text-ink-500">{formatRange(b.slotStart, b.slotEnd)}</span></span><StatusBadge status={b.status} /></Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity">
          {activity.length === 0 ? <p className="text-ink-500">Activity appears here after your first booking.</p> : (
            <ul className="divide-y divide-ink-100">
              {activity.map((a) => <li key={a.key} className="py-2.5"><span className="capitalize">{a.text}</span><span className="block text-sm text-ink-500">{formatDateTime(a.when)}</span></li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
