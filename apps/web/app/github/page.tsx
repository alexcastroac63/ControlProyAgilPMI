"use client";

import { Card, cn } from "@devhub/ui";
import { Activity, Boxes, CheckCircle2, Copy, GitBranch, GitCommit, GitPullRequest, PlayCircle, Rocket, Server, ShieldCheck, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";

type ProjectSummary = {
  code: string;
  name: string;
  status: string;
};

type BoardItem = {
  id: string;
  projectCode: string;
  status: string;
};

type GithubRepository = {
  id: string;
  projectCode: string;
  owner: string;
  name: string;
  defaultBranch: string;
  branches: number;
  commits: number;
  pullRequests: number;
  openPullRequests: number;
  actions: number;
  successfulActions: number;
  releases: number;
  issuesSynced: number;
  lastSync: string;
};

const projectsStorageKey = "devhub.projects";
const boardStorageKey = "devhub.scrumBoard";
const githubStorageKey = "devhub.githubStats";

const demoProjects: ProjectSummary[] = [
  { code: "PROY", name: "DevOps Hub Core", status: "Desarrollo" },
  { code: "QA", name: "QA Automation", status: "Pruebas" }
];

const demoRepositories: GithubRepository[] = [
  {
    id: "repo-proy-web",
    projectCode: "PROY",
    owner: "enterprise",
    name: "devops-hub-web",
    defaultBranch: "main",
    branches: 8,
    commits: 624,
    pullRequests: 34,
    openPullRequests: 4,
    actions: 156,
    successfulActions: 142,
    releases: 6,
    issuesSynced: 18,
    lastSync: "2026-05-01 18:20"
  },
  {
    id: "repo-proy-api",
    projectCode: "PROY",
    owner: "enterprise",
    name: "devops-hub-api",
    defaultBranch: "main",
    branches: 6,
    commits: 418,
    pullRequests: 21,
    openPullRequests: 3,
    actions: 119,
    successfulActions: 110,
    releases: 4,
    issuesSynced: 12,
    lastSync: "2026-05-01 18:18"
  },
  {
    id: "repo-qa-automation",
    projectCode: "QA",
    owner: "enterprise",
    name: "qa-automation",
    defaultBranch: "main",
    branches: 4,
    commits: 242,
    pullRequests: 13,
    openPullRequests: 2,
    actions: 88,
    successfulActions: 80,
    releases: 2,
    issuesSynced: 9,
    lastSync: "2026-05-01 17:55"
  }
];

const installSteps = [
  {
    title: "Preparar servidor",
    command: "mkdir -p /opt/devhub && cd /opt/devhub"
  },
  {
    title: "Configurar variables",
    command: "cp .env.example .env"
  },
  {
    title: "Crear contenedores",
    command: "docker compose up -d --build"
  },
  {
    title: "Aplicar base de datos",
    command: "docker compose exec api npx prisma migrate deploy"
  },
  {
    title: "Cargar datos iniciales",
    command: "docker compose exec api npx prisma db seed"
  },
  {
    title: "Verificar servicios",
    command: "docker compose ps"
  }
];

const requiredEnv = [
  "DATABASE_URL=postgresql://devhub:devhub@postgres:5432/devhub",
  "JWT_ACCESS_SECRET=<clave-segura-64-caracteres>",
  "JWT_REFRESH_SECRET=<clave-segura-64-caracteres>",
  "JWT_ACCESS_TTL=3h",
  "GITHUB_TOKEN=<token-github-app-o-pat>",
  "WEB_APP_URL=http://servidor:3000",
  "API_PORT=4000",
  "ATTACHMENT_LOCAL_BASE_PATH=C:\\DatosApp"
];

const serviceDocs = [
  {
    name: "devhub-web",
    type: "Frontend",
    port: "3000",
    url: "http://servidor:3000",
    purpose: "Interfaz Next.js para usuarios finales, dashboard, proyectos, backlog, scrum board, QA, GitHub y configuracion.",
    health: "Abrir /login y validar que cargue la pantalla de autenticacion.",
    commands: ["docker compose logs -f web", "docker compose restart web"]
  },
  {
    name: "devhub-api",
    type: "Backend",
    port: "4000",
    url: "http://servidor:4000/api",
    purpose: "API NestJS para autenticacion, proyectos, backlog, sprints, tableros, adjuntos, configuracion e integraciones.",
    health: "Abrir /api/docs para Swagger o ejecutar login contra /api/auth/login.",
    commands: ["docker compose logs -f api", "docker compose restart api"]
  },
  {
    name: "devhub-postgres",
    type: "Base de datos",
    port: "5432",
    url: "postgresql://devhub:*****@postgres:5432/devhub",
    purpose: "PostgreSQL persistente para usuarios, roles, auditoria, proyectos, tickets, sprints, adjuntos y sesiones.",
    health: "Ejecutar docker compose exec postgres pg_isready -U devhub.",
    commands: ["docker compose logs -f postgres", "docker compose exec postgres pg_isready -U devhub"]
  },
  {
    name: "devhub-storage",
    type: "Volumen/ruta",
    port: "N/A",
    url: "C:\\DatosApp o /var/lib/devhub/files",
    purpose: "Ruta del servidor para almacenar archivos adjuntos por proyecto sin guardar binarios en base de datos.",
    health: "Crear o abrir un proyecto y validar que exista su subcarpeta de adjuntos.",
    commands: ["docker compose exec api ls -la /data/devhub", "docker compose exec api mkdir -p /data/devhub"]
  },
  {
    name: "github-webhook",
    type: "Integracion",
    port: "4000",
    url: "http://servidor:4000/api/github/webhook",
    purpose: "Recibe eventos de GitHub para commits, pull requests, merges, releases e issues sincronizados con proyectos.",
    health: "Configurar webhook en GitHub y validar respuesta 2xx en entregas recientes.",
    commands: ["docker compose logs -f api", "curl http://servidor:4000/api/github/webhook"]
  }
];

export default function GithubPage() {
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>(demoProjects);
  const [repositories, setRepositories] = useState<GithubRepository[]>(demoRepositories);
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [selectedProject, setSelectedProject] = useState(demoProjects[0].code);

  useEffect(() => {
    const savedProjects = localStorage.getItem(projectsStorageKey);
    if (savedProjects) {
      const parsedProjects = (JSON.parse(savedProjects) as ProjectSummary[]).filter((project) => project.code && project.name);
      if (parsedProjects.length) {
        setProjects(parsedProjects);
        setSelectedProject((current) => parsedProjects.some((project) => project.code === current) ? current : parsedProjects[0].code);
      }
    }

    const savedStats = localStorage.getItem(githubStorageKey);
    if (savedStats) setRepositories(JSON.parse(savedStats) as GithubRepository[]);

    const savedBoard = localStorage.getItem(boardStorageKey);
    if (savedBoard) setBoardItems(JSON.parse(savedBoard) as BoardItem[]);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(githubStorageKey, JSON.stringify(repositories));
  }, [hydrated, repositories]);

  const project = projects.find((item) => item.code === selectedProject) ?? projects[0];
  const projectRepositories = useMemo(() => repositories.filter((repo) => repo.projectCode === selectedProject), [repositories, selectedProject]);
  const projectBoardItems = useMemo(() => boardItems.filter((item) => item.projectCode === selectedProject), [boardItems, selectedProject]);
  const stats = useMemo(() => {
    const totals = projectRepositories.reduce(
      (sum, repo) => ({
        branches: sum.branches + repo.branches,
        commits: sum.commits + repo.commits,
        pullRequests: sum.pullRequests + repo.pullRequests,
        openPullRequests: sum.openPullRequests + repo.openPullRequests,
        actions: sum.actions + repo.actions,
        successfulActions: sum.successfulActions + repo.successfulActions,
        releases: sum.releases + repo.releases,
        issuesSynced: sum.issuesSynced + repo.issuesSynced
      }),
      { branches: 0, commits: 0, pullRequests: 0, openPullRequests: 0, actions: 0, successfulActions: 0, releases: 0, issuesSynced: 0 }
    );
    const doneStories = projectBoardItems.filter((item) => item.status === "Finalizado").length;
    const pipelineHealth = totals.actions ? Math.round((totals.successfulActions / totals.actions) * 100) : 0;
    return { ...totals, doneStories, pipelineHealth };
  }, [projectRepositories, projectBoardItems]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado");
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">GitHub</h1>
          <p className="mt-1 text-sm text-slate-400">Estadisticas DevOps por proyecto, repositorios conectados e instrucciones de despliegue.</p>
        </div>
        <label className="space-y-2">
          <span className="text-xs text-slate-400">Proyecto</span>
          <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="h-11 min-w-72 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
            {projects.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.name}</option>)}
          </select>
        </label>
      </div>

      <div className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{project?.name ?? "Proyecto"}</h2>
              <p className="text-sm text-slate-400">{project?.code} · Estado {project?.status}</p>
            </div>
          </div>
          <span className="w-fit rounded bg-slate-800 px-3 py-2 text-xs text-slate-300">{projectRepositories.length} repositorios conectados</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Branches" value={stats.branches} icon={GitBranch} tone="cyan" />
        <MetricCard label="Commits" value={stats.commits} icon={GitCommit} tone="emerald" />
        <MetricCard label="Pull Requests abiertos" value={stats.openPullRequests} icon={GitPullRequest} tone="amber" />
        <MetricCard label="Releases" value={stats.releases} icon={Rocket} tone="rose" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-400">Pipelines exitosos</div>
              <div className="mt-2 text-3xl font-semibold">{stats.pipelineHealth}%</div>
            </div>
            <PlayCircle className="h-6 w-6 text-cyan-300" />
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Math.min(stats.pipelineHealth, 100)}%` }} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-400">Issues sincronizados</div>
              <div className="mt-2 text-3xl font-semibold">{stats.issuesSynced}</div>
            </div>
            <Activity className="h-6 w-6 text-emerald-300" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-slate-400">HU finalizadas en Scrum Board</div>
              <div className="mt-2 text-3xl font-semibold">{stats.doneStories}</div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>
        </Card>
      </div>

      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold">Repositorios por proyecto</h2>
          <p className="mt-1 text-sm text-slate-400">Cada repositorio alimenta estadisticas, PRs, Actions, releases e issues sincronizados.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-900 text-xs text-slate-400">
              <tr>
                <th className="px-4 py-3">Repositorio</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Commits</th>
                <th className="px-4 py-3">PR abiertos</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3">Releases</th>
                <th className="px-4 py-3">Ultima sync</th>
              </tr>
            </thead>
            <tbody>
              {projectRepositories.map((repo) => (
                <tr key={repo.id} className="border-t border-slate-800">
                  <td className="px-4 py-4 font-medium">{repo.owner}/{repo.name}</td>
                  <td className="px-4 py-4">{repo.defaultBranch}</td>
                  <td className="px-4 py-4">{repo.commits}</td>
                  <td className="px-4 py-4">{repo.openPullRequests}</td>
                  <td className="px-4 py-4">{repo.successfulActions}/{repo.actions}</td>
                  <td className="px-4 py-4">{repo.releases}</td>
                  <td className="px-4 py-4 text-slate-400">{repo.lastSync}</td>
                </tr>
              ))}
              {projectRepositories.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin repositorios conectados para este proyecto.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-semibold">Instalacion en servidor y contenedores</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">Guia minima para desplegar UI, API y PostgreSQL en un servidor Linux o Windows con Docker.</p>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            {installSteps.map((step, index) => (
              <div key={step.title} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-6 w-6 place-items-center rounded bg-cyan-500/10 text-xs text-cyan-300">{index + 1}</span>
                    {step.title}
                  </div>
                  <button type="button" onClick={() => copy(step.command)} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" title="Copiar">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <code className="block overflow-x-auto rounded bg-slate-950 px-3 py-2 text-xs text-cyan-100">{step.command}</code>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <h3 className="font-semibold">Variables requeridas</h3>
              </div>
              <div className="space-y-2">
                {requiredEnv.map((line) => (
                  <div key={line} className="flex items-center justify-between gap-3 rounded bg-slate-950 px-3 py-2">
                    <code className="min-w-0 truncate text-xs text-slate-300">{line}</code>
                    <button type="button" onClick={() => copy(line)} className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" title="Copiar">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <TerminalSquare className="h-5 w-5 text-cyan-300" />
                <h3 className="font-semibold">Contenedores esperados</h3>
              </div>
              <div className="grid gap-2 text-sm text-slate-300">
                <ContainerRow name="devhub-web" port="3000" description="Next.js UI" />
                <ContainerRow name="devhub-api" port="4000" description="NestJS API, Swagger y WebSockets" />
                <ContainerRow name="devhub-postgres" port="5432" description="PostgreSQL persistente" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-800 bg-slate-900/50">
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-semibold">Servicios y documentacion de uso</h2>
          </div>
          <p className="mt-1 text-sm text-slate-400">Inventario operativo para administrar, verificar y soportar los servicios del sistema.</p>
        </div>
        <div className="grid gap-4 p-4">
          {serviceDocs.map((service) => (
            <article key={service.name} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-base font-semibold text-cyan-200">{service.name}</h3>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{service.type}</span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">Puerto {service.port}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">{service.purpose}</p>
                </div>
                <button type="button" onClick={() => copy(service.url)} className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">
                  <Copy className="h-4 w-4" />
                  Copiar URL
                </button>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="rounded bg-slate-950 px-3 py-3">
                  <div className="mb-2 text-xs font-semibold text-slate-400">URL / recurso</div>
                  <code className="block overflow-x-auto text-xs text-cyan-100">{service.url}</code>
                </div>
                <div className="rounded bg-slate-950 px-3 py-3">
                  <div className="mb-2 text-xs font-semibold text-slate-400">Validacion</div>
                  <p className="text-xs text-slate-300">{service.health}</p>
                </div>
              </div>
              <div className="mt-3 rounded bg-slate-950 px-3 py-3">
                <div className="mb-2 text-xs font-semibold text-slate-400">Comandos de soporte</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {service.commands.map((command) => (
                    <button key={command} type="button" onClick={() => copy(command)} className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-800 px-3 py-2 text-left hover:bg-slate-900">
                      <code className="truncate text-xs text-slate-300">{command}</code>
                      <Copy className="h-4 w-4 shrink-0 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof GitBranch; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const color = {
    cyan: "text-cyan-300 bg-cyan-500/10",
    emerald: "text-emerald-300 bg-emerald-500/10",
    amber: "text-amber-300 bg-amber-500/10",
    rose: "text-rose-300 bg-rose-500/10"
  }[tone];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{label}</div>
          <div className="mt-3 text-3xl font-semibold">{value.toLocaleString("en-US")}</div>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function ContainerRow({ name, port, description }: { name: string; port: string; description: string }) {
  return (
    <div className="grid gap-2 rounded bg-slate-950 px-3 py-2 sm:grid-cols-[160px_80px_1fr]">
      <span className="font-mono text-xs text-cyan-300">{name}</span>
      <span className="font-mono text-xs text-slate-400">:{port}</span>
      <span className="text-xs text-slate-300">{description}</span>
    </div>
  );
}
