-- AlterTable
ALTER TABLE "TrainerSession" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TrainerSession_status_expiresAt_idx" ON "TrainerSession"("status", "expiresAt");
