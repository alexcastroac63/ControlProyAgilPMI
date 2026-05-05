import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { SprintsService } from "./sprints.service";

@ApiTags("sprints")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sprints")
export class SprintsController {
  constructor(private readonly service: SprintsService) {}
  @Get(":projectId") list(@Param("projectId") projectId: string) { return this.service.list(projectId); }
  @Post(":projectId") create(@Param("projectId") projectId: string, @Body() body: any) { return this.service.create(projectId, body); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.service.update(id, body); }
  @Patch(":id/start") start(@Param("id") id: string) { return this.service.start(id); }
  @Patch(":id/close") close(@Param("id") id: string) { return this.service.close(id); }
  @Delete(":id") remove(@Param("id") id: string) { return this.service.remove(id); }
}
