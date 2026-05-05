import { Module, ModuleMetadata } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BacklogModule } from "./modules/backlog/backlog.module";
import { BoardsModule } from "./modules/boards/boards.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { GithubModule } from "./modules/github/github.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PortfolioModule } from "./modules/portfolio/portfolio.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { QaModule } from "./modules/qa/qa.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { SprintsModule } from "./modules/sprints/sprints.module";
import { UsersModule } from "./modules/users/users.module";

const apiModule = process.env.API_MODULE ?? "all";
const featureModules: Record<string, NonNullable<ModuleMetadata["imports"]>> = {
  all: [
    AuthModule,
    UsersModule,
    PortfolioModule,
    ProjectsModule,
    BacklogModule,
    SprintsModule,
    BoardsModule,
    QaModule,
    GithubModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    SettingsModule
  ],
  dashboard: [DashboardModule, ReportsModule, NotificationsModule, SettingsModule],
  projects: [PortfolioModule, ProjectsModule, ReportsModule, SettingsModule],
  "scrum-board": [BacklogModule, SprintsModule, BoardsModule],
  qa: [QaModule],
  github: [GithubModule],
  teams: [AuthModule, UsersModule, NotificationsModule, SettingsModule]
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.register({ global: true }),
    PrismaModule,
    ...(featureModules[apiModule] ?? featureModules.all)
  ]
})
export class AppModule {}
