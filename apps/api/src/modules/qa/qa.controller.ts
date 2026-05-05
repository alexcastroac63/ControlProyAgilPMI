import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { QaService } from "./qa.service";

@ApiTags("qa")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("qa")
export class QaController {
  constructor(private readonly service: QaService) {}
  @Get(":projectId/suites") suites(@Param("projectId") projectId: string) { return this.service.suites(projectId); }
  @Post(":projectId/suites") createSuite(@Param("projectId") projectId: string, @Body() body: any) { return this.service.createSuite(projectId, body); }
  @Post("suites/:suiteId/cases") createCase(@Param("suiteId") suiteId: string, @Body() body: any) { return this.service.createCase(suiteId, body); }
  @Post("cases/:caseId/runs") run(@Param("caseId") testCaseId: string, @Body() body: any) { return this.service.run(testCaseId, body); }
  @Get(":projectId/traceability") traceability(@Param("projectId") projectId: string) { return this.service.traceability(projectId); }
}
