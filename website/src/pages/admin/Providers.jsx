import { useState } from 'react';
import { KeyRound, MessageSquareText, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { providersApi } from '../../api/providers.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import GymGate from '../../components/common/GymGate';
import { PageHeader, Stars } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList, Spinner } from '../../components/common/states';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import TempPasswordDialog from '../../components/common/TempPasswordDialog';
import { SelectField, TextArea, TextField } from '../../components/common/Field';
import { collect, isEmail, isPhone, numberInRange, passwordProblem, required } from '../../utils/validators';
import { formatDate, splitCsv } from '../../utils/format';

const TYPE_LABEL = { TRAINER: 'Trainer', PHYSIOTHERAPIST: 'Physiotherapist' };

function ProviderForm({ gym, provider, onClose, onSaved, onTempPassword }) {
  const editing = Boolean(provider);
  const [v, setV] = useState({
    type: provider?.type || 'TRAINER', name: provider?.name || '', email: provider?.email || '', phone: provider?.phone || '', password: '',
    bio: provider?.bio || '', specializations: (provider?.specializations || []).join(', '), experienceYears: provider?.experienceYears ?? '',
    certifications: (provider?.certifications || []).join(', '), sharePercent: provider?.sharePercent ?? 100,
  });
  const [errors, setErrors] = useState({});
  const { run, pending, error, fieldErrors } = useSubmit();
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const err = (k) => errors[k] || fieldErrors[k];

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      name: () => required(v.name, 'Name'),
      email: () => (editing || isEmail(v.email) ? null : 'Enter a valid email address.'),
      phone: () => (v.phone && !isPhone(v.phone) ? 'Enter a valid phone number.' : null),
      password: () => (editing || !v.password ? null : passwordProblem(v.password)),
      experienceYears: () => (v.experienceYears === '' ? null : numberInRange(v.experienceYears, { min: 0, max: 60, integer: true, label: 'Experience' })),
      sharePercent: () => numberInRange(v.sharePercent, { min: 0, max: 100, label: 'Share' }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const profile = {
      name: v.name.trim(), bio: v.bio.trim() || undefined, specializations: splitCsv(v.specializations), certifications: splitCsv(v.certifications),
      sharePercent: Number(v.sharePercent), ...(v.phone.trim() ? { phone: v.phone.trim() } : {}), ...(v.experienceYears !== '' ? { experienceYears: Number(v.experienceYears) } : {}),
    };
    const result = await run(
      () => (editing ? providersApi.adminUpdate(provider.id, profile) : providersApi.adminCreate({ gymId: gym.id, type: v.type, email: v.email.trim(), ...(v.password ? { password: v.password } : {}), ...profile })),
      { success: editing ? 'Provider updated' : 'Provider created' },
    );
    if (!result) return;
    onSaved();
    onClose();
    if (!editing && result.temporaryPassword) onTempPassword({ name: v.name, password: result.temporaryPassword });
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${provider.name}` : `New trainer or physio for ${gym.name}`} size="lg" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending}>{editing ? 'Save changes' : 'Create account'}</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {!editing && <SelectField label="Role" value={v.type} onChange={set('type')} options={[{ value: 'TRAINER', label: 'Trainer' }, { value: 'PHYSIOTHERAPIST', label: 'Physiotherapist' }]} />}
        <TextField label="Full name" value={v.name} onChange={set('name')} error={err('name')} required />
        {!editing && <TextField label="Email" type="email" value={v.email} onChange={set('email')} error={err('email')} required />}
        <TextField label="Phone" type="tel" value={v.phone} onChange={set('phone')} error={err('phone')} />
        {!editing && <TextField label="Temporary password" type="text" autoComplete="off" value={v.password} onChange={set('password')} error={err('password')} hint="Leave empty to generate one." />}
        <TextField label="Revenue share (%)" type="number" min="0" max="100" step="any" value={v.sharePercent} onChange={set('sharePercent')} error={err('sharePercent')} hint="Part of each coaching sale credited to the provider." />
        <TextField label="Years of experience" type="number" min="0" value={v.experienceYears} onChange={set('experienceYears')} error={err('experienceYears')} />
        <TextField label="Specializations" value={v.specializations} onChange={set('specializations')} hint="Comma separated." />
        <TextField className="sm:col-span-2" label="Certifications" value={v.certifications} onChange={set('certifications')} hint="Comma separated." />
        <TextArea className="sm:col-span-2" label="Bio" value={v.bio} onChange={set('bio')} rows={3} />
        {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error.message}</p>}
      </form>
    </Modal>
  );
}

function ReviewsModal({ provider, onClose }) {
  // Uses the verified GET /api/providers/:id/reviews (any bearer token).
  const state = useAsync(() => providersApi.reviews(provider.id, { limit: 20 }), [provider.id]);
  const items = state.data?.items || [];
  return (
    <Modal open onClose={onClose} title={`Reviews for ${provider.name}`} footer={<Button onClick={onClose}>Close</Button>}>
      {state.loading && !state.data ? <Spinner /> : state.error ? <ErrorState error={state.error} onRetry={state.reload} /> : items.length === 0 ? <p className="text-ink-500">No reviews yet.</p> : (
        <ul className="divide-y divide-ink-100">
          {items.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-sm text-ink-500">{formatDate(r.createdAt)}</span></div>
              {r.comment && <p className="mt-1 text-ink-700">{r.comment}</p>}
              <p className="text-sm text-ink-500">{r.reviewerFirstName || 'Member'}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Content({ gym }) {
  const [type, setType] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const state = useAsync(() => providersApi.adminList({ gymId: gym.id, type, isActive: active, page, limit }), [gym.id, type, active, page]);
  const [form, setForm] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [temp, setTemp] = useState(null);
  const action = useSubmit();

  const flip = async () => {
    const ok = await action.run(() => providersApi.adminUpdate(toggling.id, { isActive: !toggling.isActive }), { success: toggling.isActive ? 'Provider deactivated' : 'Provider activated' });
    if (ok) { setToggling(null); state.reload(); }
  };
  const reset = async () => {
    const res = await action.run(() => providersApi.adminResetPassword(resetting.id), { success: 'Password reset' });
    if (res) { setTemp({ name: resetting.name, password: res.temporaryPassword }); setResetting(null); }
  };

  const columns = [
    { key: 'name', header: 'Provider', primary: true, sortValue: (p) => p.name, render: (p) => <span><span className="font-medium">{p.name}</span><span className="block text-sm text-ink-500">{p.email}</span></span> },
    { key: 'type', header: 'Role', render: (p) => TYPE_LABEL[p.type] || p.type },
    { key: 'sharePercent', header: 'Share', sortValue: (p) => Number(p.sharePercent), render: (p) => `${p.sharePercent}%` },
    { key: 'rating', header: 'Rating', sortValue: (p) => Number(p.ratingAvg || 0), render: (p) => <Stars value={Number(p.ratingAvg || 0)} count={p.ratingCount || 0} /> },
    { key: 'sessions', header: 'Sessions done', sortValue: (p) => p.sessionsCompleted || 0, render: (p) => p.sessionsCompleted ?? '-' },
    { key: 'isActive', header: 'Status', render: (p) => <StatusBadge status={p.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: '', className: 'text-right', render: (p) => (
      <span className="inline-flex flex-wrap justify-end gap-1">
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm(p)}>Edit</Button>
        <Button size="sm" variant="ghost" icon={MessageSquareText} onClick={() => setReviews(p)}>Reviews</Button>
        <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setResetting(p)}>Reset password</Button>
        <Button size="sm" variant="ghost" icon={p.isActive ? PowerOff : Power} onClick={() => setToggling(p)}>{p.isActive ? 'Deactivate' : 'Activate'}</Button>
      </span>
    ) },
  ];

  return (
    <>
      <PageHeader title="Trainers and physiotherapists" subtitle={`Accounts for ${gym.name}. Ratings are read-only.`} actions={<Button icon={Plus} onClick={() => setForm('new')}>New provider</Button>} />
      <div className="mb-4 grid max-w-md grid-cols-2 gap-3">
        <SelectField label="Role" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} placeholder="All roles" options={[{ value: 'TRAINER', label: 'Trainers' }, { value: 'PHYSIOTHERAPIST', label: 'Physiotherapists' }]} />
        <SelectField label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} placeholder="Any status" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
      </div>
      {state.loading && !state.data ? <SkeletonList /> : state.error && !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : (state.data?.items || []).length === 0 ? <EmptyState title="No providers yet" message="Create an account for a trainer or physiotherapist. They set their own availability and packages after signing in." action={<Button icon={Plus} onClick={() => setForm('new')}>New provider</Button>} /> : (
        <DataTable columns={columns} rows={state.data.items} caption="Providers" serverPaging={{ page, limit, total: state.data.total, onChange: setPage }} />
      )}
      {form && <ProviderForm gym={gym} provider={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={state.reload} onTempPassword={setTemp} />}
      {reviews && <ReviewsModal provider={reviews} onClose={() => setReviews(null)} />}
      <ConfirmDialog open={Boolean(toggling)} title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Activate ${toggling?.name}?`} message={toggling?.isActive ? 'They will no longer appear to members or be able to sign in.' : 'They will appear to members again and can sign in.'} confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'} danger={toggling?.isActive} loading={action.pending} onConfirm={flip} onClose={() => setToggling(null)} />
      <ConfirmDialog open={Boolean(resetting)} title={`Reset ${resetting?.name}'s password?`} message="A new temporary password is generated. The current password stops working immediately." confirmLabel="Reset password" danger loading={action.pending} onConfirm={reset} onClose={() => setResetting(null)} />
      <TempPasswordDialog open={Boolean(temp)} name={temp?.name} password={temp?.password} onClose={() => setTemp(null)} />
    </>
  );
}

export default function AdminProviders() {
  return <GymGate>{(gym) => <Content gym={gym} />}</GymGate>;
}
