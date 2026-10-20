import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { AuthIdentity, CurrentUser, Roles } from "../common/auth";
import { PrismaService } from "../prisma/prisma.service";
import { UploadKind, UserRole, VerificationStatus } from "../generated/prisma/enums";
import { UploadsService } from "../uploads/uploads.service";

export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @IsOptional() @IsString() @MaxLength(30) @Matches(/^[+0-9 ()-]*$/, { message: "Phone may only contain digits and + ( ) - characters" }) phone?: string;
}

export class SubmitVerificationDto {
  @IsString() @MinLength(1) @MaxLength(500) documentUrl!: string;
  @IsString() @MinLength(1) @MaxLength(100) documentAssetId!: string;
  @IsString() @MinLength(1) @MaxLength(50) documentType!: string;
}

const publicUser = { id: true, email: true, firstName: true, lastName: true, address: true, phone: true, role: true, avatarUrl: true, isAgent: true, phoneVerified: true, emailVerifiedAt: true, createdAt: true, updatedAt: true, verificationDocs: { select: { status: true } } } as const;

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly prisma: PrismaService, private readonly uploads: UploadsService) {}

  @Get("me")
  me(@CurrentUser() user: AuthIdentity) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUser });
  }

  @Patch("me")
  update(@CurrentUser() user: AuthIdentity, @Body() body: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.firstName !== undefined && { firstName: body.firstName.trim() }),
        ...(body.lastName !== undefined && { lastName: body.lastName.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() || null }),
      },
      select: publicUser,
    });
  }

  @Post("me/avatar")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  async avatar(@CurrentUser() user: AuthIdentity, @UploadedFile() file?: Express.Multer.File) {
    const asset = await this.uploads.saveImage(user.id, UploadKind.AVATAR, file);
    let previous: { avatarUrl: string | null };
    let updated;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Serialize replacements so each request cleans up the actual previous image.
        await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const old = await tx.user.findUniqueOrThrow({ where: { id: user.id }, select: { avatarUrl: true } });
        await tx.uploadedAsset.update({ where: { id: asset.id }, data: { consumedAt: new Date() } });
        const next = await tx.user.update({ where: { id: user.id }, data: { avatarUrl: asset.url }, select: publicUser });
        return { old, next };
      });
      previous = result.old;
      updated = result.next;
    } catch (error) {
      // Failed attachments remain unconsumed and can also be reclaimed by maintenance.
      await this.uploads.purge(asset.id, asset.storageKey).catch(() => undefined);
      throw error;
    }
    // The replaced avatar is now unreachable, and consumed assets are never swept, so drop it here.
    if (previous.avatarUrl && previous.avatarUrl !== asset.url) {
      await this.uploads.purgeByUrl(user.id, UploadKind.AVATAR, previous.avatarUrl);
    }
    return updated;
  }

  @Post("me/verification-document")
  @Roles(UserRole.LISTER)
  async submitVerificationDocument(@CurrentUser() user: AuthIdentity, @Body() body: SubmitVerificationDto) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize retries for the same owned upload without adding a schema constraint.
      await tx.$queryRaw`SELECT id FROM "UploadedAsset" WHERE id = ${body.documentAssetId} AND "userId" = ${user.id} FOR UPDATE`;
      const asset = await tx.uploadedAsset.findFirst({ where: { id: body.documentAssetId, userId: user.id, kind: UploadKind.IDENTIFICATION } });
      if (!asset || asset.url !== body.documentUrl) throw new BadRequestException("Use an identification document uploaded by this lister");
      const previous = await tx.verificationDocument.findFirst({ where: { userId: user.id, documentUrl: asset.url } });
      if (previous) return previous;
      const document = await tx.verificationDocument.create({ data: {
        userId: user.id, documentUrl: asset.url, documentType: body.documentType, status: VerificationStatus.PENDING,
      } });
      await tx.uploadedAsset.updateMany({ where: { id: asset.id, userId: user.id, kind: UploadKind.IDENTIFICATION }, data: { consumedAt: new Date() } });
      return document;
    });
  }
}
