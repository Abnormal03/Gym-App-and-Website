import { useState } from 'react';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { meApi } from '../../api/me.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { AsyncView, EmptyState, SkeletonList } from '../../components/common/states';
import { PageHeader } from '../../components/common/Layout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { TextField } from '../../components/common/Field';
import { collect, numberInRange, required } from '../../utils/validators';
import { formatMoney } from '../../utils/format';

function PackageForm({ pkg, onClose, onSaved }) {
  const editing = Boolean(pkg);
  const [v, setV] = useState({ name: pkg?.name || '', sessionCount: pkg?.sessionCount ?? '', price: pkg?.price ?? '', validityDays: pkg?.validityDays ?? '' });
  const [errors, setErrors] = useState({});
  const { run, pending, error, fieldErrors } = useSubmit();
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));
  const err = (k) => errors[k] || fieldErrors[k];

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      name: () => required(v.name, 'Name'),
      sessionCount: () => numberInRange(v.sessionCount, { min: 1, max: 200, integer: true, label: 'Sessions' }),
      price: () => numberInRange(v.price, { min: 0, label: 'Price' }),
      validityDays: () => numberInRange(v.validityDays, { min: 1, max: 730, integer: true, label: 'Validity' }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const body = { name: v.name.trim(), sessionCount: Number(v.sessionCount), price: Number(v.price), validityDays: Number(v.validityDays) };
    const ok = await run(() => (editing ? meApi.updatePackage(pkg.id, body) : meApi.createPackage(body)), { success: editing ? 'Package updated' : 'Package created' });
    if (ok) { onSaved(); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title={editing ? `Edit ${pkg.name}` : 'New session package'} locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending}>{editing ? 'Save changes' : 'Create package'}</Button></>}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label="Name" value={v.name} onChange={set('name')} error={err('name')} required />
        <TextField label="Number of sessions" type="number" min="1" value={v.sessionCount} onChange={set('sessionCount')} error={err('sessionCount')} required />
        <TextField label="Price (ETB)" type="number" min="0" step="any" value={v.price} onChange={set('price')} error={err('price')} required />
        <TextField label="Valid for (days)" type="number" min="1" value={v.validityDays} onChange={set('validityDays')} error={err('validityDays')} required />
        {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error.message}</p>}
      </form>
    </Modal>
  );
}

export default function ProviderPackages() {
  const state = useAsync(() => meApi.packages(), []);
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const del = useSubmit();
  const rows = asList(state.data, 'packages');

  const remove = async () => {
    const ok = await del.run(() => meApi.deletePackage(removing.id), { success: 'Package removed' });
    if (ok) { setRemoving(null); state.reload(); }
  };

  const columns = [
    { key: 'name', header: 'Package', primary: true, render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'sessionCount', header: 'Sessions', sortValue: (p) => p.sessionCount, render: (p) => p.sessionCount },
    { key: 'price', header: 'Price', sortValue: (p) => Number(p.price), render: (p) => formatMoney(p.price) },
    { key: 'validityDays', header: 'Valid for', render: (p) => `${p.validityDays} days` },
    { key: 'isActive', header: 'Status', render: (p) => <StatusBadge status={p.isActive === false ? 'inactive' : 'active'} /> },
    { key: 'actions', header: '', className: 'text-right', render: (p) => (
      <span className="inline-flex gap-1"><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm(p)}>Edit</Button><Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRemoving(p)}>Remove</Button></span>
    ) },
  ];

  return (
    <>
      <PageHeader title="My packages" subtitle="Session bundles members can add at checkout." actions={<Button icon={Plus} onClick={() => setForm('new')}>New package</Button>} />
      <AsyncView state={state} skeleton={<SkeletonList />} isEmpty={() => rows.length === 0} empty={<EmptyState icon={Package} title="No packages yet" message="Create a bundle of sessions so members can book you." action={<Button icon={Plus} onClick={() => setForm('new')}>New package</Button>} />}>
        {() => <DataTable columns={columns} rows={rows} caption="My packages" />}
      </AsyncView>
      {form && <PackageForm pkg={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={state.reload} />}
      <ConfirmDialog open={Boolean(removing)} title={`Remove ${removing?.name}?`} message="A package that members already bought is deactivated instead of deleted, so their sessions stay valid." confirmLabel="Remove" danger loading={del.pending} onConfirm={remove} onClose={() => setRemoving(null)} />
    </>
  );
}
