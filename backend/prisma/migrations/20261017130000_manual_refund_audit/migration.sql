ALTER TABLE "Payment"
ADD COLUMN "refundedAt" TIMESTAMP(3),
ADD COLUMN "refundedByAdminId" INTEGER,
ADD COLUMN "refundReference" TEXT;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_refundedByAdminId_fkey"
FOREIGN KEY ("refundedByAdminId") REFERENCES "GymAdmin"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
