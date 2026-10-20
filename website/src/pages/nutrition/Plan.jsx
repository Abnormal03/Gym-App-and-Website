import { useState } from 'react';
import { meApi } from '../../api/me.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { AsyncView, SkeletonList } from '../../components/common/states';
import { Card, PageHeader } from '../../components/common/Layout';
import { TextField } from '../../components/common/Field';
import Button from '../../components/common/Button';
import { collect, numberInRange } from '../../utils/validators';

function PlanForm({ plan, onSaved }) {
  const [v, setV] = useState({ price: plan?.price ?? '', chatDurationDays: plan?.chatDurationDays ?? plan?.chatDays ?? 30 });
  const [errors, setErrors] = useState({});
  const { run, pending, fieldErrors } = useSubmit();
  const err = (k) => errors[k] || fieldErrors[k];

  const submit = async (e) => {
    e.preventDefault();
    const found = collect({
      price: () => numberInRange(v.price, { min: 0, label: 'Price' }),
      chatDurationDays: () => numberInRange(v.chatDurationDays, { min: 1, max: 365, integer: true, label: 'Chat duration' }),
    });
    setErrors(found);
    if (Object.keys(found).length) return;
    const ok = await run(() => meApi.updateConsultationPlan({ price: Number(v.price), chatDurationDays: Number(v.chatDurationDays) }), { success: 'Plan saved' });
    if (ok) onSaved();
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-4">
      <TextField label="Price (ETB)" type="number" min="0" step="any" value={v.price} onChange={(e) => setV((x) => ({ ...x, price: e.target.value }))} error={err('price')} hint="Charged once when a member adds you at checkout." required />
      <TextField label="Chat access (days)" type="number" min="1" value={v.chatDurationDays} onChange={(e) => setV((x) => ({ ...x, chatDurationDays: e.target.value }))} error={err('chatDurationDays')} hint="After this period the conversation becomes read-only." required />
      <Button type="submit" loading={pending}>Save plan</Button>
    </form>
  );
}

export default function Plan() {
  const state = useAsync(() => meApi.consultationPlan(), []);
  return (
    <>
      <PageHeader title="Consultation plan" subtitle=" " />
      <Card><AsyncView state={state} skeleton={<SkeletonList rows={2} />}>{(d) => <PlanForm plan={d?.plan || d} onSaved={state.reload} />}</AsyncView></Card>
    </>
  );
}
