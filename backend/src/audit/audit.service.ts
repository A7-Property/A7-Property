import { Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";
import { AuditAction, type UserRole } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { clientIp, userAgent } from "../common/request-context";

export interface AuditEntry {
  action: AuditAction;
  actorId?: string | null;
  actorRole?: UserRole | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  request?: Request;
}

/**
 * Append-only security trail. Writing it must never fail the caller's request,
 * so every failure is logged and swallowed.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          actorId: entry.actorId ?? null,
          actorRole: entry.actorRole ?? null,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          ip: entry.request ? clientIp(entry.request) : null,
          userAgent: entry.request ? userAgent(entry.request) : null,
          metadata: (entry.metadata ?? undefined) as never,
        },
      });
    } catch (error) {
      this.logger.error(`Audit write failed for ${entry.action}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
