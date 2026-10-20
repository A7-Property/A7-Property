import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Request } from "express";
import { Prisma } from "../generated/prisma/client";
import { AuditAction, PropertyStatus, UserRole, VerificationStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { MailService } from "../mail/mail.service";
import { pageMeta } from "../common/pagination";
import { presentProperty, propertyInclude } from "../properties/properties.service";
import { AdminPropertyQueryDto, AdminUserQueryDto, AdminUserStatusDto, AdminVerificationDocumentQueryDto, AdminVerificationDocumentDecisionDto, AuditLogQueryDto, VerificationDecisionDto } from "./dto";

const adminUserSelect = {
  id: true, email: true, firstName: true, lastName: true, address: true, phone: true, role: true,
  isActive: true, isAgent: true, emailVerifiedAt: true, lockedUntil: true, lastLoginAt: true,
  deactivatedAt: true, createdAt: true,
  verificationDocs: true,
  _count: { select: { properties: true, sentInquiries: true, receivedInquiries: true } },
} as const;

/** A reviewer may only move a listing into these states. */
const reviewableStates: VerificationStatus[] = [VerificationStatus.PENDING, VerificationStatus.VERIFIED, VerificationStatus.REJECTED, VerificationStatus.UNVERIFIED];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  async overview() {
    const [users, listers, seekers, activeUsers, properties, published, pendingReview, verified, inquiries, viewings, newInquiries, requestedViewings] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: UserRole.LISTER } }),
        this.prisma.user.count({ where: { role: UserRole.SEEKER } }),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.property.count(),
        this.prisma.property.count({ where: { status: PropertyStatus.PUBLISHED } }),
        this.prisma.property.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
        this.prisma.property.count({ where: { verificationStatus: VerificationStatus.VERIFIED } }),
        this.prisma.inquiry.count(),
        this.prisma.viewing.count(),
        this.prisma.inquiry.count({ where: { status: "NEW" } }),
        this.prisma.viewing.count({ where: { status: "REQUESTED" } }),
      ]);
    return {
      users: { total: users, active: activeUsers, listers, seekers },
      properties: { total: properties, published, pendingReview, verified },
      inquiries: { total: inquiries, new: newInquiries },
      viewings: { total: viewings, requested: requestedViewings },
    };
  }

  /** Unlike the public list, this sees every status so reviewers can work the queue. */
  async properties(query: AdminPropertyQueryDto) {
    const where: Prisma.PropertyWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.verificationStatus && { verificationStatus: query.verificationStatus }),
      ...(query.ownerId && { ownerId: query.ownerId }),
      ...(query.search && { OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { city: { contains: query.search, mode: "insensitive" } },
        { township: { contains: query.search, mode: "insensitive" } },
      ] }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.property.count({ where }),
      this.prisma.property.findMany({ where, include: propertyInclude, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { data: records.map(p => presentProperty(p, "admin")), meta: pageMeta(query.page, query.limit, total) };
  }

  async decideVerification(adminId: string, propertyId: string, input: VerificationDecisionDto, request?: Request) {
    if (!reviewableStates.includes(input.status)) throw new BadRequestException("Unsupported verification status");
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, verificationStatus: true, owner: { select: { id: true, email: true } } },
    });
    if (!property) throw new NotFoundException("Property not found");
    if (property.verificationStatus === input.status) throw new BadRequestException("Verification status is already set to that value");

    const updated = await this.prisma.property.update({ where: { id: propertyId }, data: { verificationStatus: input.status }, include: propertyInclude });
    await this.audit.record({
      action: AuditAction.PROPERTY_VERIFICATION_CHANGED, actorId: adminId, actorRole: UserRole.ADMIN,
      targetType: "Property", targetId: propertyId,
      metadata: { from: property.verificationStatus, to: input.status, note: input.note ?? null }, request,
    });
    await this.mail.notifyVerificationDecision(property.owner.email, { propertyTitle: property.title, status: input.status, note: input.note });
    return presentProperty(updated);
  }

  async users(query: AdminUserQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.role && { role: query.role }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { OR: [
        { email: { contains: query.search, mode: "insensitive" } },
        { firstName: { contains: query.search, mode: "insensitive" } },
        { lastName: { contains: query.search, mode: "insensitive" } },
      ] }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, select: adminUserSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { data: records, meta: pageMeta(query.page, query.limit, total) };
  }

  async setUserStatus(adminId: string, userId: string, input: AdminUserStatusDto, request?: Request) {
    if (adminId === userId) throw new BadRequestException("You cannot change your own account status");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, isActive: true } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === UserRole.ADMIN) throw new BadRequestException("Administrator accounts must be managed directly in the database");
    if (user.isActive === input.isActive) throw new BadRequestException("Account status is already set to that value");

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: input.isActive
          ? { isActive: true, deactivatedAt: null, lockedUntil: null, failedLoginCount: 0 }
          // Suspension must also invalidate live access tokens, not just the refresh cookie.
          : { isActive: false, deactivatedAt: new Date(), tokenVersion: { increment: 1 } },
      }),
      ...(input.isActive ? [] : [
        this.prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
        this.prisma.property.updateMany({ where: { ownerId: userId, status: PropertyStatus.PUBLISHED }, data: { status: PropertyStatus.PAUSED } }),
      ]),
    ]);
    await this.audit.record({
      action: AuditAction.USER_STATUS_CHANGED, actorId: adminId, actorRole: UserRole.ADMIN,
      targetType: "User", targetId: userId, metadata: { isActive: input.isActive, reason: input.reason ?? null }, request,
    });
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: adminUserSelect });
  }

  async unlockUser(adminId: string, userId: string, request?: Request) {
    const unlocked = await this.prisma.user.updateMany({ where: { id: userId }, data: { lockedUntil: null, failedLoginCount: 0 } });
    if (unlocked.count !== 1) throw new NotFoundException("User not found");
    await this.audit.record({
      action: AuditAction.USER_STATUS_CHANGED, actorId: adminId, actorRole: UserRole.ADMIN,
      targetType: "User", targetId: userId, metadata: { unlocked: true }, request,
    });
    return { success: true };
  }

  async deleteUser(adminId: string, userId: string, request?: Request) {
    if (adminId === userId) throw new BadRequestException("You cannot delete your own account");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === UserRole.ADMIN) throw new BadRequestException("Administrator accounts cannot be deleted here");

    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { senderId: userId } }),
      this.prisma.inquiry.deleteMany({ where: { OR: [{ seekerId: userId }, { listerId: userId }] } }),
      this.prisma.viewing.deleteMany({ where: { OR: [{ seekerId: userId }, { listerId: userId }] } }),
      this.prisma.conversation.deleteMany({ where: { OR: [{ seekerId: userId }, { listerId: userId }] } }),
      this.prisma.message.deleteMany({ where: { conversation: { property: { ownerId: userId } } } }),
      this.prisma.inquiry.deleteMany({ where: { property: { ownerId: userId } } }),
      this.prisma.viewing.deleteMany({ where: { property: { ownerId: userId } } }),
      this.prisma.conversation.deleteMany({ where: { property: { ownerId: userId } } }),
      this.prisma.property.deleteMany({ where: { ownerId: userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    await this.audit.record({
      action: AuditAction.USER_DEACTIVATED, actorId: adminId, actorRole: UserRole.ADMIN,
      targetType: "User", targetId: userId, metadata: { deleted: true }, request,
    });
    return { success: true };
  }

  async verifyUserEmail(adminId: string, userId: string, request?: Request) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, emailVerifiedAt: true } });
    if (!user) throw new NotFoundException("User not found");
    if (user.emailVerifiedAt) throw new BadRequestException("Email is already verified");

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });

    await this.audit.record({
      action: AuditAction.USER_EMAIL_VERIFIED, actorId: adminId, actorRole: UserRole.ADMIN,
      targetType: "User", targetId: userId, metadata: { verifiedManually: true }, request,
    });
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: adminUserSelect });
  }

  async auditLogs(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action && { action: query.action }),
      ...(query.actorId && { actorId: query.actorId }),
      ...(query.targetId && { targetId: query.targetId }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { actor: { select: { id: true, email: true, role: true } } },
      }),
    ]);
    return { data: records, meta: pageMeta(query.page, query.limit, total) };
  }

  async verificationDocuments(query: AdminVerificationDocumentQueryDto) {
    const where: Prisma.VerificationDocumentWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.userId && { userId: query.userId }),
    };
    const [total, records] = await this.prisma.$transaction([
      this.prisma.verificationDocument.count({ where }),
      this.prisma.verificationDocument.findMany({
        where,
        include: { user: { select: adminUserSelect } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
    ]);
    return { data: records, meta: pageMeta(query.page, query.limit, total) };
  }

  async setVerificationDocumentStatus(adminId: string, id: string, input: AdminVerificationDocumentDecisionDto, request?: Request) {
    if (!([VerificationStatus.VERIFIED, VerificationStatus.REJECTED] as VerificationStatus[]).includes(input.status)) {
      throw new BadRequestException("Status must be VERIFIED or REJECTED");
    }
    const doc = await this.prisma.verificationDocument.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.status === input.status) throw new BadRequestException("Status is already set to that value");

    return this.prisma.verificationDocument.update({
      where: { id },
      data: { status: input.status, rejectionNote: input.rejectionNote },
      include: { user: { select: adminUserSelect } }
    });
  }
}
