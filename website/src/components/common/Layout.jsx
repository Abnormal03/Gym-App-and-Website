import { Star } from 'lucide-react';
import { initials } from '../../utils/format';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '', padded = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
          <h2 className="text-xl">{title}</h2>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, loading }) {
  return (
    <div className="card p-4 bg-[#2E68F4] text-slate-950">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-950">{label}</p>
        {Icon && <Icon className="h-5 w-5 text-brand" aria-hidden="true" />}
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums">
        {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-ink-100" /> : value}
      </p>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </div>
  );
}

export function Avatar({ name, src, size = 'md' }) {
  const dim = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' }[size];
  if (src) {
    return <img src={src} alt="" referrerPolicy="no-referrer" className={`${dim} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span aria-hidden="true" className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand`}>
      {initials(name)}
    </span>
  );
}

export function Stars({ value = 0, count, size = 'sm' }) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${Number(value).toFixed(1)} out of 5`}>
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} aria-hidden="true" className={`${dim} ${n <= rounded ? 'fill-signal text-signal' : 'text-ink-200'}`} />
        ))}
      </span>
      {count !== undefined && <span className="text-sm text-ink-500">{Number(value).toFixed(1)} ({count})</span>}
    </span>
  );
}

export function StarInput({ value, onChange, label = 'Rating' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-0.5">
          <Star className={`h-8 w-8 ${n <= value ? 'fill-signal text-signal' : 'text-ink-200'}`} />
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-ink-100 p-1">
      {tabs.map((t) => (
        <button key={t.value} role="tab" type="button" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${value === t.value ? 'bg-white text-ink shadow-sm' : 'text-ink-500 hover:text-ink'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-sm text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children ?? '-'}</dd>
    </div>
  );
}
