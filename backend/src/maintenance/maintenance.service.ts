import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";
import { MailService } from "../mail/mail.service";
import { AuditService } from "../audit/audit.service";
import { Prisma } from "../generated/prisma/client";
import { AuditAction, FurnitureStatus, ListingType, PropertyStatus, PropertyType, UserRole, VerificationStatus } from "../generated/prisma/enums";

/**
 * Housekeeping that production needs and nothing else does: expired auth
 * records and abandoned uploads otherwise grow without bound.
 *
 * Every replica would run these, so `ENABLE_JOBS=false` on extra replicas keeps
 * one scheduler. The work is idempotent, so an overlapping run is harmless.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: "prune-auth-records" })
  async pruneAuthRecords() {
    const now = new Date();
    try {
      const [sessions, tokens, attempts] = await this.prisma.$transaction([
        // Keep revoked rows for a day so refresh-reuse detection still sees them.
        this.prisma.refreshSession.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now.getTime() - 86_400_000) } }] } }),
        this.prisma.emailToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { lt: new Date(now.getTime() - 86_400_000) } }] } }),
        this.prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } }),
      ]);
      if (sessions.count || tokens.count || attempts.count) {
        this.logger.log(`Pruned ${sessions.count} sessions, ${tokens.count} email tokens, ${attempts.count} login attempts`);
      }
    } catch (error) {
      this.logger.error("Auth record pruning failed", error instanceof Error ? error.stack : undefined);
    }
  }

  /**
   * Deletes uploads that were never attached to a listing or avatar. Without
   * this, every abandoned listing draft leaks an object in R2 forever.
   */
  @Cron(CronExpression.EVERY_6_HOURS, { name: "prune-orphan-uploads" })
  async pruneOrphanUploads() {
    const retentionHours = Number(process.env.UPLOAD_ORPHAN_RETENTION_HOURS ?? 24);
    const cutoff = new Date(Date.now() - retentionHours * 3_600_000);
    try {
      const orphans = await this.prisma.uploadedAsset.findMany({
        where: { consumedAt: null, createdAt: { lt: cutoff }, propertyImages: { none: {} } },
        select: { id: true, storageKey: true },
        take: 500,
      });
      let removed = 0;
      for (const orphan of orphans) {
        try {
          await this.uploads.purge(orphan.id, orphan.storageKey);
          removed += 1;
        } catch (error) {
          this.logger.warn(`Could not purge orphan upload ${orphan.storageKey}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      if (removed) this.logger.log(`Purged ${removed} orphaned uploads older than ${retentionHours}h`);
    } catch (error) {
      this.logger.error("Orphan upload pruning failed", error instanceof Error ? error.stack : undefined);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: "prune-audit-logs" })
  async pruneAuditLogs() {
    const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS ?? 365);
    try {
      const deleted = await this.prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - retentionDays * 86_400_000) } } });
      if (deleted.count) this.logger.log(`Pruned ${deleted.count} audit log entries older than ${retentionDays} days`);
    } catch (error) {
      this.logger.error("Audit log pruning failed", error instanceof Error ? error.stack : undefined);
    }
  }

  /** Clears account locks whose window has passed, so a lock never outlives its timer. */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: "clear-expired-locks" })
  async clearExpiredLocks() {
    try {
      await this.prisma.user.updateMany({ where: { lockedUntil: { lt: new Date() } }, data: { lockedUntil: null, failedLoginCount: 0 } });
    } catch (error) {
      this.logger.error("Lock expiry sweep failed", error instanceof Error ? error.stack : undefined);
    }
  }

  /** Reminds owners once, then pauses listings whose 30-day confirmation expired. */
  @Cron(CronExpression.EVERY_HOUR, { name: "refresh-listing-freshness" })
  async refreshListingFreshness() {
    const now = new Date();
    const reminderCutoff = new Date(now.getTime() + 3 * 86_400_000);
    try {
      const reminders = await this.prisma.property.findMany({
        where: { status: PropertyStatus.PUBLISHED, expiresAt: { gt: now, lte: reminderCutoff }, freshnessReminderSentAt: null },
        select: { id: true, title: true, expiresAt: true, owner: { select: { email: true } } },
        take: 200,
      });
      for (const property of reminders) {
        const claimed = await this.prisma.property.updateMany({ where: { id: property.id, freshnessReminderSentAt: null }, data: { freshnessReminderSentAt: now } });
        if (claimed.count && property.expiresAt) await this.mail.notifyListingFreshness(property.owner.email, { propertyTitle: property.title, expiresAt: property.expiresAt });
      }

      const expired = await this.prisma.property.findMany({
        where: { status: PropertyStatus.PUBLISHED, expiresAt: { lte: now } },
        select: { id: true, ownerId: true, title: true, owner: { select: { email: true } } },
        take: 200,
      });
      for (const property of expired) {
        const changed = await this.prisma.property.updateMany({ where: { id: property.id, status: PropertyStatus.PUBLISHED, expiresAt: { lte: now } }, data: { status: PropertyStatus.PAUSED } });
        if (!changed.count) continue;
        await this.audit.record({ action: AuditAction.PROPERTY_EXPIRED, actorId: property.ownerId, actorRole: UserRole.LISTER, targetType: "Property", targetId: property.id, metadata: { reason: "availability_confirmation_expired" } });
        await this.mail.notifyListingExpired(property.owner.email, property.title);
      }
    } catch (error) {
      this.logger.error("Listing freshness sweep failed", error instanceof Error ? error.stack : undefined);
    }
  }

  /** Sends one hourly digest per opted-in saved search for listings published since its last scan. */
  @Cron(CronExpression.EVERY_HOUR, { name: "saved-search-alerts" })
  async sendSavedSearchAlerts() {
    const scanFinishedAt = new Date();
    try {
      const searches = await this.prisma.savedSearch.findMany({
        where: { notificationsEnabled: true, user: { isActive: true, emailVerifiedAt: { not: null } } },
        include: { user: { select: { email: true } } },
        orderBy: { updatedAt: "asc" },
        take: 200,
      });
      for (const search of searches) {
        const claimed = await this.prisma.savedSearch.updateMany({
          where: { id: search.id, lastMatchedAt: { equals: search.lastMatchedAt } },
          data: { lastMatchedAt: scanFinishedAt },
        });
        if (!claimed.count) continue;
        const filters = search.filters && typeof search.filters === "object" && !Array.isArray(search.filters) ? search.filters as Record<string, unknown> : {};
        const text = (key: string) => typeof filters[key] === "string" ? String(filters[key]).trim() : "";
        const number = (key: string) => { const value = Number(filters[key]); return Number.isFinite(value) && value >= 0 ? value : undefined; };
        const purpose = text("purpose");
        const propertyType = text("type").toUpperCase();
        const furniture = text("furniture").toUpperCase();
        const query = text("q");
        const amenities = text("amenities").split(",").map((value) => value.trim()).filter(Boolean);
        const where: Prisma.PropertyWhereInput = {
          status: PropertyStatus.PUBLISHED,
          updatedAt: { gt: search.lastMatchedAt ?? search.createdAt, lte: scanFinishedAt },
          ...(purpose === "sale" || purpose === "rent" ? { listingType: purpose === "sale" ? ListingType.SALE : ListingType.RENT } : {}),
          ...(Object.values(PropertyType).includes(propertyType as PropertyType) ? { propertyType: propertyType as PropertyType } : {}),
          ...(Object.values(FurnitureStatus).includes(furniture as FurnitureStatus) ? { furniture: furniture as FurnitureStatus } : {}),
          ...(number("min") !== undefined || number("max") !== undefined ? { price: { gte: number("min"), lte: number("max") } } : {}),
          ...(number("beds") !== undefined ? { bedrooms: { gte: number("beds") } } : {}),
          ...(number("baths") !== undefined ? { bathrooms: { gte: number("baths") } } : {}),
          ...(text("verified") === "1" ? { verificationStatus: VerificationStatus.VERIFIED } : {}),
          ...(query ? { OR: [
            { title: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
            { township: { contains: query, mode: "insensitive" } },
            { address: { contains: query, mode: "insensitive" } },
          ] } : {}),
          ...(amenities.length ? { AND: amenities.map((name) => ({ amenities: { some: { name: { equals: name, mode: "insensitive" as const } } } })) } : {}),
        };
        const matches = await this.prisma.property.findMany({ where, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 20 });
        if (matches.length) await this.mail.notifySavedSearchMatches(search.user.email, { title: search.title, href: search.href, properties: matches });
      }
    } catch (error) {
      this.logger.error("Saved-search alert sweep failed", error instanceof Error ? error.stack : undefined);
    }
  }
}
