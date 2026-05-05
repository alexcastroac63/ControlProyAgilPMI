import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { BacklogService } from "./backlog.service";

@ApiTags("backlog")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("backlog")
export class BacklogController {
  constructor(private readonly service: BacklogService) {}
  @Get(":projectId") list(@Param("projectId") projectId: string) { return this.service.list(projectId); }
  @Post(":projectId/items") create(@Param("projectId") projectId: string, @Body() body: any) { return this.service.create(projectId, body); }
  @Patch("items/:id") update(@Param("id") id: string, @Body() body: any) { return this.service.update(id, body); }
  @Patch("items/:id/sprint") assignSprint(@Param("id") id: string, @Body() body: { sprintId: string | null }) { return this.service.assignSprint(id, body.sprintId); }
  @Delete("items/:id") remove(@Param("id") id: string) { return this.service.remove(id); }
  @Post(":projectId/reorder") reorder(@Param("projectId") projectId: string, @Body() body: { ids: string[] }) { return this.service.reorder(projectId, body.ids); }
}
