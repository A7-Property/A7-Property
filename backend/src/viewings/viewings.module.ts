import { Module } from "@nestjs/common";
import { ViewingsController } from "./viewings.controller";

@Module({ controllers: [ViewingsController] })
export class ViewingsModule {}
