import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { UploadsService } from "../uploads/uploads.service";

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

  constructor(private readonly prisma: PrismaService, private readonly uploads: UploadsService) {}

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
}
