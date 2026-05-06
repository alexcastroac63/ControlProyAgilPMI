"use client";

import { Button, Card, Input, cn } from "@devhub/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Code2, ExternalLink, FileArchive, FileJson, FileText, FolderKanban, Image, Link2, Paperclip, Plus, Upload, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/layout/page-loading";
import { api } from "@/lib/api";
import { canSeeProject, getUserAccessContext, UserAccessContext } from "@/lib/access-control";
import { createId } from "@/lib/ids";

type BudgetDetails = {
  id: string;
  type: string;
  description: string;
  amount: number;
};

type ProjectAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  physicalPath?: string;
  kind?: "file" | "sharepoint";
};

type ProjectMember = {
  id: string;
  personId?: string;
  name: string;
  email: string;
  role: string;
  allocation: number;
};

type StoryTask = {
  id: string;
  storyKey: string;
  storyTitle: string;
  title: string;
  assigneeEmail?: string;
  status: string;
};

type ProjectActivity = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  dependencyId?: string;
  dependencyIds?: string[];
  dependencyStartMode?: "next-business-day" | "same-day";
  parentId?: string;
  sprintId?: string;
  kind?: "activity" | "sprint";
  assigneeEmail?: string;
  progress?: number;
  completed?: boolean;
};

type BoardSprint = {
  id: string;
  projectCode: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
};

type GanttScale = "days" | "weeks" | "months";
type GanttLevelFilter = "all" | "N1" | "N2" | "N3";

type Person = {
  id: string;
  name: string;
  email: string;
  defaultRole: string;
};

type Project = {
  id?: string;
  code: string;
  name: string;
  projectIcon?: string;
  thumbnailUrl?: string;
  status: string;
  priority: string;
  budget: string | number;
  sponsor?: string;
  description?: string;
  attachmentPath?: string;
  budgetDetails?: BudgetDetails[] | Record<string, number>;
  attachments?: ProjectAttachment[];
  projectManager?: string;
  staffing?: ProjectMember[];
  storyTasks?: StoryTask[];
  activities?: ProjectActivity[];
};

const costTypes = ["Personal", "Equipos", "Licencias", "Servicios", "Infraestructura", "Capacitacion", "Consultoria", "Otros"];
const memberRoles = ["Encargado del proyecto", "Product Owner", "Scrum Master", "Desarrollador", "QA", "DevOps", "UX/UI", "Viewer"];
const peopleStorageKey = "devhub.people";
const projectsStorageKey = "devhub.projects";
const projectIcons = ["folder", "code", "qa", "portfolio", "rocket"];
const projectStatuses = ["Requerimientos", "Aprobado", "Desarrollo", "Pruebas", "Finalizado", "Cancelado"];
const projectStatusOrder = ["Desarrollo", "Pruebas", "Requerimientos", "Aprobado", "Finalizado", "Cancelado"];
const taskStatuses = ["Pendiente", "Asignada", "En desarrollo", "En revision", "En pruebas", "Finalizada", "Bloqueada"];
const defaultPeopleCatalog: Person[] = [
  { id: "person-1", name: "Alex Admin", email: "admin@devhub.local", defaultRole: "Encargado del proyecto" },
  { id: "person-2", name: "Diana Developer", email: "diana.dev@devhub.local", defaultRole: "Desarrollador" },
  { id: "person-3", name: "Marco Frontend", email: "marco.frontend@devhub.local", defaultRole: "Desarrollador" },
  { id: "person-4", name: "Sofia QA", email: "sofia.qa@devhub.local", defaultRole: "QA" },
  { id: "person-5", name: "Laura QA Lead", email: "laura.qa@devhub.local", defaultRole: "Encargado del proyecto" },
  { id: "person-6", name: "Ivan Automation", email: "ivan.auto@devhub.local", defaultRole: "Desarrollador" }
];

const demo: Project[] = [
  {
    id: "demo-proy",
    code: "PROY",
    name: "DevOps Hub Core",
    projectIcon: "code",
    status: "Desarrollo",
    priority: "CRITICAL",
    budget: 280000,
    sponsor: "CTO Office",
    projectManager: "Alex Admin",
    staffing: [
      { id: "member-1", personId: "person-1", name: "Alex Admin", email: "admin@devhub.local", role: "Encargado del proyecto", allocation: 40 },
      { id: "member-2", personId: "person-2", name: "Diana Developer", email: "diana.dev@devhub.local", role: "Desarrollador", allocation: 100 },
      { id: "member-3", personId: "person-3", name: "Marco Frontend", email: "marco.frontend@devhub.local", role: "Desarrollador", allocation: 80 },
      { id: "member-4", personId: "person-4", name: "Sofia QA", email: "sofia.qa@devhub.local", role: "QA", allocation: 60 }
    ],
    storyTasks: [
      { id: "task-1", storyKey: "PROY-1", storyTitle: "Autenticacion local", title: "Crear endpoints login y refresh token", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" },
      { id: "task-2", storyKey: "PROY-1", storyTitle: "Autenticacion local", title: "Validar bloqueo por intentos fallidos", assigneeEmail: "sofia.qa@devhub.local", status: "En pruebas" },
      { id: "task-3", storyKey: "PROY-2", storyTitle: "Board Scrum", title: "Implementar columnas configurables", assigneeEmail: "marco.frontend@devhub.local", status: "En desarrollo" },
      { id: "task-4", storyKey: "PROY-2", storyTitle: "Board Scrum", title: "Conectar movimiento con WebSocket", assigneeEmail: "diana.dev@devhub.local", status: "Asignada" }
    ],
    description: "Plataforma SaaS corporativa para portafolio, delivery agil, QA, DevOps y reporting ejecutivo.",
    activities: [
      { id: "act-proy-1", name: "Inicio y levantamiento", description: "Definicion inicial del alcance antes de sprints.", startDate: "2026-04-01", endDate: "2026-04-12", kind: "activity" },
      { id: "act-proy-2", name: "Preparacion release", description: "Cierre posterior a sprints y preparacion de salida.", startDate: "2026-06-01", endDate: "2026-06-10", dependencyId: "act-proy-1", kind: "activity" }
    ],
    attachmentPath: "storage/projects/demo-proy",
    budgetDetails: [
      { id: "cost-1", type: "Personal", description: "Equipo core de desarrollo", amount: 165000 },
      { id: "cost-2", type: "Equipos", description: "Laptops y perifericos", amount: 28000 },
      { id: "cost-3", type: "Licencias", description: "Repos, CI/CD, monitoreo y BI", amount: 42000 },
      { id: "cost-4", type: "Servicios", description: "Soporte cloud y seguridad", amount: 25000 },
      { id: "cost-5", type: "Otros", description: "Reserva operativa", amount: 20000 }
    ],
    attachments: [
      { id: "att-1", fileName: "business-case.pdf", mimeType: "application/pdf", size: 842120, url: "storage/projects/demo-proy/business-case.pdf", kind: "file" },
      { id: "att-2", fileName: "architecture.json", mimeType: "application/json", size: 12844, url: "storage/projects/demo-proy/architecture.json", kind: "file" },
      { id: "att-3", fileName: "Plan maestro SharePoint", mimeType: "text/sharepoint-link", size: 0, url: "https://contoso.sharepoint.com/sites/devhub/Shared%20Documents/plan-maestro.docx", kind: "sharepoint" }
    ]
  },
  {
    id: "demo-qa",
    code: "QA",
    name: "QA Automation",
    projectIcon: "qa",
    status: "Requerimientos",
    priority: "HIGH",
    budget: 120000,
    sponsor: "Delivery Office",
    projectManager: "Laura QA Lead",
    staffing: [
      { id: "member-5", personId: "person-5", name: "Laura QA Lead", email: "laura.qa@devhub.local", role: "Encargado del proyecto", allocation: 50 },
      { id: "member-6", personId: "person-6", name: "Ivan Automation", email: "ivan.auto@devhub.local", role: "Desarrollador", allocation: 80 }
    ],
    storyTasks: [
      { id: "task-5", storyKey: "QA-1", storyTitle: "Suite de regresion", title: "Diseñar casos criticos", assigneeEmail: "laura.qa@devhub.local", status: "Asignada" },
      { id: "task-6", storyKey: "QA-1", storyTitle: "Suite de regresion", title: "Automatizar smoke tests", assigneeEmail: "ivan.auto@devhub.local", status: "En desarrollo" }
    ],
    description: "Automatizacion de pruebas funcionales, regresion y evidencias para releases mensuales.",
    activities: [
      { id: "act-qa-1", name: "Plan QA inicial", description: "Estrategia y alcance de automatizacion.", startDate: "2026-04-20", endDate: "2026-04-30", kind: "activity" }
    ],
    attachmentPath: "storage/projects/demo-qa",
    budgetDetails: [
      { id: "cost-6", type: "Personal", description: "QA automation engineers", amount: 74000 },
      { id: "cost-7", type: "Equipos", description: "Dispositivos de prueba", amount: 12000 },
      { id: "cost-8", type: "Licencias", description: "Testing cloud y reportes", amount: 21000 },
      { id: "cost-9", type: "Servicios", description: "Ejecuciones externas", amount: 8000 },
      { id: "cost-10", type: "Otros", description: "Contingencia", amount: 5000 }
    ],
    attachments: []
  }
];

export default function ProjectsPage() {
  const router = useRouter();
  const [routeProjectCode, setRouteProjectCode] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [accessContext, setAccessContext] = useState<UserAccessContext | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [collapsedStatus, setCollapsedStatus] = useState<Record<string, boolean>>(() => Object.fromEntries(projectStatusOrder.map((status) => [status, status !== "Desarrollo"])));
  const [draftProject, setDraftProject] = useState<Project>({
    id: "",
    code: "",
    name: "",
    projectIcon: "folder",
    status: "Requerimientos",
    priority: "MEDIUM",
    budget: 0,
    sponsor: "",
    description: "",
    budgetDetails: [],
    staffing: [],
    storyTasks: [],
    activities: [],
    attachments: []
  });
  const { data } = useQuery({ queryKey: ["projects"], queryFn: () => api<Project[]>("/projects"), retry: false });
  const projects = useMemo(() => {
    const mergedProjects = (() => {
      if (!data?.length) return localProjects;
    const localByCode = new Map(localProjects.map((project) => [project.code, project]));
    const merged = data.map((project) => ({ ...project, ...(localByCode.get(project.code) ?? {}) }));
    const apiCodes = new Set(data.map((project) => project.code));
    return [...localProjects.filter((project) => !apiCodes.has(project.code)), ...merged];
    })();
    return accessContext ? mergedProjects.filter((project) => canSeeProject(project, accessContext)) : mergedProjects;
  }, [accessContext, data, localProjects]);
  const groupedProjects = groupProjectsByStatus(projects);
  const activeSelectedCode = selectedCode ?? routeProjectCode;
  const selectedProject = activeSelectedCode ? projects.find((project) => project.code === activeSelectedCode) : null;

  useEffect(() => {
    const saved = localStorage.getItem(projectsStorageKey);
    if (saved) setLocalProjects((JSON.parse(saved) as Project[]).map(normalizeProjectStatus));
    setRouteProjectCode(new URLSearchParams(window.location.search).get("project"));
    setAccessContext(getUserAccessContext());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(projectsStorageKey, JSON.stringify(localProjects));
  }, [hydrated, localProjects]);

  function updateLocal(project: Project) {
    setLocalProjects((current) => {
      const exists = current.some((item) => item.code === project.code);
      return exists ? current.map((item) => (item.code === project.code ? project : item)) : [project, ...current];
    });
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = draftProject.code.trim().toUpperCase();
    if (!code || !draftProject.name.trim()) {
      toast.error("Ingresa codigo y nombre del proyecto");
      return;
    }
    if (localProjects.some((project) => project.code === code)) {
      toast.error("Ya existe un proyecto con ese codigo");
      return;
    }
    let attachmentPath = `C:\\DatosApp\\${code}`;
    try {
      const storage = await api<{ provider: "local" | "sharepoint"; path: string; folderName: string }>("/settings/storage/project-folder", {
        method: "POST",
        body: JSON.stringify({ projectCode: code, projectName: draftProject.name.trim() })
      });
      attachmentPath = storage.path;
    } catch (error) {
      toast.error(error instanceof Error && error.message ? `No se pudo crear la carpeta del proyecto: ${error.message}` : "No se pudo crear la carpeta del proyecto");
      return;
    }
    const project: Project = {
      ...draftProject,
      id: createId("project"),
      code,
      name: draftProject.name.trim(),
      attachmentPath,
      budget: Number(draftProject.budget || 0),
      budgetDetails: normalizeCosts(draftProject.budgetDetails),
      staffing: normalizeMembers(draftProject.staffing),
      attachments: []
    };
    setLocalProjects((current) => [project, ...current]);
    setDraftProject({ id: "", code: "", name: "", projectIcon: "folder", status: "Requerimientos", priority: "MEDIUM", budget: 0, sponsor: "", description: "", budgetDetails: [], staffing: [], activities: [], attachments: [] });
    setShowCreate(false);
    toast.success(`Proyecto creado. Carpeta: ${attachmentPath}`);
  }

  function loadProjectThumbnail(file: File | undefined, onChange: (value: string) => void) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen valida");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  if (selectedProject) {
    return <ProjectAdmin project={selectedProject} onBack={() => { setSelectedCode(null); router.push("/projects"); }} onLocalUpdate={updateLocal} />;
  }

  return (
    <AppShell>
      {!hydrated ? (
        <PageLoading message="Cargando proyectos reales..." />
      ) : (
      <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Administracion de Proyectos</h1>
          <p className="mt-1 text-sm text-slate-400">Crea proyectos, administra miniatura, equipo, adjuntos y costos.</p>
          {accessContext?.restrictToAssignedProjects && <p className="mt-1 text-xs text-cyan-300">Vista limitada a proyectos donde estas asignado.</p>}
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}><Plus className="h-4 w-4" />Nuevo proyecto</Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <h2 className="mb-4 text-lg font-medium">Crear proyecto</h2>
          <form onSubmit={createProject} className="grid gap-4 xl:grid-cols-[220px_1fr]">
            <ProjectVisualPicker
              icon={draftProject.projectIcon ?? "folder"}
              thumbnailUrl={draftProject.thumbnailUrl}
              onIconChange={(projectIcon) => setDraftProject((value) => ({ ...value, projectIcon }))}
              onThumbnailChange={(file) => loadProjectThumbnail(file, (thumbnailUrl) => setDraftProject((value) => ({ ...value, thumbnailUrl })))}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input value={draftProject.code} onChange={(event) => setDraftProject((value) => ({ ...value, code: event.target.value }))} placeholder="Codigo" />
              <Input value={draftProject.name} onChange={(event) => setDraftProject((value) => ({ ...value, name: event.target.value }))} placeholder="Nombre del proyecto" className="md:col-span-2" />
              <Input value={draftProject.sponsor ?? ""} onChange={(event) => setDraftProject((value) => ({ ...value, sponsor: event.target.value }))} placeholder="Sponsor" />
              <select value={draftProject.status} onChange={(event) => setDraftProject((value) => ({ ...value, status: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                {projectStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={draftProject.priority} onChange={(event) => setDraftProject((value) => ({ ...value, priority: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              <textarea value={draftProject.description ?? ""} onChange={(event) => setDraftProject((value) => ({ ...value, description: event.target.value }))} placeholder="Descripcion general" className="min-h-24 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-3" />
              <div className="flex justify-end gap-2 md:col-span-3">
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
                <Button type="submit">Crear proyecto</Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {groupedProjects.map((group) => (
          <Card key={group.status} className="p-0">
            <button
              type="button"
              onClick={() => setCollapsedStatus((value) => ({ ...value, [group.status]: !value[group.status] }))}
              className="flex w-full items-center justify-between gap-4 border-b border-slate-800 p-4 text-left hover:bg-slate-900"
            >
              <div>
                <h2 className="text-lg font-medium">{group.status}</h2>
                <p className="mt-1 text-sm text-slate-500">{group.projects.length} proyectos</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded bg-slate-800 px-2 py-1 text-xs">{group.projects.length}</span>
                <ChevronDown className={cn("h-4 w-4 transition", collapsedStatus[group.status] && "-rotate-90")} />
              </div>
            </button>
            {!collapsedStatus[group.status] && (
              <>
                <div className="space-y-3 p-3 md:hidden">
                  {group.projects.map((project) => (
                    <a
                      key={project.code}
                      href={`/projects?project=${encodeURIComponent(project.code)}`}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left active:border-cyan-400"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <ProjectAvatar project={project} />
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-cyan-300">{project.code}</div>
                            <div className="mt-1 truncate font-semibold">{project.name}</div>
                          </div>
                        </div>
                        <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
                        <div>
                          <span className="block text-slate-500">Encargado</span>
                          <span className="text-slate-200">{getProjectLead(project)?.name ?? project.projectManager ?? "Sin asignar"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Presupuesto</span>
                          <span className="text-slate-200">${Number(project.budget).toLocaleString("en-US")}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Prioridad</span>
                          <span className="text-slate-200">{project.priority}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500">Adjuntos</span>
                          <span className="text-slate-200">{project.attachments?.length ?? 0}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
                <table className="hidden w-full text-left text-sm md:table">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr><th className="p-4">Proyecto</th><th>Nombre</th><th>Encargado</th><th>Prioridad</th><th>Presupuesto</th><th>Sponsor</th><th>Adjuntos</th></tr>
                  </thead>
                  <tbody>
                    {group.projects.map((project) => (
                      <tr key={project.code} onClick={() => setSelectedCode(project.code)} className="cursor-pointer border-b border-slate-900 hover:bg-slate-900/70">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <ProjectAvatar project={project} />
                            <span className="font-mono text-cyan-300">{project.code}</span>
                          </div>
                        </td>
                        <td>{project.name}</td>
                        <td>{getProjectLead(project)?.name ?? project.projectManager ?? "Sin asignar"}</td>
                        <td>{project.priority}</td>
                        <td>${Number(project.budget).toLocaleString("en-US")}</td>
                        <td>{project.sponsor}</td>
                        <td>{project.attachments?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Card>
        ))}
        {projects.length === 0 && (
          <Card className="grid min-h-48 place-items-center text-center">
            <div>
              <h2 className="text-lg font-semibold">No hay proyectos creados</h2>
              <p className="mt-2 text-sm text-slate-400">Crea el primer proyecto para comenzar a cargar informacion real.</p>
            </div>
          </Card>
        )}
      </div>
      </>
      )}
    </AppShell>
  );
}

function ProjectAdmin({ project, onBack, onLocalUpdate }: { project: Project; onBack: () => void; onLocalUpdate: (project: Project) => void }) {
  const [current, setCurrent] = useState<Project>(() => ({ ...project, budgetDetails: normalizeCosts(project.budgetDetails), staffing: normalizeMembers(project.staffing) }));
  const [peopleCatalog, setPeopleCatalog] = useState<Person[]>(defaultPeopleCatalog);
  const [sharePointLabel, setSharePointLabel] = useState("");
  const [sharePointUrl, setSharePointUrl] = useState("");
  const [editingProjectVisual, setEditingProjectVisual] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [activeProjectTab, setActiveProjectTab] = useState<"info" | "activities">("info");
  const [activityView, setActivityView] = useState<"list" | "gantt">("list");
  const [attachmentTab, setAttachmentTab] = useState<"upload" | "sharepoint">("upload");
  const [collapsedRoles, setCollapsedRoles] = useState<Record<string, boolean>>(() => Object.fromEntries(memberRoles.map((role) => [role, true])));
  const [costsCollapsed, setCostsCollapsed] = useState(true);
  const [attachmentsCollapsed, setAttachmentsCollapsed] = useState(true);
  const [staffingCollapsed, setStaffingCollapsed] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState(defaultPeopleCatalog[0]?.id ?? "");
  const [selectedRole, setSelectedRole] = useState("Desarrollador");
  const [selectedAllocation, setSelectedAllocation] = useState(100);
  const [taskDraft, setTaskDraft] = useState<StoryTask>({ id: "", storyKey: "", storyTitle: "", title: "", assigneeEmail: "", status: "Pendiente" });
  const costs = normalizeCosts(current.budgetDetails);
  const members = normalizeMembers(current.staffing);
  const storyTasks = normalizeStoryTasks(current.storyTasks);
  const availablePeople = peopleCatalog.filter((person) => !members.some((member) => member.personId === person.id || member.email === person.email));
  const lead = getProjectLead(current);
  const activities = rollupActivitySummaries(normalizeActivities(current.activities));
  const developers = members.filter((member) => member.role === "Desarrollador");
  const groupedMembers = useMemo(() => groupMembersByRole(members), [members]);
  const taskAssignments = useMemo(() => buildTaskAssignments(members, storyTasks), [members, storyTasks]);
  const total = useMemo(() => costs.reduce((sum, item) => sum + Number(item.amount || 0), 0), [costs]);

  useEffect(() => {
    const saved = localStorage.getItem(peopleStorageKey);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Array<Person & { firstName?: string; lastName?: string }>;
    const catalog = parsed.map((person) => ({
      id: person.id,
      name: person.name ?? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(),
      email: person.email,
      defaultRole: person.defaultRole
    }));
    setPeopleCatalog(catalog);
    setSelectedPersonId(catalog.find((person) => !members.some((member) => member.personId === person.id))?.id ?? "");
  }, []);

  useEffect(() => {
    const currentActivities = normalizeActivities(current.activities);
    const synced = rollupActivitySummaries(syncSprintActivities(currentActivities, current.code, lead));
    if (JSON.stringify(currentActivities) === JSON.stringify(synced)) return;
    setCurrent((value) => {
      const updated = { ...value, activities: synced };
      onLocalUpdate(updated);
      return updated;
    });
  }, [current.code, lead?.email]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const budgetDetails = costs.filter((item) => item.type && Number(item.amount) > 0);
    const updatedTotal = budgetDetails.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const updated: Project = {
      ...current,
      description: current.description ?? "",
      status: current.status,
      budget: updatedTotal,
      budgetDetails,
      projectManager: lead?.name,
      staffing: members,
      storyTasks
    };
    setCurrent(updated);
    onLocalUpdate(updated);
    if (current.id && !current.id.startsWith("demo")) {
      await api(`/projects/${current.id}`, { method: "PATCH", body: JSON.stringify({ description: updated.description, status: updated.status, budget: updatedTotal, budgetDetails, projectManager: updated.projectManager, staffing: members, storyTasks }) });
    }
    toast.success("Informacion del proyecto actualizada");
  }

  function updateProjectAuto(patch: Partial<Project>) {
    const updated = { ...current, ...patch };
    setCurrent(updated);
    onLocalUpdate(updated);
    if (updated.id && !updated.id.startsWith("demo") && ("description" in patch || "status" in patch || "name" in patch || "projectIcon" in patch || "thumbnailUrl" in patch)) {
      void api(`/projects/${updated.id}`, { method: "PATCH", body: JSON.stringify({ description: updated.description ?? "", status: updated.status, name: updated.name, projectIcon: updated.projectIcon, thumbnailUrl: updated.thumbnailUrl }) });
    }
  }

  function loadThumbnail(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen valida");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateProjectAuto({ thumbnailUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  function addCost() {
    setCurrent((value) => ({
      ...value,
      budgetDetails: [...normalizeCosts(value.budgetDetails), { id: createId("cost"), type: "Personal", description: "", amount: 0 }]
    }));
  }

  function updateCost(id: string, patch: Partial<BudgetDetails>) {
    setCurrent((value) => ({
      ...value,
      budgetDetails: normalizeCosts(value.budgetDetails).map((item) => (item.id === id ? { ...item, ...patch } : item))
    }));
  }

  function removeCost(id: string) {
    setCurrent((value) => ({
      ...value,
      budgetDetails: normalizeCosts(value.budgetDetails).filter((item) => item.id !== id)
    }));
  }

  function addMember() {
    const person = peopleCatalog.find((item) => item.id === selectedPersonId);
    if (!person) {
      toast.error("Selecciona un participante existente");
      return;
    }
    if (members.some((member) => member.personId === person.id || member.email === person.email)) {
      toast.error("El participante ya esta asociado al proyecto");
      return;
    }
    const member: ProjectMember = {
      id: createId("member"),
      personId: person.id,
      name: person.name,
      email: person.email,
      role: selectedRole || person.defaultRole,
      allocation: Number(selectedAllocation || 0)
    };
    const nextMembers = [...members, member];
    setCurrent((value) => ({
      ...value,
      projectManager: member.role === "Encargado del proyecto" ? member.name : value.projectManager,
      staffing: nextMembers
    }));
    setSelectedPersonId(peopleCatalog.find((item) => !nextMembers.some((assigned) => assigned.personId === item.id))?.id ?? "");
    setSelectedRole("Desarrollador");
    setSelectedAllocation(100);
    toast.success("Participante asociado al proyecto");
  }

  function updateMember(id: string, patch: Partial<ProjectMember>) {
    setCurrent((value) => {
      const nextMembers = members.map((member) => (member.id === id ? { ...member, ...patch } : member));
      return {
        ...value,
        projectManager: getProjectLead({ ...value, staffing: nextMembers })?.name,
        staffing: nextMembers
      };
    });
  }

  function removeMember(id: string) {
    setCurrent((value) => {
      const nextMembers = members.filter((member) => member.id !== id);
      return {
        ...value,
        projectManager: getProjectLead({ ...value, staffing: nextMembers })?.name,
        staffing: nextMembers
      };
    });
  }

  function addStoryTask() {
    if (!taskDraft.storyKey.trim() || !taskDraft.title.trim()) {
      toast.error("Ingresa historia y tarea");
      return;
    }
    const task: StoryTask = {
      ...taskDraft,
      id: createId("sharepoint"),
      storyKey: taskDraft.storyKey.trim().toUpperCase(),
      storyTitle: taskDraft.storyTitle.trim() || "Historia de usuario",
      title: taskDraft.title.trim()
    };
    setCurrent((value) => ({ ...value, storyTasks: [...normalizeStoryTasks(value.storyTasks), task] }));
    setTaskDraft({ id: "", storyKey: "", storyTitle: "", title: "", assigneeEmail: "", status: "Pendiente" });
    toast.success("Tarea asociada a historia");
  }

  function updateStoryTask(id: string, patch: Partial<StoryTask>) {
    setCurrent((value) => ({
      ...value,
      storyTasks: normalizeStoryTasks(value.storyTasks).map((task) => (task.id === id ? { ...task, ...patch } : task))
    }));
  }

  function removeStoryTask(id: string) {
    setCurrent((value) => ({
      ...value,
      storyTasks: normalizeStoryTasks(value.storyTasks).filter((task) => task.id !== id)
    }));
  }

  async function uploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    const allowed = ["application/pdf", "application/json", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Formato no permitido");
      return;
    }
    const thumbnailUrl = await createAttachmentThumbnail(file);
    const body = new FormData();
    body.append("file", file);
    body.append("projectCode", current.code);
    body.append("projectName", current.name);
    let stored: { path?: string; url?: string; physicalPath?: string; fileName?: string; mimeType?: string; size?: number };
    try {
      const response = await fetch("/api/settings/storage/project-file", {
        method: "POST",
        body,
        credentials: "include"
      });
      if (!response.ok) throw new Error(await response.text());
      stored = await response.json();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? `No se pudo guardar el archivo: ${error.message}` : "No se pudo guardar el archivo");
      return;
    }
    const localAttachment: ProjectAttachment = {
      id: createId("attachment"),
      fileName: stored.fileName ?? file.name,
      mimeType: stored.mimeType ?? file.type,
      size: stored.size ?? file.size,
      url: normalizeAttachmentUrl(stored.url ?? `${stored.path ?? current.attachmentPath ?? `C:\\DatosApp\\${current.code}`}\\${file.name}`),
      thumbnailUrl,
      physicalPath: stored.physicalPath,
      kind: "file"
    };
    const updated = { ...current, attachmentPath: stored.path ?? current.attachmentPath ?? `C:\\DatosApp\\${current.code}`, attachments: [...(current.attachments ?? []), localAttachment] };
    setCurrent(updated);
    onLocalUpdate(updated);
    toast.success("Archivo agregado al almacen del proyecto");
  }

  function addSharePointLink() {
    const label = sharePointLabel.trim() || "Documento SharePoint";
    const url = sharePointUrl.trim();
    if (!url || !url.includes("sharepoint.com")) {
      toast.error("Ingresa un enlace valido de SharePoint");
      return;
    }
    const link: ProjectAttachment = {
      id: createId("activity"),
      fileName: label,
      mimeType: "text/sharepoint-link",
      size: 0,
      url,
      kind: "sharepoint"
    };
    const updated = { ...current, attachments: [...(current.attachments ?? []), link] };
    setCurrent(updated);
    onLocalUpdate(updated);
    setSharePointLabel("");
    setSharePointUrl("");
    toast.success("Enlace de SharePoint agregado");
  }

  function removeAttachment(id: string) {
    const updated = {
      ...current,
      attachments: (current.attachments ?? []).filter((file) => file.id !== id)
    };
    setCurrent(updated);
    onLocalUpdate(updated);
    toast.success("Adjunto eliminado");
  }

  function updateActivities(nextActivities: ProjectActivity[]) {
    const updated = { ...current, activities: rollupActivitySummaries(nextActivities) };
    setCurrent(updated);
    onLocalUpdate(updated);
  }

  function addActivity(activityDraftInput: ProjectActivity) {
    if (!activityDraftInput.name.trim()) {
      toast.error("Ingresa el nombre de la actividad");
      return;
    }
    const activity: ProjectActivity = {
      id: createId("activity"),
      name: activityDraftInput.name.trim(),
      description: activityDraftInput.description.trim(),
      startDate: activityDraftInput.startDate,
      endDate: activityDraftInput.endDate,
      dependencyId: activityDraftInput.dependencyId || undefined,
      dependencyIds: normalizeDependencyIds(activityDraftInput),
      dependencyStartMode: activityDraftInput.dependencyStartMode ?? "next-business-day",
      parentId: activityDraftInput.parentId || undefined,
      assigneeEmail: activityDraftInput.assigneeEmail || undefined,
      progress: clampProgress(activityDraftInput.progress ?? 0),
      completed: Boolean(activityDraftInput.completed || activityDraftInput.progress === 100),
      sprintId: activityDraftInput.sprintId || undefined,
      kind: activityDraftInput.kind === "sprint" ? "sprint" : "activity"
    };
    updateActivities([...activities, activity]);
    toast.success("Actividad agregada");
  }

  function updateActivity(id: string, patch: Partial<ProjectActivity>) {
    updateActivities(activities.map((activity) => (activity.id === id ? { ...activity, ...patch } : activity)));
  }

  function removeActivity(id: string) {
    const target = activities.find((activity) => activity.id === id);
    if (target?.kind === "sprint") {
      if (activities.some((activity) => activity.parentId === id)) {
        toast.error("Solo puedes eliminar sprints vinculados sin sub actividades");
        return;
      }
      if (target.sprintId && sprintHasBoardItems(target.sprintId)) {
        toast.error("Solo puedes eliminar sprints vacios");
        return;
      }
    }
    updateActivities(activities
      .filter((activity) => activity.id !== id && activity.parentId !== id)
      .map((activity) => {
        const dependencyIds = normalizeDependencyIds(activity).filter((dependencyId) => dependencyId !== id);
        return {
          ...activity,
          dependencyId: dependencyIds[0],
          dependencyIds
        };
      }));
  }

  function addSprintsAsActivities() {
    const saved = localStorage.getItem("devhub.boardSprints");
    const boardSprints = saved ? JSON.parse(saved) as BoardSprint[] : [];
    const sprintActivities = boardSprints
      .filter((sprint) => sprint.projectCode === current.code)
      .filter((sprint) => !activities.some((activity) => activity.id === `sprint-activity-${sprint.id}`))
      .map((sprint) => ({
        id: `sprint-activity-${sprint.id}`,
        name: sprint.name,
        description: sprint.goal ?? "Sprint vinculado al proyecto",
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        sprintId: sprint.id,
        assigneeEmail: lead?.email,
        kind: "sprint" as const
      }));
    if (sprintActivities.length === 0) {
      toast.error("No hay sprints nuevos para vincular");
      return;
    }
    updateActivities([...activities, ...sprintActivities]);
    toast.success("Sprints vinculados como actividades");
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
          <button type="button" onClick={() => setEditingProjectVisual(true)} className="rounded-md outline-none ring-cyan-500 transition hover:ring-2" title="Cambiar icono o miniatura del proyecto">
            <ProjectAvatar project={current} />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-3xl font-semibold">{current.code} -</span>
            {editingProjectName ? (
              <Input value={current.name} onChange={(event) => updateProjectAuto({ name: event.target.value })} onBlur={() => setEditingProjectName(false)} autoFocus className="min-w-72 text-lg font-semibold" />
            ) : (
              <button type="button" onClick={() => setEditingProjectName(true)} className="min-w-0 truncate text-left text-3xl font-semibold hover:text-cyan-300" title="Modificar nombre del proyecto">
                {current.name}
              </button>
            )}
          </div>
          <span className="text-sm text-slate-400">Estado</span>
          <select
            value={current.status}
            onChange={(event) => updateProjectAuto({ status: event.target.value })}
            className="h-10 w-fit rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500"
          >
            {projectStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </div>
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" />Volver</Button>
      </div>

      {editingProjectVisual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium">Icono del proyecto</h2>
              <Button type="button" variant="secondary" onClick={() => setEditingProjectVisual(false)}>Cerrar</Button>
            </div>
            <ProjectVisualPicker
              icon={current.projectIcon ?? "folder"}
              thumbnailUrl={current.thumbnailUrl}
              onIconChange={(projectIcon) => updateProjectAuto({ projectIcon })}
              onThumbnailChange={loadThumbnail}
            />
          </div>
        </div>
      )}

      <div className="mb-4 flex rounded-md border border-slate-800 bg-slate-950 p-1">
        <button type="button" onClick={() => setActiveProjectTab("info")} className={cn("rounded px-4 py-2 text-sm", activeProjectTab === "info" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}>Informacion</button>
        <button type="button" onClick={() => setActiveProjectTab("activities")} className={cn("rounded px-4 py-2 text-sm", activeProjectTab === "activities" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}>Actividades</button>
      </div>

      {activeProjectTab === "info" ? (
      <div className="space-y-4">
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-medium">Descripcion general</h2>
          </div>
          <AutoResizeTextarea value={current.description ?? ""} onChange={(event) => updateProjectAuto({ description: event.target.value })} placeholder="Describe alcance, objetivos, contexto, supuestos, restricciones y entregables principales del proyecto." />
        </Card>

        <Card>
          <button type="button" onClick={() => setAttachmentsCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
            <div>
              <h2 className="text-lg font-medium">Almacen de adjuntos</h2>
              <div className="mt-1 text-xs text-slate-500">Archivos almacenados en la ruta configurada para el proyecto</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded bg-slate-800 px-3 py-2 text-sm text-slate-300">{(current.attachments ?? []).length} archivos</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", attachmentsCollapsed && "-rotate-90")} />
            </div>
          </button>
          {!attachmentsCollapsed && (
            <>
              <div className="mt-4 rounded-md border border-slate-800">
                <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
                  <button
                    type="button"
                    onClick={() => setAttachmentTab("upload")}
                    className={cn("flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium", attachmentTab === "upload" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}
                  >
                    <Upload className="h-4 w-4" />
                    Adjuntar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentTab("sharepoint")}
                    className={cn("flex flex-1 items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium", attachmentTab === "sharepoint" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}
                  >
                    <Link2 className="h-4 w-4" />
                    SharePoint
                  </button>
                </div>
                <div className="p-4">
                  {attachmentTab === "upload" ? (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-700 p-5 text-center hover:border-cyan-500">
                      <Upload className="h-7 w-7 text-cyan-300" />
                      <span className="text-sm text-slate-300">PDF, JSON, imagenes o Word</span>
                      <span className="text-xs text-slate-500">Se generara miniatura para imagenes. Otros archivos usan icono por extension.</span>
                      <input className="hidden" type="file" accept=".pdf,.json,.png,.jpg,.jpeg,.webp,.doc,.docx,application/pdf,application/json,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadFile} />
                    </label>
                  ) : (
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-cyan-300" />Enlace SharePoint</div>
                      <Input value={sharePointLabel} onChange={(event) => setSharePointLabel(event.target.value)} placeholder="Nombre visible del enlace" />
                      <Input value={sharePointUrl} onChange={(event) => setSharePointUrl(event.target.value)} type="url" placeholder="https://...sharepoint.com/..." />
                      <Button type="button" variant="secondary" onClick={addSharePointLink}>Agregar enlace</Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {groupAttachmentsByType(current.attachments ?? []).map((group) => (
                  <AttachmentGroup key={group.type} group={group} onRemove={removeAttachment} />
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <button type="button" onClick={() => setStaffingCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
            <div>
              <h2 className="text-lg font-medium">Encargados y desarrolladores</h2>
              <p className="mt-1 text-sm text-slate-400">Encargado: {lead?.name ?? current.projectManager ?? "Sin asignar"}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded bg-slate-800 px-3 py-2 text-sm text-slate-300">{members.length} integrantes</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", staffingCollapsed && "-rotate-90")} />
            </div>
          </button>
          {!staffingCollapsed && (
            <>
              <div className="mt-4 grid gap-3 rounded-md border border-slate-800 p-3 md:grid-cols-[1fr_200px_auto]">
                <select value={selectedPersonId} onChange={(event) => setSelectedPersonId(event.target.value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                  {availablePeople.length === 0 && <option value="">No hay participantes disponibles</option>}
                  {availablePeople.map((person) => <option key={person.id} value={person.id}>{person.name} - {person.email}</option>)}
                </select>
                <select value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                  {memberRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <Button type="button" variant="secondary" onClick={addMember} disabled={!selectedPersonId}>Asociar</Button>
              </div>

              <div className="mt-4 space-y-3">
                {groupedMembers.map((group) => (
                  <div key={group.role} className="rounded-md border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCollapsedRoles((value) => ({ ...value, [group.role]: !value[group.role] }))}
                      className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-900"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("grid h-9 w-9 place-items-center rounded-md", group.role === "Desarrollador" ? "bg-lime-500/10 text-lime-300" : "bg-cyan-500/10 text-cyan-300")}>
                          {group.role === "Desarrollador" ? <Code2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="font-medium">{group.role}</div>
                          <div className="text-xs text-slate-500">{group.members.length} personas</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-slate-800 px-2 py-1 text-xs">{group.members.length}</span>
                        <ChevronDown className={cn("h-4 w-4 transition", collapsedRoles[group.role] && "-rotate-90")} />
                      </div>
                    </button>
                    {!collapsedRoles[group.role] && (
                      <div className="divide-y divide-slate-900 border-t border-slate-800">
                        {group.members.map((member) => (
                          <div key={member.id} className="grid gap-3 p-3 md:grid-cols-[1fr_220px_auto] md:items-center">
                            <div className="font-medium">{member.name}</div>
                            <select value={member.role} onChange={(event) => updateMember(member.id, { role: event.target.value })} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                              {memberRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                            </select>
                            <Button type="button" variant="secondary" onClick={() => removeMember(member.id)}>Eliminar</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Metric label="Integrantes" value={String(members.length)} />
                <Metric label="Desarrolladores" value={String(developers.length)} />
              </div>
            </>
          )}
        </Card>

        <Card>
          <button type="button" onClick={() => setCostsCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left">
            <div>
              <h2 className="text-lg font-medium">Presupuesto y detalle de costos</h2>
              <div className="mt-1 text-xs text-slate-500">{costs.length} costos registrados</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xl font-semibold text-cyan-300">${total.toLocaleString("en-US")}</div>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", costsCollapsed && "-rotate-90")} />
            </div>
          </button>
          {!costsCollapsed && (
            <>
              <div className="mt-4 space-y-3">
                {costs.map((cost) => (
                  <div key={cost.id} className="grid gap-3 rounded-md border border-slate-800 p-3 md:grid-cols-[180px_1fr_160px_auto]">
                    <select value={cost.type} onChange={(event) => updateCost(cost.id, { type: event.target.value })} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                      {costTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                    <Input value={cost.description} onChange={(event) => updateCost(cost.id, { description: event.target.value })} placeholder="Detalle del costo" />
                    <Input value={cost.amount} onChange={(event) => updateCost(cost.id, { amount: Number(event.target.value || 0) })} type="number" min={0} step="0.01" placeholder="Monto" />
                    <Button type="button" variant="secondary" onClick={() => removeCost(cost.id)}>Eliminar</Button>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-start">
                <Button type="button" variant="secondary" onClick={addCost}>Agregar costo</Button>
              </div>
            </>
          )}
        </Card>
      </div>
      ) : (
        <ProjectActivitiesTab
          activities={activities}
          members={members}
          projectCode={current.code}
          projectLead={lead}
          view={activityView}
          setView={setActivityView}
          onAdd={addActivity}
          onUpdate={updateActivity}
          onRemove={removeActivity}
        />
      )}
    </AppShell>
  );
}

function ProjectActivitiesTab({
  activities,
  members,
  projectCode,
  projectLead,
  view,
  setView,
  onAdd,
  onUpdate,
  onRemove
}: {
  activities: ProjectActivity[];
  members: ProjectMember[];
  projectCode: string;
  projectLead?: ProjectMember;
  view: "list" | "gantt";
  setView: (view: "list" | "gantt") => void;
  onAdd: (activity: ProjectActivity) => void;
  onUpdate: (id: string, patch: Partial<ProjectActivity>) => void;
  onRemove: (id: string) => void;
}) {
  const emptyDraft: ProjectActivity = { id: "", name: "", description: "", startDate: "", endDate: "", dependencyId: "", dependencyIds: [], dependencyStartMode: "next-business-day", parentId: "", sprintId: "", assigneeEmail: "", progress: 0, completed: false, kind: "activity" };
  const [activityModal, setActivityModal] = useState<"create" | "edit" | null>(null);
  const [modalDraft, setModalDraft] = useState<ProjectActivity>(emptyDraft);
  const [boardSprints, setBoardSprints] = useState<BoardSprint[]>([]);
  useEffect(() => {
    setBoardSprints(readProjectSprints(projectCode));
  }, [projectCode, activityModal]);
  const openCreateModal = (parentId = "") => {
    setModalDraft({ ...emptyDraft, parentId });
    setActivityModal("create");
  };
  const openEditModal = (activity: ProjectActivity) => {
    const dependencyIds = normalizeDependencyIds(activity);
    setModalDraft({ ...activity, dependencyId: dependencyIds[0] ?? "", dependencyIds, dependencyStartMode: activity.dependencyStartMode ?? "next-business-day", parentId: activity.parentId ?? "" });
    setActivityModal("edit");
  };
  const closeActivityModal = () => {
    setActivityModal(null);
    setModalDraft(emptyDraft);
  };
  const saveActivityModal = () => {
    if (!modalDraft.name.trim()) {
      toast.error("Ingresa el nombre de la actividad");
      return;
    }
    if (activityModal === "create") {
      onAdd(modalDraft);
      closeActivityModal();
      return;
    }
    onUpdate(modalDraft.id, {
      name: modalDraft.name.trim(),
      description: modalDraft.description.trim(),
      startDate: modalDraft.startDate,
      endDate: modalDraft.endDate,
      dependencyId: modalDraft.dependencyId || undefined,
      dependencyIds: normalizeDependencyIds(modalDraft),
      dependencyStartMode: modalDraft.dependencyStartMode ?? "next-business-day",
      parentId: modalDraft.parentId || undefined,
      sprintId: modalDraft.sprintId || undefined,
      kind: modalDraft.kind === "sprint" ? "sprint" : "activity",
      assigneeEmail: modalDraft.assigneeEmail || undefined,
      progress: clampProgress(modalDraft.progress ?? 0),
      completed: Boolean(modalDraft.completed || modalDraft.progress === 100)
    });
    closeActivityModal();
    toast.success("Actividad actualizada");
  };
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-medium">Actividades del proyecto</h2>
            <p className="mt-1 text-sm text-slate-400">Planifica actividades, sub actividades, dependencias y sprints vinculados.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-md border border-slate-800 bg-slate-950 p-1">
              <button type="button" onClick={() => setView("list")} className={cn("rounded px-3 py-2 text-sm", view === "list" ? "bg-cyan-500 text-slate-950" : "text-slate-400")}>Lista</button>
              <button type="button" onClick={() => setView("gantt")} className={cn("rounded px-3 py-2 text-sm", view === "gantt" ? "bg-cyan-500 text-slate-950" : "text-slate-400")}>Gantt</button>
            </div>
            <Button type="button" onClick={() => openCreateModal()}><Plus className="h-4 w-4" />Crear actividad</Button>
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
          Usa Crear actividad para registrar actividades N1. En la cuadricula puedes arrastrar actividades dentro de otra o usar clic derecho para cambiar su nivel.
        </div>
      </Card>

      {view === "list" ? (
        <ActivitiesList activities={activities} members={members} onOpen={openEditModal} onMoveToParent={(id, parentId) => onUpdate(id, { parentId })} onMakePrincipal={(id) => onUpdate(id, { parentId: undefined })} onRemove={onRemove} />
      ) : (
        <ActivitiesGantt activities={activities} />
      )}
      {activityModal && (
        <ActivityModal
          mode={activityModal}
          activity={modalDraft}
          activities={activities}
          members={members}
          boardSprints={boardSprints}
          projectLead={projectLead}
          onChange={setModalDraft}
          onCancel={closeActivityModal}
          onSave={saveActivityModal}
        />
      )}
    </div>
  );
}

function ActivityModal({
  mode,
  activity,
  activities,
  members,
  boardSprints,
  projectLead,
  onChange,
  onCancel,
  onSave
}: {
  mode: "create" | "edit";
  activity: ProjectActivity;
  activities: ProjectActivity[];
  members: ProjectMember[];
  boardSprints: BoardSprint[];
  projectLead?: ProjectMember;
  onChange: React.Dispatch<React.SetStateAction<ProjectActivity>>;
  onCancel: () => void;
  onSave: () => void;
}) {
  const hasChildren = activities.some((item) => item.parentId === activity.id);
  const datesAreDerived = hasChildren || (activity.kind === "sprint" && Boolean(activity.sprintId));
  const dependencyOptions = activities.filter((item) => item.id !== activity.id);
  const [dependencySearch, setDependencySearch] = useState("");
  const selectedDependencyIds = normalizeDependencyIds(activity);
  const filteredDependencyOptions = dependencyOptions.filter((item) => !selectedDependencyIds.includes(item.id) && item.name.toLowerCase().includes(dependencySearch.toLowerCase()));
  const durationDays = getActivityDuration(activity);
  const progress = clampProgress(activity.progress ?? 0);
  const applySprint = (sprintId: string) => {
    const sprint = boardSprints.find((item) => item.id === sprintId);
    if (!sprint) {
      onChange((value) => ({ ...value, sprintId }));
      return;
    }
    onChange((value) => ({
      ...value,
      kind: "sprint",
      sprintId: sprint.id,
      name: sprint.name,
      description: sprint.goal ?? value.description,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      assigneeEmail: projectLead?.email ?? value.assigneeEmail
    }));
  };
  const updateProgress = (value: string) => {
    if (hasChildren) return;
    const nextProgress = clampProgress(Number(value || 0));
    onChange((current) => ({ ...current, progress: nextProgress, completed: nextProgress === 100 }));
  };
  const finishActivity = () => {
    if (hasChildren) return;
    onChange((current) => ({ ...current, progress: 100, completed: true }));
  };
  const updateStartDate = (startDate: string) => {
    const next: Partial<ProjectActivity> = { startDate };
    if (isValidDate(startDate) && durationDays > 0) next.endDate = formatDateInput(addBusinessDays(parseDate(startDate), durationDays - 1));
    onChange((value) => ({ ...value, ...next }));
  };
  const updateDuration = (daysValue: string) => {
    const days = Math.max(Number(daysValue || 1), 1);
    if (!isValidDate(activity.startDate)) return;
    onChange((value) => ({ ...value, endDate: formatDateInput(addBusinessDays(parseDate(value.startDate), days - 1)) }));
  };
  const applyDependencies = (dependencyIds: string[], mode = activity.dependencyStartMode ?? "next-business-day") => {
    const cleanDependencyIds = dependencyIds.filter((id) => id && id !== activity.id);
    const dependency = getLatestDependency(activities, cleanDependencyIds);
    const patch: Partial<ProjectActivity> = { dependencyId: cleanDependencyIds[0] || undefined, dependencyIds: cleanDependencyIds, dependencyStartMode: mode };
    if (dependency && isValidDate(dependency.endDate)) {
      const duration = Math.max(durationDays || 1, 1);
      const start = getDependencyStartDate(dependency, mode);
      patch.startDate = formatDateInput(start);
      patch.endDate = formatDateInput(addBusinessDays(start, duration - 1));
    }
    onChange((value) => ({ ...value, ...patch }));
  };
  const addDependency = (dependencyId: string) => {
    applyDependencies([...selectedDependencyIds, dependencyId]);
    setDependencySearch("");
  };
  const removeDependency = (dependencyId: string) => {
    applyDependencies(selectedDependencyIds.filter((id) => id !== dependencyId));
  };
  const applyDependencyStartMode = (mode: "next-business-day" | "same-day") => {
    const dependencyIds = normalizeDependencyIds(activity);
    if (dependencyIds.length > 0) {
      applyDependencies(dependencyIds, mode);
      return;
    }
    onChange((value) => ({ ...value, dependencyStartMode: mode }));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">{mode === "create" ? "Crear actividad" : "Detalle de actividad"}</h2>
            <p className="mt-1 text-sm text-slate-500">{mode === "create" ? "Registra una actividad del proyecto." : "Modifica los datos de la actividad seleccionada."}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
            <Button type="button" onClick={onSave}>Guardar</Button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-300">
            Nombre
            <Input value={activity.name} disabled={activity.kind === "sprint" && Boolean(activity.sprintId)} onChange={(event) => onChange((value) => ({ ...value, name: event.target.value }))} placeholder="Nombre de la actividad" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Tipo
            <select value={activity.kind ?? "activity"} onChange={(event) => {
              const kind = event.target.value as ProjectActivity["kind"];
              onChange((value) => ({ ...value, kind, sprintId: kind === "sprint" ? value.sprintId : "" }));
            }} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
              <option value="activity">Actividad</option>
              <option value="sprint">Sprint vinculado</option>
            </select>
          </label>
          {activity.kind === "sprint" && (
            <label className="grid gap-2 text-sm text-slate-300">
              Sprint
              <select value={activity.sprintId ?? ""} onChange={(event) => applySprint(event.target.value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                <option value="">Selecciona sprint</option>
                {boardSprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
              </select>
            </label>
          )}
          <label className="grid gap-2 text-sm text-slate-300">
            Responsable
            <select value={activity.assigneeEmail ?? ""} onChange={(event) => onChange((value) => ({ ...value, assigneeEmail: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
              <option value="">Sin asignar</option>
              {members.map((member) => <option key={member.id} value={member.email}>{member.name} - {member.role}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300 lg:col-span-2">
            Descripcion
            <AutoResizeTextarea value={activity.description} onChange={(event) => onChange((value) => ({ ...value, description: event.target.value }))} placeholder="Descripcion de la actividad" />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Fecha de ejecucion
            <Input type="date" value={activity.startDate} disabled={datesAreDerived} onChange={(event) => updateStartDate(event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Fecha de finalizacion
            <Input type="date" value={activity.endDate} disabled={datesAreDerived} onChange={(event) => onChange((value) => ({ ...value, endDate: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            Dias habiles de actividad
            <Input type="number" min={1} value={durationDays || 1} disabled={datesAreDerived} onChange={(event) => updateDuration(event.target.value)} />
          </label>
          {hasChildren && <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200 lg:col-span-2">Las fechas y el avance de esta actividad se calculan automaticamente desde sus tareas internas.</div>}
          <label className="grid gap-2 text-sm text-slate-300">
            Porcentaje de avance
            <div className="grid gap-2 rounded-md border border-slate-800 bg-slate-950 p-3">
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} step={5} value={progress} disabled={hasChildren} onChange={(event) => updateProgress(event.target.value)} className="w-full accent-cyan-400 disabled:opacity-50" />
                <Input type="number" min={0} max={100} value={progress} disabled={hasChildren} onChange={(event) => updateProgress(event.target.value)} className="w-24" />
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{activity.completed || progress === 100 ? "Finalizada" : "En progreso"}</span>
                <Button type="button" variant="secondary" className="h-8" disabled={hasChildren} onClick={finishActivity}>Finalizar</Button>
              </div>
            </div>
          </label>
          <div className="grid gap-2 text-sm text-slate-300">
            Dependencias
            <div className="grid gap-2 rounded-md border border-slate-700 bg-slate-950 p-2">
              <Input value={dependencySearch} onChange={(event) => setDependencySearch(event.target.value)} placeholder="Buscar actividad para agregar dependencia" />
              {selectedDependencyIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedDependencyIds.map((id) => {
                    const dependency = activities.find((item) => item.id === id);
                    if (!dependency) return null;
                    return (
                      <button key={id} type="button" onClick={() => removeDependency(id)} className="rounded bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20" title="Quitar dependencia">
                        {dependency.name} x
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="max-h-32 overflow-y-auto">
                {filteredDependencyOptions.slice(0, 8).map((item) => (
                  <button key={item.id} type="button" onClick={() => addDependency(item.id)} className="block w-full truncate rounded px-2 py-1 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-cyan-300">
                    {item.name}
                  </button>
                ))}
                {filteredDependencyOptions.length === 0 && <div className="px-2 py-1 text-sm text-slate-500">{dependencySearch ? "Sin resultados" : "Escribe para buscar actividades"}</div>}
              </div>
            </div>
          </div>
          {selectedDependencyIds.length > 0 && (
            <label className="grid gap-2 text-sm text-slate-300">
              Inicio segun dependencia
              <select value={activity.dependencyStartMode ?? "next-business-day"} onChange={(event) => applyDependencyStartMode(event.target.value as "next-business-day" | "same-day")} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                <option value="next-business-day">Un dia habil despues</option>
                <option value="same-day">Mismo dia de finalizacion</option>
              </select>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivitiesList({
  activities,
  members,
  onOpen,
  onMoveToParent,
  onMakePrincipal,
  onRemove
}: {
  activities: ProjectActivity[];
  members: ProjectMember[];
  onOpen: (activity: ProjectActivity) => void;
  onMoveToParent: (id: string, parentId: string) => void;
  onMakePrincipal: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ activity: ProjectActivity; x: number; y: number } | null>(null);
  const allRows = flattenActivities(activities);
  const rows = flattenActivities(activities, collapsed).filter((row) => {
    if (levelFilter === "all") return true;
    if (levelFilter === "1") return row.depth === 0;
    if (levelFilter === "2") return row.depth === 1;
    return row.depth === 2;
  });
  const parentCandidates = contextMenu
    ? allRows.filter((row) => row.depth < 2 && canMoveActivity(activities, contextMenu.activity.id, row.activity.id))
    : [];
  const toggleCollapsed = (id: string) => setCollapsed((value) => ({ ...value, [id]: !value[id] }));
  const moveActivity = (activityId: string, parentId: string) => {
    if (!canMoveActivity(activities, activityId, parentId)) {
      toast.error("Solo se permiten tres niveles: N1, N2 y N3");
      return;
    }
    onMoveToParent(activityId, parentId);
    setCollapsed((value) => ({ ...value, [parentId]: false }));
    setContextMenu(null);
    toast.success("Actividad movida dentro de la jerarquia");
  };
  return (
    <Card className="relative overflow-hidden p-0" onClick={() => setContextMenu(null)}>
      <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-medium">Cuadricula de actividades</div>
          <div className="text-xs text-slate-500">Tres niveles: N1, N2 y N3. Clic derecho o arrastra para cambiar la jerarquia.</div>
        </div>
        <div className="flex rounded-md border border-slate-800 bg-slate-950 p-1">
          {[
            ["all", "Todos"],
            ["1", "N1"],
            ["2", "N2"],
            ["3", "N3"]
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setLevelFilter(value as "all" | "1" | "2" | "3")} className={cn("rounded px-3 py-2 text-sm", levelFilter === value ? "bg-cyan-500 text-slate-950" : "text-slate-400")}>{label}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1740px]">
          <div className="grid grid-cols-[56px_44px_minmax(320px,1.7fr)_minmax(230px,1fr)_130px_130px_110px_220px_150px_180px_130px_120px] items-center border-b border-slate-800 bg-slate-950/80 px-4 py-3 text-xs font-semibold text-slate-300">
            <div />
            <div />
            <div>Nombre de tarea</div>
            <div>Vista rapida</div>
            <div>Inicio</div>
            <div>Finalizacion</div>
            <div>Duracion</div>
            <div>Depende de</div>
            <div>% completado</div>
            <div>Responsable</div>
            <div>Nivel</div>
            <div />
          </div>
          {rows.map((row, index) => (
            <ActivityGridRow
              key={row.activity.id}
              activity={row.activity}
              activities={activities}
              members={members}
              depth={row.depth}
              index={index + 1}
              hasChildren={row.hasChildren}
              collapsed={Boolean(collapsed[row.activity.id])}
              canReceiveDrop={draggingId ? canMoveActivity(activities, draggingId, row.activity.id) : false}
              levelLabel={getActivityLevelLabel(row.depth)}
              onToggleCollapsed={toggleCollapsed}
              onOpen={onOpen}
              onDragStart={setDraggingId}
              onDragEnd={() => setDraggingId(null)}
              onDropOnPrincipal={moveActivity}
              onContextMenu={(activity, x, y) => setContextMenu({ activity, x, y })}
              onRemove={onRemove}
            />
          ))}
          {rows.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Sin actividades registradas.</div>}
        </div>
      </div>
      {contextMenu && (
        <div className="fixed z-[60] min-w-64 overflow-hidden rounded-md border border-slate-800 bg-slate-950 p-1 shadow-2xl" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => { onMakePrincipal(contextMenu.activity.id); setContextMenu(null); toast.success("Actividad marcada como principal"); }} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900">
            N1
            {!contextMenu.activity.parentId && <span className="text-xs text-cyan-300">Actual</span>}
          </button>
          <div className="border-t border-slate-800 px-3 py-2 text-xs font-semibold uppercase text-slate-500">Mover dentro de</div>
          {parentCandidates.map((row) => (
            <button key={row.activity.id} type="button" onClick={() => moveActivity(contextMenu.activity.id, row.activity.id)} className="block w-full truncate rounded px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-900 hover:text-cyan-300">
              {row.activity.name} <span className="text-xs text-slate-500">({getActivityLevelLabel(row.depth)})</span>
            </button>
          ))}
          {parentCandidates.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">No hay destino valido</div>}
        </div>
      )}
    </Card>
  );
}

function ActivityGridRow({
  activity,
  activities,
  members,
  depth,
  index,
  hasChildren,
  collapsed,
  canReceiveDrop,
  levelLabel,
  onToggleCollapsed,
  onOpen,
  onDragStart,
  onDragEnd,
  onDropOnPrincipal,
  onContextMenu,
  onRemove
}: {
  activity: ProjectActivity;
  activities: ProjectActivity[];
  members: ProjectMember[];
  depth: number;
  index: number;
  hasChildren: boolean;
  collapsed: boolean;
  canReceiveDrop: boolean;
  levelLabel: string;
  onToggleCollapsed: (id: string) => void;
  onOpen: (activity: ProjectActivity) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropOnPrincipal: (id: string, parentId: string) => void;
  onContextMenu: (activity: ProjectActivity, x: number, y: number) => void;
  onRemove: (id: string) => void;
}) {
  const progress = getActivityProgress(activity);
  const duration = getActivityDuration(activity);
  const dependencyName = getDependencyNames(activity, activities);
  const assigneeName = getActivityAssigneeName(activity, members);
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", activity.id);
        onDragStart(activity.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!canReceiveDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        const movedId = event.dataTransfer.getData("text/plain");
        if (!canReceiveDrop || !movedId) return;
        event.preventDefault();
        onDropOnPrincipal(movedId, activity.id);
        onDragEnd();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(activity, event.clientX, event.clientY);
      }}
      onDoubleClick={() => onOpen(activity)}
      className={cn("grid cursor-grab grid-cols-[56px_44px_minmax(320px,1.7fr)_minmax(230px,1fr)_130px_130px_110px_220px_150px_180px_130px_120px] items-center border-b border-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/60 active:cursor-grabbing", canReceiveDrop && "bg-cyan-500/10 ring-1 ring-inset ring-cyan-500/40")}
    >
      <div className="text-xs text-slate-400">{index}</div>
      <div className="flex items-center justify-center text-indigo-300"><CheckCircle2 className="h-4 w-4" /></div>
      <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: depth * 22 }}>
        {hasChildren ? (
          <button type="button" onClick={(event) => { event.stopPropagation(); onToggleCollapsed(activity.id); }} className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-cyan-300">
            <ChevronDown className={cn("h-4 w-4 transition", collapsed && "-rotate-90")} />
          </button>
        ) : depth > 0 ? <ChevronRight className="h-4 w-4 shrink-0 text-slate-700" /> : <span className="h-6 w-6 shrink-0" />}
        <span className={cn("truncate font-medium", activity.kind === "sprint" && "text-cyan-200")}>{activity.name}</span>
      </div>
      <div className="truncate text-slate-400">{activity.description || "Sin descripcion"}</div>
      <div className="font-semibold">{formatActivityDate(activity.startDate)}</div>
      <div className="font-semibold">{formatActivityDate(activity.endDate)}</div>
      <div className="font-semibold">{duration} {duration === 1 ? "dia" : "dias"}</div>
      <div className="truncate text-slate-400">{dependencyName}</div>
      <div className="flex items-center gap-3">
        <div className="h-2 w-24 rounded bg-slate-800">
          <div className={cn("h-full rounded", progress === 100 ? "bg-emerald-400" : "bg-indigo-400")} style={{ width: `${progress}%` }} />
        </div>
        <span className="w-9 text-xs font-semibold">{progress}%</span>
      </div>
      <div className="truncate text-slate-300">{assigneeName}</div>
      <div className="flex items-center gap-2 text-xs">
        <span className={cn("h-2 w-2 rounded-full", activity.kind === "sprint" ? "bg-cyan-300" : "bg-lime-300")} />
        <span>{activity.kind === "sprint" ? "Sprint" : levelLabel}</span>
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" className="h-8" onClick={(event) => { event.stopPropagation(); onRemove(activity.id); }}>Eliminar</Button>
      </div>
    </div>
  );
}

function ActivitiesGantt({ activities }: { activities: ProjectActivity[] }) {
  const [unitWidth, setUnitWidth] = useState(40);
  const [scale, setScale] = useState<GanttScale>("days");
  const [levelFilter, setLevelFilter] = useState<GanttLevelFilter>("all");
  const headerHeight = 56;
  const rowHeight = 40;
  useEffect(() => {
    setUnitWidth(scale === "days" ? 40 : scale === "weeks" ? 92 : 120);
  }, [scale]);
  const timeline = buildActivityTimeline(activities, unitWidth, scale, levelFilter);
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-medium">Escala de tiempo</div>
          <div className="text-xs text-slate-500">Gantt por dias con dependencias visuales.</div>
        </div>
        <div className="flex items-center gap-5 text-sm text-slate-300">
          <Button type="button" variant="secondary" onClick={() => exportGanttToPdf(activities, scale, levelFilter)}><FileText className="h-4 w-4" />Exportar PDF</Button>
          <span>Nivel</span>
          <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as GanttLevelFilter)} className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
            <option value="all">Todos</option>
            <option value="N1">N1</option>
            <option value="N2">N2</option>
            <option value="N3">N3</option>
          </select>
          <select value={scale} onChange={(event) => setScale(event.target.value as GanttScale)} className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
            <option value="days">Dias</option>
            <option value="weeks">Semanas</option>
            <option value="months">Meses</option>
          </select>
          <span>Zoom</span>
          <input
            type="range"
            min={scale === "days" ? 24 : 56}
            max={scale === "days" ? 80 : 150}
            step={4}
            value={unitWidth}
            onChange={(event) => setUnitWidth(Number(event.target.value))}
            className="h-1 w-28 accent-cyan-400"
            aria-label="Zoom del diagrama Gantt"
          />
          <span>Ir a la fecha</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        {timeline.rows.length > 0 ? (
          <div className="min-w-[1100px]">
            <div className="relative grid" style={{ gridTemplateColumns: `420px ${timeline.width}px` }}>
              <div className="sticky left-0 z-20 grid grid-cols-[70px_1fr] border-r border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300" style={{ height: headerHeight }}>
                <div className="flex items-center border-r border-slate-800 px-4">Nivel</div>
                <div className="flex items-center px-4">Nombre de tarea</div>
              </div>
              <div className="relative grid border-b border-slate-800 bg-slate-950/80" style={{ gridTemplateColumns: timeline.units.map((unit) => `${unit.width}px`).join(" "), height: headerHeight }}>
                {timeline.units.map((unit) => (
                  <div key={unit.key} className={cn("flex items-center justify-center border-r border-slate-800 px-1 text-center text-[10px] font-semibold leading-tight", unit.isWeekend ? "bg-slate-800/60 text-slate-500" : "text-slate-300")}>
                    <span className="block max-w-full break-words">{unit.label}</span>
                  </div>
                ))}
              </div>
              {timeline.rows.map((row) => (
                <div key={row.id} className="contents">
                  <div className="sticky left-0 z-10 grid grid-cols-[70px_1fr] border-r border-t border-slate-800 bg-slate-950 text-sm" style={{ height: rowHeight }}>
                    <div className="flex items-center border-r border-slate-800 px-4 text-xs font-semibold text-cyan-300">{getActivityLevelLabel(row.depth)}</div>
                    <div className="flex min-w-0 items-center gap-2 px-4">
                      <span className="w-8 shrink-0 text-xs text-slate-500">{row.index}</span>
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-300" />
                      <div className="min-w-0 truncate" style={{ paddingLeft: row.depth * 18 }}>
                        <span className={cn(row.depth === 0 && "font-semibold", row.kind === "sprint" && "text-cyan-200")}>{row.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative border-t border-slate-800" style={{ width: timeline.width, height: rowHeight }}>
                    {timeline.units.map((unit) => <div key={unit.key} className={cn("absolute top-0 h-full border-r border-slate-800", unit.isWeekend && "bg-slate-800/70")} style={{ left: unit.left, width: unit.width }} />)}
                    <div className={cn("absolute top-2 h-5 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.08)]", row.kind === "sprint" ? "bg-cyan-500" : row.depth > 0 ? "bg-sky-500" : "bg-blue-600")} style={{ left: row.left, width: row.width }} />
                  </div>
                </div>
              ))}
              <svg className="pointer-events-none absolute z-30" style={{ left: 420, top: headerHeight, width: timeline.width, height: timeline.rows.length * rowHeight }} viewBox={`0 0 ${timeline.width} ${timeline.rows.length * rowHeight}`} fill="none">
                <defs>
                  <marker id="gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="#94a3b8" />
                  </marker>
                </defs>
                {timeline.connectors.map((connector) => (
                  <g key={connector.id}>
                    <path d={connector.path} stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#gantt-arrow)" />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">Sin actividades para graficar.</div>
        )}
      </div>
    </Card>
  );
}

function exportGanttToPdf(activities: ProjectActivity[], scale: GanttScale, levelFilter: GanttLevelFilter) {
  const timeline = buildActivityTimeline(activities, scale === "days" ? 28 : scale === "weeks" ? 78 : 110, scale, levelFilter);
  if (timeline.rows.length === 0) {
    toast.error("No hay actividades para exportar");
    return;
  }
  const printWindow = window.open("", "_blank", "width=1400,height=900");
  if (!printWindow) {
    toast.error("Permite ventanas emergentes para exportar el PDF");
    return;
  }
  const leftColumnsWidth = 520;
  const gridLinesSvg = timeline.units.map((unit) => `<line x1="${unit.left + unit.width}" y1="0" x2="${unit.left + unit.width}" y2="30" stroke="#e5e7eb" stroke-width="1" />`).join("");
  const rowsHtml = timeline.rows.map((row) => {
    const progress = getActivityProgress(row);
    const barColor = row.kind === "sprint" ? "#0891b2" : "#2563eb";
    return `
      <div class="row">
        <div class="cell name" style="padding-left:${12 + row.depth * 18}px">${escapeHtml(row.name)}</div>
        <div class="cell">${escapeHtml(getActivityLevelLabel(row.depth))}</div>
        <div class="cell">${escapeHtml(formatActivityDate(row.startDate))}</div>
        <div class="cell">${escapeHtml(formatActivityDate(row.endDate))}</div>
        <div class="cell">${progress}%</div>
        <div class="timeline-cell">
          <svg class="gantt-svg" width="${timeline.width}" height="30" viewBox="0 0 ${timeline.width} 30" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="${timeline.width}" height="30" fill="#ffffff" />
            ${gridLinesSvg}
            <rect x="${row.left}" y="8" width="${row.width}" height="14" rx="2" fill="${barColor}" />
          </svg>
        </div>
      </div>`;
  }).join("");
  const scaleHtml = timeline.units.map((unit) => `<span style="width:${unit.width}px">${escapeHtml(unit.label)}</span>`).join("");
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Gantt del proyecto</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          body { margin: 0; font-family: Arial, sans-serif; color: #111827; background: #ffffff; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          .meta { color: #64748b; font-size: 12px; margin-bottom: 16px; }
          .sheet { width: ${leftColumnsWidth + timeline.width}px; max-width: none; }
          .scale { display: flex; width: ${timeline.width}px; height: 26px; align-items: center; border: 1px solid #d1d5db; border-bottom: 0; margin-left: ${leftColumnsWidth}px; overflow: hidden; }
          .scale span { display: inline-flex; height: 100%; align-items: center; justify-content: center; border-right: 1px solid #e5e7eb; font-size: 9px; color: #475569; white-space: nowrap; }
          .row, .header { display: grid; grid-template-columns: 220px 70px 90px 90px 50px ${timeline.width}px; width: ${leftColumnsWidth + timeline.width}px; font-size: 11px; }
          .header { font-weight: 700; background: #e5e7eb; }
          .cell, .timeline-cell { min-height: 30px; border: 1px solid #d1d5db; border-right: 0; border-bottom: 0; padding: 7px 6px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
          .timeline-cell { padding: 0; border-right: 1px solid #d1d5db; }
          .name { font-weight: 700; }
          .gantt-svg { display: block; width: ${timeline.width}px; height: 30px; }
          @media print { .no-print { display: none; } body { zoom: 0.78; } }
        </style>
      </head>
      <body>
        <button class="no-print" onclick="window.print()" style="margin: 12px; padding: 8px 12px;">Guardar como PDF</button>
        <h1>Diagrama Gantt del proyecto</h1>
        <div class="meta">Generado ${escapeHtml(new Date().toLocaleString("es-SV"))} - Vista: ${escapeHtml(getScaleLabel(scale))} - Nivel: ${escapeHtml(levelFilter === "all" ? "Todos" : levelFilter)}</div>
        <div class="sheet">
          <div class="scale">${scaleHtml}</div>
          <div class="header">
            <div class="cell">Actividad</div>
            <div class="cell">Nivel</div>
            <div class="cell">Inicio</div>
            <div class="cell">Fin</div>
            <div class="cell">Avance</div>
            <div class="cell">Linea de tiempo</div>
          </div>
          ${rowsHtml}
        </div>
        <script>setTimeout(() => window.print(), 800);</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function AutoResizeTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const target = textareaRef.current;
    if (!target) return;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }, [props.defaultValue, props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      onInput={(event) => {
        const target = event.currentTarget;
        target.style.height = "auto";
        target.style.height = `${target.scrollHeight}px`;
        props.onInput?.(event);
      }}
      className={cn("min-h-11 w-full resize-none overflow-hidden rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-500", props.className)}
    />
  );
}

function ProjectVisualPicker({ icon, thumbnailUrl, onIconChange, onThumbnailChange }: { icon: string; thumbnailUrl?: string; onIconChange: (icon: string) => void; onThumbnailChange: (file?: File) => void }) {
  return (
    <div className="rounded-md border border-slate-800 p-3">
      <div className="mb-3 grid aspect-video place-items-center overflow-hidden rounded-md bg-slate-900">
        {thumbnailUrl ? <img src={thumbnailUrl} alt="Miniatura del proyecto" className="h-full w-full object-cover" /> : <ProjectIcon name={icon} className="h-10 w-10 text-cyan-300" />}
      </div>
      <div className="mb-3 grid grid-cols-5 gap-2">
        {projectIcons.map((item) => (
          <button key={item} type="button" onClick={() => onIconChange(item)} className={cn("grid h-9 place-items-center rounded-md border border-slate-800 bg-slate-950 text-slate-400 hover:border-cyan-500", icon === item && "border-cyan-500 bg-cyan-500/10 text-cyan-300")} title={item}>
            <ProjectIcon name={item} className="h-4 w-4" />
          </button>
        ))}
      </div>
      <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-800 bg-slate-950 text-sm text-slate-300 hover:border-cyan-500">
        <Upload className="h-4 w-4" />
        Adjuntar miniatura
        <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onThumbnailChange(event.target.files?.[0])} />
      </label>
    </div>
  );
}

function ProjectAvatar({ project }: { project: Project }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-800 bg-slate-900">
      {project.thumbnailUrl ? <img src={project.thumbnailUrl} alt={project.name} className="h-full w-full object-cover" /> : <ProjectIcon name={project.projectIcon ?? "folder"} className="h-6 w-6 text-cyan-300" />}
    </div>
  );
}

function ProjectIcon({ name, className }: { name?: string; className?: string }) {
  if (name === "code") return <Code2 className={className} />;
  if (name === "qa") return <UserRound className={className} />;
  if (name === "portfolio") return <FolderKanban className={className} />;
  if (name === "rocket") return <Upload className={className} />;
  return <FolderKanban className={className} />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function fileIcon(mimeType: string) {
  if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-rose-300" />;
  if (mimeType.includes("json")) return <FileJson className="h-5 w-5 text-lime-300" />;
  if (mimeType.includes("image")) return <Image className="h-5 w-5 text-cyan-300" />;
  if (mimeType.includes("word")) return <FileArchive className="h-5 w-5 text-blue-300" />;
  return <Paperclip className="h-5 w-5 text-slate-300" />;
}

function AttachmentTile({ file, onRemove }: { file: ProjectAttachment; onRemove: (id: string) => void }) {
  const isImage = file.mimeType.includes("image") && file.kind !== "sharepoint";
  const isSharePoint = file.kind === "sharepoint" || file.mimeType.includes("sharepoint");
  const [previewFailed, setPreviewFailed] = useState(false);
  const href = normalizeAttachmentUrl(file.url);
  const previewUrl = file.thumbnailUrl || (isImage ? href : "");
  return (
    <div className="group overflow-hidden rounded-md border border-slate-800 bg-slate-950 text-sm transition hover:border-cyan-500">
      <a href={href} target="_blank" rel="noreferrer">
      <div className="grid aspect-[16/9] place-items-center overflow-hidden bg-slate-900">
        {previewUrl && !previewFailed ? (
          <img
            src={previewUrl}
            alt={file.fileName}
            className="h-full w-full object-cover"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={cn("grid h-10 w-10 place-items-center rounded-md", isSharePoint ? "bg-blue-500/15" : "bg-slate-800")}>
              {isSharePoint ? <Link2 className="h-5 w-5 text-blue-300" /> : fileIcon(file.mimeType)}
            </div>
            <span className="px-3 text-xs text-slate-400">{isSharePoint ? "SharePoint" : fileExtension(file.fileName)}</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-xs font-medium">{file.fileName}</div>
          <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-cyan-300" />
        </div>
        <div className="mt-1 truncate text-xs text-slate-500">{isSharePoint ? "Enlace SharePoint" : `${formatBytes(file.size)} - ${fileExtension(file.fileName)}`}</div>
      </div>
      </a>
      <div className="border-t border-slate-800 p-1.5">
        <Button type="button" variant="secondary" className="h-7 w-full text-xs" onClick={() => onRemove(file.id)}>Eliminar</Button>
      </div>
    </div>
  );
}

function AttachmentGroup({ group, onRemove }: { group: { type: string; files: ProjectAttachment[] }; onRemove: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="rounded-md border border-slate-800">
      <button type="button" onClick={() => setCollapsed((value) => !value)} className="flex w-full items-center justify-between gap-4 p-3 text-left hover:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-slate-900">{fileIcon(group.files[0]?.mimeType ?? "")}</div>
          <div>
            <div className="font-medium">{group.type}</div>
            <div className="text-xs text-slate-500">{group.files.length} adjuntos</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded bg-slate-800 px-2 py-1 text-xs">{group.files.length}</span>
          <ChevronDown className={cn("h-4 w-4 transition", collapsed && "-rotate-90")} />
        </div>
      </button>
      {!collapsed && (
        <div className="grid gap-2 border-t border-slate-800 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {group.files.map((file) => <AttachmentTile key={file.id} file={file} onRemove={onRemove} />)}
        </div>
      )}
    </div>
  );
}

function groupAttachmentsByType(files: ProjectAttachment[]) {
  const groups = new Map<string, ProjectAttachment[]>();
  for (const file of files) {
    const type = attachmentType(file);
    groups.set(type, [...(groups.get(type) ?? []), file]);
  }
  const order = ["SharePoint", "PDF", "Imagenes", "Word", "JSON", "Otros"];
  return order
    .filter((type) => groups.has(type))
    .map((type) => ({ type, files: groups.get(type) ?? [] }));
}

function attachmentType(file: ProjectAttachment) {
  if (file.kind === "sharepoint" || file.mimeType.includes("sharepoint")) return "SharePoint";
  if (file.mimeType.includes("pdf")) return "PDF";
  if (file.mimeType.includes("image")) return "Imagenes";
  if (file.mimeType.includes("word")) return "Word";
  if (file.mimeType.includes("json")) return "JSON";
  return "Otros";
}

function fileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension ? extension.toUpperCase() : "Archivo";
}

function normalizeAttachmentUrl(value: string) {
  const fromPhysicalPath = localPhysicalPathToApiUrl(value);
  if (fromPhysicalPath) return fromPhysicalPath;
  if (value.startsWith("/api/")) return value;
  if (/^https?:\/\//.test(value)) return value;
  return value;
}

function localPhysicalPathToApiUrl(value: string) {
  const normalized = value.replaceAll("/", "\\");
  const marker = "\\DatosApp\\";
  const index = normalized.toLowerCase().indexOf(marker.toLowerCase());
  if (index === -1) return null;
  const relative = normalized.slice(index + marker.length);
  const [projectFolder, ...fileParts] = relative.split("\\").filter(Boolean);
  const fileName = fileParts.join("\\");
  if (!projectFolder || !fileName || fileName.includes("\\")) return null;
  return `/api/settings/storage/project-file/${encodeURIComponent(projectFolder)}/${encodeURIComponent(fileName)}`;
}

function createAttachmentThumbnail(file: File) {
  if (!file.type.startsWith("image/")) return Promise.resolve<string | undefined>(undefined);
  return new Promise<string | undefined>((resolveThumbnail) => {
    const image = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const maxSize = 320;
      const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        resolveThumbnail(undefined);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolveThumbnail(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolveThumbnail(undefined);
    };
    image.src = objectUrl;
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeCosts(value: unknown): BudgetDetails[] {
  if (Array.isArray(value)) return value as BudgetDetails[];
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, number>).map(([type, amount]) => ({
      id: createId("activity"),
      type: costTypes.find((item) => item.toLowerCase() === type.toLowerCase()) ?? type,
      description: "",
      amount: Number(amount || 0)
    }));
  }
  return [];
}

function normalizeMembers(value: unknown): ProjectMember[] {
  if (Array.isArray(value)) return value as ProjectMember[];
  return [];
}

function normalizeStoryTasks(value: unknown): StoryTask[] {
  if (Array.isArray(value)) return value as StoryTask[];
  return [];
}

function normalizeActivities(value: unknown): ProjectActivity[] {
  if (Array.isArray(value)) return value as ProjectActivity[];
  return [];
}

function readProjectSprints(projectCode: string): BoardSprint[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("devhub.boardSprints");
    const sprints = saved ? JSON.parse(saved) as BoardSprint[] : [];
    return sprints.filter((sprint) => sprint.projectCode === projectCode);
  } catch {
    return [];
  }
}

function sprintHasBoardItems(sprintId: string) {
  if (typeof window === "undefined") return false;
  try {
    const saved = localStorage.getItem("devhub.scrumBoard");
    const items = saved ? JSON.parse(saved) as Array<{ sprintId?: string | null }> : [];
    return items.some((item) => item.sprintId === sprintId);
  } catch {
    return true;
  }
}

function syncSprintActivities(activities: ProjectActivity[], projectCode: string, projectLead?: ProjectMember) {
  const sprints = readProjectSprints(projectCode);
  if (sprints.length === 0) return activities;
  return activities.map((activity) => {
    if (activity.kind !== "sprint" || !activity.sprintId) return activity;
    const sprint = sprints.find((item) => item.id === activity.sprintId);
    if (!sprint) return activity;
    return {
      ...activity,
      name: sprint.name,
      description: sprint.goal ?? activity.description,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      assigneeEmail: projectLead?.email ?? activity.assigneeEmail
    };
  });
}

function rollupActivityDates(activities: ProjectActivity[]) {
  return activities.map((activity) => {
    const descendants = getActivityDescendants(activities, activity.id).filter((item) => isValidDate(item.startDate) && isValidDate(item.endDate));
    if (descendants.length === 0) return activity;
    const progress = getChildrenProgress(activities, activity.id);
    const minStart = descendants.reduce((min, item) => Math.min(min, parseDate(item.startDate).getTime()), Number.POSITIVE_INFINITY);
    const maxEnd = descendants.reduce((max, item) => Math.max(max, parseDate(item.endDate).getTime()), Number.NEGATIVE_INFINITY);
    return {
      ...activity,
      startDate: formatDateInput(new Date(minStart)),
      endDate: formatDateInput(new Date(maxEnd)),
      progress,
      completed: progress === 100
    };
  });
}

function rollupActivitySummaries(activities: ProjectActivity[]) {
  return rollupActivityDates(applyDependencySchedules(activities));
}

function applyDependencySchedules(activities: ProjectActivity[]) {
  let scheduled = activities.map((activity) => ({ ...activity, dependencyIds: normalizeDependencyIds(activity), dependencyStartMode: activity.dependencyStartMode ?? "next-business-day" }));
  for (let index = 0; index < scheduled.length; index += 1) {
    scheduled = scheduled.map((activity) => {
      const hasChildren = scheduled.some((item) => item.parentId === activity.id);
      const dependency = getLatestDependency(scheduled, normalizeDependencyIds(activity));
      if (!dependency || hasChildren || !isValidDate(dependency.endDate)) return activity;
      const duration = Math.max(getActivityDuration(activity), 1);
      const start = getDependencyStartDate(dependency, activity.dependencyStartMode ?? "next-business-day");
      return {
        ...activity,
        startDate: formatDateInput(start),
        endDate: formatDateInput(addBusinessDays(start, duration - 1))
      };
    });
  }
  return scheduled;
}

function normalizeDependencyIds(activity: Pick<ProjectActivity, "dependencyId" | "dependencyIds">) {
  return Array.from(new Set([...(activity.dependencyIds ?? []), activity.dependencyId].filter(Boolean) as string[]));
}

function getLatestDependency(activities: ProjectActivity[], dependencyIds: string[]) {
  return dependencyIds
    .map((id) => activities.find((activity) => activity.id === id))
    .filter((activity): activity is ProjectActivity => Boolean(activity && isValidDate(activity.endDate)))
    .sort((left, right) => parseDate(right.endDate).getTime() - parseDate(left.endDate).getTime())[0];
}

function getDependencyNames(activity: ProjectActivity, activities: ProjectActivity[]) {
  const names = normalizeDependencyIds(activity)
    .map((id) => activities.find((item) => item.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Sin dependencia";
}

function getDependencyStartDate(dependency: ProjectActivity, mode: "next-business-day" | "same-day") {
  const dependencyEnd = parseDate(dependency.endDate);
  return mode === "same-day" ? dependencyEnd : addBusinessDays(dependencyEnd, 1);
}

function getChildrenProgress(activities: ProjectActivity[], activityId: string): number {
  const children = activities.filter((activity) => activity.parentId === activityId);
  if (children.length === 0) {
    const activity = activities.find((item) => item.id === activityId);
    return activity ? getActivityProgress(activity) : 0;
  }
  const total = children.reduce((sum, child) => sum + getChildrenProgress(activities, child.id), 0);
  return clampProgress(total / children.length);
}

function getActivityDescendants(activities: ProjectActivity[], activityId: string) {
  const descendants: ProjectActivity[] = [];
  const visit = (parentId: string) => {
    const children = activities.filter((activity) => activity.parentId === parentId);
    for (const child of children) {
      descendants.push(child);
      visit(child.id);
    }
  };
  visit(activityId);
  return descendants;
}

function getProjectLead(project: Project) {
  return normalizeMembers(project.staffing).find((member) => member.role === "Encargado del proyecto");
}

function normalizeProjectStatus(project: Project): Project {
  const statusMap: Record<string, string> = {
    PLANNED: "Requerimientos",
    ACTIVE: "Desarrollo",
    PAUSED: "Pruebas",
    CANCELLED: "Cancelado",
    CLOSED: "Finalizado"
  };
  return { ...project, status: statusMap[project.status] ?? project.status };
}

function groupProjectsByStatus(projects: Project[]) {
  const normalized = projects.map(normalizeProjectStatus);
  return projectStatusOrder.map((status) => ({
    status,
    projects: normalized.filter((project) => project.status === status)
  }));
}

function groupMembersByRole(members: ProjectMember[]) {
  const grouped = new Map<string, ProjectMember[]>();
  for (const member of members) grouped.set(member.role, [...(grouped.get(member.role) ?? []), member]);
  return memberRoles
    .filter((role) => grouped.has(role))
    .map((role) => ({ role, members: grouped.get(role) ?? [] }));
}

function groupTasksByStory(tasks: StoryTask[]) {
  const grouped = new Map<string, { key: string; title: string; tasks: StoryTask[] }>();
  for (const task of tasks) {
    const existing = grouped.get(task.storyKey) ?? { key: task.storyKey, title: task.storyTitle, tasks: [] };
    existing.tasks.push(task);
    grouped.set(task.storyKey, existing);
  }
  return Array.from(grouped.values());
}

function buildTaskAssignments(members: ProjectMember[], tasks: StoryTask[]) {
  return members.map((member) => ({
    email: member.email,
    name: member.name,
    role: member.role,
    total: tasks.filter((task) => task.assigneeEmail === member.email).length
  }));
}

function flattenActivities(activities: ProjectActivity[], collapsed: Record<string, boolean> = {}) {
  const rows: { activity: ProjectActivity; depth: number; hasChildren: boolean }[] = [];
  const byParent = new Map<string, ProjectActivity[]>();
  const ids = new Set(activities.map((activity) => activity.id));
  for (const activity of activities) {
    const key = activity.parentId && ids.has(activity.parentId) ? activity.parentId : "root";
    byParent.set(key, [...(byParent.get(key) ?? []), activity]);
  }
  const visit = (parentId: string, depth: number) => {
    for (const activity of byParent.get(parentId) ?? []) {
      const children = byParent.get(activity.id) ?? [];
      rows.push({ activity, depth, hasChildren: children.length > 0 });
      if (!collapsed[activity.id]) visit(activity.id, depth + 1);
    }
  };
  visit("root", 0);
  return rows;
}

function getActivityLevelLabel(depth: number) {
  if (depth === 0) return "N1";
  if (depth === 1) return "N2";
  return "N3";
}

function getEffectiveTimelineActivity(activities: ProjectActivity[], activity: ProjectActivity): ProjectActivity {
  if (isValidDate(activity.startDate) && isValidDate(activity.endDate)) return activity;
  const descendants = getActivityDescendants(activities, activity.id).filter((item) => isValidDate(item.startDate) && isValidDate(item.endDate));
  if (descendants.length > 0) {
    const minStart = descendants.reduce((min, item) => Math.min(min, parseDate(item.startDate).getTime()), Number.POSITIVE_INFINITY);
    const maxEnd = descendants.reduce((max, item) => Math.max(max, parseDate(item.endDate).getTime()), Number.NEGATIVE_INFINITY);
    return { ...activity, startDate: formatDateInput(new Date(minStart)), endDate: formatDateInput(new Date(maxEnd)) };
  }
  const parent = getNearestDatedParent(activities, activity.parentId);
  return parent ? { ...activity, startDate: parent.startDate, endDate: parent.endDate } : activity;
}

function getNearestDatedParent(activities: ProjectActivity[], parentId?: string): ProjectActivity | undefined {
  let current = activities.find((activity) => activity.id === parentId);
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    if (isValidDate(current.startDate) && isValidDate(current.endDate)) return current;
    visited.add(current.id);
    current = activities.find((activity) => activity.id === current?.parentId);
  }
  return undefined;
}

function canMoveActivity(activities: ProjectActivity[], activityId: string, parentId: string) {
  if (activityId === parentId) return false;
  const activity = activities.find((item) => item.id === activityId);
  const parent = activities.find((item) => item.id === parentId);
  if (!activity || !parent) return false;
  if (isActivityDescendantOf(activities, parentId, activityId)) return false;
  const parentDepth = getActivityDepth(activities, parentId);
  if (parentDepth >= 2) return false;
  const relativeChildDepth = getMaxRelativeChildDepth(activities, activityId);
  return parentDepth + 1 + relativeChildDepth <= 2;
}

function getActivityDepth(activities: ProjectActivity[], activityId: string) {
  let depth = 0;
  let current = activities.find((activity) => activity.id === activityId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    depth += 1;
    current = activities.find((activity) => activity.id === current?.parentId);
  }
  return depth;
}

function getMaxRelativeChildDepth(activities: ProjectActivity[], activityId: string): number {
  const children = activities.filter((activity) => activity.parentId === activityId);
  if (children.length === 0) return 0;
  return Math.max(...children.map((child) => 1 + getMaxRelativeChildDepth(activities, child.id)));
}

function isActivityDescendantOf(activities: ProjectActivity[], activityId: string, ancestorId: string) {
  let current = activities.find((activity) => activity.id === activityId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.id)) {
    if (current.parentId === ancestorId) return true;
    visited.add(current.id);
    current = activities.find((activity) => activity.id === current?.parentId);
  }
  return false;
}

function buildActivityTimeline(activities: ProjectActivity[], unitWidth = 40, scale: GanttScale = "days", levelFilter: GanttLevelFilter = "all") {
  const flattened = flattenActivities(activities);
  const effectiveRows = flattened
    .map((row) => ({ ...row, activity: getEffectiveTimelineActivity(activities, row.activity) }))
    .filter((row) => levelFilter === "all" || getActivityLevelLabel(row.depth) === levelFilter);
  const dated = effectiveRows.filter((row) => isValidDate(row.activity.startDate) && isValidDate(row.activity.endDate));
  const allActivities = effectiveRows.map((row) => row.activity);
  if (dated.length === 0) return { dayWidth: unitWidth, units: [], rows: [], connectors: [], width: 0 };
  const min = Math.min(...dated.map((row) => parseDate(row.activity.startDate).getTime()));
  const max = Math.max(...dated.map((row) => parseDate(row.activity.endDate).getTime()));
  const start = addDays(new Date(min), -2);
  const end = addDays(new Date(max), 3);
  const units = buildTimelineUnits(start, end, scale, unitWidth);
  const width = units.reduce((sum, unit) => sum + unit.width, 0);
  const rows = dated.map((row, index) => {
    const activityStart = parseDate(row.activity.startDate);
    const activityEnd = parseDate(row.activity.endDate);
    const dependency = getLatestDependency(allActivities, normalizeDependencyIds(row.activity));
    const dependencyLeft = dependency ? getTimelineOffset(units, parseDate(dependency.endDate)) + getScalePixelsPerDay(scale, unitWidth) : undefined;
    return {
      ...row.activity,
      depth: row.depth,
      index: index + 1,
      left: Math.max(getTimelineOffset(units, activityStart), 0),
      width: Math.max(getTimelineOffset(units, addDays(activityEnd, 1)) - getTimelineOffset(units, activityStart), 14),
      dependencyLeft
    };
  });
  const connectors = buildGanttConnectors(rows);
  return { dayWidth: unitWidth, units, rows, connectors, width };
}

function buildGanttConnectors(rows: Array<ProjectActivity & { index: number; left: number; width: number; depth: number }>) {
  const rowById = new Map(rows.map((row, index) => [row.id, { ...row, rowIndex: index }]));
  const connectors: Array<{ id: string; path: string; x2: number; y2: number }> = [];
  rows.forEach((row, rowIndex) => {
    for (const dependencyId of normalizeDependencyIds(row)) {
      const dependency = rowById.get(dependencyId);
      if (!dependency) continue;
      const x1 = dependency.left + dependency.width;
      const y1 = dependency.rowIndex * 40 + 12;
      const x2 = row.left;
      const y2 = rowIndex * 40 + 12;
      const direction = Math.sign(y2 - y1 || 1);
      const elbowX = x1 + 8;
      const path = `M ${x1} ${y1} L ${elbowX - 3} ${y1} Q ${elbowX} ${y1} ${elbowX} ${y1 + direction * 3} L ${elbowX} ${y2 - direction * 3} Q ${elbowX} ${y2} ${elbowX + 3} ${y2} L ${x2 - 6} ${y2}`;
      connectors.push({ id: `${dependencyId}-${row.id}`, path, x2, y2 });
    }
  });
  return connectors;
}

function buildTimelineUnits(start: Date, end: Date, scale: GanttScale, unitWidth: number) {
  const units: Array<{ key: string; label: string; day: string; isWeekend: boolean; start: Date; end: Date; left: number; width: number }> = [];
  let left = 0;
  for (let cursor = new Date(start); cursor <= end;) {
    const unitStart = startOfDay(cursor);
    const unitEnd = getTimelineUnitEnd(unitStart, scale, end);
    units.push({
      key: cursor.toISOString(),
      day: String(cursor.getDate()),
      label: getTimelineUnitLabel(unitStart, scale),
      isWeekend: scale === "days" && (cursor.getDay() === 0 || cursor.getDay() === 6),
      start: unitStart,
      end: unitEnd,
      left,
      width: unitWidth
    });
    left += unitWidth;
    cursor = addDays(unitEnd, 1);
  }
  return units;
}

function getTimelineUnitEnd(start: Date, scale: GanttScale, maxEnd: Date) {
  if (scale === "days") return start;
  if (scale === "weeks") return new Date(Math.min(addDays(start, 6).getTime(), maxEnd.getTime()));
  return new Date(Math.min(new Date(start.getFullYear(), start.getMonth() + 1, 0).getTime(), maxEnd.getTime()));
}

function getTimelineUnitLabel(date: Date, scale: GanttScale) {
  if (scale === "days") return `${date.toLocaleDateString("es-SV", { month: "short" })} ${date.getDate()}`;
  if (scale === "weeks") return `Sem ${getWeekNumber(date)}`;
  return date.toLocaleDateString("es-SV", { month: "short", year: "2-digit" });
}

function getTimelineOffset(units: Array<{ start: Date; end: Date; left: number; width: number }>, date: Date) {
  const target = startOfDay(date);
  const unit = units.find((item) => target >= item.start && target <= item.end);
  if (!unit) return target < units[0]?.start ? 0 : units.reduce((sum, item) => sum + item.width, 0);
  const spanDays = Math.max(daysBetween(unit.start, unit.end) + 1, 1);
  const offsetDays = Math.max(daysBetween(unit.start, target), 0);
  return unit.left + (offsetDays / spanDays) * unit.width;
}

function getScalePixelsPerDay(scale: GanttScale, unitWidth: number) {
  if (scale === "days") return unitWidth;
  if (scale === "weeks") return unitWidth / 7;
  return unitWidth / 30;
}

function getScaleLabel(scale: GanttScale) {
  if (scale === "days") return "Dias";
  if (scale === "weeks") return "Semanas";
  return "Meses";
}

function getWeekNumber(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7);
}

function buildPrintGridGradient(units: Array<{ left: number; width: number }>) {
  const stops = units.map((unit) => `linear-gradient(90deg, transparent ${Math.max(unit.left + unit.width - 1, 0)}px, #e5e7eb ${unit.left + unit.width}px, transparent ${unit.left + unit.width + 1}px)`);
  return stops.length > 0 ? stops.join(", ") : "#ffffff";
}

function getActivityDuration(activity: ProjectActivity) {
  if (!isValidDate(activity.startDate) || !isValidDate(activity.endDate)) return 0;
  return Math.max(businessDaysBetween(parseDate(activity.startDate), parseDate(activity.endDate)), 1);
}

function formatActivityDate(value: string) {
  if (!isValidDate(value)) return "-";
  return parseDate(value).toLocaleDateString("es-SV");
}

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getActivityProgress(activity: ProjectActivity) {
  if (activity.completed) return 100;
  if (typeof activity.progress === "number") return clampProgress(activity.progress);
  if (!isValidDate(activity.startDate) || !isValidDate(activity.endDate)) return 0;
  const start = parseDate(activity.startDate).getTime();
  const end = parseDate(activity.endDate).getTime();
  const now = new Date().getTime();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / Math.max(end - start, 1)) * 100);
}

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function getActivityAssigneeName(activity: ProjectActivity, members: ProjectMember[]) {
  if (!activity.assigneeEmail) return "Sin asignar";
  return members.find((member) => member.email === activity.assigneeEmail)?.name ?? activity.assigneeEmail;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addBusinessDays(date: Date, amount: number) {
  let next = startOfDay(date);
  if (!isBusinessDay(next)) next = nextBusinessDay(next);
  let added = 0;
  while (added < amount) {
    next = addDays(next, 1);
    if (isBusinessDay(next)) added += 1;
  }
  return next;
}

function businessDaysBetween(start: Date, end: Date) {
  const from = startOfDay(start);
  const to = startOfDay(end);
  if (to < from) return 0;
  let total = 0;
  for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) {
    if (isBusinessDay(cursor)) total += 1;
  }
  return total;
}

function nextBusinessDay(date: Date) {
  let next = startOfDay(date);
  while (!isBusinessDay(next)) next = addDays(next, 1);
  return next;
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function daysBetween(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / msPerDay);
}

function isValidDate(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
