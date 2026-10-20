import { Link } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { meApi } from '../../api/me.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { AsyncView, EmptyState, SkeletonList } from '../../components/common/states';
import { Avatar, PageHeader } from '../../components/common/Layout';
import Button from '../../components/common/Button';
import { formatDate } from '../../utils/format';

/** Members with active access (E-44). Nutrition consultants see them grouped by gym. */
export default function Clients({ base, groupByGym = false }) {
  const state = useAsync(() => meApi.clients(), []);
  const rows = asList(state.data, 'clients');

console.log('Total client records:', rows.length);
console.table(rows);

  const row = (c) => {
    const name = c.member?.name || c.name || 'Member';
    return (
      <li
  key={c.id ?? c.memberId ?? c.member?._id ?? c._id}
  className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
   
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={name} src={c.member?.photoUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="text-sm text-ink-500">
              {c.sessionsLeft != null ? `${c.sessionsLeft} sessions left` : 'Chat access'}
              {c.expiresAt ? ` · until ${formatDate(c.expiresAt)}` : ''}
            </p>
          </div>
        </div>
        <Button as={Link} to={`${base}/messages`} size="sm" variant="secondary" icon={MessageSquare}>Open chat</Button>
      </li>
    );
  };

  const groups = groupByGym ? [...rows.reduce((m, c) => m.set(c.gym?.name || c.gymName || 'Gym', [...(m.get(c.gym?.name || c.gymName || 'Gym') || []), c]), new Map())] : [['', rows]];

  return (
    <>
      <PageHeader title="Clients" subtitle="Members whose access is active." />
      <AsyncView state={state} skeleton={<SkeletonList />} isEmpty={() => rows.length === 0} empty={<EmptyState icon={Users} title="No active clients" message="Clients appear here after a member pays for your package or consultation." />}>
        {() => groups.map(([gym, list]) => (
          <section key={gym || 'all'} className="mb-6">
            {gym && <h2 className="mb-2 text-lg text-ink-600">{gym}</h2>}
            <ul className="space-y-2">{list.map(row)}</ul>
          </section>
        ))}
      </AsyncView>
    </>
  );
}
