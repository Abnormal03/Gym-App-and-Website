import { useMemo, useState } from 'react';
import { Award, Flame, Lock, Trophy } from 'lucide-react';
import { meApi } from '../../api/me.api';
import { bookingsApi } from '../../api/bookings.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { Card, PageHeader, StatCard } from '../../components/common/Layout';
import { AsyncView, ErrorState, SkeletonList } from '../../components/common/states';
import { SelectField } from '../../components/common/Field';
import { formatDate } from '../../utils/format';

function Badges({ data }) {
  const earned = data?.earned || asList(data, 'badges').filter((b) => b.earned !== false && !b.locked);
  const locked = data?.locked || asList(data, 'badges').filter((b) => b.earned === false || b.locked);
  const tile = (b, on) => (
    <li key={b.code || b.id || b.name} className={`flex items-center gap-3 rounded-lg border p-3 ${on ? 'border-brand bg-brand-50' : 'border-ink-100 bg-ink-50 text-ink-400'}`}>
      {on ? <Award className="h-6 w-6 text-brand" aria-hidden="true" /> : <Lock className="h-6 w-6" aria-hidden="true" />}
      <span><span className="block font-medium">{b.name || b.code}</span><span className="block text-sm">{on ? (b.awardedAt ? `Earned ${formatDate(b.awardedAt)}` : 'Earned') : 'Locked'}</span></span>
    </li>
  );
  if (!earned.length && !locked.length) return <p className="text-ink-500">No badges yet. Your first confirmed workout earns one.</p>;
  return <ul className="grid gap-3 sm:grid-cols-2">{earned.map((b) => tile(b, true))}{locked.map((b) => tile(b, false))}</ul>;
}

function StreakBoard() {
  const bookings = useAsync(() => bookingsApi.list(), []);
  const gyms = useMemo(() => [...new Map((bookings.data || []).filter((b) => b.gym).map((b) => [b.gym.id, b.gym])).values()], [bookings.data]);
  const [gymId, setGymId] = useState('');
  const selected = gymId || gyms[0]?.id;
  const board = useAsync(() => meApi.streakLeaderboard(selected), [selected], { enabled: Boolean(selected) });

  // The spec says to hide this entry point when the flag is off (404).
  if (board.error?.unavailable || (board.error?.status === 404)) return null;
  if (!gyms.length) return null;
  const rows = asList(board.data, 'leaderboard', 'top');
  return (
    <Card title="Gym streak leaderboard">
      <SelectField label="Gym" value={selected} onChange={(e) => setGymId(e.target.value)} options={gyms.map((g) => ({ value: g.id, label: g.name }))} className="mb-4 max-w-xs" />
      {board.loading && !board.data ? <SkeletonList rows={3} /> : board.error ? <ErrorState error={board.error} onRetry={board.reload} /> : rows.length === 0 ? <p className="text-ink-500">No one has a streak yet.</p> : (
        <ol className="divide-y divide-ink-100">
          {rows.map((r, i) => (
            <li key={r.userId || r.id || i} className={`flex items-center justify-between py-2 ${r.isMe || r.you ? 'font-medium text-brand' : ''}`}>
              <span><span className="inline-block w-8 text-ink-400">{r.rank || i + 1}</span>{r.name || r.firstName || 'Member'}{r.isMe || r.you ? ' (you)' : ''}</span>
              <span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-signal" aria-hidden="true" />{r.currentStreak ?? r.streak ?? 0}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export default function Progress() {
  const stats = useAsync(() => meApi.stats(), []);
  const badges = useAsync(() => meApi.badges(), []);
  const st = stats.data?.stats || stats.data || {};
  return (
    <>
      <PageHeader title="Streaks and badges" subtitle="Streaks update after the gym confirms your attendance." />
      {stats.error && !stats.data ? <ErrorState error={stats.error} onRetry={stats.reload} /> : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Current streak" value={`${st.currentStreak ?? 0} days`} icon={Flame} loading={stats.loading && !stats.data} />
          <StatCard label="Longest streak" value={`${st.longestStreak ?? 0} days`} icon={Trophy} loading={stats.loading && !stats.data} />
          <StatCard label="Total workouts" value={st.totalWorkouts ?? 0} icon={Award} loading={stats.loading && !stats.data} />
        </div>
      )}
      <div className="mt-6 space-y-6">
        <Card title="Badges">
          <AsyncView state={badges} skeleton={<SkeletonList rows={2} />}>{(d) => <Badges data={d} />}</AsyncView>
        </Card>
        <StreakBoard />
      </div>
    </>
  );
}
