import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthIdentity, CurrentUser, Roles, VerifiedEmail } from "../common/auth";
import { UserRole } from "../generated/prisma/enums";
import { AdminService } from "./admin.service";
import { AdminPropertyQueryDto, AdminUserQueryDto, AdminUserStatusDto, AdminVerificationDocumentQueryDto, AdminVerificationDocumentDecisionDto, AuditLogQueryDto, VerificationDecisionDto } from "./dto";

/**
 * Moderation surface. `ADMIN` cannot be self-assigned at registration, so these
 * routes are reachable only by an account promoted out of band (seed/bootstrap).
 */
@ApiTags("Admin")
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@VerifiedEmail()
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("overview")
  overview() { return this.admin.overview(); }

  @Get("properties")
  properties(@Query() query: AdminPropertyQueryDto) { return this.admin.properties(query); }

  @Patch("properties/:id/verification")
  decide(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: VerificationDecisionDto, @Req() request: Request) {
    return this.admin.decideVerification(user.id, id, body, request);
  }

  @Get("users")
  users(@Query() query: AdminUserQueryDto) { return this.admin.users(query); }

  @Patch("users/:id/status")
  setStatus(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: AdminUserStatusDto, @Req() request: Request) {
    return this.admin.setUserStatus(user.id, id, body, request);
  }

  @Post("users/:id/unlock")
  unlock(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.admin.unlockUser(user.id, id, request);
  }

  @Post("users/:id/verify-email")
  verifyEmail(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.admin.verifyUserEmail(user.id, id, request);
  }

  @Post("users/:id/delete")
  deleteUser(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Req() request: Request) {
    return this.admin.deleteUser(user.id, id, request);
  }

  @Get("audit-logs")
  auditLogs(@Query() query: AuditLogQueryDto) { return this.admin.auditLogs(query); }

  @Get("verification-documents")
  verificationDocuments(@Query() query: AdminVerificationDocumentQueryDto) {
    return this.admin.verificationDocuments(query);
  }

  @Patch("verification-documents/:id/status")
  setVerificationDocumentStatus(@CurrentUser() user: AuthIdentity, @Param("id") id: string, @Body() body: AdminVerificationDocumentDecisionDto, @Req() request: Request) {
    return this.admin.setVerificationDocumentStatus(user.id, id, body, request);
  }
}
