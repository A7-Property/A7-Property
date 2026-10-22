import { Module } from "@nestjs/common";
import { SavedSearchesController } from "./saved-searches.controller";

@Module({ controllers: [SavedSearchesController] })
export class SavedSearchesModule {}
