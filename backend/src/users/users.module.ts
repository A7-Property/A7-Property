import { Module } from "@nestjs/common";
import { UploadsModule } from "../uploads/uploads.module";
import { UsersController } from "./users.controller";

@Module({ imports: [UploadsModule], controllers: [UsersController] })
export class UsersModule {}
