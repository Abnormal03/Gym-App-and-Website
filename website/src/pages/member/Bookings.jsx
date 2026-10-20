import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarCheck, CreditCard, Plus, XCircle } from 'lucide-react';
import { bookingsApi } from '../../api/bookings.api';
import { checkoutApi } from '../../api/checkout.api';
import { sessionsApi } from '../../api/sessions.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, Card, InfoRow } from '../../components/common/Layout';
import { AsyncView, EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { SelectField, TextField } from '../../components/common/Field';
import { addMinutes, addisToIso, formatDateTime, formatRange, formatMoney, isFuture, toAddisInput } from '../../utils/format';

const FILTERS = [
  { value: '', label: 'All' }, { value: 'pending', label: 'Awaiting payment' }, { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Attended' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'expired', label: 'Expired' }, { value: 'payment_failed', label: 'Payment failed' },
];

export function BookingList() {
  const [status, setStatus] = useState('');
  const state = useAsync(() => bookingsApi.list(status), [status]);
  return (
    <>
      <PageHeader title="My bookings" actions={<Button as={Link} to="/app/gyms" icon={Plus}>New booking</Button>} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button key={f.value} type="button" aria-pressed={status === f.value} onClick={() => setStatus(f.value)} className={`whitespace-nowrap rounded-full border px-3.5 py-1 text-sm ${status === f.value ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}`}>{f.label}</button>
        ))}
      </div>
      <AsyncView state={state} skeleton={<SkeletonList />} isEmpty={(d) => !d?.length} empty={<EmptyState icon={CalendarCheck} title="No bookings here" message="Book a gym session to see it listed." action={<Button as={Link} to="/app/gyms">Find a gym</Button>} />}>
        {(bookings) => (
          <ul className="space-y-3">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link to={`/app/bookings/${b.id}`} className="card flex flex-col gap-2 p-4 transition-colors hover:border-brand sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium">{b.gym?.name || 'Gym'}</p>
                    <p className="text-sm text-ink-500">{formatRange(b.slotStart, b.slotEnd)}</p>
                    <p className="text-sm text-ink-500">
                      {b.packageName || b.package?.name || 'No package'}
                      {b.bookingType === 'GROUP' ? ` · Group of ${b.headcount}` : ''}
                      {b.sessions?.length ? ` · ${b.sessions.length} coaching session${b.sessions.length > 1 ? 's' : ''}` : ''}
                      {b.consultation?.length ? ' · Nutrition chat' : ''}
                    </p>
                  </div>
                  <StatusBadge status={b.status} label={b.status === 'checked_in' ? 'attended' : b.status === 'pending' ? 'awaiting payment' : undefined} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
    </>
  );
}

function AddSessionModal({ booking, open, onClose, onDone }) {
  const sessions = useAsync(() => sessionsApi.list(), [], { enabled: open });
  const { run, pending, error } = useSubmit();
  const [purchaseId, setPurchaseId] = useState('');
  const [startsAt, setStartsAt] = useState('');

  const purchases = [...new Map((sessions.data || []).filter((s) => s.purchase?.sessionsRemaining > 0).map((s) => [s.purchase.id, s])).values()];
  const min = toAddisInput(booking.slotStart);
  const max = toAddisInput(addMinutes(booking.slotStart, (new Date(booking.slotEnd) - new Date(booking.slotStart)) / 60000 - 60));
  const valid = purchaseId && startsAt && startsAt >= min && startsAt <= max;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const ok = await run(() => bookingsApi.addSession(booking.id, { purchaseId: purchases.find((p) => String(p.purchase.id) === purchaseId).purchase.id, startsAt: addisToIso(startsAt.slice(0, 10), startsAt.slice(11, 16)) }), { success: 'Session scheduled' });
    if (ok) { onDone(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a coaching session" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending} disabled={!valid}>Schedule session</Button></>}>
      {sessions.loading && !sessions.data ? <SkeletonList rows={1} /> : sessions.error ? <ErrorState error={sessions.error} onRetry={sessions.reload} /> : purchases.length === 0 ? (
        <EmptyState title="No sessions left to schedule" message="Buy a coach package at checkout to get session credits." />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <SelectField label="Coach package" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} placeholder="Choose a package" options={purchases.map((s) => ({ value: String(s.purchase.id), label: `${s.provider?.name || 'Coach'} (${s.purchase.sessionsRemaining} left)` }))} required />
          <TextField label="Session start" type="datetime-local" min={min} max={max} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} hint="Must be inside this booking, leaving one hour before it ends, and within the coach's available hours." required />
          {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
        </form>
      )}
    </Modal>
  );
}

export function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const booking = useAsync(() => bookingsApi.get(id), [id]);
  const extras = useAsync(async () => (await bookingsApi.list()).find((b) => String(b.id) === String(id)) || null, [id]);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const cancel = useSubmit();
  const pay = useSubmit();

  if (booking.loading && !booking.data) return <SkeletonList rows={3} />;
  if (booking.error) return <ErrorState error={booking.error} onRetry={booking.reload} title="Could not load this booking" />;
  const b = { ...booking.data, ...(extras.data || {}) };
  const sessions = extras.data?.sessions || [];
  const cancellable = ['pending', 'confirmed'].includes(b.status) && isFuture(b.slotStart);

  const doCancel = async () => {
    const ok = await cancel.run(() => bookingsApi.cancel(b.id), { success: 'Booking cancelled' });
    if (ok) { setConfirmCancel(false); booking.reload(); extras.reload(); }
  };
  const doPay = async () => {
    const res = await pay.run(() => checkoutApi.initPayment(b.id));
    if (res?.checkoutUrl) window.location.assign(res.checkoutUrl);
    else if (res) toast.error('No payment link was returned.');
  };

  return (
    <>
      <PageHeader
        title={b.gym?.name || 'Booking'}
        subtitle={formatRange(b.slotStart, b.slotEnd)}
        actions={<>
          {b.status === 'pending' && <Button icon={CreditCard} onClick={doPay} loading={pay.pending}>Pay now</Button>}
          {b.status === 'confirmed' && isFuture(b.slotStart) && <Button variant="secondary" icon={Plus} onClick={() => setAddOpen(true)}>Add coaching session</Button>}
          {cancellable && <Button variant="dangerOutline" icon={XCircle} onClick={() => setConfirmCancel(true)}>Cancel booking</Button>}
        </>}
      />
      {pay.error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{pay.error.message}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Details">
          <dl className="divide-y divide-ink-100">
            <InfoRow label="Status"><StatusBadge status={b.status} label={b.status === 'checked_in' ? 'attended' : b.status === 'pending' ? 'awaiting payment' : undefined} /></InfoRow>
            <InfoRow label="Package">{b.packageName || b.package?.name}{b.package?.price ? ` (${formatMoney(b.package.price)})` : ''}</InfoRow>
            <InfoRow label="Type">{b.bookingType === 'GROUP' ? `Group of ${b.headcount}` : 'Single'}</InfoRow>
            <InfoRow label="Payment">{b.payment?.status ? <StatusBadge status={b.payment.status} /> : 'Not paid yet'}</InfoRow>
            <InfoRow label="Order">{b.order ? `#${b.order.id} · ${b.order.status}` : '-'}</InfoRow>
          </dl>
        </Card>
        <Card title="Coaching sessions">
          {sessions.length === 0 ? <p className="text-ink-500">No coaching sessions attached to this booking.</p> : (
            <ul className="divide-y divide-ink-100">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{s.provider?.name || 'Coach'}<span className="block text-sm text-ink-500">{formatDateTime(s.startsAt)}</span></span>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <ConfirmDialog open={confirmCancel} title="Cancel this booking?" message="The slot is released and any coaching sessions attached to it are cancelled. Refunds are handled by the gym." confirmLabel="Cancel booking" danger loading={cancel.pending} onConfirm={doCancel} onClose={() => setConfirmCancel(false)} />
      {addOpen && <AddSessionModal booking={b} open onClose={() => setAddOpen(false)} onDone={() => { booking.reload(); extras.reload(); }} />}
    </>
  );
}
