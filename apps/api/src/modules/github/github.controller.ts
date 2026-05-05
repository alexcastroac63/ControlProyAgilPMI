import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GithubService } from "./github.service";

@ApiTags("github")
@Controller("github")
export class GithubController {
  constructor(private readonly service: GithubService) {}
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("connections")
  connect(@CurrentUser() user: any, @Body() body: any) { return this.service.connect(user.organizationId, body); }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("connections/:id/repository")
  repository(@Param("id") id: string) { return this.service.repository(id); }
  @Post("webhook")
  webhook(@Body() body: any) { return this.service.handleWebhook(body); }
}
