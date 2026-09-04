export const MAX_DURATION_HOURS = 4;

const parseTime = (time: string): number => {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
};

const normalizeClosingMinutes = (
  openingMinutes: number,
  closingMinutes: number
): number =>
  closingMinutes < openingMinutes ? closingMinutes + 24 * 60 : closingMinutes;

const formatTime = (minutes: number): string => {
  const normalizedMinutes = minutes % (24 * 60);
  const hour = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const generateCheckInTimes = (
  openingTime: string,
  closingTime: string
): string[] => {
  const openingMinutes = parseTime(openingTime);
  const closingMinutes = normalizeClosingMinutes(
    openingMinutes,
    parseTime(closingTime)
  );
  const lastCheckIn = closingMinutes - 60; // at least 1hr before close

  const slots: string[] = [];
  let cursor = openingMinutes;

  while (cursor <= lastCheckIn) {
    slots.push(formatTime(cursor));
    cursor += 30;
  }

  return slots;
};

// Given a check-in time and gym closing time, return the valid durations
// in hours the user can choose from (30-min steps, max 4hrs, can't exceed closing).
export const getAvailableDurations = (
  checkInTime: string,
  closingTime: string,
  openingTime?: string
): number[] => {
  const checkInMinutes = parseTime(checkInTime);
  const closingMinutes = parseTime(closingTime);
  const normalizedClosingMinutes = openingTime
    ? normalizeClosingMinutes(parseTime(openingTime), closingMinutes)
    : closingMinutes < checkInMinutes
      ? closingMinutes + 24 * 60
      : closingMinutes;
  const normalizedCheckInMinutes =
    openingTime &&
    normalizedClosingMinutes > 24 * 60 &&
    checkInMinutes < parseTime(openingTime)
      ? checkInMinutes + 24 * 60
      : checkInMinutes;

  // Max they can stay: either the hard 4hr cap or time until closing
  const maxMinutes = Math.min(
    MAX_DURATION_HOURS * 60,
    normalizedClosingMinutes - normalizedCheckInMinutes
  );

  const durations: number[] = [];
  for (let mins = 60; mins <= maxMinutes; mins += 30) {
    durations.push(mins / 60); // store as hours: 1, 1.5, 2 ...
  }

  return durations;
};

// Given check-in time string + duration in hours → checkout time string
export const computeCheckOutTime = (
  checkInTime: string,
  durationHours: number
): string => {
  return formatTime(parseTime(checkInTime) + durationHours * 60);
};

export const getCheckoutDayOffset = (
  checkInTime: string,
  durationHours: number
): number => Math.floor((parseTime(checkInTime) + durationHours * 60) / (24 * 60));

export const getCheckInDayOffset = (
  openingTime: string,
  closingTime: string,
  checkInTime: string
): number =>
  parseTime(closingTime) < parseTime(openingTime) &&
  parseTime(checkInTime) < parseTime(openingTime)
    ? 1
    : 0;

// "1.5" → "1h 30m", "2" → "2h", "0.5" → "30m"
export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Builds a full ISO datetime string from a Date and a "HH:MM" time string
export const buildSlotDateTime = (
  date: Date,
  time: string,
  dayOffset = 0
): string => {
  const [h, m] = time.split(':').map(Number);
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);
  dt.setDate(dt.getDate() + dayOffset);
  return dt.toISOString();
};

// Next 7 days starting from today
export const getNextSevenDays = (): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

export const formatShortDay = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

export const formatDayNumber = (date: Date): string =>
  date.getDate().toString();

export const isSameDay = (a: Date, b: Date): boolean =>
  a.toDateString() === b.toDateString();