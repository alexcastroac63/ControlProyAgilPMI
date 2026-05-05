import { Injectable } from "@nestjs/common";
import { isDatabaseUnavailable } from "../../common/prisma/prisma-errors";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class QaService {
  constructor(private readonly prisma: PrismaService) {}

  async suites(projectId: string) {
    try {
      return await this.prisma.testSuite.findMany({ where: { projectId }, include: { cases: { include: { runs: true, workItem: true } } } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return demoSuites(projectId);
    }
  }

  async createSuite(projectId: string, data: any) {
    try {
      return await this.prisma.testSuite.create({ data: { ...data, projectId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id: `suite-${Date.now()}`, projectId };
    }
  }

  async createCase(suiteId: string, data: any) {
    try {
      return await this.prisma.testCase.create({ data: { ...data, suiteId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id: `case-${Date.now()}`, suiteId };
    }
  }

  async run(testCaseId: string, data: any) {
    try {
      return await this.prisma.testRun.create({ data: { ...data, testCaseId } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return { ...data, id: `run-${Date.now()}`, testCaseId };
    }
  }

  async traceability(projectId: string) {
    try {
      return await this.prisma.workItem.findMany({ where: { projectId }, include: { testCases: { include: { runs: true } } } });
    } catch (error) {
      if (!isDatabaseUnavailable(error) || process.env.NODE_ENV !== "development") throw error;
      this.prisma.markUnavailable();
      return [];
    }
  }
}

function demoSuites(projectId: string) {
  return [
    {
      id: `${projectId}-suite-auth`,
      projectId,
      name: "Regression Suite",
      cases: [
        { id: `${projectId}-case-1`, key: "TC-001", name: "Login valido", status: "Approved", runs: [], workItem: null }
      ]
    }
  ];
}
