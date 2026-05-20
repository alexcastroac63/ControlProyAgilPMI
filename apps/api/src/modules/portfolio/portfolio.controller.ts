import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PortfolioRequestDto } from "../../common/swagger/api-docs.dto";
import { PortfolioService } from "./portfolio.service";

@ApiTags("portfolio")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}
  @ApiOperation({ summary: "Listar portafolios de la organizacion" })
  @Get() list(@CurrentUser() user: any) { return this.service.list(user.organizationId); }
  @ApiOperation({ summary: "Crear portafolio estrategico" })
  @Post() create(@CurrentUser() user: any, @Body() body: PortfolioRequestDto) { return this.service.create(user.organizationId, body); }
  @ApiOperation({ summary: "Obtener portafolio por id" })
  @Get(":id") get(@CurrentUser() user: any, @Param("id") id: string) { return this.service.get(user.organizationId, id); }
  @ApiOperation({ summary: "Actualizar portafolio" })
  @ApiBody({ type: PortfolioRequestDto })
  @Patch(":id") update(@Param("id") id: string, @Body() body: Partial<PortfolioRequestDto>) { return this.service.update(id, body); }
}
