import { useState } from 'react';
import { KeyRound, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import GymGate from '../../components/common/GymGate';
import { PageHeader } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import TempPasswordDialog from '../../components/common/TempPasswordDialog';
import { SelectField, TextField } from '../../components/common/Field';
import { collect, isEmail, isPhone, passwordProblem, required } from '../../utils/validators';
import { formatDate } from '../../utils/format';

function StaffForm({ gym, member, onClose, onSaved, onTempPassword }) {
  const editing = Boolean(member);
  const [v, setV] = useState({ name: member?.name || '', email: member?.email || '', phone: member?.phone || '', password: '' });
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
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const phone = v.phone.trim();
    const result = await run(
      () => (editing ? adminApi.staffUpdate(member.id, { name: v.name.trim(), ...(phone ? { phone } : {}) }) : adminApi.staffCreate({ gymId: gym.id, name: v.name.trim(), email: v.email.trim(), ...(phone ? { phone } : {}), ...(v.password ? { password: v.password } : {}) })),
      { success: editing ? 'Staff member updated' : 'Staff member created' },
    );
    if (!result) return;
    onSaved();
    onClose();
    if (!editing && result.temporaryPassword) onTempPassword({ name: v.name, password: result.temporaryPassword });
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${member.name}` : `New staff member for ${gym.name}`} locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending}>{editing ? 'Save changes' : 'Create account'}</Button></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextField label="Full name" value={v.name} onChange={set('name')} error={err('name')} required />
        {!editing && <TextField label="Email" type="email" value={v.email} onChange={set('email')} error={err('email')} required />}
        <TextField label="Phone" type="tel" value={v.phone} onChange={set('phone')} error={err('phone')} />
        {!editing && <TextField label="Temporary password" autoComplete="off" value={v.password} onChange={set('password')} error={err('password')} hint="Leave empty to generate one." />}
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      </form>
    </Modal>
  );
}

function Content({ gym }) {
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const state = useAsync(() => adminApi.staffList({ gymId: gym.id, isActive: active, page, limit }), [gym.id, active, page]);
  const [form, setForm] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [temp, setTemp] = useState(null);
  const action = useSubmit();

  const flip = async () => {
    const ok = await action.run(() => adminApi.staffUpdate(toggling.id, { isActive: !toggling.isActive }), { success: toggling.isActive ? 'Staff member deactivated' : 'Staff member activated' });
    if (ok) { setToggling(null); state.reload(); }
  };
  const reset = async () => {
    const res = await action.run(() => adminApi.staffResetPassword(resetting.id), { success: 'Password reset' });
    if (res) { setTemp({ name: resetting.name, password: res.temporaryPassword }); setResetting(null); }
  };

  const columns = [
    { key: 'name', header: 'Name', primary: true, sortValue: (s) => s.name, render: (s) => <span><span className="font-medium">{s.name}</span><span className="block text-sm text-ink-500">{s.email}</span></span> },
    { key: 'phone', header: 'Phone', render: (s) => s.phone || '-' },
    { key: 'createdAt', header: 'Added', sortValue: (s) => s.createdAt, render: (s) => formatDate(s.createdAt) },
    { key: 'isActive', header: 'Status', render: (s) => <StatusBadge status={s.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: '', className: 'text-right', render: (s) => (
      <span className="inline-flex flex-wrap justify-end gap-1">
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm(s)}>Edit</Button>
        <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => setResetting(s)}>Reset password</Button>
        <Button size="sm" variant="ghost" icon={s.isActive ? PowerOff : Power} onClick={() => setToggling(s)}>{s.isActive ? 'Deactivate' : 'Activate'}</Button>
      </span>
    ) },
  ];

  return (
    <>
      <PageHeader title="Staff" subtitle={`Front-desk accounts for ${gym.name}.`} actions={<Button icon={Plus} onClick={() => setForm('new')}>New staff member</Button>} />
      <SelectField label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} placeholder="Any status" options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} className="mb-4 max-w-[12rem]" />
      {state.loading && !state.data ? <SkeletonList /> : state.error && !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : (state.data?.items || []).length === 0 ? <EmptyState title="No staff yet" action={<Button icon={Plus} onClick={() => setForm('new')}>New staff member</Button>} /> : (
        <DataTable columns={columns} rows={state.data.items} caption="Staff" serverPaging={{ page, limit, total: state.data.total, onChange: setPage }} />
      )}
      {form && <StaffForm gym={gym} member={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={state.reload} onTempPassword={setTemp} />}
      <ConfirmDialog open={Boolean(toggling)} title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Activate ${toggling?.name}?`} message={toggling?.isActive ? 'They can no longer sign in.' : 'They can sign in again.'} confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'} danger={toggling?.isActive} loading={action.pending} onConfirm={flip} onClose={() => setToggling(null)} />
      <ConfirmDialog open={Boolean(resetting)} title={`Reset ${resetting?.name}'s password?`} message="A new temporary password is generated and the old one stops working." confirmLabel="Reset password" danger loading={action.pending} onConfirm={reset} onClose={() => setResetting(null)} />
      <TempPasswordDialog open={Boolean(temp)} name={temp?.name} password={temp?.password} onClose={() => setTemp(null)} />
    </>
  );
}

export default function AdminStaff() {
  return <GymGate>{(gym) => <Content gym={gym} />}</GymGate>;
}
