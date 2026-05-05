import { Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Get() list(@CurrentUser() user: any) { return this.service.list(user.organizationId); }
  @Post() create(@CurrentUser() user: any, @Body() body: any) { return this.service.create(user.organizationId, body); }
  @Get(":id") get(@CurrentUser() user: any, @Param("id") id: string) { return this.service.get(user.organizationId, id); }
  @Patch(":id") update(@CurrentUser() user: any, @Param("id") id: string, @Body() body: any) { return this.service.update(user.organizationId, id, body); }
  @Post(":id/attachments")
  @UseInterceptors(FileInterceptor("file", {
    dest: "storage/tmp",
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      const allowed = [
        "application/pdf",
        "application/json",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/webp"
      ];
      callback(null, allowed.includes(file.mimetype));
    }
  }))
  upload(@CurrentUser() user: any, @Param("id") id: string, @UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    return this.service.attachFile(user.organizationId, id, file, req.cookies?.microsoftAccessToken);
  }
}
