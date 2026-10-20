import { useMemo, useState } from 'react';
import { AlertTriangle, Check, RotateCcw, UserCheck, XCircle } from 'lucide-react';
import { adminApi } from '../../api/admin.api';
import { bookingsApi } from '../../api/bookings.api';
import { checkinsApi } from '../../api/checkins.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useToast } from '../../contexts/ToastContext';
import GymGate from '../../components/common/GymGate';
import { PageHeader } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import DataTable from '../../components/common/DataTable';
import SearchBar from '../../components/common/SearchBar';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { SelectField, TextField } from '../../components/common/Field';
import { formatMoney, formatRange } from '../../utils/format';

const STATUSES = ['pending', 'confirmed', 'checked_in', 'cancelled', 'expired', 'payment_failed'].map((s) => ({ value: s, label: s === 'checked_in' ? 'Attended' : s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) }));

// The order (with its needsManualRefund flag) must be included in the gym bookings response.
const needsRefund = (b) => Boolean(b.order?.needsManualRefund ?? b.needsManualRefund);
const orderIdOf = (b) => b.order?.id ?? b.orderId;

function RefundModal({ booking, onClose, onDone }) {
  const [reference, setReference] = useState('');
  const { run, pending, error } = useSubmit();
  const amount = booking.order?.totalAmount ?? booking.payment?.amount;

  const submit = async (e) => {
    e?.preventDefault();
    const ok = await run(() => adminApi.confirmRefund(orderIdOf(booking), reference.trim()), { success: 'Refund recorded' });
    if (ok) { onDone(); onClose(); }
  };

  return (
    <Modal open onClose={onClose} title="Confirm refund" size="sm" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending}>Record refund</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-ink-600"><strong>{booking.user?.name || 'The member'}</strong> paid {amount != null ? formatMoney(amount) : ''} after the slot was no longer available.</p>
        <TextField label="Refund reference" value={reference} onChange={(e) => setReference(e.target.value)} hint="Optional, for example REFUND-12345." />
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      </form>
    </Modal>
  );
}

function Content({ gym }) {
  const toast = useToast();
  const state = useAsync(() => bookingsApi.forGym(gym.id), [gym.id]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [refundOnly, setRefundOnly] = useState(false);
  const [refunding, setRefunding] = useState(null);
  const { run } = useSubmit();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (state.data || []).filter((b) => (!status || b.status === status) && (!refundOnly || needsRefund(b)) && (!term || `${b.user?.name} ${b.user?.email} ${b.id}`.toLowerCase().includes(term)));
  }, [state.data, q, status, refundOnly]);
  const flagged = (state.data || []).filter(needsRefund);

  const act = async (b, fn, success) => {
    setBusy(b.id);
    const ok = await run(fn, { success });
    setBusy(null);
    if (ok) state.reload();
    return ok;
  };

  // Attendance is a check-in record (feeds streaks, badges and package visits).
  const attend = (b) => act(b, async () => {
    const res = await checkinsApi.manual(b.user.id, gym.id);
    if (res.alreadyCheckedIn) toast.info(`${res.memberName} was already checked in.`);
    else if (res.newBadges?.length) toast.info(`New badge: ${res.newBadges.map((x) => x.name).join(', ')}`);
  }, 'Checked in');

  const columns = [
    { key: 'user', header: 'Member', primary: true, sortValue: (b) => b.user?.name || '', render: (b) => <span><span className="font-medium">{b.user?.name || 'Member'}</span><span className="block text-sm text-ink-500">{b.user?.email}</span></span> },
    { key: 'slotStart', header: 'When', sortValue: (b) => b.slotStart, render: (b) => formatRange(b.slotStart, b.slotEnd) },
    { key: 'package', header: 'Package', render: (b) => <span>{b.package?.name || '-'}{b.bookingType === 'GROUP' ? <span className="block text-sm text-ink-500">Group of {b.headcount}</span> : null}</span> },
    { key: 'status', header: 'Status', sortValue: (b) => b.status, render: (b) => (
      <span>
        <StatusBadge status={b.status} label={b.status === 'checked_in' ? 'attended' : undefined} />
        {needsRefund(b) && <span className="mt-1 block"><StatusBadge status="failed" tone="red" label="refund needed" /></span>}
      </span>
    ) },
    { key: 'payment', header: 'Payment', render: (b) => (b.payment?.status ? <StatusBadge status={b.payment.status} /> : '-') },
    { key: 'actions', header: '', className: 'text-right', render: (b) => (
      <span className="inline-flex flex-wrap justify-end gap-1">
        {needsRefund(b) && <Button size="sm" icon={RotateCcw} onClick={() => setRefunding(b)}>Confirm refund</Button>}
        {b.status === 'pending' && <Button size="sm" variant="ghost" icon={Check} loading={busy === b.id} onClick={() => act(b, () => bookingsApi.confirm(b.id), 'Booking confirmed')}>Confirm</Button>}
      </span>
    ) },
  ];

  return (
    <>
      <PageHeader title="Bookings" subtitle={`Everything booked at ${gym.name}. Check-ins feed member streaks and badges.`} />
      {flagged.length > 0 && (
        <div role="status" className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-amber-900"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><span><strong>{flagged.length} payment{flagged.length === 1 ? '' : 's'} need a manual refund.</strong> Send each refund yourself, then press Confirm refund to record it.</span></p>
          <Button size="sm" variant="secondary" onClick={() => setRefundOnly((v) => !v)}>{refundOnly ? 'Show all bookings' : 'Show only these'}</Button>
        </div>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <SearchBar label="Search bookings" value={q} onChange={setQ} placeholder="Search by member name, email or booking number" />
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses" options={STATUSES} className="[&>label]:sr-only" />
      </div>
      {state.loading && !state.data ? <SkeletonList /> : state.error && !state.data ? <ErrorState error={state.error} onRetry={state.reload} /> : rows.length === 0 ? <EmptyState title="No bookings match" message={state.data?.length ? 'Clear the search or status filter.' : 'Bookings appear here once members book this gym.'} /> : (
        <DataTable columns={columns} rows={rows} caption="Bookings" />
      )}
      {refunding && <RefundModal booking={refunding} onClose={() => setRefunding(null)} onDone={state.reload} />}
      <ConfirmDialog open={Boolean(cancelling)} title="Cancel this booking?" message={`This cancels ${cancelling?.user?.name || 'the member'}'s booking and releases the slot. It cannot be undone.`} confirmLabel="Cancel booking" danger loading={busy === cancelling?.id} onClose={() => setCancelling(null)} onConfirm={async () => { if (await act(cancelling, () => bookingsApi.adminCancel(cancelling.id), 'Booking cancelled')) setCancelling(null); }} />
    </>
  );
}

export default function AdminBookings() {
  return <GymGate>{(gym) => <Content gym={gym} />}</GymGate>;
}
