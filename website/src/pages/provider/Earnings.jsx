import { useState } from 'react';
import { Banknote } from 'lucide-react';
import { meApi } from '../../api/me.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useAuth } from '../../contexts/AuthContext';
import { AsyncView, EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import { Card, PageHeader, StatCard } from '../../components/common/Layout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import { SelectField, TextField } from '../../components/common/Field';
import { formatDate, formatMoney } from '../../utils/format';
import { normalizeEarnings } from './earningsShape';

function PayoutModal({ gyms, defaultGymId, onClose, onDone }) {
  const [gymId, setGymId] = useState(defaultGymId ?? gyms[0]?.gymId ?? '');
  const [amount, setAmount] = useState('');
  const { run, pending, error } = useSubmit();
  const gym = gyms.find((g) => String(g.gymId) === String(gymId));
  const max = gym ? gym.available : null;
  const n = Number(amount);
  const problem = !amount ? null : !Number.isFinite(n) || n <= 0 ? 'Enter an amount above zero.' : max !== null && n > max ? `You can request at most ${formatMoney(max)} from this gym.` : null;

  const submit = async (e) => {
    e?.preventDefault();
    if (!amount || problem || !gymId) return;
    const ok = await run(() => meApi.requestPayout({ gymId, amount: n }), { success: 'Payout requested. The gym admin will review it.' });
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal open onClose={onClose} title="Request a payout" size="sm" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending} disabled={!amount || Boolean(problem) || !gymId}>Send request</Button></>}>
      <form onSubmit={submit} className="space-y-4">
        {gyms.length > 1 || !defaultGymId ? <SelectField label="Gym" value={gymId} onChange={(e) => setGymId(e.target.value)} options={gyms.map((g) => ({ value: g.gymId, label: `${g.gymName} (${formatMoney(g.available)} available)` }))} hint="The request goes to this gym's admin." /> : <p className="text-ink-600">The request goes to {gym?.gymName || 'your gym'} admin.</p>}
        <TextField label="Amount (ETB)" type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} error={problem} hint={max !== null ? `Available: ${formatMoney(max)}` : undefined} required />
        {error && <p role="alert" className="text-sm text-red-600">{error.message}</p>}
      </form>
    </Modal>
  );
}

/** Balance cards, ledger, payout request and history. Consultants (perGym) see balances per gym. */
export default function Earnings() {
  const { user, role } = useAuth();
  const earnings = useAsync(() => meApi.earnings(), []);
  const payouts = useAsync(() => meApi.payouts(), []);
  const [open, setOpen] = useState(false);
  const consultant = role === 'NUTRITION_CONSULTANT';

  const view = earnings.data ? normalizeEarnings(earnings.data) : null;
  // Coaches belong to one gym; their balance is a single bucket.
  const gyms = view ? (view.perGym.length ? view.perGym : [{ gymId: user.gymId, gymName: 'Your gym', ...view.balance }]) : [];
  const history = asList(payouts.data, 'payouts');

  const ledgerCols = [
    { key: 'createdAt', header: 'Date', primary: true, render: (l) => formatDate(l.createdAt) },
    { key: 'description', header: 'Entry', render: (l) => l.description || l.source || l.type || 'Earning' },
    { key: 'amount', header: 'Amount', render: (l) => formatMoney(l.amount) },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
  ];
  const payoutCols = [
    { key: 'createdAt', header: 'Requested', primary: true, render: (p) => formatDate(p.createdAt) },
    { key: 'amount', header: 'Amount', render: (p) => formatMoney(p.amount) },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'detail', header: 'Detail', render: (p) => p.status === 'PAID' ? `${(p.method || '').replace('_', ' ').toLowerCase()} ${p.reference || ''}` : p.note || '-' },
  ];

  return (
    <>
      <PageHeader title="Earnings and payouts" subtitle=" " actions={view && <Button icon={Banknote} onClick={() => setOpen(true)} disabled={view.balance.available <= 0 && !gyms.some((g) => g.available > 0)}>Request payout</Button>} />
      {earnings.loading && !earnings.data ? <SkeletonList rows={2} /> : earnings.error && !earnings.data ? <ErrorState error={earnings.error} onRetry={earnings.reload} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Available" value={formatMoney(view.balance.available)} />
            <StatCard label="Requested" value={formatMoney(view.balance.requested)} hint="Waiting for the gym admin" />
            <StatCard label="Paid" value={formatMoney(view.balance.paid)} />
          </div>
          {consultant && view.perGym.length > 0 && (
            <Card title="By gym" className="mt-6">
              <ul className="divide-y divide-ink-100">
                {view.perGym.map((g) => <li key={g.gymId} className="flex flex-wrap justify-between gap-2 py-2"><span className="font-medium">{g.gymName}</span><span className="text-sm text-ink-600">Available {formatMoney(g.available)} · Requested {formatMoney(g.requested)} · Paid {formatMoney(g.paid)}</span></li>)}
              </ul>
            </Card>
          )}
          <h2 className="mb-3 mt-8 text-2xl">Ledger</h2>
          {view.ledger.length === 0 ? <EmptyState title="No earnings yet" message="Earnings are credited per completed session." /> : <DataTable columns={ledgerCols} rows={view.ledger} caption="Earnings ledger" />}
        </>
      )}
      <h2 className="mb-3 mt-8 text-2xl">Payout history</h2>
      <AsyncView state={payouts} skeleton={<SkeletonList rows={2} />} isEmpty={() => history.length === 0} empty={<EmptyState title="No payout requests yet" />}>
        {() => <DataTable columns={payoutCols} rows={history} caption="Payout history" />}
      </AsyncView>
      {open && view && <PayoutModal gyms={gyms} defaultGymId={consultant ? undefined : user.gymId} onClose={() => setOpen(false)} onDone={() => { earnings.reload(); payouts.reload(); }} />}
    </>
  );
}
