import { useState } from 'react';
import { Award, Camera, CheckCircle2, ScanLine, UserCheck } from 'lucide-react';
import { checkinsApi } from '../../api/checkins.api';
import { asList } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { useDebounce } from '../../hooks/useDebounce';
import { useSubmit } from '../../hooks/useSubmit';
import { Card, Tabs } from './Layout';
import { EmptyState, ErrorState, SkeletonList } from './states';
import Button from './Button';
import SearchBar from './SearchBar';
import StatusBadge from './StatusBadge';
import { TextField } from './Field';
import { formatTime } from '../../utils/format';
import QrScanner from './QrScanner';

function ResultBanner({ result }) {
  if (!result) return null;
  return (
    <div role="status" className={`mb-4 rounded-lg border p-4 ${result.alreadyCheckedIn ? 'border-amber-200 bg-amber-50' : 'border-brand/30 bg-brand-50'}`}>
      <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5 text-brand" aria-hidden="true" />{result.memberName} {result.alreadyCheckedIn ? 'was already checked in' : 'is checked in'}</p>
      <p className="mt-1 text-sm text-ink-600">
        {result.guestCount > 1 ? `${result.guestCount} people · ` : ''}Covered by {result.covering === 'BOOKING' ? 'a booking' : 'a gym package (walk-in)'}
        {result.checkedInAt ? ` · ${formatTime(result.checkedInAt)}` : ''}
      </p>
      {result.newBadges?.length > 0 && <p className="mt-1 inline-flex items-center gap-1 text-sm text-brand"><Award className="h-4 w-4" aria-hidden="true" />New badge: {result.newBadges.map((b) => b.name).join(', ')}</p>}
    </div>
  );
}

/** Front-desk check-in for one gym: scan a member's QR token, find a member by name/phone, or review today's list. */
export default function CheckinDesk({ gymId }) {
  const [tab, setTab] = useState('scan');
  const [token, setToken] = useState('');
  const [camera, setCamera] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDebounce(q.trim());
  const [result, setResult] = useState(null);
  const scan = useSubmit();
  const manual = useSubmit();
  const today = useAsync(() => checkinsApi.today(gymId), [gymId]);
  const members = useAsync(() => checkinsApi.searchMembers(gymId, dq), [gymId, dq], { enabled: tab === 'manual' && dq.length > 0 });

  const done = (res) => { if (res && res !== true) { setResult(res); today.reload(); } };

  const runScan = async (code) => {
    if (!code.trim()) return;
    setResult(null);
    const res = await scan.run(() => checkinsApi.scan(code.trim(), gymId), { silent: true });
    if (res) { done(res); setToken(''); }
  };
  const submitScan = (e) => { e.preventDefault(); runScan(token); };
  const checkInMember = async (m) => {
    setResult(null);
    done(await manual.run(() => checkinsApi.manual(m.id, gymId), { silent: true }));
  };

  const list = asList(today.data);
  const err = tab === 'scan' ? scan.error : manual.error;

  return (
    <>
      <Tabs tabs={[{ value: 'scan', label: 'Scan pass' }, { value: 'manual', label: 'Find member' }, { value: 'today', label: `Today (${today.data ? list.length : '-'})` }]} value={tab} onChange={(t) => { setTab(t); setResult(null); }} label="Check-in mode" />
      {tab !== 'today' && <ResultBanner result={result} />}
      {err && tab !== 'today' && <p role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{err.message}</p>}

      {tab === 'scan' && (
        <Card>
          <form onSubmit={submitScan} className="space-y-3">
            <TextField label="Member pass code" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" autoFocus hint="Point a handheld QR scanner at the member's phone (it types the code here), or paste the code, then press Check in." />
            <Button type="submit" icon={ScanLine} loading={scan.pending} disabled={!token.trim()}>Check in</Button>
          </form>
          <div className="mt-4 border-t border-ink-100 pt-4">
            {camera ? (
              <QrScanner onResult={(code) => { setCamera(false); runScan(code); }} onClose={() => setCamera(false)} />
            ) : (
              <Button variant="secondary" icon={Camera} onClick={() => setCamera(true)}>Scan with camera</Button>
            )}
          </div>
        </Card>
      )}

      {tab === 'manual' && (
        <Card>
          <SearchBar label="Find member" value={q} onChange={setQ} placeholder="Name or phone number" className="mb-4 max-w-md" />
          {!dq ? <p className="text-ink-500">Type a name or phone. Only members with a confirmed booking or active package here are listed.</p> : members.loading && !members.data ? <SkeletonList rows={2} /> : members.error ? <ErrorState error={members.error} onRetry={members.reload} /> : asList(members.data).length === 0 ? <p className="text-ink-500">No matching members with access at this gym.</p> : (
            <ul className="divide-y divide-ink-100">
              {asList(members.data).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5"><span>{m.name}<span className="block text-sm text-ink-500">{m.phone}</span></span><Button size="sm" variant="brand" icon={UserCheck} loading={manual.pending} onClick={() => checkInMember(m)}>Check in</Button></li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'today' && (
        today.loading && !today.data ? <SkeletonList rows={3} /> : today.error ? <ErrorState error={today.error} onRetry={today.reload} /> : list.length === 0 ? <EmptyState icon={UserCheck} title="No check-ins yet today" /> : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="card flex items-center justify-between gap-3 p-3">
                <span className="font-medium">{c.memberName}<span className="block text-sm font-normal text-ink-500">{formatTime(c.checkedInAt)}{c.guestCount > 1 ? ` · ${c.guestCount} people` : ''}{c.package?.name ? ` · ${c.package.name}` : ''}</span></span>
                <StatusBadge status={c.type === 'BOOKING' ? 'confirmed' : 'scheduled'} label={c.type === 'BOOKING' ? 'booking' : 'walk-in'} />
              </li>
            ))}
          </ul>
        )
      )}
    </>
  );
}
