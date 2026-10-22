-- Persist seeker searches across devices and let listers publish bookable windows.
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastMatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedSearch_userId_href_key" ON "SavedSearch"("userId", "href");
CREATE INDEX "SavedSearch_userId_createdAt_idx" ON "SavedSearch"("userId", "createdAt");
CREATE INDEX "SavedSearch_notificationsEnabled_lastMatchedAt_idx" ON "SavedSearch"("notificationsEnabled", "lastMatchedAt");
CREATE UNIQUE INDEX "AvailabilitySlot_propertyId_startsAt_key" ON "AvailabilitySlot"("propertyId", "startsAt");
CREATE INDEX "AvailabilitySlot_propertyId_startsAt_endsAt_idx" ON "AvailabilitySlot"("propertyId", "startsAt", "endsAt");
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
