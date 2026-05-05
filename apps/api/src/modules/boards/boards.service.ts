import { Injectable } from "@nestjs/common";
import { WorkItemStatus } from "@prisma/client";
import { isDatabaseUnavailable } from "../../common/prisma/prisma-errors";
import { PrismaService } from "../../common/prisma/prisma.service";
import { BoardsGateway } from "./boards.gateway";

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: BoardsGateway) {}

  async get(projectId: string) {
    try {
      return await this.prisma.board.findFirst({ where: { projectId }, include: { columns: { orderBy: { position: "asc" } }, project: { include: { workItems: true } } } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return demoBoard(projectId);
    }
  }

  async create(projectId: string, data: any) {
    const statuses = [WorkItemStatus.BACKLOG, WorkItemStatus.READY, WorkItemStatus.IN_PROGRESS, WorkItemStatus.CODE_REVIEW, WorkItemStatus.QA, WorkItemStatus.UAT, WorkItemStatus.DONE, WorkItemStatus.BLOCKED];
    try {
      return await this.prisma.board.create({ data: { projectId, name: data.name ?? "Scrum Board", columns: { create: statuses.map((status, position) => ({ name: status.replace("_", " "), status, position, wipLimit: position === 2 ? 5 : null })) } }, include: { columns: true } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return demoBoard(projectId);
    }
  }

  async move(id: string, data: { status: WorkItemStatus; boardId?: string }) {
    try {
      const item = await this.prisma.workItem.update({ where: { id }, data: { status: data.status } });
      if (data.boardId) this.gateway.broadcastMove(data.boardId, item);
      return item;
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      const item = { id, status: data.status };
      if (data.boardId) this.gateway.broadcastMove(data.boardId, item);
      return item;
    }
  }
}

function demoBoard(projectId: string) {
  const statuses = ["BACKLOG", "READY", "IN_PROGRESS", "CODE_REVIEW", "QA", "UAT", "DONE", "BLOCKED"];
  return {
    id: `${projectId}-board`,
    projectId,
    name: "Scrum Board",
    columns: statuses.map((status, position) => ({ id: `${projectId}-${status}`, boardId: `${projectId}-board`, name: status.replace("_", " "), status, position, wipLimit: position === 2 ? 5 : null })),
    project: { id: projectId, workItems: [] }
  };
}
