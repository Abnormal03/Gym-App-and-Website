export const TZ = 'Africa/Addis_Ababa';
export const ADDIS_OFFSET = '+03:00'; // Addis Ababa has no daylight saving

const dtf = (opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });

export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return dtf({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}
export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return dtf({ day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}
export function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return dtf({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}
export function formatRange(startIso, endIso) {
  return `${formatDateTime(startIso)} - ${formatTime(endIso)}`;
}
export function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `ETB ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Wall-clock parts of an instant in Addis Ababa. */
export function addisParts(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
/** Value for <input type="datetime-local"> showing an instant in Addis time. */
export function toAddisInput(iso) {
  const { date, time } = addisParts(new Date(iso));
  return `${date}T${time}`;
}
/** '2026-10-20' + '06:00' (Addis wall clock) -> ISO string with +03:00 offset. */
export function addisToIso(date, time) {
  return `${date}T${time}:00${ADDIS_OFFSET}`;
}
export function addMinutes(iso, minutes) {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}
export function isFuture(iso) {
  return new Date(iso).getTime() > Date.now();
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Display Monday first; API uses 0 = Sunday.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const PERIODS = [
  { value: 'MORNING', label: 'Morning', hours: '06-12' },
  { value: 'AFTERNOON', label: 'Afternoon', hours: '12-17' },
  { value: 'EVENING', label: 'Evening', hours: '17-22' },
];

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
}
export function splitCsv(text = '') {
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}
export function titleCase(s = '') {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
