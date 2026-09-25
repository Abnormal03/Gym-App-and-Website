/*
  Warnings:

  - You are about to drop the `UserPreference` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Trainer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Trainer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `Trainer` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `Trainer` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "passwordHash" TEXT NOT NULL,
ADD COLUMN     "profilePhotoUrl" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sessionPrice" DECIMAL(10,2),
ADD COLUMN     "specialization" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "gymId" DROP NOT NULL,
ALTER COLUMN "name" SET NOT NULL;

-- DropTable
DROP TABLE "UserPreference";

-- CreateTable
CREATE TABLE "TrainerCredential" (
    "id" SERIAL NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "label" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerAvailability" (
    "id" SERIAL NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "TrainerAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerSession" (
    "id" SERIAL NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "price" DECIMAL(10,2) NOT NULL,
    "chapaTxRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerReview" (
    "id" SERIAL NOT NULL,
    "trainerId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerAvailability_trainerId_dayOfWeek_idx" ON "TrainerAvailability"("trainerId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerSession_chapaTxRef_key" ON "TrainerSession"("chapaTxRef");

-- CreateIndex
CREATE INDEX "TrainerSession_trainerId_startTime_idx" ON "TrainerSession"("trainerId", "startTime");

-- CreateIndex
CREATE INDEX "TrainerSession_memberId_startTime_idx" ON "TrainerSession"("memberId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerReview_sessionId_key" ON "TrainerReview"("sessionId");

-- CreateIndex
CREATE INDEX "TrainerReview_trainerId_idx" ON "TrainerReview"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerReview_memberId_idx" ON "TrainerReview"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Trainer_email_key" ON "Trainer"("email");

-- AddForeignKey
ALTER TABLE "Trainer" ADD CONSTRAINT "Trainer_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerCredential" ADD CONSTRAINT "TrainerCredential_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerAvailability" ADD CONSTRAINT "TrainerAvailability_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerSession" ADD CONSTRAINT "TrainerSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerSession" ADD CONSTRAINT "TrainerSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerReview" ADD CONSTRAINT "TrainerReview_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerReview" ADD CONSTRAINT "TrainerReview_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerReview" ADD CONSTRAINT "TrainerReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainerSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
