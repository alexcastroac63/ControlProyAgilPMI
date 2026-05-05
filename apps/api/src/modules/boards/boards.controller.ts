import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { BoardsService } from "./boards.service";

@ApiTags("boards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("boards")
export class BoardsController {
  constructor(private readonly service: BoardsService) {}
  @Get(":projectId") get(@Param("projectId") projectId: string) { return this.service.get(projectId); }
  @Post(":projectId") create(@Param("projectId") projectId: string, @Body() body: any) { return this.service.create(projectId, body); }
  @Patch("items/:id/move") move(@Param("id") id: string, @Body() body: any) { return this.service.move(id, body); }
}
