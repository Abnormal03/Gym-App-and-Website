export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
export const isPhone = (v) => /^\+?[0-9\s-]{7,16}$/.test(String(v || '').trim());
export const isUrl = (v) => {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Provider/staff rule from the API docs: 8-72 chars, at least one letter and one digit. */
export function passwordProblem(v = '') {
  if (v.length < 8) return 'Use at least 8 characters.';
  if (v.length > 72) return 'Use at most 72 characters.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Include at least one letter and one digit.';
  return null;
}

export const required = (v, label = 'This field') => (String(v ?? '').trim() ? null : `${label} is required.`);

export function numberInRange(v, { min, max, integer = false, label = 'Value' } = {}) {
  if (v === '' || v === null || v === undefined) return `${label} is required.`;
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
  if (min !== undefined && n < min) return `${label} must be at least ${min}.`;
  if (max !== undefined && n > max) return `${label} must be at most ${max}.`;
  return null;
}

/** Run a map of { field: () => message | null } and return only the failures. */
export function collect(checks) {
  const errors = {};
  for (const [field, fn] of Object.entries(checks)) {
    const msg = fn();
    if (msg) errors[field] = msg;
  }
  return errors;
}
