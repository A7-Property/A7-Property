CREATE TYPE "PropertyReportReason" AS ENUM ('SUSPECTED_SCAM', 'INCORRECT_INFORMATION', 'DUPLICATE_LISTING', 'UNAVAILABLE_PROPERTY', 'OTHER');
CREATE TYPE "PropertyReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

ALTER TYPE "AuditAction" ADD VALUE 'PROPERTY_REPORT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PROPERTY_REPORT_REVIEWED';

CREATE TABLE "PropertyReport" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "PropertyReportReason" NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" "PropertyReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolutionNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PropertyReport_status_createdAt_idx" ON "PropertyReport"("status", "createdAt");
CREATE INDEX "PropertyReport_propertyId_status_idx" ON "PropertyReport"("propertyId", "status");
CREATE INDEX "PropertyReport_reporterId_createdAt_idx" ON "PropertyReport"("reporterId", "createdAt");

ALTER TABLE "PropertyReport" ADD CONSTRAINT "PropertyReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyReport" ADD CONSTRAINT "PropertyReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
