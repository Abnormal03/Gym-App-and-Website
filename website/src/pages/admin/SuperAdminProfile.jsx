import { Building2, CalendarDays, Mail, Shield, Users } from 'lucide-react';
import { superAdminApi } from '../../api/superAdmin.api';
import { useAsync } from '../../hooks/useAsync';
import { Avatar, Card, PageHeader, StatCard } from '../../components/common/Layout';
import { ErrorState, SkeletonList } from '../../components/common/states';
import { formatDate } from '../../utils/format';

export default function SuperAdminProfile() {
  const state = useAsync(() => superAdminApi.profile(), []);
  if (state.loading && !state.data) return <><PageHeader title="Platform profile" subtitle="Your account and platform overview."/><SkeletonList rows={3}/></>;
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.reload}/>;
  const { profile, overview } = state.data;
  return <><PageHeader title="Platform profile" subtitle="Your account and platform overview."/>
    <section className="flex flex-col gap-5 rounded-2xl border border-ink-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
      <Avatar name={profile.name} size="lg"/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{profile.name}</h2><span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand">Platform administrator</span></div><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-ink-500"><span className="inline-flex items-center gap-2"><Mail className="h-4 w-4"/>{profile.email}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4"/>Admin since {formatDate(profile.createdAt)}</span></div></div>
    </section>
    <h2 className="mb-3 mt-7 text-sm font-semibold uppercase tracking-[0.12em] text-ink-500">Platform at a glance</h2>
    <div className="grid gap-4 sm:grid-cols-2"><StatCard label="Gyms" value={overview.gyms} icon={Building2}/><StatCard label="Gym admins" value={overview.gymAdmins} icon={Users}/></div>
    <Card title="Account" className="mt-6"><dl className="divide-y divide-ink-100"><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Name</dt><dd className="text-right font-medium">{profile.name}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Email</dt><dd className="break-all text-right font-medium">{profile.email}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Role</dt><dd className="inline-flex items-center gap-2 text-right font-medium"><Shield className="h-4 w-4 text-brand"/>Platform administrator</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Admin since</dt><dd className="text-right font-medium">{formatDate(profile.createdAt)}</dd></div></dl></Card>
  </>;
}
