import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";
import { AuthIdentity, CurrentUser, Roles, VerifiedEmail } from "../common/auth";
import { PropertyStatus, UserRole } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { PaginationDto, pageMeta } from "../common/pagination";

export class CreateConversationDto {
  @IsString() @MaxLength(128) propertyId!: string;
}

export class ConversationFromViewingDto {
  @IsString() @MaxLength(128) viewingId!: string;
}

export class CreateMessageDto {
  @IsString() @MinLength(1) @MaxLength(5000) body!: string;
}

export class MessageQueryDto {
  @IsOptional() @IsString() @MaxLength(128) before?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

const conversationInclude = {
  property: { select: { id: true, title: true, city: true, township: true, images: { where: { isPrimary: true }, select: { url: true }, take: 1 } } },
  seeker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  lister: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
} as const;

@ApiTags("Conversations")
@ApiBearerAuth()
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  @Get()
  async list(@CurrentUser() user: AuthIdentity, @Query() query: PaginationDto) {
    const where = user.role === UserRole.SEEKER ? { seekerId: user.id } : { listerId: user.id };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.findMany({
        where,
        include: {
          ...conversationInclude,
          // Inbound unread messages only: a sender never has unread of their own.
          _count: { select: { messages: { where: { isRead: false, senderId: { not: user.id } } } } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    const data = rows.map((row) => ({ ...row, unreadCount: row._count.messages }));
    return { data, meta: pageMeta(query.page, query.limit, total) };
  }

  /** Badge count across every conversation this user takes part in. */
  @Get("unread-count")
  async unreadCount(@CurrentUser() user: AuthIdentity) {
    const count = await this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: user.id },
        conversation: user.role === UserRole.SEEKER ? { seekerId: user.id } : { listerId: user.id },
      },
    });
    return { count };
  }

  @Roles(UserRole.SEEKER)
  @VerifiedEmail()
  @Post()
  async create(@CurrentUser() user: AuthIdentity, @Body() body: CreateConversationDto) {
    const property = await this.prisma.property.findFirst({ where: { id: body.propertyId, status: PropertyStatus.PUBLISHED }, select: { ownerId: true } });
    if (!property) throw new NotFoundException("Property not found");
    if (property.ownerId === user.id) throw new BadRequestException("You cannot start a conversation about your own listing");
    return this.prisma.conversation.upsert({
      where: { propertyId_seekerId_listerId: { propertyId: body.propertyId, seekerId: user.id, listerId: property.ownerId } },
      create: { propertyId: body.propertyId, seekerId: user.id, listerId: property.ownerId },
      update: {},
      include: conversationInclude,
    });
  }

  /**
   * Opens (or reuses) a conversation with the seeker who requested a viewing.
   * Scoped to the viewing's own lister, so a lister can only initiate a thread
   * with someone who already contacted them — never with an arbitrary seeker.
   */
  @Roles(UserRole.LISTER)
  @VerifiedEmail()
  @Post("from-viewing")
  async createFromViewing(@CurrentUser() user: AuthIdentity, @Body() body: ConversationFromViewingDto) {
    const viewing = await this.prisma.viewing.findUnique({ where: { id: body.viewingId }, select: { propertyId: true, seekerId: true, listerId: true } });
    if (!viewing) throw new NotFoundException("Viewing not found");
    if (viewing.listerId !== user.id) throw new ForbiddenException();
    return this.prisma.conversation.upsert({
      where: { propertyId_seekerId_listerId: { propertyId: viewing.propertyId, seekerId: viewing.seekerId, listerId: viewing.listerId } },
      create: { propertyId: viewing.propertyId, seekerId: viewing.seekerId, listerId: viewing.listerId },
      update: {},
      include: conversationInclude,
    });
  }

  @Get(":id")
  async get(@CurrentUser() user: AuthIdentity, @Param("id") id: string) {
    await this.assertParticipant(id, user.id);
    return this.prisma.conversation.findUniqueOrThrow({ where: { id }, include: conversationInclude });
  }

  @Get(":id/messages")
  async messages(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Query() query: MessageQueryDto) {
    await this.assertParticipant(id, user.id);
    if (query.before) {
      const cursor = await this.prisma.message.findUnique({ where: { id: query.before }, select: { conversationId: true } });
      if (cursor?.conversationId !== id) throw new BadRequestException("Invalid message cursor");
    }
    const rows = await this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.before && { cursor: { id: query.before }, skip: 1 }),
    });
    const hasMore = rows.length > query.limit;
    const data = rows.slice(0, query.limit);
    return { data, meta: { nextCursor: hasMore ? data[data.length - 1].id : null } };
  }

  @Post(":id/messages")
  @VerifiedEmail()
  async send(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: CreateMessageDto) {
    const conversation = await this.assertParticipant(id, user.id);
    const message = body.body.trim();
    if (!message) throw new BadRequestException("Message cannot be blank");
    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.message.create({ data: { conversationId: id, senderId: user.id, body: message } });
      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      return row;
    });

    // Notify only when the recipient has nothing else unread, so a back-and-forth does not spam.
    const recipientId = conversation.seekerId === user.id ? conversation.listerId : conversation.seekerId;
    const otherUnread = await this.prisma.message.count({
      where: { conversationId: id, senderId: user.id, isRead: false, id: { not: created.id } },
    });
    if (otherUnread === 0) {
      const [recipient, sender, property] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: recipientId }, select: { email: true } }),
        this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, lastName: true } }),
        this.prisma.property.findUniqueOrThrow({ where: { id: conversation.propertyId }, select: { title: true } }),
      ]);
      if (recipient) {
        await this.mail.notifyNewMessage(recipient.email, {
          propertyTitle: property.title,
          senderName: `${sender.firstName} ${sender.lastName}`.trim(),
        });
      }
    }
    return created;
  }

  /** Marks every inbound message in this conversation read in one call. */
  @Patch(":id/read")
  async markConversationRead(@CurrentUser() user: AuthIdentity, @Param("id") id: string) {
    await this.assertParticipant(id, user.id);
    const result = await this.prisma.message.updateMany({
      where: { conversationId: id, senderId: { not: user.id }, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  private async assertParticipant(id: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id }, select: { id: true, propertyId: true, seekerId: true, listerId: true } });
    if (!conversation) throw new NotFoundException("Conversation not found");
    if (conversation.seekerId !== userId && conversation.listerId !== userId) throw new ForbiddenException();
    return conversation;
  }
}

@ApiTags("Messages")
@ApiBearerAuth()
@Controller("messages")
export class MessagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch(":id/read")
  async markRead(@CurrentUser() user: AuthIdentity, @Param("id") id: string) {
    const message = await this.prisma.message.findUnique({ where: { id }, include: { conversation: { select: { seekerId: true, listerId: true } } } });
    if (!message) throw new NotFoundException("Message not found");
    if (message.senderId === user.id || (message.conversation.seekerId !== user.id && message.conversation.listerId !== user.id)) throw new ForbiddenException();
    return this.prisma.message.update({ where: { id }, data: { isRead: true } });
  }
}
