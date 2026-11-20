import { useEffect, useState } from 'react';
import { Building2, CalendarDays, CreditCard, Edit3, Mail, Shield, UserRound, Users, Wallet, UserCog, CalendarCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin.api';
import { bookingsApi } from '../../api/bookings.api';
import { providersApi } from '../../api/providers.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useAdminGym } from '../../contexts/AdminGymContext';
import { Avatar, Card, PageHeader, StatCard } from '../../components/common/Layout';
import { AsyncView, ErrorState, SkeletonList } from '../../components/common/states';
import { formatDate, formatRange } from '../../utils/format';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

function EditNameModal({ initialName, onClose, onSaved }) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const valid = name.trim().length >= 2 && name.trim().length <= 100;
  async function submit(event) {
    event.preventDefault();
    if (!valid) { setError('Enter a display name to continue.'); return; }
    setSaving(true);
    setError('');
    try { onSaved(await adminApi.updateProfile({ name: name.trim() })); }
    catch (e) { setError(e.response?.data?.message || 'Could not update your display name.'); }
    finally { setSaving(false); }
  }
  return <Modal open onClose={onClose} title="Edit display name" size="md" locked={saving}
    footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button variant="brand" type="submit" form="admin-display-name-form" loading={saving} disabled={!valid}>Save name</Button></>}>
    <form id="admin-display-name-form" onSubmit={submit} className="space-y-2">
      <label htmlFor="admin-display-name" className="block font-medium">Display name</label>
      <input id="admin-display-name" autoFocus autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className={`input w-full ${error ? 'border-red-600 focus:border-red-600 focus:ring-red-200' : ''}`} placeholder="Your name" aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-name-error' : 'admin-name-hint'} />
      {error ? <p id="admin-name-error" role="alert" className="flex items-center gap-2 text-sm text-red-700"><X className="h-4 w-4" />{error}</p> : <p id="admin-name-hint" className="text-sm text-ink-500">Shown in the header and to your team.</p>}
    </form>
  </Modal>;
}

export default function AdminProfile() {
  const profile = useAsync(() => adminApi.profile(), []);
  const dashboard = useAsync(() => adminApi.dashboard(), []);
  const { gym, gyms } = useAdminGym();
  const bookings = useAsync(() => gym ? bookingsApi.forGym(gym.id) : Promise.resolve([]), [gym?.id]);
  const [editing, setEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const stats = useAsync(() => bookingsApi.stats(), []);
  const providers = useAsync(() => gym ? providersApi.adminList({ gymId: gym.id, limit: 1 }) : Promise.resolve(null), [gym?.id]);
  const payouts = useAsync(() => adminApi.payouts('PENDING'), []);
  const recent = [...(bookings.data || [])].sort((a,b) => new Date(b.slotStart)-new Date(a.slotStart)).slice(0,4);
  const pendingPayouts = payouts.data ? asList(payouts.data, 'payouts').length : '-';

  useEffect(() => { if (profile.data?.name) document.title = `${profile.data.name} · Profile`; return () => { document.title = 'Gym Platform'; }; }, [profile.data?.name]);

  function updateProfile(admin) { profile.setData(admin); setEditing(false); setSavedMessage('Display name updated.'); }

  return <>
    <PageHeader title="Profile" subtitle="Your account and the gym you manage." />
    {profile.error && !profile.data ? <ErrorState error={profile.error} onRetry={profile.reload} /> : profile.loading && !profile.data ? <SkeletonList rows={3} /> : profile.data && <>
      <section className="flex flex-col gap-5 rounded-2xl border border-ink-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar name={profile.data.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold">{profile.data.name}</h2><span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand">Gym administrator</span></div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-ink-500"><span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />{profile.data.email}</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />Admin since {formatDate(profile.data.createdAt)}</span>{gym && <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" />Managing {gym.name}</span>}<span className="inline-flex items-center gap-2"><Shield className="h-4 w-4" />{gyms.length} {gyms.length === 1 ? 'gym' : 'gyms'} on the platform</span></div>
          {savedMessage && <p role="status" className="mt-2 text-sm text-green-700">{savedMessage}</p>}
        </div>
        <Button variant="secondary" icon={Edit3} onClick={() => { setSavedMessage(''); setEditing(true); }}>Edit name</Button>
      </section>
      <h2 className="mb-3 mt-7 text-sm font-semibold uppercase tracking-[0.12em] text-ink-500">{gym?.name ? `${gym.name} at a glance` : 'Platform at a glance'}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Bookings" value={dashboard.data?.totalBookings ?? '-'} hint={stats.data ? `${stats.data.confirmed ?? 0} confirmed · ${stats.data.pending ?? 0} awaiting payment` : undefined} icon={CalendarCheck} loading={dashboard.loading && !dashboard.data} />
        <StatCard label="Members" value={dashboard.data?.totalUsers ?? '-'} icon={Users} loading={dashboard.loading && !dashboard.data} />
        <StatCard label="Payments" value={dashboard.data?.totalPayments ?? '-'} icon={CreditCard} loading={dashboard.loading && !dashboard.data} />
        <StatCard label="Trainers and physios" value={providers.data?.total ?? '-'} icon={UserCog} loading={providers.loading && !providers.data} />
        <StatCard label="Payout requests waiting" value={pendingPayouts} icon={Wallet} loading={payouts.loading && !payouts.data} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.8fr_1fr]">
        <Card title={`Latest bookings${gym ? ` at ${gym.name}` : ''}`} actions={<Link to="/admin/bookings" className="text-sm font-medium text-brand hover:underline">All bookings</Link>}>
          {bookings.loading && !bookings.data ? <SkeletonList rows={3} /> : bookings.error ? <ErrorState error={bookings.error} onRetry={bookings.reload} /> : recent.length === 0 ? <p className="py-4 text-sm text-ink-500">No recent bookings.</p> : <ul className="divide-y divide-ink-100">{recent.map((b) => <li key={b.id} className="flex items-center justify-between gap-3 py-3"><span className="min-w-0 truncate font-medium">{b.user?.name || 'Member'}<span className="block truncate text-sm font-normal text-ink-500">{formatRange(b.slotStart,b.slotEnd)} · {b.package?.name || 'No package'}</span></span><StatusBadge status={b.status} /></li>)}</ul>}
        </Card>
        <Card title="Account"><dl className="divide-y divide-ink-100"><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Display name</dt><dd className="text-right font-medium">{profile.data.name}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Email</dt><dd className="break-all text-right font-medium">{profile.data.email}</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Role</dt><dd className="text-right font-medium">Gym administrator</dd></div><div className="flex justify-between gap-4 py-3"><dt className="text-ink-500">Admin since</dt><dd className="text-right font-medium">{formatDate(profile.data.createdAt)}</dd></div></dl></Card>
      </div>
    </>}
    {editing && profile.data && <EditNameModal initialName={profile.data.name} onClose={() => setEditing(false)} onSaved={updateProfile} />}
  </>;
}
