WITH eligible_purchases AS (
  SELECT
    b."userId",
    b."gymId",
    b."packageId",
    b.id AS "purchaseBookingId",
    COALESCE(payment."updatedAt", payment."createdAt") AS "paidAt",
    package."durationDays",
    package."maxVisits"
  FROM "Booking" b
  JOIN "Order" orders ON orders."bookingId" = b.id
  JOIN "Payment" payment ON payment."bookingId" = b.id
  JOIN "Package" package ON package.id = b."packageId"
  WHERE payment.status = 'success'
    AND b.status IN ('confirmed', 'checked_in')
    AND EXISTS (
      SELECT 1
      FROM "OrderItem" item
      WHERE item."orderId" = orders.id
        AND item.type = 'GYM_BOOKING'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "MemberPackage" existing
      WHERE existing."purchaseBookingId" = b.id
    )
)
INSERT INTO "MemberPackage" (
  "userId",
  "gymId",
  "packageId",
  "purchaseBookingId",
  "startsAt",
  "endsAt",
  "maxVisits",
  status
)
SELECT
  purchase."userId",
  purchase."gymId",
  purchase."packageId",
  purchase."purchaseBookingId",
  purchase."paidAt",
  purchase."paidAt" + (purchase."durationDays" * INTERVAL '1 day'),
  purchase."maxVisits",
  CASE
    WHEN purchase."paidAt" + (purchase."durationDays" * INTERVAL '1 day') <= CURRENT_TIMESTAMP
      THEN 'EXPIRED'::"AccessStatus"
    ELSE 'ACTIVE'::"AccessStatus"
  END
FROM eligible_purchases purchase;
