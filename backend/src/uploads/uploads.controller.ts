import { Controller, Get, Header, Post, Query, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { IsString, MaxLength, MinLength } from "class-validator";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthIdentity, CurrentUser, Roles } from "../common/auth";
import { UploadKind, UserRole } from "../generated/prisma/enums";
import { UploadsService } from "./uploads.service";
import { PropertyImageThrottlerGuard } from "./property-image-throttler.guard";

class DocumentQuery {
  @IsString() @MinLength(1) @MaxLength(500) url!: string;
}

@ApiTags("Uploads")
@ApiBearerAuth()
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Get("document")
  @Header("Cache-Control", "private, no-store")
  async document(@CurrentUser() user: AuthIdentity, @Query() query: DocumentQuery) {
    return new StreamableFile(await this.uploads.document(user.id, user.role, query.url), {
      type: "image/webp", disposition: 'inline; filename="a7-document.webp"',
    });
  }

  @Roles(UserRole.LISTER)
  // Broad IP protection before authentication; the route guard applies the account quota.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @UseGuards(PropertyImageThrottlerGuard)
  @Post("property-image")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  upload(@CurrentUser() user: AuthIdentity, @UploadedFile() file?: Express.Multer.File) {
    return this.uploads.saveImage(user.id, UploadKind.PROPERTY_IMAGE, file);
  }

  @Roles(UserRole.LISTER)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("identification")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  uploadIdentification(@CurrentUser() user: AuthIdentity, @UploadedFile() file?: Express.Multer.File) {
    return this.uploads.saveImage(user.id, UploadKind.IDENTIFICATION, file);
  }

  @Roles(UserRole.LISTER)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("property-document")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 0 } }))
  uploadPropertyDocument(@CurrentUser() user: AuthIdentity, @UploadedFile() file?: Express.Multer.File) {
    return this.uploads.saveImage(user.id, UploadKind.PROPERTY_DOCUMENT, file);
  }
}
