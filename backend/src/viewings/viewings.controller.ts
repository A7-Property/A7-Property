import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { AuthIdentity, CurrentUser, Roles, VerifiedEmail } from "../common/auth";
import { PropertyStatus, UserRole, ViewingStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { PaginationDto, pageMeta } from "../common/pagination";

export class CreateViewingDto {
  @IsString() @MaxLength(128) propertyId!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

export class ViewingStatusDto {
  @IsEnum(ViewingStatus) status!: ViewingStatus;
}

export class RescheduleViewingDto {
  @IsDateString() scheduledAt!: string;
}

const viewingInclude = {
  property: { select: { id: true, title: true, city: true, township: true, address: true, images: { where: { isPrimary: true }, select: { url: true }, take: 1 } } },
  seeker: { select: { id: true, firstName: true, lastName: true, phone: true } },
  lister: { select: { id: true, firstName: true, lastName: true, phone: true } },
} as const;

/** A seeker may only cancel; a lister confirms, declines, or completes. */
const allowedTransitions: Record<UserRole, Partial<Record<ViewingStatus, ViewingStatus[]>>> = {
  [UserRole.SEEKER]: {
    [ViewingStatus.REQUESTED]: [ViewingStatus.CANCELLED],
    [ViewingStatus.CONFIRMED]: [ViewingStatus.CANCELLED],
  },
  [UserRole.LISTER]: {
    [ViewingStatus.REQUESTED]: [ViewingStatus.CONFIRMED, ViewingStatus.DECLINED],
    [ViewingStatus.CONFIRMED]: [ViewingStatus.COMPLETED, ViewingStatus.CANCELLED],
  },
  [UserRole.ADMIN]: {},
};

const maxDaysAhead = 180;

@ApiTags("Viewings")
@ApiBearerAuth()
@Controller("viewings")
export class ViewingsController {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  @Roles(UserRole.SEEKER)
  @VerifiedEmail()
  @Post()
  async create(@CurrentUser() user: AuthIdentity, @Body() body: CreateViewingDto) {
    const property = await this.prisma.property.findFirst({
      where: { id: body.propertyId, status: PropertyStatus.PUBLISHED },
      select: { ownerId: true, title: true, owner: { select: { email: true } } },
    });
    if (!property) throw new NotFoundException("Property not found");
    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException("Viewing date is invalid");
    if (scheduledAt <= new Date()) throw new BadRequestException("Viewing date must be in the future");
    if (scheduledAt.getTime() > Date.now() + maxDaysAhead * 86_400_000) throw new BadRequestException(`Viewing date must be within ${maxDaysAhead} days`);

    const publishedSlots = await this.prisma.availabilitySlot.count({ where: { propertyId: body.propertyId, startsAt: { gt: new Date() } } });
    if (publishedSlots > 0) {
      const offered = await this.prisma.availabilitySlot.findFirst({ where: { propertyId: body.propertyId, startsAt: { lte: scheduledAt }, endsAt: { gt: scheduledAt } } });
      if (!offered) throw new ConflictException("That time is not available for this property");
    }
    const conflict = await this.prisma.viewing.findFirst({
      where: { listerId: property.ownerId, scheduledAt, status: { in: [ViewingStatus.REQUESTED, ViewingStatus.CONFIRMED] } }, select: { id: true },
    });
    if (conflict) throw new ConflictException("That viewing time has already been requested");

    // One open request per seeker and property keeps a lister's queue usable.
    const existing = await this.prisma.viewing.findFirst({
      where: { propertyId: body.propertyId, seekerId: user.id, status: { in: [ViewingStatus.REQUESTED, ViewingStatus.CONFIRMED] } },
      select: { id: true },
    });
    if (existing) throw new ConflictException("You already have an open viewing request for this home");

    const seeker = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, lastName: true } });
    const viewing = await this.prisma.viewing.create({
      data: { propertyId: body.propertyId, seekerId: user.id, listerId: property.ownerId, scheduledAt, note: body.note?.trim() },
      include: viewingInclude,
    });
    await this.mail.notifyViewingRequested(property.owner.email, {
      propertyTitle: property.title,
      scheduledAt,
      seekerName: `${seeker.firstName} ${seeker.lastName}`.trim(),
    });
    return viewing;
  }

  @Get()
  async list(@CurrentUser() user: AuthIdentity, @Query() query: PaginationDto) {
    const where = user.role === UserRole.SEEKER ? { seekerId: user.id } : { listerId: user.id };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.viewing.count({ where }),
      this.prisma.viewing.findMany({ where, include: viewingInclude, orderBy: [{ scheduledAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    return { data: rows, meta: pageMeta(query.page, query.limit, total) };
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthIdentity, @Param("id") id: string) {
    const viewing = await this.prisma.viewing.findUnique({ where: { id }, include: viewingInclude });
    if (!viewing) throw new NotFoundException("Viewing not found");
    if (viewing.seekerId !== user.id && viewing.listerId !== user.id) throw new ForbiddenException();
    return viewing;
  }

  @Patch(":id/status")
  async status(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: ViewingStatusDto) {
    const viewing = await this.get(user, id);
    const permitted = allowedTransitions[user.role][viewing.status] ?? [];
    if (!permitted.includes(body.status)) throw new ForbiddenException("Invalid viewing transition");

    // Guarding on the status we read turns a concurrent double-click into a 409 rather than a lost update.
    const changed = await this.prisma.viewing.updateMany({ where: { id, status: viewing.status }, data: { status: body.status } });
    if (changed.count !== 1) throw new ConflictException("Viewing status changed; refresh and try again");

    const updated = await this.prisma.viewing.findUniqueOrThrow({ where: { id }, include: viewingInclude });
    // Tell the other party, not the actor.
    const recipient = user.role === UserRole.SEEKER ? updated.lister.id : updated.seeker.id;
    const contact = await this.prisma.user.findUnique({ where: { id: recipient }, select: { email: true } });
    if (contact) {
      await this.mail.notifyViewingStatus(contact.email, {
        propertyTitle: updated.property.title,
        status: body.status,
        scheduledAt: updated.scheduledAt,
      });
    }
    return updated;
  }


  @Roles(UserRole.SEEKER)
  @Patch(":id/reschedule")
  async reschedule(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: RescheduleViewingDto) {
    const viewing = await this.get(user, id);
    if (viewing.status !== ViewingStatus.REQUESTED && viewing.status !== ViewingStatus.CONFIRMED) throw new ForbiddenException("This viewing cannot be rescheduled");
    const scheduledAt = new Date(body.scheduledAt);
    if (scheduledAt <= new Date() || scheduledAt.getTime() > Date.now() + maxDaysAhead * 86_400_000) throw new BadRequestException("Viewing date is outside the allowed range");
    const slots = await this.prisma.availabilitySlot.count({ where: { propertyId: viewing.propertyId, startsAt: { gt: new Date() } } });
    if (slots && !await this.prisma.availabilitySlot.findFirst({ where: { propertyId: viewing.propertyId, startsAt: { lte: scheduledAt }, endsAt: { gt: scheduledAt } } })) throw new ConflictException("That time is not available for this property");
    if (await this.prisma.viewing.findFirst({ where: { id: { not: id }, listerId: viewing.listerId, scheduledAt, status: { in: [ViewingStatus.REQUESTED, ViewingStatus.CONFIRMED] } } })) throw new ConflictException("That viewing time has already been requested");
    return this.prisma.viewing.update({ where: { id }, data: { scheduledAt, status: ViewingStatus.REQUESTED }, include: viewingInclude });
  }
}
