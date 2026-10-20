import { useState } from 'react';
import { Banknote, Ban } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { PageHeader, Tabs } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { SelectField, TextArea, TextField } from '../../components/common/Field';
import { formatDate, formatMoney } from '../../utils/format';

const TABS = [{ value: 'PENDING', label: 'Pending' }, { value: 'PAID', label: 'Paid' }, { value: 'REJECTED', label: 'Rejected' }];
const METHODS = [{ value: 'CASH', label: 'Cash' }, { value: 'BANK_TRANSFER', label: 'Bank transfer' }, { value: 'OTHER', label: 'Other' }];
const who = (p) => p.provider?.name || p.providerName || `Provider #${p.providerId ?? p.id}`;

function PaidModal({ payout, onClose, onDone }) {
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const { run, pending, error } = useSubmit();
  const submit = async (e) => {
    e?.preventDefault();
    const ok = await run(() => adminApi.markPaid(payout.id, { method, reference: reference.trim() || undefined }), { success: 'Payout marked as paid' });
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal open onClose={onClose} title={`Pay ${who(payout)}`} size="sm" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending}>Mark as paid</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-ink-600">Amount to pay: <strong>{formatMoney(payout.amount)}</strong></p>
        <SelectField label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={METHODS} />
        <TextField label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} hint="Bank transaction number or receipt number." />
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      </form>
    </Modal>
  );
}

function RejectModal({ payout, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const { run, pending, error } = useSubmit();
  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (!note.trim()) return;
    const ok = await run(() => adminApi.reject(payout.id, { note: note.trim() }), { success: 'Payout rejected. The amount is available to the provider again.' });
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal open onClose={onClose} title={`Reject ${who(payout)}'s request`} size="sm" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button variant="danger" onClick={submit} loading={pending}>Reject request</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <TextArea label="Reason" value={note} onChange={(e) => setNote(e.target.value)} error={touched && !note.trim() ? 'A reason is required.' : undefined} hint="The provider sees this note." required />
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      </form>
    </Modal>
  );
}

export default function AdminPayouts() {
  const [status, setStatus] = useState('PENDING');
  const state = useAsync(() => adminApi.payouts(status), [status]);
  const [paying, setPaying] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const rows = asList(state.data, 'payouts');

  const columns = [
    { key: 'provider', header: 'Provider', primary: true, render: (p) => <span className="font-medium">{who(p)}</span> },
    { key: 'amount', header: 'Amount', sortValue: (p) => Number(p.amount), render: (p) => formatMoney(p.amount) },
    { key: 'createdAt', header: 'Requested', sortValue: (p) => p.createdAt, render: (p) => formatDate(p.createdAt) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'detail', header: 'Detail', render: (p) => <span className="text-sm text-ink-600">{p.status === 'PAID' ? `${(p.method || p.paidMethod || '').replace('_', ' ').toLowerCase()} ${p.reference || p.paidReference || ''}` : p.note || '-'}</span> },
    { key: 'actions', header: '', className: 'text-right', render: (p) => p.status === 'PENDING' ? (
      <span className="inline-flex gap-1"><Button size="sm" variant="brand" icon={Banknote} onClick={() => setPaying(p)}>Mark as paid</Button><Button size="sm" variant="dangerOutline" icon={Ban} onClick={() => setRejecting(p)}>Reject</Button></span>
    ) : null },
  ];

  return (
    <>
      <PageHeader title="Payout requests" subtitle="Trainers, physiotherapists and consultants ask for their earnings here. You pay them outside the app, then record it." />
      <Tabs tabs={TABS} value={status} onChange={setStatus} label="Payout status" />
      {state.loading && !state.data ? <SkeletonList /> : state.error && !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : rows.length === 0 ? <EmptyState title={`No ${status.toLowerCase()} requests`} /> : <DataTable columns={columns} rows={rows} caption="Payout requests" />}
      {paying && <PaidModal payout={paying} onClose={() => setPaying(null)} onDone={state.reload} />}
      {rejecting && <RejectModal payout={rejecting} onClose={() => setRejecting(null)} onDone={state.reload} />}
    </>
  );
}
