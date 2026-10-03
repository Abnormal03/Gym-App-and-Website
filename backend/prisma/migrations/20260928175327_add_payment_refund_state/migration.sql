/*
  Warnings:

  - A unique constraint covering the columns `[chapaRefundRef]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'refund_pending';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "chapaRefundRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_chapaRefundRef_key" ON "Payment"("chapaRefundRef");
