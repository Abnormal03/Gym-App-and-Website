const TONES = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-800 ring-sky-200',
  gray: 'bg-ink-50 text-ink-500 ring-ink-200',
};

const MAP = {
  pending: 'amber', held: 'amber', confirmed: 'brand', scheduled: 'blue', checked_in: 'blue', attended: 'blue',
  completed: 'green', paid: 'green', success: 'green', active: 'green',
  cancelled: 'gray', expired: 'gray', inactive: 'gray', no_show: 'red', payment_failed: 'red', failed: 'red', rejected: 'red',
  requested: 'amber', available: 'green',
};

export default function StatusBadge({ status, label, tone }) {
  const key = String(status || '').toLowerCase();
  const text = label || key.replace(/_/g, ' ') || 'unknown';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${TONES[tone || MAP[key] || 'gray']}`}>
      {text}
    </span>
  );
}
