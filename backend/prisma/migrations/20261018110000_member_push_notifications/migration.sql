ALTER TABLE "User" ADD COLUMN "expoPushToken" TEXT;
ALTER TABLE "Booking" ADD COLUMN "confirmationNotificationSentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "reminderNotificationSentAt" TIMESTAMP(3);
ALTER TABLE "TrainingSession" ADD COLUMN "reminderNotificationSentAt" TIMESTAMP(3);
