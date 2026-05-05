import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { SettingsService } from "./settings.service";
import { AppSettings } from "./settings.types";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.getSettings();
  }

  @Patch()
  update(@Body() body: Partial<AppSettings>) {
    return this.settings.updateSettings(body);
  }

  @Post("storage/project-folder")
  createProjectFolder(@Body() body: { projectCode?: string; projectName?: string }) {
    return this.settings.ensureProjectStorageFolder(body);
  }

  @Post("storage/project-file")
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
  uploadProjectFile(@Body() body: { projectCode?: string; projectName?: string }, @UploadedFile() file: Express.Multer.File) {
    return this.settings.storeProjectFile(body, file);
  }

  @Get("storage/project-file/:projectFolder/:fileName")
  serveProjectFile(@Param("projectFolder") projectFolder: string, @Param("fileName") fileName: string, @Res() response: Response) {
    const filePath = this.settings.getProjectFilePath(projectFolder, fileName);
    if (!filePath) throw new NotFoundException("Archivo no encontrado");
    return response.sendFile(filePath);
  }
}
