import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { mkdirSync, readFileSync, renameSync, unlinkSync } from "fs";
import axios from "axios";
import { join } from "path";
import { isDatabaseUnavailable } from "../../common/prisma/prisma-errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: SettingsService) {}

  async list(organizationId: string) {
    try {
      return await this.prisma.project.findMany({ where: { organizationId }, include: { team: true, portfolio: true, risks: true, attachments: true }, orderBy: { createdAt: "desc" } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return demoProjects();
    }
  }

  async create(organizationId: string, data: any) {
    try {
      return await this.prisma.project.create({ data: { ...data, organizationId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id: data.id ?? cryptoId(), organizationId, createdAt: new Date(), updatedAt: new Date() };
    }
  }

  async get(organizationId: string, id: string) {
    try {
      return await this.prisma.project.findFirstOrThrow({ where: { id, organizationId }, include: { workItems: true, sprints: true, boards: { include: { columns: true } }, budgets: true, risks: true, attachments: true } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      const project = demoProjects().find((item) => item.id === id || item.code === id);
      if (!project) throw new NotFoundException("Proyecto no encontrado");
      return { ...project, workItems: [], sprints: [], boards: [], budgets: [], risks: [], attachments: project.attachments ?? [] };
    }
  }

  async update(organizationId: string, id: string, data: any) {
    try {
      return await this.prisma.project.update({ where: { id }, data: { ...data, organizationId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id, organizationId, updatedAt: new Date() };
    }
  }

  async attachFile(organizationId: string, id: string, file: Express.Multer.File, microsoftAccessToken?: string) {
    let project: { id: string; code?: string | null; name?: string | null };
    try {
      project = await this.prisma.project.findFirstOrThrow({ where: { id, organizationId }, select: { id: true, code: true, name: true } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      project = { id, code: id, name: id };
    }

    const projectFolder = toSafeProjectFolder(project.code || project.name || project.id);
    const settings = this.settings.getSettings();
    if (settings.storage.provider === "sharepoint") {
      return this.attachFileToSharePoint(id, projectFolder, file, settings.storage, microsoftAccessToken);
    }
    const storageDir = join(this.settings.getLocalStoragePath(), projectFolder);
    mkdirSync(storageDir, { recursive: true });
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const absolutePath = join(storageDir, safeName);
    renameSync(file.path, absolutePath);

    try {
      await this.prisma.project.update({ where: { id }, data: { attachmentPath: storageDir } });
      return await this.prisma.attachment.create({
        data: {
          projectId: id,
          fileName: file.originalname,
          url: absolutePath,
          mimeType: file.mimetype,
          size: file.size
        }
      });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { id: cryptoId(), projectId: id, fileName: file.originalname, url: absolutePath, mimeType: file.mimetype, size: file.size };
    }
  }

  private async attachFileToSharePoint(id: string, projectFolder: string, file: Express.Multer.File, storage: ReturnType<SettingsService["getSettings"]>["storage"], microsoftAccessToken?: string) {
    if (!microsoftAccessToken) throw new BadRequestException("No hay sesion Microsoft activa para cargar adjuntos en SharePoint");
    if (!storage.sharePointSiteId || !storage.sharePointDriveId) throw new BadRequestException("Configura SharePoint Site ID y Drive ID");
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const folder = `${storage.sharePointFolderPath.replace(/^\/|\/$/g, "")}/${projectFolder}`;
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${storage.sharePointSiteId}/drives/${storage.sharePointDriveId}/root:/${encodeURIComponent(folder).replace(/%2F/g, "/")}/${encodeURIComponent(safeName)}:/content`;
    const result = await axios.put(uploadUrl, readFileSync(file.path), {
      headers: {
        Authorization: `Bearer ${microsoftAccessToken}`,
        "Content-Type": file.mimetype
      }
    });
    unlinkSync(file.path);
    const webUrl = result.data?.webUrl ?? uploadUrl;
    return this.prisma.attachment.create({
      data: {
        projectId: id,
        fileName: file.originalname,
        url: webUrl,
        mimeType: file.mimetype,
        size: file.size
      }
    });
  }
}

function demoProjects() {
  return [
    {
      id: "demo-proy",
      code: "PROY",
      name: "DevOps Hub Core",
      status: "ACTIVE",
      priority: "CRITICAL",
      budget: 280000,
      sponsor: "CTO Office",
      description: "Plataforma SaaS corporativa para portafolio, delivery agil, QA, DevOps y reporting ejecutivo.",
      attachments: [],
      risks: [],
      team: null,
      portfolio: null
    },
    {
      id: "demo-qa",
      code: "QA",
      name: "QA Automation",
      status: "PLANNED",
      priority: "HIGH",
      budget: 120000,
      sponsor: "Delivery Office",
      description: "Automatizacion de pruebas funcionales, regresion y evidencias.",
      attachments: [],
      risks: [],
      team: null,
      portfolio: null
    }
  ];
}

function toSafeProjectFolder(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "project";
}

function cryptoId() {
  return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
