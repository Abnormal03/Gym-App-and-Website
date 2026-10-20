import { providersApi } from '../../api/providers.api';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../contexts/AuthContext';
import { AsyncView, EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import { Card, PageHeader, Stars } from '../../components/common/Layout';
import DataTable from '../../components/common/DataTable';
import { formatDate } from '../../utils/format';

export default function Reviews() {
  const { user, role } = useAuth();
  // Own reviews: verified GET /api/providers/:id/reviews. Provider id equals the user id in the documented samples.
  const reviews = useAsync(() => providersApi.reviews(user.id, { limit: 20 }), [user.id]);
  const board = useAsync(() => providersApi.leaderboard({ type: role, limit: 10 }), [role]);
  const items = reviews.data?.items || [];
  const rows = board.data?.items || [];

  const cols = [
    { key: 'rank', header: '#', render: (r) => r.rank },
    { key: 'name', header: 'Provider', primary: true, render: (r) => <span className={r.id === user.id ? 'font-semibold text-brand' : ''}>{r.name}{r.id === user.id ? ' (you)' : ''}</span> },
    { key: 'rating', header: 'Rating', render: (r) => <Stars value={Number(r.ratingAvg || 0)} count={r.ratingCount || 0} /> },
    { key: 'sessions', header: 'Sessions', render: (r) => r.sessionsCompleted ?? '-' },
  ];

  return (
    <>
      <PageHeader title="Reviews and ranking" subtitle="What members said, and how you rank at your gym." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your reviews">
          <AsyncView state={reviews} skeleton={<SkeletonList rows={2} />} isEmpty={() => items.length === 0} empty={<EmptyState title="No reviews yet" message="Members can review you after a completed session." />}>
            {() => (
              <ul className="divide-y divide-ink-100">
                {items.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-sm text-ink-500">{formatDate(r.createdAt)}</span></div>
                    {r.comment && <p className="mt-1">{r.comment}</p>}
                    <p className="text-sm text-ink-500">{r.reviewerFirstName || 'Member'}</p>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </Card>
        <Card title="Gym ranking" padded={false}>
          <div className="p-4">
            {board.loading && !board.data ? <SkeletonList rows={3} /> : board.error ? <ErrorState error={board.error} onRetry={board.reload} /> : rows.length === 0 ? <EmptyState title="Not ranked yet" message="Providers appear after they collect a few reviews." /> : <DataTable columns={cols} rows={rows} rowKey="rank" caption="Ranking" />}
          </div>
        </Card>
      </div>
    </>
  );
}
