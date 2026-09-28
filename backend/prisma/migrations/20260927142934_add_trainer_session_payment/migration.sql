/*
  Warnings:

  - A unique constraint covering the columns `[trainerSessionId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'PAYMENT_FAILED';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "trainerSessionId" INTEGER,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_trainerSessionId_key" ON "Payment"("trainerSessionId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_trainerSessionId_fkey" FOREIGN KEY ("trainerSessionId") REFERENCES "TrainerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
