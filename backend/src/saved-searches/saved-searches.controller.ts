import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { AuthIdentity, CurrentUser, Roles } from "../common/auth";
import { UserRole } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

class CreateSavedSearchDto {
  @IsString() @MinLength(1) @MaxLength(120) title!: string;
  @IsOptional() @IsString() @MaxLength(240) detail = "";
  @IsString() @MaxLength(1000) href!: string;
  @IsObject() filters!: Record<string, unknown>;
  @IsOptional() @IsBoolean() notificationsEnabled = false;
}

class UpdateSavedSearchDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(240) detail?: string;
  @IsOptional() @IsBoolean() notificationsEnabled?: boolean;
}

const maxSavedSearches = 12;

@ApiTags("Saved searches")
@ApiBearerAuth()
@Roles(UserRole.SEEKER)
@Controller("saved-searches")
export class SavedSearchesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthIdentity) {
    return this.prisma.savedSearch.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  }

  @Post()
  async create(@CurrentUser() user: AuthIdentity, @Body() body: CreateSavedSearchDto) {
    if (!body.href.startsWith("/search?")) throw new BadRequestException("Saved search URL is invalid");
    const existing = await this.prisma.savedSearch.findUnique({ where: { userId_href: { userId: user.id, href: body.href } } });
    if (!existing && await this.prisma.savedSearch.count({ where: { userId: user.id } }) >= maxSavedSearches) {
      throw new BadRequestException(`You can save up to ${maxSavedSearches} searches`);
    }
    return this.prisma.savedSearch.upsert({
      where: { userId_href: { userId: user.id, href: body.href } },
      create: { userId: user.id, title: body.title.trim(), detail: body.detail.trim(), href: body.href, filters: body.filters as Prisma.InputJsonValue, notificationsEnabled: body.notificationsEnabled },
      update: { title: body.title.trim(), detail: body.detail.trim(), filters: body.filters as Prisma.InputJsonValue, notificationsEnabled: body.notificationsEnabled },
    });
  }

  @Patch(":id")
  async update(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: UpdateSavedSearchDto) {
    const changed = await this.prisma.savedSearch.updateMany({ where: { id, userId: user.id }, data: body });
    if (changed.count !== 1) throw new BadRequestException("Saved search not found");
    return this.prisma.savedSearch.findUniqueOrThrow({ where: { id } });
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthIdentity, @Param("id") id: string) {
    await this.prisma.savedSearch.deleteMany({ where: { id, userId: user.id } });
    return { success: true };
  }
}
