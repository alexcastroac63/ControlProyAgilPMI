"use client";

import { Button, Card, Input, cn } from "@devhub/ui";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Edit3, FolderKanban, Plus, Save, Send, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import { canSeeProject, getUserAccessContext, isActiveSprint, UserAccessContext } from "@/lib/access-control";
import { createId } from "@/lib/ids";

type Project = { id?: string; code: string; name: string; status?: string; sprintWeeks?: number; staffing?: Array<{ name?: string; email?: string; role?: string }> };
type Sprint = { id: string; projectId?: string; name: string; goal?: string; startDate: string; endDate: string; capacity?: number; velocity?: number };
type Person = { id: string; name: string; email: string; defaultRole?: string; firstName?: string; lastName?: string };
type StoryTask = { id: string; code: string; title: string; assigneeEmail: string; status: string };
type BoardItem = {
  id: string;
  projectCode: string;
  key: string;
  title: string;
  status: "Por hacer" | "En curso" | "Bloqueada" | "Desarrollo finalizado" | "Listo para QA" | "En QA" | "Finalizado";
  priority: "Low" | "Medium" | "High" | "Critical";
  points: number;
  sprintId?: string | null;
  tasks?: StoryTask[];
};
type BoardSprint = { id: string; projectCode: string; name: string; goal: string; startDate: string; endDate: string };
type WorkItem = {
  id: string;
  projectId?: string;
  key: string;
  title: string;
  summary?: string;
  description?: string;
  type: "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG" | "SPIKE";
  status: string;
  priority: "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST" | "CRITICAL";
  storyPoints?: number;
  sprintId?: string | null;
  dependencyIds?: string[];
  tasks?: StoryTask[];
};

const demoProjects: Project[] = [
  { id: "demo-proy", code: "PROY", name: "DevOps Hub Core", status: "ACTIVE" },
  { id: "demo-qa", code: "QA", name: "QA Automation", status: "PLANNED" },
  { id: "demo-devhub-build", code: "DEVHUB", name: "Creacion Plataforma DevOps Hub", status: "ACTIVE" }
];

const demoSprints: Sprint[] = [
  { id: "sprint-1", projectId: "demo-proy", name: "Sprint 1", goal: "Auth y backlog base", startDate: "2026-04-20", endDate: "2026-05-03", capacity: 120, velocity: 42 },
  { id: "sprint-2", projectId: "demo-proy", name: "Sprint 2", goal: "Board, QA y GitHub", startDate: "2026-05-04", endDate: "2026-05-17", capacity: 128, velocity: 48 },
  { id: "sprint-3", projectId: "demo-proy", name: "Sprint 3", goal: "Reporteria y Gantt", startDate: "2026-05-18", endDate: "2026-05-31", capacity: 110, velocity: 40 },
  { id: "sprint-qa-1", projectId: "demo-qa", name: "Sprint QA 1", goal: "Suite de regresion", startDate: "2026-05-04", endDate: "2026-05-17", capacity: 80, velocity: 24 },
  { id: "sprint-devhub-1", projectId: "demo-devhub-build", name: "Sprint 1", goal: "Base arquitectura, auth y proyectos", startDate: "2026-04-24", endDate: "2026-04-28", capacity: 120, velocity: 34 },
  { id: "sprint-devhub-2", projectId: "demo-devhub-build", name: "Sprint 2", goal: "Backlog, Scrum Board, Projects y Gantt", startDate: "2026-04-29", endDate: "2026-05-02", capacity: 128, velocity: 42 },
  { id: "sprint-devhub-3", projectId: "demo-devhub-build", name: "Sprint 3", goal: "QA, GitHub, Docker y auditoria", startDate: "2026-05-03", endDate: "2026-05-07", capacity: 120, velocity: 38 }
];

const demoItems: WorkItem[] = [
  { id: "wi-1", projectId: "demo-proy", key: "HU00001", title: "Implementar autenticacion JWT con refresh tokens", summary: "Acceso seguro con sesiones renovables.", type: "STORY", status: "DONE", priority: "CRITICAL", storyPoints: 8, sprintId: "sprint-1", tasks: [{ id: "task-hu-1", code: "T00001", title: "Crear login local", assigneeEmail: "diana.dev@devhub.local", status: "En curso" }] },
  { id: "wi-2", projectId: "demo-proy", key: "HU00002", title: "Board Scrum con WIP limits y drag/drop", summary: "Mover tickets entre columnas configurables.", type: "STORY", status: "IN_PROGRESS", priority: "HIGH", storyPoints: 13, sprintId: "sprint-2", dependencyIds: ["wi-1"] },
  { id: "wi-3", projectId: "demo-proy", key: "HU00003", title: "Matriz de trazabilidad QA", summary: "Relacionar historias con casos y ejecuciones.", type: "STORY", status: "READY", priority: "MEDIUM", storyPoints: 5, dependencyIds: ["wi-2"] },
  { id: "wi-4", projectId: "demo-proy", key: "HU00004", title: "Sincronizar PR aprobado con Ready QA", summary: "Automatizar cambios de estado desde GitHub.", type: "BUG", status: "QA", priority: "HIGH", storyPoints: 3, sprintId: "sprint-2" },
  { id: "wi-5", projectId: "demo-qa", key: "HU00005", title: "Crear suite de regresion automatizada", summary: "Agrupar pruebas criticas del producto.", type: "STORY", status: "READY", priority: "HIGH", storyPoints: 8, sprintId: "sprint-2" },
  { id: "wi-6", projectId: "demo-qa", key: "HU00006", title: "Publicar evidencias por ejecucion", summary: "Adjuntar capturas y documentos a cada corrida.", type: "STORY", status: "BACKLOG", priority: "MEDIUM", storyPoints: 5 },
  { id: "devhub-wi-1", projectId: "demo-devhub-build", key: "HU00001", title: "Login seguro con JWT de 3 horas", summary: "Inicio de sesion con token de autenticacion y cierre automatico.", description: "Crear login local, generar JWT con vencimiento de 3 horas y redirigir a login al expirar.", type: "STORY", status: "DONE", priority: "CRITICAL", storyPoints: 8, sprintId: "sprint-devhub-1", tasks: [{ id: "devhub-t-1", code: "T00001", title: "Crear pantalla de login", assigneeEmail: "marco.frontend@devhub.local", status: "Finalizada" }, { id: "devhub-t-2", code: "T00002", title: "Emitir token con vencimiento", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" }] },
  { id: "devhub-wi-2", projectId: "demo-devhub-build", key: "HU00002", title: "Administracion de proyectos con adjuntos", summary: "Proyectos con costos, personas, adjuntos locales, SharePoint y miniaturas.", description: "Permitir crear proyectos, editar estado/nombre/icono, registrar presupuesto, personal, actividades y almacenar adjuntos por ruta del servidor.", type: "STORY", status: "QA", priority: "HIGH", storyPoints: 13, sprintId: "sprint-devhub-2", dependencyIds: ["devhub-wi-1"], tasks: [{ id: "devhub-t-3", code: "T00003", title: "Guardar adjuntos en ruta del servidor", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" }, { id: "devhub-t-4", code: "T00004", title: "Miniaturas e iconos por extension", assigneeEmail: "marco.frontend@devhub.local", status: "En pruebas" }] },
  { id: "devhub-wi-3", projectId: "demo-devhub-build", key: "HU00003", title: "Backlog con HU, dependencias, tareas y sprints", summary: "HU con mascara HU00000, tareas T00000, dependencias y asignacion a sprint.", type: "STORY", status: "DONE", priority: "HIGH", storyPoints: 13, sprintId: "sprint-devhub-2", dependencyIds: ["devhub-wi-1"], tasks: [{ id: "devhub-t-5", code: "T00005", title: "Codigos HU00000 y T00000", assigneeEmail: "diana.dev@devhub.local", status: "Finalizada" }] },
  { id: "devhub-wi-4", projectId: "demo-devhub-build", key: "HU00004", title: "Scrum Board con drag/drop y estados QA", summary: "Estados por sprint, persistencia, orden interno y calculo de puntos.", type: "STORY", status: "READY", priority: "HIGH", storyPoints: 8, sprintId: "sprint-devhub-2", dependencyIds: ["devhub-wi-3"], tasks: [{ id: "devhub-t-6", code: "T00006", title: "Persistir movimientos entre estados", assigneeEmail: "marco.frontend@devhub.local", status: "En pruebas" }] },
  { id: "devhub-wi-5", projectId: "demo-devhub-build", key: "HU00005", title: "QA tipo Xray integrado con Scrum Board", summary: "Planes, suites, casos, ejecuciones, defectos y trazabilidad.", type: "STORY", status: "IN_PROGRESS", priority: "HIGH", storyPoints: 8, sprintId: "sprint-devhub-3", dependencyIds: ["devhub-wi-4"], tasks: [{ id: "devhub-t-7", code: "T00007", title: "Matriz de trazabilidad y ejecuciones", assigneeEmail: "sofia.qa@devhub.local", status: "En curso" }] },
  { id: "devhub-wi-6", projectId: "demo-devhub-build", key: "HU00006", title: "GitHub por proyecto y documentacion Docker", summary: "Estadisticas por proyecto, servicios y pasos de instalacion con contenedores.", type: "STORY", status: "IN_PROGRESS", priority: "MEDIUM", storyPoints: 5, sprintId: "sprint-devhub-3", dependencyIds: ["devhub-wi-4"], tasks: [{ id: "devhub-t-8", code: "T00008", title: "Estadisticas por repositorio", assigneeEmail: "ivan.auto@devhub.local", status: "En curso" }] },
  { id: "devhub-wi-7", projectId: "demo-devhub-build", key: "HU00007", title: "Auditoria y fallback sin PostgreSQL", summary: "Validar procesos, builds, endpoints y modo demo cuando DB no responde.", type: "STORY", status: "READY", priority: "CRITICAL", storyPoints: 5, sprintId: "sprint-devhub-3", dependencyIds: ["devhub-wi-6"], tasks: [{ id: "devhub-t-9", code: "T00009", title: "Servicios API con modo demo seguro", assigneeEmail: "diana.dev@devhub.local", status: "Pendiente" }] },
  { id: "devhub-wi-8", projectId: "demo-devhub-build", key: "HU00008", title: "Microsoft SharePoint y dominios autorizados", summary: "Login Microsoft, dominios permitidos y almacenamiento SharePoint productivo.", type: "STORY", status: "BACKLOG", priority: "MEDIUM", storyPoints: 3, sprintId: null, dependencyIds: ["devhub-wi-2"], tasks: [{ id: "devhub-t-10", code: "T00010", title: "Completar flujo Microsoft productivo", assigneeEmail: "ivan.auto@devhub.local", status: "Pendiente" }] }
];

const priorities = ["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST", "CRITICAL"];
const taskStatuses = ["Pendiente", "En curso", "Bloqueada", "Finalizada"];
const peopleStorageKey = "devhub.people";
const projectsStorageKey = "devhub.projects";
const sprintWeeksStorageKey = "devhub.projectSprintWeeks";
const boardStorageKey = "devhub.scrumBoard";
const boardSprintStorageKey = "devhub.boardSprints";
const backlogDropId = "sprint:backlog";
let sprintStartDateUpdater: (sprintId: string, startDate: string) => void = () => {};
const emptyStory = {
  title: "",
  summary: "",
  description: "",
  priority: "MEDIUM" as WorkItem["priority"],
  storyPoints: 3,
  sprintId: "",
  dependencyIds: [] as string[],
  tasks: [] as StoryTask[]
};

const defaultPeople: Person[] = [
  { id: "person-1", name: "Alex Admin", email: "admin@devhub.local", defaultRole: "Encargado del proyecto" },
  { id: "person-2", name: "Diana Developer", email: "diana.dev@devhub.local", defaultRole: "Desarrollador" },
  { id: "person-3", name: "Marco Frontend", email: "marco.frontend@devhub.local", defaultRole: "Desarrollador" },
  { id: "person-4", name: "Sofia QA", email: "sofia.qa@devhub.local", defaultRole: "QA" }
];

export default function BacklogPage() {
  const router = useRouter();
  const [routeProjectId, setRouteProjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [items, setItems] = useState<WorkItem[]>(demoItems);
  const [sprints, setSprints] = useState<Sprint[]>(demoSprints);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyStory);
  const [showStoryForm, setShowStoryForm] = useState(false);
  const [showDependencySearch, setShowDependencySearch] = useState(false);
  const [dependencySearch, setDependencySearch] = useState("");
  const [peopleCatalog, setPeopleCatalog] = useState<Person[]>(defaultPeople);
  const [taskDraft, setTaskDraft] = useState<StoryTask>({ id: "", code: "", title: "", assigneeEmail: "", status: "Pendiente" });
  const [backlogTab, setBacklogTab] = useState<"stories" | "tasks">("stories");
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintDraft, setSprintDraft] = useState({ name: "", goal: "", startDate: "", endDate: "" });
  const [sprintWeeks, setSprintWeeks] = useState(2);
  const [projectSprintWeeks, setProjectSprintWeeks] = useState<Record<string, number>>({});
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [accessContext, setAccessContext] = useState<UserAccessContext | null>(null);

  const { data: projects = demoProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/projects"),
    retry: false
  });

  const availableProjects = useMemo(() => {
    const source = localProjects.length ? localProjects : projects.length ? projects : demoProjects;
    return accessContext ? source.filter((project) => canSeeProject(project, accessContext)) : source;
  }, [accessContext, localProjects, projects]);
  const activeSelectedProjectId = selectedProjectId ?? routeProjectId;
  const selectedProject = activeSelectedProjectId
    ? availableProjects.find((p) => (p.id ?? p.code) === activeSelectedProjectId) ?? demoProjects.find((p) => p.id === activeSelectedProjectId)
    : null;

  useEffect(() => {
    const saved = localStorage.getItem(peopleStorageKey);
    if (!saved) return;
    const parsed = JSON.parse(saved) as Person[];
    setPeopleCatalog(parsed.map(normalizePerson));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(projectsStorageKey);
    const savedSprintWeeks = localStorage.getItem(sprintWeeksStorageKey);
    setRouteProjectId(new URLSearchParams(window.location.search).get("project"));
    if (saved) setLocalProjects(JSON.parse(saved) as Project[]);
    if (savedSprintWeeks) setProjectSprintWeeks(JSON.parse(savedSprintWeeks) as Record<string, number>);
    setAccessContext(getUserAccessContext());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    setSprintWeeks(getProjectSprintWeeks(selectedProject, projectSprintWeeks));
  }, [projectSprintWeeks, selectedProject]);

  useQuery({
    queryKey: ["backlog", activeSelectedProjectId],
    queryFn: async () => {
      if (!activeSelectedProjectId) return [];
      if (activeSelectedProjectId.startsWith("demo")) {
        const data = demoItems.filter((item) => item.projectId === activeSelectedProjectId).map(normalizeWorkItemTasks);
        setItems(data);
        return data;
      }
      const data = await api<WorkItem[]>(`/backlog/${activeSelectedProjectId}`);
      setItems(data.map(normalizeWorkItemTasks));
      return data;
    },
    retry: false
  });

  useQuery({
    queryKey: ["sprints", activeSelectedProjectId],
    queryFn: async () => {
      if (!activeSelectedProjectId) return [];
      if (activeSelectedProjectId.startsWith("demo")) {
        const data = demoSprints.filter((sprint) => sprint.projectId === activeSelectedProjectId);
        setSprints(data);
        return data;
      }
      const data = await api<Sprint[]>(`/sprints/${activeSelectedProjectId}`);
      setSprints(data);
      return data;
    },
    retry: false
  });

  const visibleSprints = useMemo(() => {
    if (!accessContext?.onlyActiveSprint) return sprints;
    const active = sprints.filter(isActiveSprint);
    return active.length ? active : sprints.slice(0, 1);
  }, [accessContext, sprints]);
  const visibleSprintIds = useMemo(() => new Set(visibleSprints.map((sprint) => sprint.id)), [visibleSprints]);
  const visibleItems = useMemo(() => accessContext?.onlyActiveSprint ? items.filter((item) => item.sprintId && visibleSprintIds.has(item.sprintId)) : items, [accessContext, items, visibleSprintIds]);
  const gantt = useMemo(() => buildGantt(visibleSprints, visibleItems), [visibleSprints, visibleItems]);
  const backlogItems = useMemo(() => accessContext?.onlyActiveSprint ? [] : visibleItems.filter((item) => !item.sprintId), [accessContext, visibleItems]);
  const sprintGroups = useMemo(() => visibleSprints.map((sprint) => ({ sprint, items: visibleItems.filter((item) => item.sprintId === sprint.id) })), [visibleItems, visibleSprints]);
  const activeSprint = useMemo(() => getActiveSprint(sprintGroups), [sprintGroups]);
  const projectPeople = useMemo(() => getProjectPeople(selectedProject ?? null, peopleCatalog), [peopleCatalog, selectedProject]);
  const taskAssigneeOptions = useMemo(() => (draft.sprintId ? projectPeople : peopleCatalog), [draft.sprintId, peopleCatalog, projectPeople]);
  const activeSprintTasks = useMemo(() => buildActiveSprintTasks(activeSprint?.items ?? [], projectPeople), [activeSprint, projectPeople]);
  const dependencyOptions = useMemo(() => {
    const query = dependencySearch.trim().toLowerCase();
    return items.filter((item) => {
      if (item.id === editingId || item.type !== "STORY" || draft.dependencyIds.includes(item.id)) return false;
      if (!query) return true;
      return `${item.key} ${item.title} ${item.summary ?? ""}`.toLowerCase().includes(query);
    });
  }, [dependencySearch, draft.dependencyIds, editingId, items]);

  async function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    if (!draft.title.trim()) {
      toast.error("Ingresa el titulo de la historia");
      return;
    }
    const payload = {
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      type: "STORY" as const,
      priority: draft.priority,
      storyPoints: Number(draft.storyPoints || 0),
      sprintId: draft.sprintId || null,
      dependencyIds: draft.dependencyIds,
      tasks: draft.tasks
    };
    if (payload.sprintId && hasExternalTaskAssignee(payload.tasks, projectPeople)) {
      toast.error("Las tareas de un sprint solo pueden asignarse al personal del proyecto");
      return;
    }

    if (editingId) {
      const original = items.find((item) => item.id === editingId);
      const updatedStory = original ? { ...original, ...payload } : { id: editingId, projectId: selectedProjectId ?? selectedProject.code, key: "", status: payload.sprintId ? "READY" : "BACKLOG", ...payload };
      setItems((current) => current.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
      syncStoryWithScrumBoard(updatedStory, selectedProject.code, sprints, !original?.sprintId && Boolean(payload.sprintId));
      if (selectedProjectId && !selectedProjectId.startsWith("demo")) {
        await api(`/backlog/items/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        await api(`/backlog/items/${editingId}/sprint`, { method: "PATCH", body: JSON.stringify({ sprintId: payload.sprintId }) });
      }
      toast.success("Historia actualizada");
    } else {
      const nextNumber = getNextStoryNumber(items);
      const localStory: WorkItem = {
        id: createId("sprint"),
        projectId: selectedProjectId ?? selectedProject.code,
        key: formatStoryKey(nextNumber),
        status: payload.sprintId ? "READY" : "BACKLOG",
        ...payload
      };
      setItems((current) => [localStory, ...current]);
      if (payload.sprintId) syncStoryWithScrumBoard(localStory, selectedProject.code, sprints, true);
      if (selectedProjectId && !selectedProjectId.startsWith("demo")) {
        const created = await api<WorkItem>(`/backlog/${selectedProjectId}/items`, { method: "POST", body: JSON.stringify({ ...payload, projectCode: selectedProject.code }) });
        setItems((current) => current.map((item) => (item.id === localStory.id ? { ...created, dependencyIds: payload.dependencyIds, tasks: payload.tasks } : item)));
      }
      toast.success("Historia creada");
    }

    setEditingId(null);
    setDraft(emptyStory);
    setShowStoryForm(false);
    setTaskDraft({ id: "", code: "", title: "", assigneeEmail: "", status: "Pendiente" });
  }

  function editStory(item: WorkItem) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      summary: item.summary ?? "",
      description: item.description ?? "",
      priority: item.priority,
      storyPoints: item.storyPoints ?? 0,
      sprintId: item.sprintId ?? "",
      dependencyIds: item.dependencyIds ?? [],
      tasks: normalizeTasks(item.tasks)
    });
    setShowStoryForm(true);
  }

  function openCreateStory() {
    setEditingId(null);
    setDraft(emptyStory);
    setTaskDraft({ id: "", code: "", title: "", assigneeEmail: "", status: "Pendiente" });
    setShowStoryForm(true);
  }

  function cancelStoryForm() {
    setEditingId(null);
    setDraft(emptyStory);
    setShowStoryForm(false);
    setShowDependencySearch(false);
    setDependencySearch("");
    setTaskDraft({ id: "", code: "", title: "", assigneeEmail: "", status: "Pendiente" });
  }

  function addTaskToDraft() {
    if (!taskDraft.title.trim()) {
      toast.error("Ingresa el nombre de la tarea");
      return;
    }
    if (draft.sprintId && taskDraft.assigneeEmail && !isProjectAssignee(taskDraft.assigneeEmail, projectPeople)) {
      toast.error("Las tareas de un sprint solo pueden asignarse al personal del proyecto");
      return;
    }
    const task: StoryTask = {
      id: createId("story"),
      code: formatTaskKey(getNextTaskNumber(items, draft.tasks)),
      title: taskDraft.title.trim(),
      assigneeEmail: taskDraft.assigneeEmail,
      status: taskDraft.status || "Pendiente"
    };
    setDraft((value) => ({ ...value, tasks: [...value.tasks, task] }));
    setTaskDraft({ id: "", code: "", title: "", assigneeEmail: "", status: "Pendiente" });
  }

  function updateDraftTask(id: string, patch: Partial<StoryTask>) {
    if (draft.sprintId && patch.assigneeEmail && !isProjectAssignee(patch.assigneeEmail, projectPeople)) {
      toast.error("Las tareas de un sprint solo pueden asignarse al personal del proyecto");
      return;
    }
    setDraft((value) => ({ ...value, tasks: value.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)) }));
  }

  function removeDraftTask(id: string) {
    setDraft((value) => ({ ...value, tasks: value.tasks.filter((task) => task.id !== id) }));
  }

  function updateTaskStatus(storyId: string, taskId: string, status: string) {
    setItems((current) => current.map((item) => item.id === storyId ? { ...item, tasks: normalizeTasks(item.tasks).map((task) => task.id === taskId ? { ...task, status } : task) } : item));
    toast.success("Estado de tarea actualizado");
  }

  function updateTaskAssignee(storyId: string, taskId: string, assigneeEmail: string) {
    const story = items.find((item) => item.id === storyId);
    if (story?.sprintId && assigneeEmail && !isProjectAssignee(assigneeEmail, projectPeople)) {
      toast.error("Las tareas de un sprint solo pueden asignarse al personal del proyecto");
      return;
    }
    setItems((current) => current.map((item) => item.id === storyId ? { ...item, tasks: normalizeTasks(item.tasks).map((task) => task.id === taskId ? { ...task, assigneeEmail } : task) } : item));
    toast.success("Encargado de tarea actualizado");
  }

  async function assignSprint(item: WorkItem, sprintId: string) {
    setItems((current) => current.map((candidate) => (candidate.id === item.id ? { ...candidate, sprintId: sprintId || null, status: sprintId ? "READY" : "BACKLOG" } : candidate)));
    syncStoryWithScrumBoard({ ...item, sprintId: sprintId || null }, selectedProject?.code ?? "", sprints, !item.sprintId && Boolean(sprintId));
    if (selectedProjectId && !selectedProjectId.startsWith("demo")) {
      await api(`/backlog/items/${item.id}/sprint`, { method: "PATCH", body: JSON.stringify({ sprintId: sprintId || null }) });
    }
  }

  function createSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProjectId) return;
    if (!sprintDraft.name.trim()) {
      toast.error("Ingresa el nombre del sprint");
      return;
    }
    const calculatedEndDate = calculateSprintEndDate(sprintDraft.startDate, sprintWeeks);
    const sprint: Sprint = {
      id: `sprint-${Date.now()}`,
      projectId: selectedProjectId,
      name: sprintDraft.name.trim(),
      goal: sprintDraft.goal.trim(),
      startDate: sprintDraft.startDate,
      endDate: calculatedEndDate,
      capacity: 0,
      velocity: 0
    };
    setSprints((current) => [...current, sprint]);
    setSprintDraft({ name: "", goal: "", startDate: "", endDate: "" });
    setShowSprintForm(false);
    toast.success("Sprint creado");
  }

  function updateSprintWeeks(value: number) {
    const weeks = Math.max(1, value || 1);
    setSprintWeeks(weeks);
    if (selectedProject?.code) {
      const nextConfig = { ...projectSprintWeeks, [selectedProject.code]: weeks };
      setProjectSprintWeeks(nextConfig);
      localStorage.setItem(sprintWeeksStorageKey, JSON.stringify(nextConfig));
      const savedProjects = localStorage.getItem(projectsStorageKey);
      if (savedProjects) {
        const updatedProjects = (JSON.parse(savedProjects) as Project[]).map((project) =>
          project.code === selectedProject.code || project.id === selectedProject.id ? { ...project, sprintWeeks: weeks } : project
        );
        localStorage.setItem(projectsStorageKey, JSON.stringify(updatedProjects));
        setLocalProjects(updatedProjects);
      }
    }
    setSprints((current) => current.map((sprint) => ({ ...sprint, endDate: calculateSprintEndDate(sprint.startDate, weeks) })));
    setSprintDraft((current) => ({ ...current, endDate: calculateSprintEndDate(current.startDate, weeks) }));
  }

  function updateSprintDraftStartDate(startDate: string) {
    setSprintDraft((current) => ({ ...current, startDate, endDate: calculateSprintEndDate(startDate, sprintWeeks) }));
  }

  function updateSprintStartDate(sprintId: string, startDate: string) {
    const endDate = calculateSprintEndDate(startDate, sprintWeeks);
    setSprints((current) => current.map((sprint) => (sprint.id === sprintId ? { ...sprint, startDate, endDate } : sprint)));
    if (selectedProjectId && !selectedProjectId.startsWith("demo")) {
      void api(`/sprints/${sprintId}`, { method: "PATCH", body: JSON.stringify({ startDate, endDate }) });
    }
    toast.success("Fechas del sprint actualizadas");
  }

  function handleDragEnd(event: DragEndEvent) {
    const itemId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    if (!overId) return;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const originSprintId = item.sprintId ?? null;
    const destinationSprintId =
      overId === backlogDropId
        ? null
        : overId.startsWith("sprint:")
          ? overId.replace("sprint:", "")
          : items.find((candidate) => `story:${candidate.id}` === overId)?.sprintId ?? null;
    const movedToDifferentGroup = originSprintId !== destinationSprintId;

    setItems((current) => {
      const moving = current.find((candidate) => candidate.id === itemId);
      if (!moving) return current;
      const withoutMoving = current.filter((candidate) => candidate.id !== itemId);

      if (overId === backlogDropId || overId.startsWith("sprint:")) {
        const sprintId = overId === backlogDropId ? null : overId.replace("sprint:", "");
        return [...withoutMoving, { ...moving, sprintId, status: sprintId ? "READY" : "BACKLOG" }];
      }

      if (overId.startsWith("story:")) {
        const targetId = overId.replace("story:", "");
        const targetIndex = withoutMoving.findIndex((candidate) => candidate.id === targetId);
        const target = withoutMoving[targetIndex];
        if (!target) return current;
        const next = [...withoutMoving];
        next.splice(targetIndex, 0, { ...moving, sprintId: target.sprintId ?? null, status: target.sprintId ? "READY" : "BACKLOG" });
        return next;
      }

      return current;
    });

    if (!movedToDifferentGroup) return;

    syncStoryWithScrumBoard({ ...item, sprintId: destinationSprintId }, selectedProject?.code ?? "", sprints, !originSprintId && Boolean(destinationSprintId));

    if (selectedProjectId && !selectedProjectId.startsWith("demo")) {
      void api(`/backlog/items/${item.id}/sprint`, { method: "PATCH", body: JSON.stringify({ sprintId: destinationSprintId }) });
    }
    toast.success(`${item.key} movida`);
  }

  function toggleDependency(id: string) {
    setDraft((value) => ({
      ...value,
      dependencyIds: value.dependencyIds.includes(id) ? value.dependencyIds.filter((item) => item !== id) : [...value.dependencyIds, id]
    }));
  }

  sprintStartDateUpdater = updateSprintStartDate;

  if (!selectedProject) {
    return (
      <AppShell>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Backlog</h1>
          <p className="mt-1 text-sm text-slate-400">Selecciona un proyecto para visualizar sus historias de usuario.</p>
          {(accessContext?.restrictToAssignedProjects || accessContext?.onlyActiveSprint) && <p className="mt-1 text-xs text-cyan-300">Restricciones activas segun perfil: proyectos asignados y/o sprint activo.</p>}
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {availableProjects.map((project) => (
            <a
              key={project.id ?? project.code}
              href={`/backlog?project=${encodeURIComponent(project.id ?? project.code)}`}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-left transition active:border-cyan-400 hover:border-cyan-500 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <FolderKanban className="h-5 w-5 text-cyan-300" />
                <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{project.status ?? "ACTIVE"}</span>
              </div>
              <div className="mt-5 font-mono text-sm text-cyan-300">{project.code}</div>
              <div className="mt-2 text-lg font-semibold">{project.name}</div>
            </a>
          ))}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Backlog de {selectedProject.code}</h1>
          <p className="mt-1 text-sm text-slate-400">{selectedProject.name} - historias de usuario del proyecto.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={openCreateStory}><Plus className="h-4 w-4" />Crear historia de usuario</Button>
          <Button variant="secondary" onClick={() => { setSelectedProjectId(null); router.push("/backlog"); }}><ArrowLeft className="h-4 w-4" />Cambiar proyecto</Button>
        </div>
      </div>

      <section className={cn("grid gap-4", showSprintForm && "xl:grid-cols-[1.15fr_.85fr]")}>
        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-medium">Historias por sprint</h2>
              <p className="mt-1 text-xs text-slate-400">Arrastra historias entre Backlog y los sprints del proyecto.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex rounded-md border border-slate-800 bg-slate-950 p-1">
                <button type="button" onClick={() => setBacklogTab("stories")} className={cn("rounded px-3 py-2 text-sm", backlogTab === "stories" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}>Historias</button>
                <button type="button" onClick={() => setBacklogTab("tasks")} className={cn("rounded px-3 py-2 text-sm", backlogTab === "tasks" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200")}>Tareas activas</button>
              </div>
              <label className="space-y-2">
                <span className="text-xs text-slate-400">Tamano sprint (semanas)</span>
                <Input type="number" min={1} value={sprintWeeks} onChange={(event) => updateSprintWeeks(Number(event.target.value))} className="w-36" />
              </label>
              <Button type="button" onClick={() => setShowSprintForm(true)}><Plus className="h-4 w-4" />Crear sprint</Button>
            </div>
          </div>
          {backlogTab === "stories" ? (
            <DndContext onDragEnd={handleDragEnd}>
              <div className="space-y-4 p-4">
                <SprintLane title="Backlog" subtitle="Historias sin sprint asociado" dropId={backlogDropId} items={backlogItems} allItems={items} sprints={sprints} defaultOpen onAssignSprint={assignSprint} onEditStory={editStory} />
                {sprintGroups.map((group) => (
                  <SprintLane key={group.sprint.id} title={group.sprint.name} subtitle={[group.sprint.goal, `${formatDate(group.sprint.startDate)} - ${formatDate(group.sprint.endDate)}`].filter(Boolean).join(" · ")} dropId={`sprint:${group.sprint.id}`} items={group.items} allItems={items} sprints={sprints} onAssignSprint={assignSprint} onEditStory={editStory} />
                ))}
                {sprints.length === 0 && <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">Crea un sprint para planificar las historias del proyecto.</div>}
              </div>
            </DndContext>
          ) : (
            <ActiveSprintTasksView sprint={activeSprint?.sprint} tasks={activeSprintTasks} people={projectPeople} onStatusChange={updateTaskStatus} onAssigneeChange={updateTaskAssignee} />
          )}
        </Card>

        {showSprintForm && (
          <div className="space-y-4">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Crear sprint</h2>
                <Button type="button" variant="secondary" onClick={() => setShowSprintForm(false)}><X className="h-4 w-4" />Cerrar</Button>
              </div>
              <form onSubmit={createSprint} className="space-y-3">
                <Input value={sprintDraft.name} onChange={(event) => setSprintDraft((value) => ({ ...value, name: event.target.value }))} placeholder="Nombre del sprint" />
                <Input value={sprintDraft.goal} onChange={(event) => setSprintDraft((value) => ({ ...value, goal: event.target.value }))} placeholder="Goal del sprint" />
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs text-slate-400">Inicio</span>
                    <Input type="date" value={sprintDraft.startDate} onChange={(event) => updateSprintDraftStartDate(event.target.value)} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs text-slate-400">Fin calculado</span>
                    <Input value={sprintDraft.endDate || "Selecciona inicio"} readOnly />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowSprintForm(false)}>Cancelar</Button>
                  <Button type="submit"><Save className="h-4 w-4" />Guardar</Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </section>

      <Card className="mt-6 overflow-x-auto">
        <h2 className="mb-4 text-lg font-medium">Diagrama Gantt del proyecto</h2>
        <div className="min-w-[980px] space-y-3">
          <div className="grid grid-cols-[180px_1fr] items-center gap-4">
            <div className="text-xs text-slate-500">Historia</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(gantt.weeks.length, 1)}, minmax(96px, 1fr))` }}>
              {gantt.weeks.map((week) => (
                <div key={week.id} className="rounded bg-slate-900 px-2 py-1 text-xs text-slate-400">
                  {week.label}
                </div>
              ))}
            </div>
          </div>
          {gantt.rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[180px_1fr] items-center gap-4">
              <div className="truncate text-sm text-slate-300">{row.label}</div>
              <div className="relative h-10 rounded-md bg-slate-900">
                <div className="absolute inset-0 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(gantt.weeks.length, 1)}, minmax(96px, 1fr))` }}>
                  {gantt.weeks.map((week) => <div key={week.id} className="border-r border-slate-800/80 last:border-r-0" />)}
                </div>
                <div className="absolute inset-y-1 rounded bg-cyan-500/80" style={{ left: `${row.left}%`, width: `${row.width}%` }} />
                <div className={cn("absolute inset-y-0 flex items-center text-xs text-slate-950", row.width > 18 ? "px-3" : "px-1")} style={{ left: `${row.left}%` }}>
                  <Send className="mr-1 h-3 w-3" /> {row.points} pts
                </div>
              </div>
            </div>
          ))}
          {gantt.rows.length === 0 && <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">Asocia historias a sprints con fecha para visualizar el Gantt semanal.</div>}
        </div>
      </Card>

      {showStoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium">{editingId ? "Modificar historia de usuario" : "Crear historia de usuario"}</h2>
              <Button type="button" variant="secondary" onClick={cancelStoryForm}><X className="h-4 w-4" />Cancelar</Button>
            </div>
            <form onSubmit={saveStory} className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_220px]">
                <Input value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="Titulo de la historia" />
                <select value={draft.priority} onChange={(event) => setDraft((value) => ({ ...value, priority: event.target.value as WorkItem["priority"] }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                  {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
                <Input value={draft.storyPoints} onChange={(event) => setDraft((value) => ({ ...value, storyPoints: Number(event.target.value || 0) }))} type="number" min={0} placeholder="Puntos" />
                <select value={draft.sprintId} onChange={(event) => setDraft((value) => ({ ...value, sprintId: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                  <option value="">Backlog</option>
                  {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
                </select>
              </div>
              <Input value={draft.summary} onChange={(event) => setDraft((value) => ({ ...value, summary: event.target.value }))} placeholder="Resumen" />
              <textarea value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} placeholder="Descripcion" className="min-h-36 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              <div>
                <div className="mb-2 text-xs text-slate-400">Dependencias entre historias</div>
                <div className="rounded-md border border-slate-800 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-medium text-slate-300">Dependencias asociadas</div>
                    <Button type="button" variant="secondary" className="h-8" onClick={() => setShowDependencySearch(true)}>Buscar</Button>
                  </div>
                  <div className="space-y-2">
                    {draft.dependencyIds.length === 0 && <div className="rounded border border-dashed border-slate-800 p-3 text-xs text-slate-500">Sin dependencias asociadas</div>}
                    {draft.dependencyIds.map((id) => {
                      const dependency = items.find((candidate) => candidate.id === id);
                      return dependency ? (
                        <div key={id} className="flex items-center justify-between gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs">
                          <span className="truncate"><span className="font-mono text-cyan-300">{dependency.key}</span> {dependency.title}</span>
                          <button type="button" onClick={() => toggleDependency(id)} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-rose-400 hover:text-rose-300">
                            Quitar
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-slate-400">Tareas de la historia</div>
                <div className="rounded-md border border-slate-800 p-3">
                  <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_220px_160px_auto]">
                    <Input value={taskDraft.title} onChange={(event) => setTaskDraft((value) => ({ ...value, title: event.target.value }))} placeholder="Nombre de la tarea" />
                    <select value={taskDraft.assigneeEmail} onChange={(event) => setTaskDraft((value) => ({ ...value, assigneeEmail: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                      <option value="">Sin asignar</option>
                      {taskAssigneeOptions.map((person) => <option key={person.id} value={person.email}>{person.name}</option>)}
                    </select>
                    <select value={taskDraft.status} onChange={(event) => setTaskDraft((value) => ({ ...value, status: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                      {taskStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <Button type="button" variant="secondary" onClick={addTaskToDraft}>Agregar</Button>
                  </div>
                  <div className="space-y-2">
                    {draft.tasks.length === 0 && <div className="rounded border border-dashed border-slate-800 p-3 text-xs text-slate-500">Sin tareas asociadas</div>}
                    {draft.tasks.map((task) => (
                      <div key={task.id} className="grid gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs lg:grid-cols-[90px_1fr_220px_150px_auto] lg:items-center">
                        <div className="font-mono text-cyan-300">{task.code}</div>
                        <Input value={task.title} onChange={(event) => updateDraftTask(task.id, { title: event.target.value })} />
                        <select value={task.assigneeEmail} onChange={(event) => updateDraftTask(task.id, { assigneeEmail: event.target.value })} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                          <option value="">Sin asignar</option>
                          {taskAssigneeOptions.map((person) => <option key={person.id} value={person.email}>{person.name}</option>)}
                        </select>
                        <select value={task.status} onChange={(event) => updateDraftTask(task.id, { status: event.target.value })} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                          {taskStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                        <button type="button" onClick={() => removeDraftTask(task.id)} className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-rose-400 hover:text-rose-300">Quitar</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={cancelStoryForm}>Cancelar</Button>
                <Button type="submit">{editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingId ? "Guardar cambios" : "Crear historia"}</Button>
              </div>
            </form>
          </div>
          {showDependencySearch && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
              <div className="max-h-[82vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-medium">Buscar historias de usuario</h3>
                    <p className="mt-1 text-xs text-slate-400">Selecciona una historia para agregarla como dependencia.</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setShowDependencySearch(false)}><X className="h-4 w-4" />Cerrar</Button>
                </div>
                <div className="mb-4 flex gap-2">
                  <Input value={dependencySearch} onChange={(event) => setDependencySearch(event.target.value)} placeholder="Buscar por codigo, titulo o resumen" />
                  <Button type="button" onClick={() => setDependencySearch((value) => value.trim())}>Buscar</Button>
                </div>
                <div className="space-y-2">
                  {dependencyOptions.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900/80 p-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-cyan-300">{item.key}</div>
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="mt-1 truncate text-xs text-slate-400">{item.summary || "Sin resumen"}</div>
                      </div>
                      <Button
                        type="button"
                        className="shrink-0"
                        onClick={() => {
                          toggleDependency(item.id);
                          setShowDependencySearch(false);
                          setDependencySearch("");
                        }}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                  {dependencyOptions.length === 0 && <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">No se encontraron historias disponibles.</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function SprintLane({
  title,
  subtitle,
  sprint,
  dropId,
  items,
  allItems,
  sprints,
  defaultOpen = false,
  onAssignSprint,
  onEditStory,
  onUpdateSprintStartDate
}: {
  title: string;
  subtitle: string;
  sprint?: Sprint;
  dropId: string;
  items: WorkItem[];
  allItems: WorkItem[];
  sprints: Sprint[];
  defaultOpen?: boolean;
  onAssignSprint: (item: WorkItem, sprintId: string) => void;
  onEditStory: (item: WorkItem) => void;
  onUpdateSprintStartDate?: (sprintId: string, startDate: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const storyPoints = items.reduce((sum, item) => sum + (item.storyPoints ?? 0), 0);
  const laneSprint = sprint ?? (dropId.startsWith("sprint:") ? sprints.find((candidate) => candidate.id === dropId.replace("sprint:", "")) : undefined);
  const updateStartDate = onUpdateSprintStartDate ?? sprintStartDateUpdater;
  return (
    <section ref={setNodeRef} className={cn("rounded-lg border border-slate-800 bg-slate-950/60 p-3 transition", isOver && "border-cyan-400 bg-cyan-500/10")}>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <button type="button" onClick={() => setIsOpen((value) => !value)} className="flex min-w-0 items-start gap-2 text-left">
          <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition", !isOpen && "-rotate-90")} />
          <div className="min-w-0">
            <h3 className="font-medium">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
        </button>
        <div className="flex flex-col gap-3 md:items-end">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-800 px-2 py-1 text-xs">{items.length} historias</span>
            <span className="rounded bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">{storyPoints} pts</span>
          </div>
          {laneSprint && (
            <div className="grid gap-2 sm:grid-cols-[145px_130px]">
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Inicio</span>
                <Input type="date" value={laneSprint.startDate} onPointerDown={(event) => event.stopPropagation()} onChange={(event) => updateStartDate(laneSprint.id, event.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Fin calculado</span>
                <Input value={formatDate(laneSprint.endDate)} readOnly />
              </label>
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="space-y-3">
          {items.map((item) => (
            <StoryCard key={item.id} item={item} allItems={allItems} sprints={sprints} onAssignSprint={onAssignSprint} onEditStory={onEditStory} />
          ))}
          {items.length === 0 && <div className="grid min-h-20 place-items-center rounded-md border border-dashed border-slate-800 text-xs text-slate-500">Soltar historias aqui</div>}
        </div>
      )}
    </section>
  );
}

function StoryCard({
  item,
  allItems,
  sprints,
  onAssignSprint,
  onEditStory
}: {
  item: WorkItem;
  allItems: WorkItem[];
  sprints: Sprint[];
  onAssignSprint: (item: WorkItem, sprintId: string) => void;
  onEditStory: (item: WorkItem) => void;
}) {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: item.id });
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: `story:${item.id}` });
  const setNodeRef = (node: HTMLElement | null) => {
    setDraggableRef(node);
    setDroppableRef(node);
  };
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab rounded-lg border border-slate-800 bg-slate-900/80 p-4 text-sm shadow-md transition active:cursor-grabbing", isDragging && "z-50 opacity-70 ring-2 ring-cyan-400", isOver && !isDragging && "border-cyan-400")}
    >
      <div className="grid gap-3 lg:grid-cols-[90px_1fr_90px_170px_48px] lg:items-start">
        <span className="font-mono text-sm text-cyan-300">{item.key}</span>
        <div>
          <div className="font-medium">{item.title}</div>
          <div className="mt-1 text-xs text-slate-400">{item.summary || "Sin resumen"}</div>
          <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">{item.description || "Sin descripcion"}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(item.dependencyIds ?? []).map((id) => {
              const dependency = allItems.find((candidate) => candidate.id === id);
              return dependency ? <span key={id} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">depende de {dependency.key}</span> : null;
            })}
            {(item.tasks ?? []).length > 0 && <span className="rounded bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">{item.tasks?.length} tareas</span>}
          </div>
        </div>
        <span className="text-sm">{item.storyPoints ?? 0} pts</span>
        <select
          value={item.sprintId ?? ""}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onAssignSprint(item, event.target.value)}
          className="h-9 rounded-md border border-slate-700 bg-slate-950 px-2 text-sm outline-none focus:border-cyan-500"
        >
          <option value="">Backlog</option>
          {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
        </select>
        <Button type="button" variant="secondary" className="h-9" onPointerDown={(event) => event.stopPropagation()} onClick={() => onEditStory(item)}><Edit3 className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function ActiveSprintTasksView({
  sprint,
  tasks,
  people,
  onStatusChange,
  onAssigneeChange
}: {
  sprint?: Sprint;
  tasks: Array<StoryTask & { storyId: string; storyKey: string; storyTitle: string; assigneeName: string }>;
  people: Person[];
  onStatusChange: (storyId: string, taskId: string, status: string) => void;
  onAssigneeChange: (storyId: string, taskId: string, assigneeEmail: string) => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-4 rounded-md border border-slate-800 bg-slate-950/60 p-4">
        <div className="text-sm font-medium">{sprint ? sprint.name : "Sin sprint en ejecucion"}</div>
        <div className="mt-1 text-xs text-slate-500">{sprint ? `${formatDate(sprint.startDate)} - ${formatDate(sprint.endDate)}` : "No hay sprint activo con tareas pendientes."}</div>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="grid gap-3 rounded-md border border-slate-800 bg-slate-900/70 p-3 text-sm lg:grid-cols-[90px_100px_1fr_220px_170px] lg:items-center">
            <div className="font-mono text-xs text-cyan-300">{task.code}</div>
            <div className="font-mono text-xs text-cyan-300">{task.storyKey}</div>
            <div>
              <div className="font-medium">{task.title}</div>
              <div className="mt-1 text-xs text-slate-500">{task.storyTitle}</div>
            </div>
            <select value={task.assigneeEmail} onChange={(event) => onAssigneeChange(task.storyId, task.id, event.target.value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
              <option value="">Sin asignar</option>
              {people.map((person) => <option key={person.id} value={person.email}>{person.name}</option>)}
            </select>
            <select value={task.status} onChange={(event) => onStatusChange(task.storyId, task.id, event.target.value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
              {taskStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        ))}
        {tasks.length === 0 && <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">No hay tareas activas para el sprint en ejecucion.</div>}
      </div>
    </div>
  );
}

function buildGantt(sprints: Sprint[], items: WorkItem[]) {
  const scheduled = items.flatMap((item) => {
    const sprint = sprints.find((candidate) => candidate.id === item.sprintId);
    return sprint && isValidDateValue(sprint.startDate) && isValidDateValue(sprint.endDate) ? [{ item, sprint }] : [];
  });
  if (scheduled.length === 0) return { weeks: [], rows: [] };

  const firstSprintStart = Math.min(...scheduled.map(({ sprint }) => parseDate(sprint.startDate).getTime()));
  const lastSprintEnd = Math.max(...scheduled.map(({ sprint }) => parseDate(sprint.endDate).getTime()));
  const timelineStart = startOfWeek(new Date(firstSprintStart));
  const timelineEnd = endOfWeek(new Date(lastSprintEnd));
  const weekCount = Math.max(1, Math.ceil((timelineEnd.getTime() - timelineStart.getTime() + 1) / weekMs));
  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const start = addDays(timelineStart, index * 7);
    const end = addDays(start, 6);
    return {
      id: start.toISOString(),
      start,
      label: `${formatDate(start.toISOString())} - ${formatDate(end.toISOString())}`
    };
  });

  const rows = scheduled.map(({ item, sprint }) => {
    const start = startOfWeek(parseDate(sprint.startDate));
    const end = endOfWeek(parseDate(sprint.endDate));
    const startIndex = Math.max(0, Math.floor((start.getTime() - timelineStart.getTime()) / weekMs));
    const endIndex = Math.min(weekCount - 1, Math.floor((end.getTime() - timelineStart.getTime()) / weekMs));
    const span = Math.max(1, endIndex - startIndex + 1);
    return {
      id: item.id,
      label: `${item.key} ${item.title}`,
      points: item.storyPoints ?? 0,
      left: (startIndex / weekCount) * 100,
      width: (span / weekCount) * 100
    };
  });

  return { weeks, rows };
}

function calculateSprintEndDate(startDate: string, weeks: number) {
  if (!startDate) return "";
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Math.max(1, weeks) * 7 - 1);
  return date.toISOString().slice(0, 10);
}

function getProjectSprintWeeks(project: Project, config: Record<string, number>) {
  return Math.max(1, config[project.code] ?? project.sprintWeeks ?? 2);
}

function isValidDateValue(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

const weekMs = 7 * 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfWeek(date: Date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function normalizePerson(person: Person) {
  const name = person.name ?? `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return {
    ...person,
    name: name || person.email,
    defaultRole: person.defaultRole ?? "Desarrollador"
  };
}

function getProjectPeople(project: Project | null, people: Person[]) {
  const staffing = project?.staffing ?? [];
  if (!staffing.length) return [];
  return staffing
    .filter((member) => Boolean(member.email))
    .map((member) => {
      const fromCatalog = people.find((person) => person.email.toLowerCase() === member.email?.toLowerCase());
      return fromCatalog ?? {
        id: `project-person-${member.email}`,
        name: member.name || member.email || "Persona del proyecto",
        email: member.email || "",
        defaultRole: member.role || "Miembro del proyecto"
      };
    });
}

function isProjectAssignee(email: string, people: Person[]) {
  return people.some((person) => person.email.toLowerCase() === email.toLowerCase());
}

function hasExternalTaskAssignee(tasks: StoryTask[], people: Person[]) {
  return tasks.some((task) => task.assigneeEmail && !isProjectAssignee(task.assigneeEmail, people));
}

function normalizeWorkItemTasks(item: WorkItem): WorkItem {
  return { ...item, tasks: normalizeTasks(item.tasks) };
}

function syncStoryWithScrumBoard(item: WorkItem, projectCode: string, sprints: Sprint[], forceTodo: boolean) {
  if (!projectCode) return;
  const sprint = item.sprintId ? sprints.find((candidate) => candidate.id === item.sprintId) : null;
  if (sprint) upsertScrumBoardSprint(sprint, projectCode);

  const saved = localStorage.getItem(boardStorageKey);
  const boardItems = saved ? JSON.parse(saved) as BoardItem[] : [];
  const nextItem = toBoardItem(item, projectCode, forceTodo);
  const exists = boardItems.some((candidate) => candidate.id === item.id || candidate.key === item.key);
  const nextItems = exists
    ? boardItems.map((candidate) => candidate.id === item.id || candidate.key === item.key
      ? { ...candidate, ...nextItem, status: forceTodo ? "Por hacer" : candidate.status }
      : candidate)
    : [...boardItems, nextItem];
  localStorage.setItem(boardStorageKey, JSON.stringify(nextItems));
}

function upsertScrumBoardSprint(sprint: Sprint, projectCode: string) {
  const saved = localStorage.getItem(boardSprintStorageKey);
  const boardSprints = saved ? JSON.parse(saved) as BoardSprint[] : [];
  const nextSprint: BoardSprint = {
    id: sprint.id,
    projectCode,
    name: sprint.name,
    goal: sprint.goal ?? "",
    startDate: sprint.startDate,
    endDate: sprint.endDate
  };
  const exists = boardSprints.some((candidate) => candidate.id === sprint.id);
  const nextSprints = exists
    ? boardSprints.map((candidate) => candidate.id === sprint.id ? { ...candidate, ...nextSprint } : candidate)
    : [...boardSprints, nextSprint];
  localStorage.setItem(boardSprintStorageKey, JSON.stringify(nextSprints));
}

function toBoardItem(item: WorkItem, projectCode: string, forceTodo: boolean): BoardItem {
  return {
    id: item.id,
    projectCode,
    key: item.key,
    title: item.title,
    status: forceTodo ? "Por hacer" : normalizeBoardStatus(item.status),
    priority: normalizeBoardPriority(item.priority),
    points: Number(item.storyPoints ?? 0),
    sprintId: item.sprintId ?? null,
    tasks: normalizeTasks(item.tasks)
  };
}

function normalizeBoardStatus(status: string): BoardItem["status"] {
  const statusMap: Record<string, BoardItem["status"]> = {
    BACKLOG: "Por hacer",
    READY: "Por hacer",
    IN_PROGRESS: "En curso",
    DONE: "Finalizado",
    BLOCKED: "Bloqueada",
    QA: "En QA"
  };
  return statusMap[status] ?? "Por hacer";
}

function normalizeBoardPriority(priority: WorkItem["priority"]): BoardItem["priority"] {
  if (priority === "CRITICAL" || priority === "HIGHEST") return "Critical";
  if (priority === "HIGH") return "High";
  if (priority === "LOW" || priority === "LOWEST") return "Low";
  return "Medium";
}

function normalizeTasks(tasks: StoryTask[] | undefined) {
  return (tasks ?? []).map((task, index) => ({
    ...task,
    code: task.code || formatTaskKey(index + 1)
  }));
}

function formatTaskKey(value: number) {
  return `T${String(value).padStart(5, "0")}`;
}

function getNextTaskNumber(items: WorkItem[], draftTasks: StoryTask[]) {
  const numbers = [...items.flatMap((item) => normalizeTasks(item.tasks)), ...draftTasks]
    .map((task) => task.code?.match(/^T(\d{5})$/)?.[1])
    .filter(Boolean)
    .map((value) => Number(value));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

function getActiveSprint(groups: Array<{ sprint: Sprint; items: WorkItem[] }>) {
  const today = new Date();
  const byDate = groups.find(({ sprint }) => {
    if (!isValidDateValue(sprint.startDate) || !isValidDateValue(sprint.endDate)) return false;
    return parseDate(sprint.startDate).getTime() <= today.getTime() && parseDate(sprint.endDate).getTime() >= today.getTime();
  });
  if (byDate) return byDate;
  return groups.find(({ items }) => items.some((item) => (item.tasks ?? []).some((task) => task.status !== "Finalizada")));
}

function buildActiveSprintTasks(items: WorkItem[], people: Person[]) {
  return items.flatMap((item) =>
    normalizeTasks(item.tasks)
      .filter((task) => task.status !== "Finalizada")
      .map((task) => {
        const person = people.find((candidate) => candidate.email === task.assigneeEmail);
        return {
          ...task,
          storyId: item.id,
          storyKey: item.key,
          storyTitle: item.title,
          assigneeName: person?.name ?? task.assigneeEmail ?? "Sin asignar"
        };
      })
  );
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  if (Number.isNaN(new Date(value).getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-SV", { month: "short", day: "2-digit" }).format(new Date(value));
}

function formatStoryKey(value: number) {
  return `HU${String(value).padStart(5, "0")}`;
}

function getNextStoryNumber(items: WorkItem[]) {
  const numbers = items
    .map((item) => item.key.match(/^HU(\d{5})$/)?.[1])
    .filter(Boolean)
    .map((value) => Number(value));
  return numbers.length ? Math.max(...numbers) + 1 : items.length + 1;
}
