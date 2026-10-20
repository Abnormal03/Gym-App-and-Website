import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Dumbbell, MapPin, Users } from 'lucide-react';
import { WEEKDAYS_SHORT, PERIODS, formatMoney } from '../../utils/format';
import { isUrl } from '../../utils/validators';

export function GymPhoto({ photos, name, className = 'h-36' }) {
  const [failed, setFailed] = useState(false);
  const src = Array.isArray(photos) ? photos.find(isUrl) : null;
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-ink-700 to-brand ${className}`} role="img" aria-label={name ? `${name} (no photo)` : 'No photo'}>
        <Dumbbell className="h-10 w-10 text-white/60" aria-hidden="true" />
      </div>
    );
  }
  return <img src={src} alt={name ? `${name}` : ''} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`w-full object-cover ${className}`} />;
}

export function GymCard({ gym, to }) {
  return (
    <Link to={to} className="card group block overflow-hidden transition-colors hover:border-brand">
      <GymPhoto photos={gym.photos} name={gym.name} />
      <div className="p-4">
        <h3 className="text-xl group-hover:text-brand">{gym.name}</h3>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-500"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{gym.address || 'Address not listed'}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden="true" />{gym.openingTime} - {gym.closingTime}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />Capacity {gym.capacity}</span>
        </div>
        {gym.amenities?.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {gym.amenities.slice(0, 4).map((a) => <li key={a} className="rounded-full bg-ink-50 px-2 py-0.5 text-xs text-ink-600">{a}</li>)}
            {gym.amenities.length > 4 && <li className="px-1 text-xs text-ink-400">+{gym.amenities.length - 4}</li>}
          </ul>
        )}
      </div>
    </Link>
  );
}

/** Human-readable restrictions of a gym package (BR-10). */
export function packageRestrictions(pkg) {
  const out = [];
  out.push(pkg.maxVisits ? `${pkg.maxVisits} visits` : 'Unlimited visits');
  if (pkg.allowedDays?.length) out.push(pkg.allowedDays.map((d) => WEEKDAYS_SHORT[d]).join(', '));
  else out.push('Every day');
  if (pkg.allowedPeriods?.length) out.push(pkg.allowedPeriods.map((p) => PERIODS.find((x) => x.value === p)?.label || p).join(', '));
  else out.push('Any time of day');
  if (pkg.maxGroupSize > 1) out.push(`Groups up to ${pkg.maxGroupSize}`);
  return out;
}

export function PackageCard({ pkg, selected, onSelect, action }) {
  const Wrapper = onSelect ? 'button' : 'div';
  return (
    <Wrapper
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      aria-pressed={onSelect ? selected : undefined}
      className={`card w-full p-4 text-left ${onSelect ? 'transition-colors hover:border-brand' : ''} ${selected ? 'border-brand ring-2 ring-brand/20' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl">{pkg.name}</h3>
          <p className="text-sm capitalize text-ink-500">{pkg.type ? `${pkg.type} · ` : ''}{pkg.durationDays} day{pkg.durationDays === 1 ? '' : 's'}</p>
        </div>
        <p className="font-display text-2xl font-semibold text-brand">{formatMoney(pkg.price)}</p>
      </div>
      {pkg.benefits && <p className="mt-2 text-ink-600">{pkg.benefits}</p>}
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {packageRestrictions(pkg).map((r) => <li key={r} className="rounded-full bg-ink-50 px-2 py-0.5 text-xs text-ink-600">{r}</li>)}
      </ul>
      {action && <div className="mt-3">{action}</div>}
    </Wrapper>
  );
}
