import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, MessageSquare, Star } from 'lucide-react';
import { sessionsApi } from '../../api/sessions.api';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { PageHeader, StarInput, Tabs } from '../../components/common/Layout';
import { AsyncView, EmptyState, SkeletonList } from '../../components/common/states';
import StatusBadge from '../../components/common/StatusBadge';
import Button from '../../components/common/Button';
import Modal, { ConfirmDialog } from '../../components/common/Modal';
import { TextArea } from '../../components/common/Field';
import { formatRange, isFuture } from '../../utils/format';

const TABS = [{ value: '', label: 'All' }, { value: 'SCHEDULED', label: 'Upcoming' }, { value: 'COMPLETED', label: 'Completed' }, { value: 'CANCELLED', label: 'Cancelled' }];

function ReviewModal({ session, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { run, pending, error } = useSubmit();
  const submit = async () => {
    if (!rating) return;
    const body = { rating };
    if (comment.trim()) body.comment = comment.trim();
    const ok = await run(() => sessionsApi.review(session.id, body), { success: 'Review submitted' });
    if (ok) { onDone(); onClose(); }
  };
  return (
    <Modal open onClose={onClose} title={`Review ${session.provider?.name || 'your coach'}`} locked={pending} footer={<><Button variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button><Button onClick={submit} loading={pending} disabled={!rating}>Submit review</Button></>}>
      <div className="space-y-4">
        <div><p className="mb-1 text-sm font-medium text-ink-700">Your rating</p><StarInput value={rating} onChange={setRating} /></div>
        <TextArea label="Comment" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} hint={`${comment.length}/500. Optional. You can review each session once.`} />
        {error && <p role="alert" className="text-sm text-red-600">{error.code === 'ALREADY_EXISTS' || error.status === 409 ? 'You have already reviewed this session.' : error.message}</p>}
      </div>
    </Modal>
  );
}

export default function MemberSessions() {
  const [status, setStatus] = useState('');
  const state = useAsync(() => sessionsApi.list(status), [status]);
  const [reviewing, setReviewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const cancel = useSubmit();

  const doCancel = async () => {
    const ok = await cancel.run(() => sessionsApi.cancel(cancelling.id), { success: 'Session cancelled' });
    if (ok) { setCancelling(null); state.reload(); }
  };

  return (
    <>
      <PageHeader title="Coaching sessions" subtitle="Private sessions with your trainer or physiotherapist." actions={<Button as={Link} to="/app/messages" variant="secondary" icon={MessageSquare}>Messages</Button>} />
      <Tabs tabs={TABS} value={status} onChange={setStatus} label="Session status" />
      <AsyncView state={state} skeleton={<SkeletonList />} isEmpty={(d) => !d?.length} empty={<EmptyState icon={CalendarClock} title="No sessions" message="Add a trainer or physiotherapist when you book a gym visit." />}>
        {(sessions) => (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-lg font-medium">{s.provider?.name || 'Coach'}</p>
                  <p className="text-sm text-ink-500">{formatRange(s.startsAt, s.endsAt)}</p>
                  <p className="text-sm text-ink-500">{s.booking?.gym?.name}{s.purchase ? ` · ${s.purchase.sessionsRemaining} sessions left in package` : ''}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.status} />
                  {s.status === 'COMPLETED' && <Button size="sm" variant="secondary" icon={Star} onClick={() => setReviewing(s)}>Review</Button>}
                  {['HELD', 'SCHEDULED'].includes(s.status) && isFuture(s.startsAt) && <Button size="sm" variant="dangerOutline" onClick={() => setCancelling(s)}>Cancel</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncView>
      {reviewing && <ReviewModal session={reviewing} onClose={() => setReviewing(null)} onDone={state.reload} />}
      <ConfirmDialog open={Boolean(cancelling)} title="Cancel this session?" message="Cancelling at least 2 hours before the start returns the session to your package. Later cancellations may not." confirmLabel="Cancel session" danger loading={cancel.pending} onConfirm={doCancel} onClose={() => setCancelling(null)} />
    </>
  );
}
