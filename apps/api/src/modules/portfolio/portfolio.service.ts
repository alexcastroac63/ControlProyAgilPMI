import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}
  list(organizationId: string) {
    return this.prisma.portfolio.findMany({ where: { organizationId }, include: { projects: true, goals: true, budgets: true, risks: true } });
  }
  create(organizationId: string, data: any) { return this.prisma.portfolio.create({ data: { ...data, organizationId } }); }
  get(organizationId: string, id: string) {
    return this.prisma.portfolio.findFirstOrThrow({ where: { id, organizationId }, include: { programs: true, projects: true, goals: true, budgets: true, risks: true } });
  }
  update(id: string, data: any) { return this.prisma.portfolio.update({ where: { id }, data }); }
}
