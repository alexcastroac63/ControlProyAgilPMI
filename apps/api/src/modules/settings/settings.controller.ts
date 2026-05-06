import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { ProjectFolderRequestDto, SettingsRequestDto } from "../../common/swagger/api-docs.dto";
import { SettingsService } from "./settings.service";
import { AppSettings } from "./settings.types";

@ApiTags("settings")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @ApiOperation({ summary: "Obtener configuracion general de la aplicacion" })
  @Get()
  get() {
    return this.settings.getSettings();
  }

  @ApiOperation({ summary: "Actualizar configuracion general, almacenamiento, correo, Microsoft o GitHub" })
  @ApiBody({ type: SettingsRequestDto })
  @Patch()
  update(@Body() body: Partial<AppSettings>) {
    return this.settings.updateSettings(body);
  }

  @ApiOperation({ summary: "Crear carpeta de almacenamiento para un proyecto" })
  @Post("storage/project-folder")
  createProjectFolder(@Body() body: ProjectFolderRequestDto) {
    return this.settings.ensureProjectStorageFolder(body);
  }

  @ApiOperation({ summary: "Guardar archivo fisico en la carpeta configurada del proyecto" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        projectCode: { type: "string", example: "PROY" },
        projectName: { type: "string", example: "DevOps Hub Core" },
        file: { type: "string", format: "binary" }
      },
      required: ["projectCode", "file"]
    }
  })
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
  uploadProjectFile(@Body() body: ProjectFolderRequestDto, @UploadedFile() file: Express.Multer.File) {
    return this.settings.storeProjectFile(body, file);
  }

  @ApiOperation({ summary: "Descargar o visualizar archivo almacenado de un proyecto" })
  @Get("storage/project-file/:projectFolder/:fileName")
  serveProjectFile(@Param("projectFolder") projectFolder: string, @Param("fileName") fileName: string, @Res() response: Response) {
    const filePath = this.settings.getProjectFilePath(projectFolder, fileName);
    if (!filePath) throw new NotFoundException("Archivo no encontrado");
    return response.sendFile(filePath);
  }
}
