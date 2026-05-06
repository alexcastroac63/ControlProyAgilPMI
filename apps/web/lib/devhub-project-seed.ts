"use client";

const seedVersion = "2026-05-01-devhub-build-project-v1";
const seedKey = "devhub.seed.devhubBuildProject";

const project = {
  id: "demo-devhub-build",
  code: "DEVHUB",
  name: "Creacion Plataforma DevOps Hub",
  projectIcon: "code",
  status: "Desarrollo",
  priority: "CRITICAL",
  budget: 385000,
  sponsor: "Direccion de Tecnologia",
  projectManager: "Alex Admin",
  attachmentPath: "C:\\DatosApp\\DEVHUB",
  description:
    "Construccion de una plataforma SaaS enterprise para Portfolio Management y DevOps Hub. El alcance incluye autenticacion local con JWT, sesiones de 3 horas, administracion de proyectos, backlog, Scrum Board, QA empresarial, integracion GitHub, configuracion de adjuntos locales y SharePoint, dashboard, temas claro/oscuro, soporte movil, Docker, API NestJS y UI Next.js.",
  staffing: [
    { id: "devhub-member-1", personId: "person-1", name: "Alex Admin", email: "admin@devhub.local", role: "Encargado del proyecto", allocation: 50 },
    { id: "devhub-member-2", personId: "person-2", name: "Diana Developer", email: "diana.dev@devhub.local", role: "Desarrollador", allocation: 100 },
    { id: "devhub-member-3", personId: "person-3", name: "Marco Frontend", email: "marco.frontend@devhub.local", role: "Desarrollador", allocation: 100 },
    { id: "devhub-member-4", personId: "person-4", name: "Sofia QA", email: "sofia.qa@devhub.local", role: "QA", allocation: 80 },
    { id: "devhub-member-5", personId: "person-6", name: "Ivan Automation", email: "ivan.auto@devhub.local", role: "DevOps", allocation: 80 }
  ],
  storyTasks: [
    { id: "devhub-task-1", storyKey: "HU00001", storyTitle: "Autenticacion segura", title: "Implementar login local y expiracion JWT", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" },
    { id: "devhub-task-2", storyKey: "HU00002", storyTitle: "Administracion de proyectos", title: "Adjuntos locales, miniaturas y SharePoint", assigneeEmail: "marco.frontend@devhub.local", status: "En desarrollo" },
    { id: "devhub-task-3", storyKey: "HU00005", storyTitle: "QA tipo Xray", title: "Trazabilidad con Scrum Board", assigneeEmail: "sofia.qa@devhub.local", status: "En pruebas" }
  ],
  budgetDetails: [
    { id: "devhub-cost-1", type: "Personal", description: "Equipo full stack, QA, DevOps y gestion del producto", amount: 215000 },
    { id: "devhub-cost-2", type: "Licencias", description: "GitHub, CI/CD, monitoreo, correo y herramientas BI", amount: 52000 },
    { id: "devhub-cost-3", type: "Infraestructura", description: "Servidor Docker, PostgreSQL, almacenamiento y respaldos", amount: 68000 },
    { id: "devhub-cost-4", type: "Servicios", description: "Configuracion Microsoft, SharePoint y seguridad", amount: 34000 },
    { id: "devhub-cost-5", type: "Otros", description: "Reserva de contingencia y estabilizacion", amount: 16000 }
  ],
  attachments: [
    { id: "devhub-att-1", fileName: "arquitectura-devhub.md", mimeType: "text/markdown", size: 18400, url: "storage/projects/devhub/arquitectura-devhub.md", kind: "file" },
    { id: "devhub-att-2", fileName: "plan-implementacion.json", mimeType: "application/json", size: 9200, url: "storage/projects/devhub/plan-implementacion.json", kind: "file" },
    { id: "devhub-att-3", fileName: "Repositorio SharePoint DevHub", mimeType: "text/sharepoint-link", size: 0, url: "https://grupocampestre.sharepoint.com/sites/Administracion_Proyectos", kind: "sharepoint" }
  ],
  activities: [
    { id: "devhub-act-n1-1", name: "Inicio y arquitectura", description: "Definicion de alcance, stack, estructura monorepo, Docker y modelo SaaS.", startDate: "2026-04-24", endDate: "2026-04-28", kind: "activity", assigneeEmail: "admin@devhub.local", progress: 100, completed: true },
    { id: "devhub-act-n2-1", parentId: "devhub-act-n1-1", name: "Scaffold monorepo", description: "Crear apps web/api, packages y configuraciones base.", startDate: "2026-04-24", endDate: "2026-04-24", kind: "activity", assigneeEmail: "diana.dev@devhub.local", progress: 100, completed: true },
    { id: "devhub-act-n3-1", parentId: "devhub-act-n2-1", name: "Next.js 16 y NestJS", description: "Configurar UI, API, Prisma, Tailwind y rutas iniciales.", startDate: "2026-04-24", endDate: "2026-04-25", kind: "activity", assigneeEmail: "marco.frontend@devhub.local", progress: 100, completed: true },
    { id: "devhub-act-n1-2", name: "Producto funcional", description: "Construccion de proyectos, backlog, board, QA, GitHub y dashboard.", startDate: "2026-04-29", endDate: "2026-05-03", kind: "activity", dependencyIds: ["devhub-act-n1-1"], dependencyStartMode: "next-business-day", assigneeEmail: "admin@devhub.local", progress: 82 },
    { id: "devhub-act-n2-2", parentId: "devhub-act-n1-2", name: "Projects y adjuntos", description: "Administracion de proyectos, costos, personal, actividades, Gantt y adjuntos.", startDate: "2026-04-29", endDate: "2026-05-01", kind: "activity", assigneeEmail: "marco.frontend@devhub.local", progress: 88 },
    { id: "devhub-act-n2-3", parentId: "devhub-act-n1-2", name: "Backlog y Scrum Board", description: "HU, sprints, tareas, estados, drag/drop y persistencia.", startDate: "2026-04-29", endDate: "2026-05-02", kind: "activity", assigneeEmail: "diana.dev@devhub.local", progress: 78 },
    { id: "devhub-act-n2-4", parentId: "devhub-act-n1-2", name: "QA y GitHub", description: "QA tipo Xray, estadisticas GitHub por proyecto y documentacion de servicios.", startDate: "2026-05-01", endDate: "2026-05-03", kind: "activity", dependencyIds: ["devhub-act-n2-3"], dependencyStartMode: "same-day", assigneeEmail: "sofia.qa@devhub.local", progress: 70 },
    { id: "devhub-act-n1-3", name: "Hardening y despliegue", description: "Login, auditoria, fallbacks sin DB, Docker y validaciones finales.", startDate: "2026-05-02", endDate: "2026-05-06", kind: "activity", dependencyIds: ["devhub-act-n1-2"], dependencyStartMode: "next-business-day", assigneeEmail: "ivan.auto@devhub.local", progress: 40 },
    { id: "sprint-activity-sprint-devhub-1", name: "Sprint 1", description: "Base arquitectura, auth y proyectos.", startDate: "2026-04-24", endDate: "2026-04-28", sprintId: "sprint-devhub-1", kind: "sprint", assigneeEmail: "admin@devhub.local", progress: 100, completed: true },
    { id: "sprint-activity-sprint-devhub-2", name: "Sprint 2", description: "Backlog, Scrum Board, Projects y Gantt.", startDate: "2026-04-29", endDate: "2026-05-02", sprintId: "sprint-devhub-2", kind: "sprint", assigneeEmail: "admin@devhub.local", progress: 80 },
    { id: "sprint-activity-sprint-devhub-3", name: "Sprint 3", description: "QA, GitHub, Docker, auditoria y estabilizacion.", startDate: "2026-05-03", endDate: "2026-05-07", sprintId: "sprint-devhub-3", kind: "sprint", assigneeEmail: "admin@devhub.local", progress: 35 }
  ]
};

const sprints = [
  { id: "sprint-devhub-1", projectCode: "DEVHUB", name: "Sprint 1", goal: "Base arquitectura, auth y proyectos", startDate: "2026-04-24", endDate: "2026-04-28" },
  { id: "sprint-devhub-2", projectCode: "DEVHUB", name: "Sprint 2", goal: "Backlog, Scrum Board, Projects y Gantt", startDate: "2026-04-29", endDate: "2026-05-02" },
  { id: "sprint-devhub-3", projectCode: "DEVHUB", name: "Sprint 3", goal: "QA, GitHub, Docker y auditoria", startDate: "2026-05-03", endDate: "2026-05-07" }
];

const boardItems = [
  { id: "devhub-wi-1", projectCode: "DEVHUB", key: "HU00001", title: "Login seguro con JWT de 3 horas", status: "Finalizado", priority: "Critical", points: 8, sprintId: "sprint-devhub-1", tasks: [{ id: "devhub-t-1", code: "T00001", title: "Crear pantalla de login", assigneeEmail: "marco.frontend@devhub.local", status: "Finalizada" }, { id: "devhub-t-2", code: "T00002", title: "Emitir token con vencimiento", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" }] },
  { id: "devhub-wi-2", projectCode: "DEVHUB", key: "HU00002", title: "Administracion de proyectos con adjuntos", status: "En QA", priority: "High", points: 13, sprintId: "sprint-devhub-2", tasks: [{ id: "devhub-t-3", code: "T00003", title: "Guardar adjuntos en ruta del servidor", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" }, { id: "devhub-t-4", code: "T00004", title: "Miniaturas e iconos por extension", assigneeEmail: "marco.frontend@devhub.local", status: "En pruebas" }] },
  { id: "devhub-wi-3", projectCode: "DEVHUB", key: "HU00003", title: "Backlog con HU, dependencias, tareas y sprints", status: "Finalizado", priority: "High", points: 13, sprintId: "sprint-devhub-2", tasks: [{ id: "devhub-t-5", code: "T00005", title: "Codigos HU00000 y T00000", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" }] },
  { id: "devhub-wi-4", projectCode: "DEVHUB", key: "HU00004", title: "Scrum Board con drag/drop y estados QA", status: "Listo para QA", priority: "High", points: 8, sprintId: "sprint-devhub-2", tasks: [{ id: "devhub-t-6", code: "T00006", title: "Persistir movimientos entre estados", assigneeEmail: "marco.frontend@devhub.local", status: "En pruebas" }] },
  { id: "devhub-wi-5", projectCode: "DEVHUB", key: "HU00005", title: "QA tipo Xray integrado con Scrum Board", status: "En curso", priority: "High", points: 8, sprintId: "sprint-devhub-3", tasks: [{ id: "devhub-t-7", code: "T00007", title: "Matriz de trazabilidad y ejecuciones", assigneeEmail: "sofia.qa@devhub.local", status: "En curso" }] },
  { id: "devhub-wi-6", projectCode: "DEVHUB", key: "HU00006", title: "GitHub por proyecto y documentacion Docker", status: "En curso", priority: "Medium", points: 5, sprintId: "sprint-devhub-3", tasks: [{ id: "devhub-t-8", code: "T00008", title: "Estadisticas por repositorio", assigneeEmail: "ivan.auto@devhub.local", status: "En curso" }] },
  { id: "devhub-wi-7", projectCode: "DEVHUB", key: "HU00007", title: "Auditoria y fallback sin PostgreSQL", status: "Por hacer", priority: "Critical", points: 5, sprintId: "sprint-devhub-3", tasks: [{ id: "devhub-t-9", code: "T00009", title: "Servicios API con modo demo seguro", assigneeEmail: "diana.dev@devhub.local", status: "Pendiente" }] },
  { id: "devhub-wi-8", projectCode: "DEVHUB", key: "HU00008", title: "Microsoft SharePoint y dominios autorizados", status: "Por hacer", priority: "Medium", points: 3, sprintId: null, tasks: [{ id: "devhub-t-10", code: "T00010", title: "Completar flujo Microsoft productivo", assigneeEmail: "ivan.auto@devhub.local", status: "Pendiente" }] }
];

const githubRepositories = [
  { id: "repo-devhub-web", projectCode: "DEVHUB", owner: "local", name: "devhub-web", defaultBranch: "main", branches: 5, commits: 86, pullRequests: 18, openPullRequests: 2, actions: 42, successfulActions: 37, releases: 1, issuesSynced: 8, lastSync: "2026-05-01 22:10" },
  { id: "repo-devhub-api", projectCode: "DEVHUB", owner: "local", name: "devhub-api", defaultBranch: "main", branches: 6, commits: 74, pullRequests: 15, openPullRequests: 3, actions: 38, successfulActions: 34, releases: 1, issuesSynced: 7, lastSync: "2026-05-01 22:10" },
  { id: "repo-devhub-infra", projectCode: "DEVHUB", owner: "local", name: "devhub-infra", defaultBranch: "main", branches: 3, commits: 29, pullRequests: 6, openPullRequests: 1, actions: 16, successfulActions: 14, releases: 0, issuesSynced: 5, lastSync: "2026-05-01 22:10" }
];

const qaSeed = {
  cases: [
    { id: "tc-devhub-1", projectCode: "DEVHUB", key: "TC-DEVHUB-001", name: "Login valido y expiracion de sesion", type: "Manual", priority: "Critical", status: "Approved", coverage: ["HU00001"], suite: "Autenticacion", owner: "Sofia QA" },
    { id: "tc-devhub-2", projectCode: "DEVHUB", key: "TC-DEVHUB-002", name: "Carga de adjuntos con miniatura", type: "Manual", priority: "High", status: "Approved", coverage: ["HU00002"], suite: "Projects", owner: "Sofia QA" },
    { id: "tc-devhub-3", projectCode: "DEVHUB", key: "TC-DEVHUB-003", name: "Movimiento HU entre sprints y estados", type: "Manual", priority: "High", status: "Approved", coverage: ["HU00003", "HU00004"], suite: "Scrum Board", owner: "Laura QA Lead" },
    { id: "tc-devhub-4", projectCode: "DEVHUB", key: "TC-DEVHUB-004", name: "QA bloquea HU fallida en tablero", type: "Automatizado", priority: "High", status: "Draft", coverage: ["HU00005"], suite: "QA Xray", owner: "Ivan Automation" },
    { id: "tc-devhub-5", projectCode: "DEVHUB", key: "TC-DEVHUB-005", name: "GitHub muestra estadisticas por proyecto", type: "Manual", priority: "Medium", status: "Approved", coverage: ["HU00006"], suite: "GitHub", owner: "Sofia QA" }
  ],
  executions: [
    { id: "te-devhub-1", projectCode: "DEVHUB", key: "TE-DEVHUB-001", name: "Smoke funcional DevHub", environment: "Local", version: "0.1.0", status: "Passed", executedBy: "Sofia QA", executedAt: "2026-05-01", cases: [{ caseKey: "TC-DEVHUB-001", status: "Passed" }, { caseKey: "TC-DEVHUB-002", status: "Passed" }, { caseKey: "TC-DEVHUB-003", status: "Passed" }] },
    { id: "te-devhub-2", projectCode: "DEVHUB", key: "TE-DEVHUB-002", name: "Regression QA-GitHub", environment: "Local", version: "0.2.0", status: "Blocked", executedBy: "Laura QA Lead", executedAt: "2026-05-01", cases: [{ caseKey: "TC-DEVHUB-004", status: "Blocked" }, { caseKey: "TC-DEVHUB-005", status: "Pending" }] }
  ],
  defects: [
    { id: "bug-devhub-1", projectCode: "DEVHUB", key: "BUG-DEVHUB-001", title: "Completar flujo Microsoft productivo con SharePoint", severity: "Medium", status: "Open", linkedCase: "TC-DEVHUB-004", linkedStory: "HU00008" },
    { id: "bug-devhub-2", projectCode: "DEVHUB", key: "BUG-DEVHUB-002", title: "Agregar pruebas automatizadas reales al API", severity: "High", status: "Open", linkedCase: "TC-DEVHUB-005", linkedStory: "HU00007" }
  ]
};

const people = [
  { id: "person-1", name: "Alex Admin", email: "admin@devhub.local", defaultRole: "Encargado del proyecto" },
  { id: "person-2", name: "Diana Developer", email: "diana.dev@devhub.local", defaultRole: "Desarrollador" },
  { id: "person-3", name: "Marco Frontend", email: "marco.frontend@devhub.local", defaultRole: "Desarrollador" },
  { id: "person-4", name: "Sofia QA", email: "sofia.qa@devhub.local", defaultRole: "QA" },
  { id: "person-6", name: "Ivan Automation", email: "ivan.auto@devhub.local", defaultRole: "DevOps" }
];

export function seedDevhubBuildProject() {
  if (typeof window === "undefined") return;
  // Precarga el proyecto usado como caso real de la construccion de esta aplicacion.
  upsert("devhub.projects", project, (item) => item.code === project.code || item.id === project.id);
  for (const person of people) upsert("devhub.people", person, (item) => item.email === person.email || item.id === person.id);
  for (const sprint of sprints) upsert("devhub.boardSprints", sprint, (item) => item.id === sprint.id);
  for (const item of boardItems) upsert("devhub.scrumBoard", item, (candidate) => candidate.id === item.id || (candidate.projectCode === item.projectCode && candidate.key === item.key));
  for (const repo of githubRepositories) upsert("devhub.githubStats", repo, (item) => item.id === repo.id);
  upsertQaData();
  localStorage.setItem(seedKey, seedVersion);
}

function upsert<T>(key: string, value: T, predicate: (item: T) => boolean) {
  const current = readArray<T>(key);
  const exists = current.some(predicate);
  const next = exists ? current.map((item) => (predicate(item) ? { ...item, ...value } : item)) : [value, ...current];
  localStorage.setItem(key, JSON.stringify(next));
}

function upsertQaData() {
  // QA guarda un objeto compuesto, por eso se mezcla por coleccion y no como arreglo unico.
  const current = JSON.parse(localStorage.getItem("devhub.qaXray") || "{}") as typeof qaSeed;
  const next = {
    cases: mergeById(current.cases ?? [], qaSeed.cases),
    executions: mergeById(current.executions ?? [], qaSeed.executions),
    defects: mergeById(current.defects ?? [], qaSeed.defects)
  };
  localStorage.setItem("devhub.qaXray", JSON.stringify(next));
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const merged = [...current];
  for (const item of incoming) {
    const index = merged.findIndex((candidate) => candidate.id === item.id);
    if (index >= 0) merged[index] = { ...merged[index], ...item };
    else merged.unshift(item);
  }
  return merged;
}

function readArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T[] : [];
  } catch {
    return [];
  }
}
