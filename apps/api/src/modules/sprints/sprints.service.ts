import { Injectable } from "@nestjs/common";
import { isDatabaseUnavailable } from "../../common/prisma/prisma-errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string) {
    try {
      return await this.prisma.sprint.findMany({ where: { projectId }, include: { items: true }, orderBy: { startDate: "asc" } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return demoSprints(projectId);
    }
  }

  async create(projectId: string, data: any) {
    try {
      return await this.prisma.sprint.create({ data: { ...data, projectId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id: `sprint-${Date.now()}`, projectId, items: [] };
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.sprint.update({ where: { id }, data });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id };
    }
  }

  async start(id: string) {
    try {
      return await this.prisma.sprint.update({ where: { id }, data: { startedAt: new Date() } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { id, startedAt: new Date() };
    }
  }

  async close(id: string) {
    try {
      return await this.prisma.sprint.update({ where: { id }, data: { closedAt: new Date() } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { id, closedAt: new Date() };
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.sprint.delete({ where: { id } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { id, deleted: true };
    }
  }
}

function demoSprints(projectId: string) {
  return [
    { id: `${projectId}-sprint-1`, projectId, name: "Sprint 1", goal: "Base operativa", startDate: "2026-04-20", endDate: "2026-05-03", items: [] },
    { id: `${projectId}-sprint-2`, projectId, name: "Sprint 2", goal: "Delivery y QA", startDate: "2026-05-04", endDate: "2026-05-17", items: [] }
  ];
}
