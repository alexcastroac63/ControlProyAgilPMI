import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: "acme-enterprise" },
    update: {},
    create: { name: "Acme Enterprise", slug: "acme-enterprise" }
  });

  const permissions = ["portfolio:read", "portfolio:write", "projects:write", "boards:write", "qa:write", "github:write", "reports:read"];
  for (const key of permissions) await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });

  const roleNames = ["SUPER_ADMIN", "PORTFOLIO_MANAGER", "PROJECT_MANAGER", "SCRUM_MASTER", "PRODUCT_OWNER", "DEVELOPER", "QA", "VIEWER", "EXECUTIVE"];
  for (const name of roleNames) await prisma.role.upsert({ where: { organizationId_name: { organizationId: organization.id, name } }, update: {}, create: { organizationId: organization.id, name } });

  const adminRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, name: "SUPER_ADMIN" } });
  const admin = await prisma.user.upsert({
    where: { email: "admin@devhub.local" },
    update: {},
    create: {
      organizationId: organization.id,
      firstName: "Alex",
      lastName: "Admin",
      email: "admin@devhub.local",
      passwordHash: await argon2.hash("Admin12345!"),
      roles: { create: { roleId: adminRole.id } }
    }
  });

  const team = await prisma.team.create({ data: { organizationId: organization.id, name: "Core Platform", capacity: 160 } });
  await prisma.teamMember.create({ data: { teamId: team.id, userId: admin.id, skills: ["Architecture", "NestJS", "Next.js"], capacity: 40 } });

  const portfolio = await prisma.portfolio.create({
    data: {
      organizationId: organization.id,
      name: "Digital Transformation 2026",
      priority: "CRITICAL",
      annualRoadmap: { q1: "Platform foundation", q2: "QA automation", q3: "BI rollout", q4: "DevOps optimization" },
      goals: { create: [{ name: "Delivery predictability", kpi: "Sprint commitment", target: 90, current: 74 }] },
      budgets: { create: [{ amount: 850000, executed: 240000, fiscalYear: 2026 }] },
      risks: { create: [{ title: "Legacy migration dependency", impact: "HIGH", probability: 55, mitigation: "Parallel migration waves" }] }
    }
  });

  const project = await prisma.project.create({
    data: {
      organizationId: organization.id,
      portfolioId: portfolio.id,
      teamId: team.id,
      name: "DevOps Hub Core",
      code: "PROY",
      description: "Plataforma SaaS corporativa para portafolio, delivery agil, QA, DevOps y reporting ejecutivo.",
      client: "Internal",
      sponsor: "CTO Office",
      projectManager: "Alex Admin",
      staffing: [
        { id: "member-1", name: "Alex Admin", email: "admin@devhub.local", role: "Encargado del proyecto", allocation: 40 },
        { id: "member-2", name: "Diana Developer", email: "diana.dev@devhub.local", role: "Desarrollador", allocation: 100 },
        { id: "member-3", name: "Marco Frontend", email: "marco.frontend@devhub.local", role: "Desarrollador", allocation: 80 },
        { id: "member-4", name: "Sofia QA", email: "sofia.qa@devhub.local", role: "QA", allocation: 60 }
      ],
      scrumMaster: "María Scrum",
      productOwner: "Carlos PO",
      status: "ACTIVE",
      budget: 280000,
      budgetDetails: [
        { id: "cost-1", type: "Personal", description: "Equipo core de desarrollo", amount: 165000 },
        { id: "cost-2", type: "Equipos", description: "Laptops y perifericos", amount: 28000 },
        { id: "cost-3", type: "Licencias", description: "Repos, CI/CD, monitoreo y BI", amount: 42000 },
        { id: "cost-4", type: "Servicios", description: "Soporte cloud y seguridad", amount: 25000 },
        { id: "cost-5", type: "Otros", description: "Reserva operativa", amount: 20000 }
      ],
      priority: "CRITICAL",
      projectType: "SaaS",
      businessArea: "Technology"
    }
  });

  const board = await prisma.board.create({ data: { projectId: project.id, name: "Scrum Delivery" } });
  const columns = ["BACKLOG", "READY", "IN_PROGRESS", "CODE_REVIEW", "QA", "UAT", "DONE", "BLOCKED"] as const;
  await Promise.all(columns.map((status, position) => prisma.boardColumn.create({ data: { boardId: board.id, name: status.replace("_", " "), status, position, wipLimit: status === "IN_PROGRESS" ? 5 : null } })));

  const sprint = await prisma.sprint.create({ data: { projectId: project.id, name: "Sprint 1", goal: "Auth, backlog and board foundation", startDate: new Date(), endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14), capacity: 120, velocity: 42 } });
  await prisma.workItem.createMany({
    data: [
      { projectId: project.id, sprintId: sprint.id, reporterId: admin.id, assigneeId: admin.id, key: "PROY-1", title: "Implementar autenticación JWT con refresh tokens", type: "STORY", status: "DONE", priority: "CRITICAL", storyPoints: 8, rank: 1 },
      { projectId: project.id, sprintId: sprint.id, reporterId: admin.id, assigneeId: admin.id, key: "PROY-2", title: "Board Scrum con WIP limits y drag/drop", type: "FEATURE", status: "IN_PROGRESS", priority: "HIGH", storyPoints: 13, rank: 2 },
      { projectId: project.id, reporterId: admin.id, key: "PROY-3", title: "Matriz de trazabilidad QA", type: "TASK", status: "READY", priority: "MEDIUM", storyPoints: 5, rank: 3 },
      { projectId: project.id, reporterId: admin.id, key: "PROY-4", title: "Sincronizar PR aprobado con estado Ready QA", type: "BUG", status: "QA", priority: "HIGH", storyPoints: 3, rank: 4 }
    ]
  });

  const suite = await prisma.testSuite.create({ data: { projectId: project.id, name: "Regression Suite" } });
  await prisma.testCase.create({ data: { suiteId: suite.id, title: "Login válido", steps: [{ action: "Ingresar credenciales" }, { action: "Enviar formulario" }], expected: "Dashboard ejecutivo visible", status: "PASSED" } });
}

main().finally(() => prisma.$disconnect());
