import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthIdentity, CurrentUser, Roles, VerifiedEmail } from "../common/auth";
import { UserRole } from "../generated/prisma/enums";
import { CreatePropertyReportDto } from "./dto";
import { ReportsService } from "./reports.service";

@ApiTags("Property reports")
@ApiBearerAuth()
@Roles(UserRole.SEEKER, UserRole.LISTER)
@VerifiedEmail()
@Controller("properties/:propertyId/reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@CurrentUser() user: AuthIdentity, @Param("propertyId") propertyId: string, @Body() body: CreatePropertyReportDto, @Req() request: Request) {
    return this.reports.create(user, propertyId, body, request);
  }
}
