import { useState } from 'react';
import { Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { packagesApi } from '../../api/packages.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import GymGate from '../../components/common/GymGate';
import { PageHeader } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { ChipGroup, SelectField, TextArea, TextField } from '../../components/common/Field';
import { packageRestrictions } from '../../components/common/GymParts';
import { collect, numberInRange, required } from '../../utils/validators';
import { PERIODS, WEEKDAYS_SHORT, formatMoney } from '../../utils/format';

const TYPES = ['daily', 'weekly', 'monthly', 'annual'].map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }));
const DAY_OPTIONS = WEEKDAYS_SHORT.map((label, value) => ({ value, label }));
const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.value, label: `${p.label} (${p.hours})` }));

function PackageForm({ gym, pkg, onClose, onSaved }) {
  const editing = Boolean(pkg);
  const [v, setV] = useState({
    name: pkg?.name || '', type: pkg?.type || 'monthly', price: pkg?.price ?? '', durationDays: pkg?.durationDays ?? '', benefits: pkg?.benefits || '',
    maxVisits: pkg?.maxVisits ?? '', allowedDays: pkg?.allowedDays || [], allowedPeriods: pkg?.allowedPeriods || [], maxGroupSize: pkg?.maxGroupSize ?? 1,
  });
  const [errors, setErrors] = useState({});
  const { run, pending, error, fieldErrors } = useSubmit();
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const err = (k) => errors[k] || fieldErrors[k];

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      name: () => required(v.name, 'Name'),
      price: () => numberInRange(v.price, { min: 0, label: 'Price' }),
      durationDays: () => numberInRange(v.durationDays, { min: 1, integer: true, label: 'Validity' }),
      maxVisits: () => (v.maxVisits === '' ? null : numberInRange(v.maxVisits, { min: 1, integer: true, label: 'Visit limit' })),
      maxGroupSize: () => numberInRange(v.maxGroupSize, { min: 1, integer: true, label: 'Group size' }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = {
      name: v.name.trim(), type: v.type, price: Number(v.price), durationDays: Number(v.durationDays), benefits: v.benefits.trim() || null,
      maxVisits: v.maxVisits === '' ? null : Number(v.maxVisits), allowedDays: v.allowedDays, allowedPeriods: v.allowedPeriods, maxGroupSize: Number(v.maxGroupSize),
    };
    // gymId is accepted on create only
    const ok = await run(() => (editing ? packagesApi.adminUpdate(pkg.id, body) : packagesApi.adminCreate({ gymId: gym.id, ...body })), { success: editing ? 'Package updated' : 'Package created' });
    if (ok) { onSaved(); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${pkg.name}` : `New package for ${gym.name}`} size="lg" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending}>{editing ? 'Save changes' : 'Create package'}</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" value={v.name} onChange={set('name')} error={err('name')} required />
        <SelectField label="Type" value={v.type} onChange={set('type')} options={TYPES} />
        <TextField label="Price per person (ETB)" type="number" min="0" step="any" value={v.price} onChange={set('price')} error={err('price')} required />
        <TextField label="Valid for (days)" type="number" min="1" value={v.durationDays} onChange={set('durationDays')} error={err('durationDays')} hint="1 daily, 7 weekly, 30 monthly." required />
        <TextField label="Largest group" type="number" min="1" value={v.maxGroupSize} onChange={set('maxGroupSize')} error={err('maxGroupSize')} hint="1 means no group bookings." />
        <TextArea className="sm:col-span-2" label="Benefits" value={v.benefits} onChange={set('benefits')} rows={2} />
        <div className="sm:col-span-2"><ChipGroup label="Allowed days" options={DAY_OPTIONS} value={v.allowedDays} onChange={(x) => setV((s) => ({ ...s, allowedDays: x }))} hint="None selected means every day." /></div>
        <div className="sm:col-span-2"><ChipGroup label="Allowed times of day" options={PERIOD_OPTIONS} value={v.allowedPeriods} onChange={(x) => setV((s) => ({ ...s, allowedPeriods: x }))} hint="None selected means any time." /></div>
        {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error.message}</p>}
      </form>
    </Modal>
  );
}

function Content({ gym }) {
  const [active, setActive] = useState('true');
  const [page, setPage] = useState(1);
  const limit = 10;
  const state = useAsync(() => packagesApi.adminList({ gymId: gym.id, isActive: active === 'all' ? undefined : active, page, limit }), [gym.id, active, page]);
  const [form, setForm] = useState(null);
  const [toDeactivate, setToDeactivate] = useState(null);
  const toggle = useSubmit();

  const deactivate = async () => {
    const ok = await toggle.run(() => packagesApi.adminDeactivate(toDeactivate.id), { success: 'Package deactivated' });
    if (ok) { setToDeactivate(null); state.reload(); }
  };
  const reactivate = async (p) => {
    const ok = await toggle.run(() => packagesApi.adminUpdate(p.id, { isActive: true }), { success: 'Package reactivated' });
    if (ok) state.reload();
  };

  const columns = [
    { key: 'name', header: 'Package', primary: true, render: (p) => <span><span className="font-medium">{p.name}</span><span className="block text-sm capitalize text-ink-500">{p.type} · {p.durationDays} days</span></span> },
    { key: 'price', header: 'Price', render: (p) => formatMoney(p.price) },
    { key: 'rules', header: 'Rules', render: (p) => <span className="text-sm text-ink-600">{packageRestrictions(p).join(' · ')}</span> },
    { key: 'isActive', header: 'Status', render: (p) => <StatusBadge status={p.isActive ? 'active' : 'inactive'} /> },
    { key: 'actions', header: '', className: 'text-right', render: (p) => (
      <span className="inline-flex gap-1">
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm(p)} disabled={!p.isActive} aria-label={`Edit ${p.name}`}>Edit</Button>
        {p.isActive ? <Button size="sm" variant="ghost" icon={PowerOff} onClick={() => setToDeactivate(p)}>Deactivate</Button> : <Button size="sm" variant="ghost" icon={Power} onClick={() => reactivate(p)}>Reactivate</Button>}
      </span>
    ) },
  ];

  return (
    <>
      <PageHeader title="Gym packages" subtitle={`What members can buy at ${gym.name}.`} actions={<Button icon={Plus} onClick={() => setForm('new')}>New package</Button>} />
      <SelectField label="Show" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }, { value: 'all', label: 'All' }]} className="mb-4 max-w-[10rem]" />
      {state.loading && !state.data ? <SkeletonList /> : state.error && !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : (state.data?.items || []).length === 0 ? (
        <EmptyState title="No packages here" message="Create a package so members can book this gym." action={<Button icon={Plus} onClick={() => setForm('new')}>New package</Button>} />
      ) : (
        <DataTable columns={columns} rows={state.data.items} caption="Gym packages" serverPaging={{ page, limit, total: state.data.total, onChange: setPage }} />
      )}
      {form && <PackageForm gym={gym} pkg={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={state.reload} />}
      <ConfirmDialog open={Boolean(toDeactivate)} title="Deactivate this package?" message="Members will no longer be able to buy it. Existing purchases are unaffected, and you can reactivate it later." confirmLabel="Deactivate" danger loading={toggle.pending} onConfirm={deactivate} onClose={() => setToDeactivate(null)} />
    </>
  );
}

export default function AdminPackages() {
  return <GymGate>{(gym) => <Content gym={gym} />}</GymGate>;
}
