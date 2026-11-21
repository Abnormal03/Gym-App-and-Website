import { useState } from 'react';
import { Check, X, Building2 } from 'lucide-react';
import { superAdminApi } from '../../api/superAdmin.api';
import { useAsync } from '../../hooks/useAsync';
import { PageHeader, Card } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList } from '../../components/common/states';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/format';

function DecisionModal({ item, decision, onClose, onDone }) {
  const [reason,setReason] = useState(''); const [error,setError] = useState(''); const [pending,setPending] = useState(false);
  async function submit(e) { e.preventDefault(); if (decision === 'reject' && !reason.trim()) { setError('A reason is required to reject this registration.'); return; } setPending(true); setError(''); try { await superAdminApi[decision](item.id, reason.trim() || undefined); onDone(); } catch(err) { setError(err.message || 'Could not save the decision.'); } finally { setPending(false); } }
  return <Modal open onClose={onClose} title={`${decision === 'approve' ? 'Approve' : 'Reject'} ${item.name}`} size="sm" locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button variant={decision === 'approve' ? 'brand' : 'danger'} type="submit" form="gym-decision" loading={pending}>{decision === 'approve' ? 'Approve gym' : 'Reject gym'}</Button></>}><form id="gym-decision" onSubmit={submit} className="space-y-3"><p className="text-sm text-ink-600">{decision === 'approve' ? 'Approval makes this gym visible to members.' : 'The gym will remain unavailable to members.'}</p><label className="block text-sm font-medium" htmlFor="decision-reason">Reason {decision === 'reject' && <span className="text-red-600">(required)</span>}</label><textarea id="decision-reason" rows={3} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} className="input w-full" placeholder={decision === 'approve' ? 'Optional note' : 'Explain why this registration is rejected'} />{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</form></Modal>;
}

export default function SuperAdminRegistrations() {
 const state=useAsync(()=>superAdminApi.registrations({status:'PENDING'}),[]); const [decision,setDecision]=useState(null);
 const rows=state.data?.registrations || [];
 return <><PageHeader title="Gym registrations" subtitle="Review pending gym registrations across the platform." />
 {state.loading && !state.data ? <SkeletonList rows={4}/> : state.error ? <ErrorState error={state.error} onRetry={state.reload}/> : rows.length===0 ? <EmptyState icon={Building2} title="No pending registrations" message="New gym applications will appear here for review."/> : <Card><div className="divide-y divide-ink-100">{rows.map((g)=><article key={g.id} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h2 className="text-lg font-semibold">{g.name}</h2><p className="text-sm text-ink-600">{g.address}</p><p className="mt-1 text-sm text-ink-500">Submitted by {g.admin?.name || 'Gym admin'} · {g.admin?.email || 'No email'} · {formatDate(g.createdAt)}</p></div><div className="flex gap-2"><Button variant="brand" icon={Check} onClick={()=>setDecision({item:g,kind:'approve'})}>Approve</Button><Button variant="dangerOutline" icon={X} onClick={()=>setDecision({item:g,kind:'reject'})}>Reject</Button></div></article>)}</div></Card>}
 {decision && <DecisionModal item={decision.item} decision={decision.kind} onClose={()=>setDecision(null)} onDone={()=>{setDecision(null);state.reload();}}/>}</>;
}
