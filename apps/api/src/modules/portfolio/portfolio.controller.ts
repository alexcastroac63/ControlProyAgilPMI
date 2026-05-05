import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PortfolioService } from "./portfolio.service";

@ApiTags("portfolio")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}
  @Get() list(@CurrentUser() user: any) { return this.service.list(user.organizationId); }
  @Post() create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(user.organizationId, body); }
  @Get(":id") get(@CurrentUser() user: any, @Param("id") id: string) { return this.service.get(user.organizationId, id); }
  @Patch(":id") update(@Param("id") id: string, @Body() body: any) { return this.service.update(id, body); }
}
