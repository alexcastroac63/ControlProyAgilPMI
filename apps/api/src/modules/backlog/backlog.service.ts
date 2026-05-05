import { Injectable } from "@nestjs/common";
import { isDatabaseUnavailable } from "../../common/prisma/prisma-errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class BacklogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    try {
      return await this.prisma.workItem.findMany({ where: { projectId }, include: { assignee: true, comments: true, attachments: true, sprint: true }, orderBy: { rank: "asc" } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return demoItems(projectId);
    }
  }

  async create(projectId: string, data: any) {
    try {
      const count = await this.prisma.workItem.count({ where: { projectId } });
      return await this.prisma.workItem.create({ data: { ...data, projectId, key: data.key ?? `${data.projectCode ?? "PROY"}-${count + 1}`, rank: count + 1 } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id: data.id ?? `wi-${Date.now()}`, projectId, key: data.key ?? `HU${String(Date.now()).slice(-5)}`, rank: 1 };
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.workItem.update({ where: { id }, data });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id };
    }
  }

  async assignSprint(id: string, sprintId: string | null) {
    try {
      return await this.prisma.workItem.update({ where: { id }, data: { sprintId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { id, sprintId };
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.workItem.delete({ where: { id } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { id, deleted: true };
    }
  }

  async reorder(projectId: string, ids: string[]) {
    try {
      await this.prisma.$transaction(ids.map((id, rank) => this.prisma.workItem.update({ where: { id }, data: { projectId, rank } })));
      return { ok: true };
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ok: true };
    }
  }
}

function demoItems(projectId: string) {
  const code = projectId.toLowerCase().includes("qa") ? "QA" : "PROY";
  return [
    { id: `${projectId}-wi-1`, projectId, key: "HU00001", title: `${code} autenticacion y trazabilidad`, type: "STORY", status: "DONE", priority: "CRITICAL", storyPoints: 8, rank: 1, assignee: null, comments: [], attachments: [], sprint: null },
    { id: `${projectId}-wi-2`, projectId, key: "HU00002", title: `${code} tablero Scrum operativo`, type: "STORY", status: "IN_PROGRESS", priority: "HIGH", storyPoints: 13, rank: 2, assignee: null, comments: [], attachments: [], sprint: null }
  ];
}
