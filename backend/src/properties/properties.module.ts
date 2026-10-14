import { Module } from "@nestjs/common";
import { UploadsModule } from "../uploads/uploads.module";
import { PropertiesController } from "./properties.controller";
import { PropertiesService } from "./properties.service";

@Module({ imports: [UploadsModule], controllers: [PropertiesController], providers: [PropertiesService], exports: [PropertiesService] })
export class PropertiesModule {}
