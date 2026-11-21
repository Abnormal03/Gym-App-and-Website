CREATE TYPE "GymApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "SuperAdmin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

ALTER TABLE "Gym" ADD COLUMN "approvalStatus" "GymApprovalStatus" NOT NULL DEFAULT 'APPROVED';

CREATE TABLE "GymApprovalAudit" (
    "id" SERIAL NOT NULL,
    "gymId" INTEGER NOT NULL,
    "superAdminId" INTEGER NOT NULL,
    "decision" "GymApprovalStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GymApprovalAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GymApprovalAudit_gymId_createdAt_idx" ON "GymApprovalAudit"("gymId", "createdAt");
CREATE INDEX "GymApprovalAudit_superAdminId_createdAt_idx" ON "GymApprovalAudit"("superAdminId", "createdAt");
ALTER TABLE "GymApprovalAudit" ADD CONSTRAINT "GymApprovalAudit_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymApprovalAudit" ADD CONSTRAINT "GymApprovalAudit_superAdminId_fkey" FOREIGN KEY ("superAdminId") REFERENCES "SuperAdmin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
