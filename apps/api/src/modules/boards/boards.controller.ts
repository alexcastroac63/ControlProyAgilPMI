import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { BoardItemRequestDto, BoardMoveRequestDto } from "../../common/swagger/api-docs.dto";
import { BoardsService } from "./boards.service";

@ApiTags("boards")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("boards")
export class BoardsController {
  constructor(private readonly service: BoardsService) {}
  @ApiOperation({ summary: "Obtener Scrum Board por proyecto" })
  @ApiParam({ name: "projectId", example: "demo-proy" })
  @Get(":projectId") get(@Param("projectId") projectId: string) { return this.service.get(projectId); }
  @ApiOperation({ summary: "Crear tarjeta en Scrum Board" })
  @Post(":projectId") create(@Param("projectId") projectId: string, @Body() body: BoardItemRequestDto) { return this.service.create(projectId, body); }
  @ApiOperation({ summary: "Mover tarjeta entre estados o sprints" })
  @Patch("items/:id/move") move(@Param("id") id: string, @Body() body: BoardMoveRequestDto) { return this.service.move(id, body); }
}
