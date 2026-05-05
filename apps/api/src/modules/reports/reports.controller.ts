import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  @Get("export")
  @Header("Content-Type", "text/csv")
  export(@Query("type") type = "csv") {
    if (type !== "csv") return "format,status\npdf-and-excel,queued\n";
    return "metric,value\nactive_projects,12\nvelocity,48\nbugs_open,7\n";
  }
}
