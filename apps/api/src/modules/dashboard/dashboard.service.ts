import { Injectable } from "@nestjs/common";
import { isDatabaseUnavailable } from "../../common/prisma/prisma-errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async executive(organizationId: string) {
    try {
      const [activeProjects, criticalRisks, openBugs, doneItems, allItems, sprints] = await Promise.all([
        this.prisma.project.count({ where: { organizationId, status: "ACTIVE" } }),
        this.prisma.risk.count({ where: { project: { organizationId }, impact: "CRITICAL", status: "OPEN" } }),
        this.prisma.workItem.count({ where: { project: { organizationId }, type: "BUG", status: { not: "DONE" } } }),
        this.prisma.workItem.count({ where: { project: { organizationId }, status: "DONE" } }),
        this.prisma.workItem.count({ where: { project: { organizationId } } }),
        this.prisma.sprint.findMany({ where: { project: { organizationId } }, include: { items: true }, take: 10, orderBy: { startDate: "desc" } })
      ]);

      return {
        metrics: [
          { label: "Proyectos activos", value: String(activeProjects), trend: 8 },
          { label: "% avance", value: `${allItems ? Math.round((doneItems / allItems) * 100) : 0}%`, trend: 12 },
          { label: "Riesgos criticos", value: String(criticalRisks), trend: -3 },
          { label: "Bugs abiertos", value: String(openBugs), trend: -9 }
        ],
        velocity: sprints.map((s) => ({ sprint: s.name, points: s.items.reduce((sum, item) => sum + (item.storyPoints ?? 0), 0) })),
        capacityHeatmap: defaultCapacityHeatmap()
      };
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return defaultDashboard();
    }
  }
}

function defaultDashboard() {
  return {
    metrics: [
      { label: "Proyectos activos", value: "1", trend: 8 },
      { label: "% avance", value: "25%", trend: 12 },
      { label: "Riesgos criticos", value: "0", trend: 0 },
      { label: "Bugs abiertos", value: "0", trend: 0 }
    ],
    velocity: [
      { sprint: "S1", points: 34 },
      { sprint: "S2", points: 42 },
      { sprint: "S3", points: 39 },
      { sprint: "S4", points: 48 }
    ],
    capacityHeatmap: defaultCapacityHeatmap()
  };
}

function defaultCapacityHeatmap() {
  return [
    { team: "Core Platform", capacity: 84 },
    { team: "QA Automation", capacity: 72 },
    { team: "Data BI", capacity: 91 }
  ];
}
