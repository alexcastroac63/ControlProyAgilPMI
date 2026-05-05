import { Module } from "@nestjs/common";
import { BoardsController } from "./boards.controller";
import { BoardsGateway } from "./boards.gateway";
import { BoardsService } from "./boards.service";

@Module({ controllers: [BoardsController], providers: [BoardsService, BoardsGateway] })
export class BoardsModule {}
