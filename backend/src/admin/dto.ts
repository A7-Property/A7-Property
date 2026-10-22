import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AuditAction, PropertyReportStatus, PropertyStatus, UserRole, VerificationStatus } from "../generated/prisma/enums";

export class AdminPropertyQueryDto {
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
  @IsOptional() @IsEnum(VerificationStatus) verificationStatus?: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsString() @MaxLength(128) ownerId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

/** Reviewers may only move a listing between review states; they never edit listing content. */
export class VerificationDecisionDto {
  @IsEnum(VerificationStatus) status!: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class AdminUserQueryDto {
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class AdminUserStatusDto {
  @Type(() => Boolean) @IsBoolean() isActive!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class AuditLogQueryDto {
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
  @IsOptional() @IsString() @MaxLength(128) actorId?: string;
  @IsOptional() @IsString() @MaxLength(128) targetId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 50;
}

export class AdminVerificationDocumentQueryDto {
  @IsOptional() @IsEnum(VerificationStatus) status?: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(128) userId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class AdminVerificationDocumentDecisionDto {
  @IsEnum(VerificationStatus) status!: VerificationStatus;
  @IsOptional() @IsString() @MaxLength(1000) rejectionNote?: string;
}

export class AdminPropertyReportQueryDto {
  @IsOptional() @IsEnum(PropertyReportStatus) status?: PropertyReportStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}

export class AdminPropertyReportDecisionDto {
  @IsEnum(PropertyReportStatus) status!: PropertyReportStatus;
  @IsOptional() @IsString() @MaxLength(1000) resolutionNote?: string;
}
