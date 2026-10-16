-- Attendance belongs to a booking/day, while the booking itself stays confirmed.
DROP INDEX IF EXISTS "CheckIn_bookingId_key";

CREATE UNIQUE INDEX "CheckIn_bookingId_localDate_key"
ON "CheckIn"("bookingId", "localDate");

-- Restore any still-active bookings that the old scan flow marked attended.
UPDATE "Booking"
SET "status" = 'confirmed'
WHERE "status" = 'checked_in'
  AND "slotEnd" > CURRENT_TIMESTAMP;
