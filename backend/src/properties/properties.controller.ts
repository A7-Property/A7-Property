import { BadRequestException, Body, Controller, DefaultValuePipe, Delete, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthIdentity, CurrentUser, Public, Roles, VerifiedEmail } from "../common/auth";
import { PropertyStatus, UserRole } from "../generated/prisma/enums";
import { CreatePropertyDto, OwnerPropertyQueryDto, PropertyAvailabilityStatusDto, PropertyQueryDto, UpdatePropertyDto } from "./dto";
import { PropertiesService } from "./properties.service";
import { PrismaService } from "../prisma/prisma.service";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsDateString, ValidateNested } from "class-validator";

class AvailabilitySlotInput {
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}

class SetAvailabilityDto {
  @IsArray() @ArrayMaxSize(200) @ValidateNested({ each: true }) @Type(() => AvailabilitySlotInput)
  slots!: AvailabilitySlotInput[];
}

@ApiTags("Properties")
@Controller("properties")
export class PropertiesController {
  constructor(private readonly properties: PropertiesService, private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  list(@Query() query: PropertyQueryDto) { return this.properties.list(query); }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Get("mine")
  mine(@CurrentUser() user: AuthIdentity, @Query() query: OwnerPropertyQueryDto) { return this.properties.mine(user.id, query); }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Get("mine/overview")
  overview(@CurrentUser() user: AuthIdentity) { return this.properties.ownerOverview(user.id); }

  @Public()
  @Get(":id")
  get(@Param("id") id: string) { return this.properties.get(id); }

  @Public()
  @Get(":id/similar")
  similar(@Param("id") id: string, @Query("limit", new DefaultValuePipe(6), ParseIntPipe) limit: number) {
    return this.properties.similar(id, Math.min(Math.max(limit, 1), 20));
  }

  @Public()
  @Get(":id/availability")
  availability(@Param("id") id: string) {
    return this.prisma.availabilitySlot.findMany({ where: { propertyId: id, startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, take: 200 });
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Put(":id/availability")
  async setAvailability(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: SetAvailabilityDto) {
    const property = await this.prisma.property.findUnique({ where: { id }, select: { ownerId: true } });
    if (!property) throw new BadRequestException("Property not found");
    if (property.ownerId !== user.id) throw new ForbiddenException("This property belongs to another lister");
    const now = Date.now();
    const slots = body.slots.map((slot) => ({ startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) }));
    if (slots.some((slot) => slot.startsAt.getTime() <= now || slot.endsAt <= slot.startsAt || slot.endsAt.getTime() - slot.startsAt.getTime() > 8 * 60 * 60 * 1000)) {
      throw new BadRequestException("Availability slots must be future windows of eight hours or less");
    }
    slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    if (slots.some((slot, index) => index > 0 && slot.startsAt < slots[index - 1].endsAt)) throw new BadRequestException("Availability slots cannot overlap");
    return this.prisma.$transaction(async (tx) => {
      await tx.availabilitySlot.deleteMany({ where: { propertyId: id, startsAt: { gt: new Date() } } });
      if (slots.length) await tx.availabilitySlot.createMany({ data: slots.map((slot) => ({ propertyId: id, ...slot })) });
      return tx.availabilitySlot.findMany({ where: { propertyId: id, startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } });
    });
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Post()
  create(@CurrentUser() user: AuthIdentity, @Body() body: CreatePropertyDto, @Req() request: Request) {
    return this.properties.create(user.id, body, request);
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Patch(":id")
  update(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: UpdatePropertyDto, @Req() request: Request) {
    return this.properties.update(user.id, id, body, request);
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Delete(":id")
  archive(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.properties.archive(user.id, id, request);
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @VerifiedEmail()
  @Post(":id/publish")
  publish(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.properties.changeStatus(user.id, id, PropertyStatus.PUBLISHED, request);
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Post(":id/pause")
  pause(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.properties.changeStatus(user.id, id, PropertyStatus.PAUSED, request);
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Post(":id/confirm-availability")
  confirmAvailability(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.properties.confirmAvailability(user.id, id, request);
  }

  @ApiBearerAuth()
  @Roles(UserRole.LISTER)
  @Patch(":id/availability-status")
  availabilityStatus(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: PropertyAvailabilityStatusDto, @Req() request: Request) {
    return this.properties.markUnavailable(user.id, id, body.status, request);
  }
}
