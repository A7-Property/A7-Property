import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { AuditAction, PropertyReportStatus, PropertyStatus, type UserRole } from "../generated/prisma/enums";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePropertyReportDto } from "./dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(reporter: { id: string; role: UserRole }, propertyId: string, input: CreatePropertyReportDto, request: Request) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, status: PropertyStatus.PUBLISHED },
      select: { id: true, ownerId: true },
    });
    if (!property) throw new NotFoundException("Property not found");
    if (property.ownerId === reporter.id) throw new ForbiddenException("You cannot report your own listing");
    const existing = await this.prisma.propertyReport.findFirst({
      where: { propertyId, reporterId: reporter.id, status: PropertyReportStatus.PENDING },
      select: { id: true },
    });
    if (existing) throw new BadRequestException("You already have a pending report for this listing");
    const report = await this.prisma.propertyReport.create({
      data: { propertyId, reporterId: reporter.id, reason: input.reason, details: input.details.trim() },
    });
    await this.audit.record({
      action: AuditAction.PROPERTY_REPORT_CREATED,
      actorId: reporter.id,
      actorRole: reporter.role,
      targetType: "PropertyReport",
      targetId: report.id,
      metadata: { propertyId, reason: input.reason },
      request,
    });
    return report;
  }
}
