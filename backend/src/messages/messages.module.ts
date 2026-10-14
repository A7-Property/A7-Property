import { Module } from "@nestjs/common";
import { ConversationsController, MessagesController } from "./messages.controller";

@Module({ controllers: [ConversationsController, MessagesController] })
export class MessagesModule {}
