import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { QaCaseRequestDto, QaRunRequestDto, QaSuiteRequestDto } from "../../common/swagger/api-docs.dto";
import { QaService } from "./qa.service";

@ApiTags("qa")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("qa")
export class QaController {
  constructor(private readonly service: QaService) {}
  @ApiOperation({ summary: "Listar suites de prueba por proyecto" })
  @Get(":projectId/suites") suites(@Param("projectId") projectId: string) { return this.service.suites(projectId); }
  @ApiOperation({ summary: "Crear suite de pruebas" })
  @Post(":projectId/suites") createSuite(@Param("projectId") projectId: string, @Body() body: QaSuiteRequestDto) { return this.service.createSuite(projectId, body); }
  @ApiOperation({ summary: "Crear caso de prueba" })
  @Post("suites/:suiteId/cases") createCase(@Param("suiteId") suiteId: string, @Body() body: QaCaseRequestDto) { return this.service.createCase(suiteId, body); }
  @ApiOperation({ summary: "Registrar ejecucion de caso de prueba" })
  @Post("cases/:caseId/runs") run(@Param("caseId") testCaseId: string, @Body() body: QaRunRequestDto) { return this.service.run(testCaseId, body); }
  @ApiOperation({ summary: "Obtener matriz de trazabilidad QA por proyecto" })
  @Get(":projectId/traceability") traceability(@Param("projectId") projectId: string) { return this.service.traceability(projectId); }
}
