import { useEffect, useState } from 'react';
import { usersApi } from '../../api/users.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, PageHeader, Avatar } from '../../components/common/Layout';
import { AsyncView, SkeletonList } from '../../components/common/states';
import { TextField, Toggle } from '../../components/common/Field';
import Button from '../../components/common/Button';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';
import { collect, isPhone, isUrl, required } from '../../utils/validators';
import { formatDate } from '../../utils/format';

function DetailsForm({ user, onSaved }) {
  const { updateUser } = useAuth();
  const [v, setV] = useState({ name: user.name || '', phone: user.phone || '', photoUrl: user.photoUrl || '' });
  const [errors, setErrors] = useState({});
  const { run, pending, fieldErrors } = useSubmit();
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const dirty = v.name !== (user.name || '') || v.phone !== (user.phone || '') || v.photoUrl !== (user.photoUrl || '');

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      name: () => required(v.name, 'Name'),
      phone: () => (v.phone && !isPhone(v.phone) ? 'Enter a valid phone number.' : null),
      photoUrl: () => (v.photoUrl && !isUrl(v.photoUrl) ? 'Enter a full http(s) link.' : null),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {};
    if (v.name !== (user.name || '')) body.name = v.name.trim();
    if (v.phone !== (user.phone || '')) body.phone = v.phone.trim();
    if (v.photoUrl !== (user.photoUrl || '')) body.photoUrl = v.photoUrl.trim();
    const updated = await run(() => usersApi.updateMe(body), { success: 'Profile updated' });
    if (updated && updated !== true) { updateUser({ name: updated.name, phone: updated.phone, photoUrl: updated.photoUrl }); onSaved(); }
  };
  const err = (k) => errors[k] || fieldErrors[k];

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="flex items-center gap-4"><Avatar name={v.name} src={isUrl(v.photoUrl) ? v.photoUrl : null} size="lg" /><p className="text-sm text-ink-500">Member since {formatDate(user.createdAt)}. {user.totalBookings ?? 0} bookings.</p></div>
      <TextField label="Full name" value={v.name} onChange={set('name')} error={err('name')} required />
      <TextField label="Email" value={user.email || ''} disabled hint="Email cannot be changed." />
      <TextField label="Phone" type="tel" value={v.phone} onChange={set('phone')} error={err('phone')} />
      <TextField label="Photo link" type="url" value={v.photoUrl} onChange={set('photoUrl')} error={err('photoUrl')} hint="Paste a link to an image. Uploads are not supported." />
      <Button type="submit" loading={pending} disabled={!dirty}>Save changes</Button>
    </form>
  );
}

function Preferences() {
  const toast = useToast();
  const state = useAsync(() => usersApi.preference(), []);
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (state.data) setPrefs(state.data); }, [state.data]);

  const change = async (key, value) => {
    const before = prefs;
    setPrefs({ ...prefs, [key]: value }); // optimistic
    setSaving(true);
    try {
      setPrefs(await usersApi.updatePreference({ [key]: value }));
    } catch (e) {
      setPrefs(before);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AsyncView state={state} skeleton={<SkeletonList rows={2} />}>
      {() => prefs && (
        <div className="divide-y divide-ink-100">
          <Toggle label="Booking confirmations" description="Tell me when a booking is confirmed." checked={prefs.bookingConfirm} disabled={saving} onChange={(c) => change('bookingConfirm', c)} />
          <Toggle label="Session reminders" description="Remind me before coaching sessions." checked={prefs.sessionReminders} disabled={saving} onChange={(c) => change('sessionReminders', c)} />
          <Toggle label="Offers and promotions" description="Occasional deals from gyms." checked={prefs.offersAndPromotions} disabled={saving} onChange={(c) => change('offersAndPromotions', c)} />
        </div>
      )}
    </AsyncView>
  );
}

export default function MemberProfile() {
  const me = useAsync(() => usersApi.me(), []);
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your details"><AsyncView state={me} skeleton={<SkeletonList rows={3} />}>{(u) => <DetailsForm user={u} onSaved={me.reload} />}</AsyncView></Card>
        <div className="space-y-6">
          <Card title="Notifications"><Preferences /></Card>
          <Card title="Change password"><ChangePasswordForm mode="member" /></Card>
        </div>
      </div>
    </>
  );
}
