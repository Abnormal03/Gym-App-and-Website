import { useState } from 'react';
import { providersApi } from '../../api/providers.api';
import { useAsync } from '../../hooks/useAsync';
import GymGate from '../../components/common/GymGate';
import { PageHeader, Stars, Tabs } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import DataTable from '../../components/common/DataTable';

function Content({ gym }) {
  const [type, setType] = useState('TRAINER');
  const [page, setPage] = useState(1);
  const limit = 20;
  const state = useAsync(() => providersApi.leaderboard({ gymId: gym.id, type, page, limit }), [gym.id, type, page]);
  const items = state.data?.items || [];
  const columns = [
    { key: 'rank', header: '#', className: 'w-12', render: (r) => r.rank },
    { key: 'name', header: 'Provider', primary: true, render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'rating', header: 'Rating', render: (r) => <Stars value={Number(r.ratingAvg || 0)} count={r.ratingCount || 0} /> },
    { key: 'sessions', header: 'Sessions completed', render: (r) => r.sessionsCompleted ?? '-' },
    { key: 'badges', header: 'Badges', render: (r) => (Array.isArray(r.badges) ? r.badges.length : r.badges ?? '-') },
  ];
  return (
    <>
      <PageHeader title="Provider ranking" subtitle={`Highest rated at ${gym.name}. Providers need a few reviews to appear.`} />
      <Tabs tabs={[{ value: 'TRAINER', label: 'Trainers' }, { value: 'PHYSIOTHERAPIST', label: 'Physiotherapists' }]} value={type} onChange={(t) => { setType(t); setPage(1); }} label="Provider type" />
      {state.loading && !state.data ? <SkeletonList /> : state.error && !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : items.length === 0 ? <EmptyState title="No ranked providers yet" /> : (
        <DataTable columns={columns} rows={items} rowKey="rank" caption="Provider ranking" serverPaging={{ page, limit, total: state.data.total ?? items.length, onChange: setPage }} />
      )}
    </>
  );
}

export default function AdminLeaderboard() {
  return <GymGate>{(gym) => <Content gym={gym} />}</GymGate>;
}
