ALTER TABLE "Message"
  ADD COLUMN "editedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "editHistory" JSONB NOT NULL DEFAULT '[]'::jsonb;
