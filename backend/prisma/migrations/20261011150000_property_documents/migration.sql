-- Complete the existing PropertyDocument model. This migration only adds data structures.
ALTER TYPE "UploadKind" ADD VALUE 'PROPERTY_DOCUMENT';

CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyDocument_propertyId_status_idx" ON "PropertyDocument"("propertyId", "status");
CREATE INDEX "PropertyDocument_createdAt_idx" ON "PropertyDocument"("createdAt");
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
