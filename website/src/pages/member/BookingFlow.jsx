import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Apple, ArrowLeft, Check, Minus, Plus } from 'lucide-react';
import { gymsApi } from '../../api/gyms.api';
import { packagesApi } from '../../api/packages.api';
import { providersApi } from '../../api/providers.api';
import { checkoutApi } from '../../api/checkout.api';
import { asList } from '../../api/client';
import { CHECKOUT_PACKAGE_KEY } from '../../config/apiShape';
import { useAsync } from '../../hooks/useAsync';
import { useSubmit } from '../../hooks/useSubmit';
import { useToast } from '../../contexts/ToastContext';
import { addMinutes, addisParts, addisToIso, formatDateTime, formatMoney, formatRange, isFuture, toAddisInput } from '../../utils/format';
import { isUrl } from '../../utils/validators';
import { Avatar, Card, PageHeader, Stars } from '../../components/common/Layout';
import { EmptyState, ErrorState, SkeletonList, Spinner } from '../../components/common/states';
import { PackageCard, packageRestrictions } from '../../components/common/GymParts';
import AvailabilityGrid from '../../components/common/AvailabilityGrid';
import { SelectField, TextField } from '../../components/common/Field';
import Button from '../../components/common/Button';

const STEPS = ['Package and time', 'Coach', 'Nutrition', 'Review and pay'];
const DURATIONS = [30, 60, 90, 120, 150, 180, 210, 240];
const SESSION_MINUTES = 60; // BR-05 default session length
const EMPTY = {
  packageId: '', bookingType: 'SINGLE', headcount: 1, date: '', time: '', duration: 60,
  coachType: 'none', provider: null, providerPackageId: '', firstSession: '',
  wantsConsult: false, consultant: null,
};

/** Everything the slot step decides; changing any of it invalidates coach choices. */
const slotKey = (d) => `${d.packageId}|${d.date}|${d.time}|${d.duration}`;

function StepHeader({ step }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Booking steps">
      {STEPS.map((label, i) => (
        <li key={label} aria-current={i === step ? 'step' : undefined} className={`border-t-4 pt-2 text-sm ${i < step ? 'border-brand text-brand' : i === step ? 'border-signal font-medium text-ink' : 'border-ink-200 text-ink-400'}`}>
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{i + 1}</span>
        </li>
      ))}
    </ol>
  );
}

function SlotStep({ gym, packages, draft, patch, onNext }) {
  const pkg = packages.find((p) => String(p.id) === String(draft.packageId));
  const [checking, setChecking] = useState(false);
  const [avail, setAvail] = useState(null);
  const [availError, setAvailError] = useState('');
  const today = addisParts().date;

  const startsAt = draft.date && draft.time ? addisToIso(draft.date, draft.time) : null;
  const endIso = startsAt ? addMinutes(startsAt, Number(draft.duration)) : null;

  const problems = useMemo(() => {
    const out = [];
    if (!pkg) out.push('Choose a package.');
    if (!startsAt) out.push('Choose a date and start time.');
    else {
      if (!isFuture(startsAt)) out.push('The start time must be in the future.');
      const end = addisParts(new Date(endIso));
      if (draft.time < gym.openingTime) out.push(`The gym opens at ${gym.openingTime}.`);
      if (end.date !== draft.date || end.time > gym.closingTime) out.push(`The booking must end by ${gym.closingTime}.`);
    }
    return out;
  }, [pkg, startsAt, endIso, draft.time, draft.date, gym]);

  const hints = useMemo(() => {
    if (!pkg || !startsAt) return [];
    const out = [];
    const dow = new Date(`${draft.date}T12:00:00+03:00`).getUTCDay();
    if (pkg.allowedDays?.length && !pkg.allowedDays.includes(dow)) out.push('This package is not valid on the chosen day.');
    const h = Number(draft.time.slice(0, 2));
    const period = h >= 17 ? 'EVENING' : h >= 12 ? 'AFTERNOON' : 'MORNING';
    if (pkg.allowedPeriods?.length && !pkg.allowedPeriods.includes(period)) out.push('This package is not valid at the chosen time of day.');
    return out;
  }, [pkg, startsAt, draft.date, draft.time]);

  const checkAvailability = async () => {
    setChecking(true);
    setAvailError('');
    try {
      setAvail(await gymsApi.availability(gym.id, startsAt, endIso));
    } catch (e) {
      setAvail(null);
      setAvailError(e.message);
    } finally {
      setChecking(false);
    }
  };

  const maxGroup = pkg?.maxGroupSize || 1;
  const total = pkg ? Number(pkg.price) * (draft.bookingType === 'GROUP' ? draft.headcount : 1) : 0;

  return (
    <div className="space-y-6">
      <Card title="Package">
        <div className="grid gap-3 md:grid-cols-2">
          {packages.map((p) => (
            <PackageCard key={p.id} pkg={p} selected={String(p.id) === String(draft.packageId)} onSelect={() => patch({ packageId: p.id, bookingType: 'SINGLE', headcount: 1 })} />
          ))}
        </div>
      </Card>

      {pkg && maxGroup > 1 && (
        <Card title="Who is coming?">
          <div className="flex flex-wrap items-center gap-4">
            <div role="radiogroup" aria-label="Booking type" className="flex gap-1 rounded-lg bg-ink-100 p-1">
              {['SINGLE', 'GROUP'].map((t) => (
                <button key={t} type="button" role="radio" aria-checked={draft.bookingType === t} onClick={() => patch({ bookingType: t, headcount: t === 'SINGLE' ? 1 : Math.max(2, draft.headcount) })} className={`rounded-md px-4 py-1.5 text-sm font-medium ${draft.bookingType === t ? 'bg-white shadow-sm' : 'text-ink-500'}`}>
                  {t === 'SINGLE' ? 'Just me' : 'Group'}
                </button>
              ))}
            </div>
            {draft.bookingType === 'GROUP' && (
              <div className="flex items-center gap-3" role="group" aria-label="Headcount">
                <Button variant="secondary" size="sm" icon={Minus} aria-label="Fewer people" disabled={draft.headcount <= 2} onClick={() => patch({ headcount: draft.headcount - 1 })} />
                <span className="w-24 text-center font-medium">{draft.headcount} people</span>
                <Button variant="secondary" size="sm" icon={Plus} aria-label="More people" disabled={draft.headcount >= maxGroup} onClick={() => patch({ headcount: draft.headcount + 1 })} />
              </div>
            )}
          </div>
          {draft.bookingType === 'GROUP' && <p className="mt-2 text-sm text-ink-500">Group price is the package price times the headcount. Only you receive the entitlement.</p>}
        </Card>
      )}

      <Card title="Time">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Date" type="date" min={today} value={draft.date} onChange={(e) => patch({ date: e.target.value })} required />
          <TextField label="Start time" type="time" step={900} value={draft.time} onChange={(e) => patch({ time: e.target.value })} hint={`Gym hours ${gym.openingTime} - ${gym.closingTime}`} required />
          <SelectField label="Duration" value={draft.duration} onChange={(e) => patch({ duration: Number(e.target.value) })} options={DURATIONS.map((m) => ({ value: m, label: m >= 60 ? `${m / 60} h${m % 60 ? ' 30 min' : ''}` : `${m} min` }))} hint="Up to 4 hours." />
        </div>
        {startsAt && problems.length === 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" loading={checking} onClick={checkAvailability}>Check availability</Button>
            {avail && <p role="status" className={avail.available >= draft.headcount ? 'text-brand' : 'text-red-700'}>{avail.available} of {avail.capacity} spots free{avail.available < draft.headcount ? ' (not enough for your group)' : ''}.</p>}
            {availError && <p role="alert" className="text-sm text-red-600">{availError}</p>}
          </div>
        )}
        {hints.map((h) => <p key={h} role="status" className="mt-3 flex items-center gap-2 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" aria-hidden="true" />{h} {pkg && `(${packageRestrictions(pkg).join(' · ')})`}</p>)}
        {problems.length > 0 && (draft.date || draft.time) && <ul className="mt-3 space-y-1 text-sm text-red-600">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-ink-600">{pkg ? <>Total so far <strong className="text-ink">{formatMoney(total)}</strong></> : ''}</p>
        <Button disabled={problems.length > 0} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function CoachStep({ gym, draft, patch, startsAt, endIso, onBack, onNext }) {
  const type = draft.coachType;
  const providers = useAsync(() => providersApi.search({ gymId: gym.id, type }), [gym.id, type], { enabled: type !== 'none' });
  const profile = useAsync(() => providersApi.profile(draft.provider.id), [draft.provider?.id], { enabled: Boolean(draft.provider) });
  const prof = profile.data?.provider || profile.data || {};
  const pkgs = asList(prof.packages).filter((p) => p.isActive !== false);
  const availability = asList(prof.availability);
  const chosenPkg = pkgs.find((p) => String(p.id) === String(draft.providerPackageId));

  const latest = toAddisInput(addMinutes(startsAt, Number(draft.duration) - SESSION_MINUTES));
  const earliest = toAddisInput(startsAt);
  const windowFits = Number(draft.duration) >= SESSION_MINUTES;
  const sessionOk = draft.firstSession && draft.firstSession >= earliest && draft.firstSession <= latest;
  const ready = type === 'none' || (draft.provider && chosenPkg && sessionOk);

  const pickType = (t) => patch({ coachType: t, provider: null, providerPackageId: '', firstSession: '' });
  const pickProvider = (p) => patch({ provider: p, providerPackageId: '', firstSession: '' });

  return (
    <div className="space-y-6">
      <Card title="Need a trainer or physiotherapist?">
        <div role="radiogroup" aria-label="Coach type" className="flex flex-wrap gap-2">
          {[['none', 'No thanks'], ['TRAINER', 'Trainer'], ['PHYSIOTHERAPIST', 'Physiotherapist']].map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={type === v} onClick={() => pickType(v)} className={`rounded-md border px-4 py-2 text-sm font-medium ${type === v ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-white hover:bg-ink-50'}`}>{label}</button>
          ))}
        </div>
        {type !== 'none' && !windowFits && <p className="mt-3 text-sm text-red-600">Sessions last {SESSION_MINUTES} minutes. Go back and book at least one hour of gym time.</p>}
      </Card>

      {type !== 'none' && windowFits && (
        <Card title={`Choose a ${type === 'TRAINER' ? 'trainer' : 'physiotherapist'}`}>
          {providers.loading && !providers.data ? <SkeletonList rows={2} /> : providers.error ? <ErrorState error={providers.error} onRetry={providers.reload} /> : (providers.data || []).length === 0 ? (
            <EmptyState title="No one listed yet" message="You can continue without a coach." action={<Button variant="secondary" onClick={() => pickType('none')}>Continue without</Button>} />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {providers.data.map((p) => {
                const on = draft.provider?.id === p.id;
                return (
                  <li key={p.id}>
                    <button type="button" aria-pressed={on} onClick={() => pickProvider(p)} className={`card flex w-full items-center gap-3 p-3 text-left hover:border-brand ${on ? 'border-brand ring-2 ring-brand/20' : ''}`}>
                      <Avatar name={p.name} src={isUrl(p.photoUrl) ? p.photoUrl : null} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.name}</span>
                        <span className="block truncate text-sm text-ink-500">{p.specializations?.join(', ') || `${p.experienceYears || 0} yrs experience`}</span>
                        <Stars value={p.ratingAvg || 0} count={p.ratingCount || 0} />
                      </span>
                      {on && <Check className="ml-auto h-5 w-5 text-brand" aria-label="Selected" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {draft.provider && windowFits && (
        <Card title={`${draft.provider.name}'s packages`}>
          {profile.loading && !profile.data ? <Spinner label="Loading packages" /> : profile.error ? (
            <div className="space-y-3">
              <ErrorState error={profile.error} onRetry={profile.reload} title="Cannot load this coach's packages" />
              <Button variant="secondary" onClick={() => pickType('none')}>Continue without a coach</Button>
            </div>
          ) : pkgs.length === 0 ? <EmptyState title="No packages yet" message="This coach has not published a session package." /> : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {pkgs.map((p) => {
                  const on = String(p.id) === String(draft.providerPackageId);
                  return (
                    <button key={p.id} type="button" aria-pressed={on} onClick={() => patch({ providerPackageId: p.id })} className={`card p-4 text-left hover:border-brand ${on ? 'border-brand ring-2 ring-brand/20' : ''}`}>
                      <p className="text-lg font-medium">{p.name}</p>
                      <p className="text-sm text-ink-500">{p.sessionCount} sessions · valid {p.validityDays} days</p>
                      <p className="mt-1 font-display text-xl font-semibold text-brand">{formatMoney(p.price)}</p>
                    </button>
                  );
                })}
              </div>
              {availability.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-ink-700">When {draft.provider.name} works</p>
                  <AvailabilityGrid value={availability} readOnly />
                </div>
              )}
              <TextField
                label="First session"
                type="datetime-local"
                min={earliest}
                max={latest}
                value={draft.firstSession}
                onChange={(e) => patch({ firstSession: e.target.value })}
                error={draft.firstSession && !sessionOk ? 'Pick a time inside your gym booking, leaving one hour before it ends.' : undefined}
                hint={`Between ${formatDateTime(startsAt)} and ${formatDateTime(addMinutes(startsAt, Number(draft.duration) - SESSION_MINUTES))}. The remaining sessions are booked later.`}
                required
              />
            </div>
          )}
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>Back</Button>
        <Button disabled={!ready} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function NutritionStep({ draft, patch, onBack, onNext }) {
  const wants = Boolean(draft.consultant || draft.wantsConsult);
  const consultants = useAsync(() => providersApi.search({ type: 'NUTRITION_CONSULTANT' }), [], { enabled: wants });
  return (
    <div className="space-y-6">
      <Card title="Need a nutrition consultant?">
        <div role="radiogroup" aria-label="Nutrition consultant" className="flex gap-2">
          {[[false, 'No thanks'], [true, 'Yes, add one']].map(([v, label]) => (
            <button key={label} type="button" role="radio" aria-checked={wants === v} onClick={() => patch({ wantsConsult: v, consultant: v ? draft.consultant : null })} className={`rounded-md border px-4 py-2 text-sm font-medium ${wants === v ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-white hover:bg-ink-50'}`}>{label}</button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-600"><Apple className="h-4 w-4 text-brand" aria-hidden="true" />Chat with the consultant unlocks after payment. The price appears in the review step.</p>
      </Card>
      {wants && (
        <Card title="Choose a consultant">
          {consultants.loading && !consultants.data ? <SkeletonList rows={2} /> : consultants.error ? <ErrorState error={consultants.error} onRetry={consultants.reload} /> : (consultants.data || []).length === 0 ? (
            <EmptyState title="No consultants available" message="You can continue without one." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {consultants.data.map((c) => {
                const on = draft.consultant?.id === c.id;
                return (
                  <li key={c.id}>
                    <button type="button" aria-pressed={on} onClick={() => patch({ consultant: c })} className={`card flex w-full items-center gap-3 p-3 text-left hover:border-brand ${on ? 'border-brand ring-2 ring-brand/20' : ''}`}>
                      <Avatar name={c.name} src={isUrl(c.photoUrl) ? c.photoUrl : null} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.name}</span>
                        <span className="block truncate text-sm text-ink-500">{c.specializations?.join(', ') || c.bio || 'Nutrition consultant'}</span>
                      </span>
                      {on && <Check className="ml-auto h-5 w-5 text-brand" aria-label="Selected" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}
      <div className="flex justify-between">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack}>Back</Button>
        <Button disabled={wants && !draft.consultant} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}

function SummaryStep({ gym, pkg, draft, body, startsAt, endIso, onBack, onEditSlot }) {
  const toast = useToast();
  const navigate = useNavigate();
  const quote = useAsync(() => checkoutApi.quote(body), [JSON.stringify(body)]);
  const { run, pending, error } = useSubmit();
  // An order that already exists must be reused, never created twice.
  const [order, setOrder] = useState(null);

  const pay = async () => {
    const result = await run(async () => {
      const created = order || (await checkoutApi.create(body));
      setOrder(created);
      if (created.requiresPayment === false) return { free: true };
      const init = await checkoutApi.initPayment(created.bookingId);
      return { url: init.checkoutUrl };
    }, { silent: true });
    if (!result) return;
    if (result.free) {
      toast.success('Booking confirmed');
      navigate('/app/bookings');
    } else if (result.url) {
      window.location.assign(result.url);
    } else {
      toast.error('The payment provider did not return a checkout link.');
    }
  };

  const items = quote.data?.items || [];
  return (
    <div className="space-y-6">
      <Card title="Your booking">
        <dl className="grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-2">
          <div><dt className="text-sm text-ink-500">Gym</dt><dd>{gym.name}</dd></div>
          <div><dt className="text-sm text-ink-500">When</dt><dd>{formatRange(startsAt, endIso)}</dd></div>
          <div><dt className="text-sm text-ink-500">Package</dt><dd>{pkg.name}</dd></div>
          <div><dt className="text-sm text-ink-500">People</dt><dd>{draft.bookingType === 'GROUP' ? `Group of ${draft.headcount}` : 'Just you'}</dd></div>
          {draft.provider && <div><dt className="text-sm text-ink-500">Coach</dt><dd>{draft.provider.name}, first session {formatDateTime(addisToIso(draft.firstSession.slice(0, 10), draft.firstSession.slice(11, 16)))}</dd></div>}
          {draft.consultant && <div><dt className="text-sm text-ink-500">Nutrition</dt><dd>{draft.consultant.name}</dd></div>}
        </dl>
      </Card>

      <Card title="Price">
        {quote.loading && !quote.data ? <Spinner label="Calculating your total" /> : quote.error ? (
          <div className="space-y-3">
            <ErrorState error={quote.error} onRetry={quote.reload} title="This booking cannot be priced" />
            <Button variant="secondary" onClick={onEditSlot}>Change my choices</Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-ink-100">
              {items.map((it) => (
                <li key={`${it.type}-${it.label}`} className="flex justify-between gap-4 py-2"><span>{it.label}</span><span className="tabular-nums">{formatMoney(it.amount)}</span></li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-ink-200 pt-3 text-xl"><span className="font-display font-semibold">Total</span><span className="font-display font-semibold tabular-nums">{formatMoney(quote.data?.total)}</span></p>
            <p className="mt-3 text-sm text-ink-500">After you continue, unpaid orders are released after 30 minutes.</p>
          </>
        )}
      </Card>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
          {order && <p className="mt-1">Your order #{order.orderId} is saved. Retrying only repeats the payment step.</p>}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" icon={ArrowLeft} onClick={onBack} disabled={pending || Boolean(order)}>Back</Button>
        <Button size="lg" loading={pending} disabled={!quote.data} onClick={pay}>{order ? 'Retry payment' : 'Pay with Chapa'}</Button>
      </div>
    </div>
  );
}

export default function BookingFlow() {
  const { id } = useParams();
  const toast = useToast();
  const gymState = useAsync(() => gymsApi.get(id), [id]);
  const pkgState = useAsync(() => packagesApi.forGym(id), [id]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY);

  // Changing the slot after a coach was chosen clears the coach choice (and tells the member).
  const patch = (changes) => {
    const next = { ...draft, ...changes };
    if (draft.provider && slotKey(next) !== slotKey(draft)) {
      toast.info('You changed the time, so your coach choice was cleared.');
      setDraft({ ...next, coachType: 'none', provider: null, providerPackageId: '', firstSession: '' });
    } else {
      setDraft(next);
    }
  };

  if ((gymState.loading && !gymState.data) || (pkgState.loading && !pkgState.data)) return <SkeletonList rows={3} />;
  if (gymState.error) return <ErrorState error={gymState.error} onRetry={gymState.reload} />;
  if (pkgState.error) return <ErrorState error={pkgState.error} onRetry={pkgState.reload} />;

  const gym = gymState.data;
  const packages = (pkgState.data || []).filter((p) => p.isActive !== false);
  if (gym.isActive === false) return <EmptyState title="This gym is not taking bookings" action={<Button as={Link} to="/app/gyms">Back to gyms</Button>} />;
  if (packages.length === 0) return <EmptyState title="No packages to book" message="This gym has no active package yet." action={<Button as={Link} to={`/app/gyms/${id}`}>Back to the gym</Button>} />;

  const pkg = packages.find((p) => String(p.id) === String(draft.packageId));
  const startsAt = draft.date && draft.time ? addisToIso(draft.date, draft.time) : null;
  const endIso = startsAt ? addMinutes(startsAt, Number(draft.duration)) : null;

  // Hidden steps never contribute `provider` / `consultation` keys.
  const body = pkg && startsAt ? {
    gymId: gym.id,
    [CHECKOUT_PACKAGE_KEY]: pkg.id,
    bookingType: draft.bookingType,
    headcount: draft.bookingType === 'GROUP' ? draft.headcount : 1,
    startsAt,
    durationMinutes: Number(draft.duration),
    ...(draft.provider && draft.providerPackageId && draft.firstSession ? {
      provider: {
        providerId: draft.provider.id,
        providerPackageId: draft.providerPackageId,
        firstSessionStartsAt: addisToIso(draft.firstSession.slice(0, 10), draft.firstSession.slice(11, 16)),
      },
    } : {}),
    ...(draft.consultant ? { consultation: { consultantId: draft.consultant.id } } : {}),
  } : null;

  return (
    <>
      <PageHeader title={`Book ${gym.name}`} subtitle="Your choices are kept if you go back." />
      <StepHeader step={step} />
      {step === 0 && <SlotStep gym={gym} packages={packages} draft={draft} patch={patch} onNext={() => setStep(1)} />}
      {step === 1 && <CoachStep gym={gym} draft={draft} patch={patch} startsAt={startsAt} endIso={endIso} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
      {step === 2 && <NutritionStep draft={draft} patch={patch} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && body && <SummaryStep gym={gym} pkg={pkg} draft={draft} body={body} startsAt={startsAt} endIso={endIso} onBack={() => setStep(2)} onEditSlot={() => setStep(0)} />}
    </>
  );
}
