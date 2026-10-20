import { adminApi } from '../../api/admin.api';
import { useAsync } from '../../hooks/useAsync';
import { AsyncView, SkeletonList } from '../../components/common/states';
import { Avatar, Card, InfoRow, PageHeader } from '../../components/common/Layout';
import { formatDate } from '../../utils/format';

export default function AdminProfile() {
  const state = useAsync(() => adminApi.profile(), []);
  return (
    <>
      <PageHeader title="Profile" />
      <Card>
        <AsyncView state={state} skeleton={<SkeletonList rows={2} />}>
          {(a) => (
            <>
              <div className="mb-4 flex items-center gap-4"><Avatar name={a.name} size="lg" /><div><p className="text-xl font-medium">{a.name}</p><p className="text-ink-500">Gym administrator</p></div></div>
              <dl className="divide-y divide-ink-100">
                <InfoRow label="Email">{a.email}</InfoRow>
                <InfoRow label="Phone">{a.phone}</InfoRow>
                <InfoRow label="Admin since">{formatDate(a.createdAt)}</InfoRow>
              </dl>
            </>
          )}
        </AsyncView>
      </Card>
    </>
  );
}
