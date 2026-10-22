ALTER TYPE "EmailTokenType" ADD VALUE 'CHANGE_EMAIL';
ALTER TYPE "AuditAction" ADD VALUE 'USER_EMAIL_CHANGE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_EMAIL_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPERTY_AVAILABILITY_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPERTY_EXPIRED';

ALTER TABLE "EmailToken" ADD COLUMN "pendingEmail" TEXT;
ALTER TABLE "Property"
  ADD COLUMN "availabilityConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "freshnessReminderSentAt" TIMESTAMP(3);

UPDATE "Property"
SET "availabilityConfirmedAt" = CURRENT_TIMESTAMP,
    "expiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE "status" = 'PUBLISHED';

CREATE INDEX "Property_status_expiresAt_idx" ON "Property"("status", "expiresAt");
CREATE INDEX "EmailToken_pendingEmail_type_consumedAt_idx" ON "EmailToken"("pendingEmail", "type", "consumedAt");
