import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { AuthIdentity, CurrentUser, Roles, VerifiedEmail } from "../common/auth";
import { InquiryStatus, PropertyStatus, UserRole } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { PaginationDto, pageMeta } from "../common/pagination";

export class CreateInquiryDto {
  @IsString() @MaxLength(128) propertyId!: string;
  @IsString() @MinLength(1) @MaxLength(200) subject!: string;
  @IsString() @MinLength(1) @MaxLength(5000) message!: string;
}

export class InquiryStatusDto {
  @IsEnum(InquiryStatus) status!: InquiryStatus;
}

const inquiryInclude = {
  property: { select: { id: true, title: true, city: true, township: true, images: { where: { isPrimary: true }, select: { url: true }, take: 1 } } },
  seeker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  lister: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

@ApiTags("Inquiries")
@ApiBearerAuth()
@Controller("inquiries")
export class InquiriesController {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  @Roles(UserRole.SEEKER)
  @VerifiedEmail()
  @Post()
  async create(@CurrentUser() user: AuthIdentity, @Body() body: CreateInquiryDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: body.propertyId, status: PropertyStatus.PUBLISHED },
      select: { ownerId: true, title: true, owner: { select: { email: true } } },
    });
    if (!property) throw new NotFoundException("Property not found");
    const seeker = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, lastName: true } });
    const inquiry = await this.prisma.inquiry.create({
      data: { seekerId: user.id, listerId: property.ownerId, propertyId: body.propertyId, subject: body.subject.trim(), message: body.message.trim() },
      include: inquiryInclude,
    });
    await this.mail.notifyNewInquiry(property.owner.email, {
      propertyTitle: property.title,
      subject: inquiry.subject,
      seekerName: `${seeker.firstName} ${seeker.lastName}`.trim(),
    });
    return inquiry;
  }

  @Get()
  async list(@CurrentUser() user: AuthIdentity, @Query() query: PaginationDto) {
    const where = user.role === UserRole.SEEKER ? { seekerId: user.id } : { listerId: user.id };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.inquiry.count({ where }),
      this.prisma.inquiry.findMany({ where, include: inquiryInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { data: rows, meta: pageMeta(query.page, query.limit, total) };
  }

  /** Lister-facing badge count for the CRM. */
  @Roles(UserRole.LISTER)
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthIdentity) {
    const count = await this.prisma.inquiry.count({ where: { listerId: user.id, status: InquiryStatus.NEW } });
    return { count };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthIdentity, @Param("id") id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id }, include: inquiryInclude });
    if (!inquiry) throw new NotFoundException("Inquiry not found");
    if (inquiry.seekerId !== user.id && inquiry.listerId !== user.id) throw new ForbiddenException();
    return inquiry;
  }

  @Roles(UserRole.LISTER)
  @Patch(":id/status")
  async status(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: InquiryStatusDto) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id }, select: { listerId: true } });
    if (!inquiry) throw new NotFoundException("Inquiry not found");
    if (inquiry.listerId !== user.id) throw new ForbiddenException();
    return this.prisma.inquiry.update({ where: { id }, data: { status: body.status }, include: inquiryInclude });
  }
}
