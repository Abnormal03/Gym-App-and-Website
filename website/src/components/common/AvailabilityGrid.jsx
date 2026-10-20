import { PERIODS, WEEKDAYS_SHORT, WEEK_ORDER } from '../../utils/format';

/** 7 x 3 grid (day x period). `value` is an array of { dayOfWeek, period }. */
export default function AvailabilityGrid({ value, onChange, readOnly = false }) {
  const has = (d, p) => value.some((v) => v.dayOfWeek === d && v.period === p);
  const toggle = (d, p) => {
    if (readOnly) return;
    onChange(has(d, p) ? value.filter((v) => !(v.dayOfWeek === d && v.period === p)) : [...value, { dayOfWeek: d, period: p }]);
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1.5 text-center">
        <caption className="sr-only">Weekly availability</caption>
        <thead>
          <tr>
            <td />
            {PERIODS.map((p) => (
              <th key={p.value} scope="col" className="pb-1 text-sm font-medium">
                {p.label}
                <span className="block text-xs font-normal text-ink-500">{p.hours}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((d) => (
            <tr key={d}>
              <th scope="row" className="pr-2 text-right text-sm font-medium text-ink-600">{WEEKDAYS_SHORT[d]}</th>
              {PERIODS.map((p) => {
                const on = has(d, p.value);
                return (
                  <td key={p.value}>
                    <button
                      type="button"
                      disabled={readOnly}
                      aria-pressed={on}
                      aria-label={`${WEEKDAYS_SHORT[d]} ${p.label}`}
                      onClick={() => toggle(d, p.value)}
                      className={`h-10 w-full rounded-md border transition-colors ${on ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-white hover:bg-ink-50'} ${readOnly ? 'cursor-default' : ''}`}
                    >
                      {on ? 'On' : ''}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
