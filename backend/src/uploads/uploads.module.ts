import { Module } from "@nestjs/common";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { PropertyImageThrottlerGuard } from "./property-image-throttler.guard";

@Module({ controllers: [UploadsController], providers: [UploadsService, PropertyImageThrottlerGuard], exports: [UploadsService] })
export class UploadsModule {}
