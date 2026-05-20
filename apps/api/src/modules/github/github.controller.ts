import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GithubConnectionRequestDto, GithubWebhookRequestDto } from "../../common/swagger/api-docs.dto";
import { GithubService } from "./github.service";

@ApiTags("github")
@Controller("github")
export class GithubController {
  constructor(private readonly service: GithubService) {}
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Conectar repositorio GitHub a un proyecto" })
  @Post("connections")
  connect(@CurrentUser() user: any, @Body() body: GithubConnectionRequestDto) { return this.service.connect(user.organizationId, body); }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Consultar ramas, commits, PRs, pipelines y releases" })
  @Get("connections/:id/repository")
  repository(@Param("id") id: string) { return this.service.repository(id); }
  @ApiOperation({ summary: "Recibir eventos webhook de GitHub" })
  @Post("webhook")
  webhook(@Body() body: GithubWebhookRequestDto) { return this.service.handleWebhook(body); }
}
