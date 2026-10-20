import { useId } from 'react';

/** Label + control + hint + error. `children` receives { id, describedBy, invalid } for custom controls. */
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({ label, error, hint, required, className = '', inputClassName = '', ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={required} className={`input ${invalid ? 'input-error' : ''} ${inputClassName}`} {...props} />
      )}
    </Field>
  );
}

export function SelectField({ label, error, hint, required, options, className = '', placeholder, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`input ${invalid ? 'input-error' : ''}`} {...props}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function TextArea({ label, error, hint, required, className = '', rows = 3, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} rows={rows} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={`input ${invalid ? 'input-error' : ''}`} {...props} />
      )}
    </Field>
  );
}

/** Pill checkbox group (days, periods). */
export function ChipGroup({ label, options, value, onChange, hint }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-ink-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <label key={o.value} className={`cursor-pointer select-none rounded-full border px-3 py-1 text-sm transition-colors focus-within:ring-2 focus-within:ring-signal ${on ? 'border-brand bg-brand text-white' : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}`}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-1 text-sm text-ink-500">{hint}</p>}
    </fieldset>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="block text-sm text-ink-500">{description}</span>}
      </span>
      <span className="relative mt-1 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-ink-200 transition-colors peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-signal peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
