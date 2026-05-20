import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WorkItemStatus } from "@prisma/client";

export class EmailRequestDto {
  @ApiProperty({ example: "admin@devhub.local" })
  email!: string;
}

export class ProjectRequestDto {
  @ApiProperty({ example: "DevOps Hub Core" })
  name!: string;

  @ApiProperty({ example: "PROY" })
  code!: string;

  @ApiProperty({ example: "Desarrollo", enum: ["Requerimientos", "Aprobado", "Desarrollo", "Pruebas", "Finalizado", "Cancelado"] })
  status!: string;

  @ApiPropertyOptional({ example: "Plataforma SaaS corporativa para gestion agil, QA y DevOps." })
  description?: string;

  @ApiPropertyOptional({ example: 280000 })
  budget?: number;

  @ApiPropertyOptional({ example: "CTO Office" })
  sponsor?: string;

  @ApiPropertyOptional({ example: "Alex Admin" })
  projectManager?: string;
}

export class PortfolioRequestDto {
  @ApiProperty({ example: "Transformacion Digital 2026" })
  name!: string;

  @ApiPropertyOptional({ example: "Portafolio corporativo de iniciativas estrategicas." })
  description?: string;

  @ApiPropertyOptional({ example: "Activo" })
  status?: string;

  @ApiPropertyOptional({ example: 1200000 })
  budget?: number;
}

export class BacklogItemRequestDto {
  @ApiProperty({ example: "HU00010" })
  key!: string;

  @ApiProperty({ example: "Como usuario quiero consultar el avance del sprint activo" })
  title!: string;

  @ApiPropertyOptional({ example: "Consulta rapida del avance operativo del sprint en ejecucion." })
  summary?: string;

  @ApiPropertyOptional({ example: "Detalle funcional extenso de la historia de usuario." })
  description?: string;

  @ApiProperty({ example: "Story", enum: ["Epic", "Feature", "Story", "Task", "Bug", "Spike"] })
  type!: string;

  @ApiProperty({ example: "High", enum: ["Lowest", "Low", "Medium", "High", "Highest", "Critical"] })
  priority!: string;

  @ApiPropertyOptional({ example: 8 })
  storyPoints?: number;

  @ApiPropertyOptional({ example: ["HU00001", "HU00003"], type: [String] })
  dependencyKeys?: string[];
}

export class AssignSprintRequestDto {
  @ApiPropertyOptional({ example: "sprint-proy-2", nullable: true })
  sprintId!: string | null;
}

export class ReorderRequestDto {
  @ApiProperty({ example: ["story-1", "story-2", "story-3"], type: [String] })
  ids!: string[];
}

export class SprintRequestDto {
  @ApiProperty({ example: "Sprint 3" })
  name!: string;

  @ApiPropertyOptional({ example: "Automatizar pruebas y estabilizar release." })
  goal?: string;

  @ApiProperty({ example: "2026-05-06" })
  startDate!: string;

  @ApiPropertyOptional({ example: "2026-05-19" })
  endDate?: string;

  @ApiPropertyOptional({ example: 2 })
  durationWeeks?: number;
}

export class BoardItemRequestDto {
  @ApiProperty({ example: "HU00010" })
  storyKey!: string;

  @ApiProperty({ example: "Por hacer" })
  status!: string;

  @ApiPropertyOptional({ example: "sprint-proy-2" })
  sprintId?: string;
}

export class BoardMoveRequestDto {
  @ApiProperty({ example: WorkItemStatus.QA, enum: WorkItemStatus })
  status!: WorkItemStatus;

  @ApiPropertyOptional({ example: "sprint-proy-2", nullable: true })
  sprintId?: string | null;

  @ApiPropertyOptional({ example: 3 })
  order?: number;
}

export class GithubConnectionRequestDto {
  @ApiProperty({ example: "PROY" })
  projectCode!: string;

  @ApiProperty({ example: "alexcastroac63/ControlProyAgilPMI" })
  repository!: string;

  @ApiPropertyOptional({ example: "ghp_xxx" })
  token?: string;
}

export class GithubWebhookRequestDto {
  @ApiProperty({ example: "pull_request" })
  event!: string;

  @ApiProperty({ example: { action: "closed", pull_request: { merged: true } } })
  payload!: Record<string, unknown>;
}

export class QaSuiteRequestDto {
  @ApiProperty({ example: "Regresion Sprint 3" })
  name!: string;

  @ApiPropertyOptional({ example: "Suite de pruebas funcionales del sprint activo." })
  description?: string;
}

export class QaCaseRequestDto {
  @ApiProperty({ example: "Validar login con usuario activo" })
  title!: string;

  @ApiPropertyOptional({ example: "Dado un usuario valido, cuando ingresa credenciales, entonces accede al dashboard." })
  steps?: string;

  @ApiPropertyOptional({ example: "HU00010" })
  storyKey?: string;
}

export class QaRunRequestDto {
  @ApiProperty({ example: "Passed", enum: ["Pending", "Passed", "Failed", "Blocked"] })
  status!: string;

  @ApiPropertyOptional({ example: "Ejecucion completada sin defectos." })
  evidence?: string;
}

export class UserRequestDto {
  @ApiProperty({ example: "Alex" })
  firstName!: string;

  @ApiProperty({ example: "Castro" })
  lastName!: string;

  @ApiProperty({ example: "alex.castro@empresa.com" })
  email!: string;

  @ApiProperty({ example: "Project Manager" })
  role!: string;

  @ApiPropertyOptional({ example: "Activo" })
  status?: string;
}

export class SettingsRequestDto {
  @ApiPropertyOptional({ example: { provider: "server", serverPath: "C:\\DatosApp" } })
  attachments?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { host: "smtp.office365.com", port: 587, secure: false, user: "notificaciones@empresa.com" } })
  email?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { enabled: true, clientId: "00000000-0000-0000-0000-000000000000", allowedDomains: ["empresa.com"] } })
  microsoftAuth?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { enabled: true, allowedDomains: ["empresa.com"] } })
  googleAuth?: Record<string, unknown>;

  @ApiPropertyOptional({ example: { enabled: true, organization: "alexcastroac63" } })
  githubIntegration?: Record<string, unknown>;
}

export class ProjectFolderRequestDto {
  @ApiProperty({ example: "PROY" })
  projectCode!: string;

  @ApiPropertyOptional({ example: "DevOps Hub Core" })
  projectName?: string;
}
