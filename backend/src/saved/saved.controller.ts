import { Controller, Delete, Get, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthIdentity, CurrentUser, Roles } from "../common/auth";
import { PropertyStatus, UserRole } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { presentProperty, propertyInclude } from "../properties/properties.service";
import { PaginationDto, pageMeta } from "../common/pagination";

const maxSavedPerUser = 500;

@ApiTags("Saved properties")
@ApiBearerAuth()
@Roles(UserRole.SEEKER)
@Controller("saved-properties")
export class SavedController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthIdentity, @Query() query: PaginationDto) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.savedProperty.count({ where: { userId: user.id } }),
      this.prisma.savedProperty.findMany({
        where: { userId: user.id },
        include: { property: { include: propertyInclude } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return { data: rows.map((row) => ({ id: row.id, createdAt: row.createdAt, property: presentProperty(row.property) })), meta: pageMeta(query.page, query.limit, total) };
  }

  /** Just the ids, so a client can render save state across a results grid in one request. */
  @Get("ids")
  async ids(@CurrentUser() user: AuthIdentity) {
    const rows = await this.prisma.savedProperty.findMany({ where: { userId: user.id }, select: { propertyId: true }, take: maxSavedPerUser });
    return rows.map((row) => row.propertyId);
  }

  @Post(":propertyId")
  async save(@CurrentUser() user: AuthIdentity, @Param("propertyId") propertyId: string) {
    const property = await this.prisma.property.findFirst({ where: { id: propertyId, status: PropertyStatus.PUBLISHED }, select: { id: true } });
    if (!property) throw new NotFoundException("Property not found");
    return this.prisma.savedProperty.upsert({ where: { userId_propertyId: { userId: user.id, propertyId } }, create: { userId: user.id, propertyId }, update: {} });
  }

  @Delete(":propertyId")
  async remove(@CurrentUser() user: AuthIdentity, @Param("propertyId") propertyId: string) {
    await this.prisma.savedProperty.deleteMany({ where: { userId: user.id, propertyId } });
    return { success: true };
  }
}
