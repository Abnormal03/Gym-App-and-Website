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

// Builds the slotStart ISO string.
// date = selected date, time = check-in time string "HH:MM"
export const buildSlotStart = (date: Date, checkInTime: string): string => {
  const [h, m] = checkInTime.split(':').map(Number);
  const dt = new Date(date);
  dt.setHours(h, m, 0, 0);
  return dt.toISOString().replace('.000Z',"");
};

// Builds slotEnd for the AVAILABILITY CHECK (same day, just adds workout duration).
// This tells the backend: "on this specific day, this person occupies a spot from X to Y"
// Used for: GET /gyms/:id/availability
export const buildAvailabilitySlotEnd = (
  date: Date,
  checkInTime: string,
  durationHours: number
): string => {
  const [h, m] = checkInTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationHours * 60;
  const outH = Math.floor(totalMinutes / 60);
  const outM = totalMinutes % 60;

  const dt = new Date(date);
  dt.setHours(outH, outM, 0, 0);
  return dt.toISOString().replace('.000Z',"");
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
  const [h, m] = checkInTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationHours * 60;
  const outH = Math.floor(totalMinutes / 60);
  const outM = totalMinutes % 60;

  // End date = start date + package duration
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + packageDurationDays);
  endDate.setHours(outH, outM, 0, 0);
  return endDate.toISOString().replace('.000Z',"");
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