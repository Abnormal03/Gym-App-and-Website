import ImageUploader from '../../components/common/ImageUploader';
import { useState } from 'react';
import { meApi } from '../../api/me.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useAuth } from '../../contexts/AuthContext';
import { AsyncView, SkeletonList } from '../../components/common/states';
import { Avatar, Card, PageHeader } from '../../components/common/Layout';
import { TextArea, TextField } from '../../components/common/Field';
import Button from '../../components/common/Button';
import { collect, isUrl, numberInRange } from '../../utils/validators';
import { splitCsv } from '../../utils/format';

function Form({ profile, onSaved }) {
  const { user, updateUser } = useAuth();
  const p = profile?.provider || profile || {};
  const [v, setV] = useState({
    bio: p.bio || '', specializations: (p.specializations || []).join(', '), experienceYears: p.experienceYears ?? '',
    certifications: (p.certifications || []).join(', '), photoUrl: p.photoUrl || user.photoUrl || '',
  });
  const [errors, setErrors] = useState({});
  const { run, pending, fieldErrors } = useSubmit();
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const err = (k) => errors[k] || fieldErrors[k];

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      experienceYears: () => (v.experienceYears === '' ? null : numberInRange(v.experienceYears, { min: 0, max: 60, integer: true, label: 'Experience' })),
      photoUrl: () => (v.photoUrl && !isUrl(v.photoUrl) ? 'Enter a full http(s) link.' : null),
      bio: () => (v.bio.length > 1000 ? 'Keep the bio under 1000 characters.' : null),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      bio: v.bio.trim(), specializations: splitCsv(v.specializations), certifications: splitCsv(v.certifications),
      ...(v.experienceYears !== '' ? { experienceYears: Number(v.experienceYears) } : {}), ...(v.photoUrl.trim() ? { photoUrl: v.photoUrl.trim() } : {}),
    };
    const ok = await run(() => meApi.updateProfile(body), { success: 'Profile saved' });
    if (ok) { if (body.photoUrl) updateUser({ photoUrl: body.photoUrl }); onSaved(); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="flex items-center gap-4"><Avatar name={user.name} src={isUrl(v.photoUrl) ? v.photoUrl : null} size="lg" /><div><p className="text-lg font-medium">{user.name}</p><p className="text-sm text-ink-500">{user.email}</p></div></div>
      <TextArea label="Bio" rows={4} value={v.bio} onChange={set('bio')} error={err('bio')} hint="Shown to members when they choose you." />
      <TextField label="Specializations" value={v.specializations} onChange={set('specializations')} hint="Comma separated, e.g. Strength, Mobility." />
      <TextField label="Certifications" value={v.certifications} onChange={set('certifications')} hint="Comma separated." />
      <TextField label="Years of experience" type="number" min="0" value={v.experienceYears} onChange={set('experienceYears')} error={err('experienceYears')} />
      <ImageUploader label="Profile photo" name={v.name} value={v.photoUrl} onChange={(url) => setV((x) => ({ ...x, photoUrl: url }))} />
      <Button type="submit" loading={pending}>Save profile</Button>
    </form>
  );
}

export default function ProviderProfile() {
  const state = useAsync(() => meApi.profile(), []);
  return (
    <>
      <PageHeader title="Profile" />
      <Card><AsyncView state={state} skeleton={<SkeletonList rows={3} />}>{(p) => <Form profile={p} onSaved={state.reload} />}</AsyncView></Card>
    </>
  );
}
