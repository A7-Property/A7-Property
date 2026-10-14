import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthIdentity, CurrentUser, Public, Roles, VerifiedEmail } from "../common/auth";
import { PropertyStatus, UserRole } from "../generated/prisma/enums";
import { CreatePropertyDto, OwnerPropertyQueryDto, PropertyQueryDto, UpdatePropertyDto } from "./dto";
import { PropertiesService } from "./properties.service";

@ApiTags("Properties")
@Controller("properties")
export class PropertiesController {
  constructor(private readonly properties: PropertiesService) {}

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
}
