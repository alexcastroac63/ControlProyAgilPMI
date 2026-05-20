import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AssignSprintRequestDto, BacklogItemRequestDto, ReorderRequestDto } from "../../common/swagger/api-docs.dto";
import { BacklogService } from "./backlog.service";

@ApiTags("backlog")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("backlog")
export class BacklogController {
  constructor(private readonly service: BacklogService) {}
  @ApiOperation({ summary: "Listar backlog de un proyecto" })
  @ApiParam({ name: "projectId", example: "demo-proy" })
  @Get(":projectId") list(@Param("projectId") projectId: string) { return this.service.list(projectId); }
  @ApiOperation({ summary: "Crear historia, tarea, bug o item de backlog" })
  @ApiParam({ name: "projectId", example: "demo-proy" })
  @Post(":projectId/items") create(@Param("projectId") projectId: string, @Body() body: BacklogItemRequestDto) { return this.service.create(projectId, body); }
  @ApiOperation({ summary: "Actualizar item de backlog" })
  @ApiBody({ type: BacklogItemRequestDto })
  @Patch("items/:id") update(@Param("id") id: string, @Body() body: Partial<BacklogItemRequestDto>) { return this.service.update(id, body); }
  @ApiOperation({ summary: "Asignar o quitar sprint a una historia" })
  @Patch("items/:id/sprint") assignSprint(@Param("id") id: string, @Body() body: AssignSprintRequestDto) { return this.service.assignSprint(id, body.sprintId); }
  @ApiOperation({ summary: "Eliminar item de backlog" })
  @Delete("items/:id") remove(@Param("id") id: string) { return this.service.remove(id); }
  @ApiOperation({ summary: "Reordenar items del backlog" })
  @Post(":projectId/reorder") reorder(@Param("projectId") projectId: string, @Body() body: ReorderRequestDto) { return this.service.reorder(projectId, body.ids); }
}
