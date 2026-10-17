// src/utils/timeSlots.ts

export const MAX_DURATION_HOURS = 4;

// Generate check-in times in 30-min increments within gym hours.
// Last valid check-in must be at least 1 hour before closing.
export const generateCheckInTimes = (
  openingTime: string,
  closingTime: string
): string[] => {
  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);

  const openingMinutes = openHour * 60 + openMin;
  const closingMinutes = closeHour * 60 + closeMin;
  const lastCheckIn = closingMinutes - 60;

  const slots: string[] = [];
  let cursor = openingMinutes;

  while (cursor <= lastCheckIn) {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cursor += 30;
  }

  return slots;
};

// Available workout durations given a check-in time and closing time.
// Max 4 hours or whatever time is left before closing — whichever is less.
export const getAvailableDurations = (
  checkInTime: string,
  closingTime: string
): number[] => {
  const [checkInHour, checkInMin] = checkInTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);

  const checkInMinutes = checkInHour * 60 + checkInMin;
  const closingMinutes = closeHour * 60 + closeMin;

  const maxMinutes = Math.min(
    MAX_DURATION_HOURS * 60,
    closingMinutes - checkInMinutes
  );

  const durations: number[] = [];
  for (let mins = 60; mins <= maxMinutes; mins += 30) {
    durations.push(mins / 60);
  }

  return durations;
};

// Computes checkout time string for DISPLAY only (e.g. "10:30").
// Does NOT include the date — used only for showing the user their checkout time.
export const computeCheckOutTime = (
  checkInTime: string,
  durationHours: number
): string => {
  const [h, m] = checkInTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationHours * 60;
  const outH = Math.floor(totalMinutes / 60);
  const outM = totalMinutes % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
};

// Display a gym's Addis Ababa wall time without changing the value used in
// booking requests (which remains in 24-hour HH:mm form).
export const formatTimeAmPm = (time: string): string => {
  const [hour, minute] = time.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
};

const ADDIS_TIME_ZONE = 'Africa/Addis_Ababa';
const ADDIS_OFFSET_MINUTES = 3 * 60;

const getAddisDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ADDIS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
};

// Gym schedules are entered and displayed as Addis Ababa wall time. Convert
// that wall time to a UTC instant explicitly so device timezone settings do not
// change the requested booking slot.
const buildAddisInstant = (date: Date, time: string): Date => {
  const { year, month, day } = getAddisDateParts(date);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute) -
      ADDIS_OFFSET_MINUTES * 60_000,
  );
};

export const buildSlotStart = (date: Date, checkInTime: string): string => {
  return buildAddisInstant(date, checkInTime).toISOString();
};

// Builds slotEnd for the AVAILABILITY CHECK (same day, just adds workout duration).
// This tells the backend: "on this specific day, this person occupies a spot from X to Y"
// Used for: GET /gyms/:id/availability
export const buildAvailabilitySlotEnd = (
  date: Date,
  checkInTime: string,
  durationHours: number
): string => {
  const start = buildAddisInstant(date, checkInTime);
  return new Date(start.getTime() + durationHours * 60 * 60_000).toISOString();
};

/**
 * Build the end of the actual workout window used for provider search.
 * Booking timestamps without an offset are interpreted as UTC by the API.
 */
export const buildProviderWindowEnd = (
  slotStart: string,
  durationHours: number,
): string | undefined => {
  const startInput = /(?:Z|[+-]\d{2}:\d{2})$/i.test(slotStart)
    ? slotStart
    : `${slotStart}Z`;
  const start = new Date(startInput);
  const durationMinutes = Math.round(durationHours * 60);

  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return undefined;
  }

  return new Date(start.getTime() + durationMinutes * 60_000).toISOString();
};

// Builds slotEnd for BOOKING CREATION.
// The date is slotStart date + package duration days (e.g. +30 for monthly).
// The time is check-in time + workout duration.
//
// Example:
//   slotStart: 2026-06-10T09:00:00 (monthly package, 1hr workout)
//   slotEnd:   2026-07-10T10:00:00  ← 30 days later, 1hr later in the day
//
// Used for: POST /bookings
export const buildBookingSlotEnd = (
  date: Date,
  checkInTime: string,
  durationHours: number,
  packageDurationDays: number
): string => {
  const start = buildAddisInstant(date, checkInTime);
  const end = new Date(
    start.getTime() + packageDurationDays * 24 * 60 * 60_000,
  );
  return new Date(end.getTime() + durationHours * 60 * 60_000).toISOString();
};

// "1.5" → "1h 30m", "2" → "2h", "0.5" → "30m"
export const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Next 7 days starting today
export const getNextSevenDays = (): Date[] =>
  (() => {
    const { year, month, day } = getAddisDateParts(new Date());
    return Array.from(
      { length: 7 },
      (_, i) => new Date(Date.UTC(year, month - 1, day + i, 12)),
    );
  })();

export const formatShortDay = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    timeZone: ADDIS_TIME_ZONE,
    weekday: 'short',
  });

export const formatDayNumber = (date: Date): string =>
  String(getAddisDateParts(date).day);

export const isSameDay = (a: Date, b: Date): boolean =>
  formatAddisDateKey(a) === formatAddisDateKey(b);

const formatAddisDateKey = (date: Date): string => {
  const { year, month, day } = getAddisDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
