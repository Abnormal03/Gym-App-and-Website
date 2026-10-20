import { useMemo, useState } from 'react';
import { CalendarClock, Check, MessageSquare, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sessionsApi } from '../../api/sessions.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { AsyncView, EmptyState, SkeletonList } from '../../components/common/states';
import { PageHeader, Tabs } from '../../components/common/Layout';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/Modal';
import { formatDate, formatRange, isFuture } from '../../utils/format';

const TABS = [{ value: 'upcoming', label: 'Upcoming' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }];
const match = (tab, s) => (tab === 'upcoming' ? ['SCHEDULED', 'HELD'].includes(s.status) : tab === 'completed' ? s.status === 'COMPLETED' : s.status === 'CANCELLED');

export default function ProviderSessions({ base }) {
  const state = useAsync(() => sessionsApi.list(), []);
  const [tab, setTab] = useState('upcoming');
  const [target, setTarget] = useState(null); // { session, kind: 'complete' | 'cancel' }
  const act = useSubmit();

  const days = useMemo(() => {
    const list = (state.data || []).filter((s) => match(tab, s)).sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (new Date(a.startsAt) - new Date(b.startsAt)));
    const groups = new Map();
    list.forEach((s) => { const d = formatDate(s.startsAt); groups.set(d, [...(groups.get(d) || []), s]); });
    return [...groups.entries()];
  }, [state.data, tab]);

  const confirm = async () => {
    const { session, kind } = target;
    const ok = await act.run(() => (kind === 'complete' ? sessionsApi.complete(session.id) : sessionsApi.cancel(session.id)), { success: kind === 'complete' ? 'Session marked completed' : 'Session cancelled' });
    if (ok) { setTarget(null); state.reload(); }
  };

  return (
    <>
      <PageHeader title="Sessions" subtitle="Mark a session completed once it has taken place. That credits your earnings and lets the member review you." actions={<Button as={Link} to={`${base}/messages`} variant="secondary" icon={MessageSquare}>Messages</Button>} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Session filter" />
      <AsyncView state={state} skeleton={<SkeletonList />} isEmpty={() => days.length === 0} empty={<EmptyState icon={CalendarClock} title={`No ${tab} sessions`} />}>
        {() => days.map(([day, list]) => (
          <section key={day} className="mb-6">
            <h2 className="mb-2 text-lg text-ink-600">{day}</h2>
            <ul className="space-y-2">
              {list.map((s) => (
                <li key={s.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{s.member?.name || s.user?.name || 'Member'}</p>
                    <p className="text-sm text-ink-500">{formatRange(s.startsAt, s.endsAt)}{s.booking?.gym?.name ? ` · ${s.booking.gym.name}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status} />
                    {s.status === 'SCHEDULED' && <Button size="sm" variant="brand" icon={Check} onClick={() => setTarget({ session: s, kind: 'complete' })}>Mark completed</Button>}
                    {['SCHEDULED', 'HELD'].includes(s.status) && isFuture(s.startsAt) && <Button size="sm" variant="dangerOutline" icon={X} onClick={() => setTarget({ session: s, kind: 'cancel' })}>Cancel</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </AsyncView>
      <ConfirmDialog
        open={Boolean(target)}
        title={target?.kind === 'complete' ? 'Mark this session completed?' : 'Cancel this session?'}
        message={target?.kind === 'complete' ? 'This adds to your completed count and earnings and cannot be undone.' : 'The member is notified. The session is returned to their package if the cancellation rules allow it.'}
        confirmLabel={target?.kind === 'complete' ? 'Mark completed' : 'Cancel session'}
        danger={target?.kind === 'cancel'}
        loading={act.pending}
        onConfirm={confirm}
        onClose={() => setTarget(null)}
      />
    </>
  );
}
