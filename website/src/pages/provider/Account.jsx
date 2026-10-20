import { Card, InfoRow, PageHeader } from '../../components/common/Layout';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';
import { useAuth } from '../../contexts/AuthContext';
import { ROLE_LABEL } from '../../config/roles';

export default function Account() {
  const { user, role } = useAuth();
  return (
    <>
      <PageHeader title="Password" subtitle="Change the password you use to sign in." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your account">
          <dl className="divide-y divide-ink-100">
            <InfoRow label="Name">{user.name}</InfoRow>
            <InfoRow label="Email">{user.email}</InfoRow>
            <InfoRow label="Role">{ROLE_LABEL[role]}</InfoRow>
          </dl>
        </Card>
        <Card title="Change password"><ChangePasswordForm mode="portal" /></Card>
      </div>
    </>
  );
}
