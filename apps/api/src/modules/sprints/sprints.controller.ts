import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { SprintRequestDto } from "../../common/swagger/api-docs.dto";
import { SprintsService } from "./sprints.service";

@ApiTags("sprints")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sprints")
export class SprintsController {
  constructor(private readonly service: SprintsService) {}
  @ApiOperation({ summary: "Listar sprints por proyecto" })
  @Get(":projectId") list(@Param("projectId") projectId: string) { return this.service.list(projectId); }
  @ApiOperation({ summary: "Crear sprint" })
  @Post(":projectId") create(@Param("projectId") projectId: string, @Body() body: SprintRequestDto) { return this.service.create(projectId, body); }
  @ApiOperation({ summary: "Actualizar sprint" })
  @ApiBody({ type: SprintRequestDto })
  @Patch(":id") update(@Param("id") id: string, @Body() body: Partial<SprintRequestDto>) { return this.service.update(id, body); }
  @ApiOperation({ summary: "Iniciar sprint" })
  @Patch(":id/start") start(@Param("id") id: string) { return this.service.start(id); }
  @ApiOperation({ summary: "Cerrar sprint" })
  @Patch(":id/close") close(@Param("id") id: string) { return this.service.close(id); }
  @ApiOperation({ summary: "Eliminar sprint vacio" })
  @Delete(":id") remove(@Param("id") id: string) { return this.service.remove(id); }
}
