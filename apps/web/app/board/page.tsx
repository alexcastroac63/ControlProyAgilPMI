"use client";

import { cn } from "@devhub/ui";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/layout/page-loading";
import { canSeeProject, getUserAccessContext, isActiveSprint, UserAccessContext } from "@/lib/access-control";

type StoryStatus = "Por hacer" | "En curso" | "Bloqueada" | "Desarrollo finalizado" | "Listo para QA" | "En QA" | "Finalizado";
type SprintState = "En curso" | "No iniciado" | "Finalizado";
type StoryTask = { id: string; code?: string; title: string; assigneeEmail: string; status: string };

type BoardItem = {
  id: string;
  projectCode: string;
  key: string;
  title: string;
  status: StoryStatus;
  priority: "Low" | "Medium" | "High" | "Critical";
  points: number;
  sprintId?: string | null;
  tasks?: StoryTask[];
};

type BoardSprint = {
  id: string;
  projectCode: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
};

type ProjectSummary = {
  id?: string;
  code: string;
  name: string;
  status: string;
  sprintWeeks?: number;
  staffing?: Array<{ email?: string }>;
};

const boardStorageKey = "devhub.scrumBoard";
const sprintStorageKey = "devhub.boardSprints";
const sprintWeeksStorageKey = "devhub.projectSprintWeeks";
const projectsStorageKey = "devhub.projects";
const backlogDropId = "sprint:backlog";
const storyStatuses: StoryStatus[] = ["Por hacer", "En curso", "Bloqueada", "Desarrollo finalizado", "Listo para QA", "En QA", "Finalizado"];

const initialSprints: BoardSprint[] = [
  { id: "sprint-proy-1", projectCode: "PROY", name: "Sprint 1", goal: "Base operativa y autenticacion", startDate: "2026-04-20", endDate: "2026-05-03" },
  { id: "sprint-proy-2", projectCode: "PROY", name: "Sprint 2", goal: "Delivery, QA y reporteria", startDate: "2026-05-04", endDate: "2026-05-17" },
  { id: "sprint-qa-1", projectCode: "QA", name: "Sprint QA 1", goal: "Regresion automatizada", startDate: "2026-04-27", endDate: "2026-05-10" }
];

const initialItems: BoardItem[] = [
  { id: "board-1", projectCode: "PROY", key: "HU00005", title: "Setup BI exports", status: "Por hacer", priority: "Medium", points: 5, sprintId: null },
  { id: "board-2", projectCode: "PROY", key: "HU00003", title: "Matriz de trazabilidad QA", status: "Por hacer", priority: "Medium", points: 5, sprintId: "sprint-proy-2" },
  { id: "board-3", projectCode: "PROY", key: "HU00002", title: "Board Scrum con WIP limits", status: "En curso", priority: "High", points: 13, sprintId: "sprint-proy-1", tasks: [{ id: "task-board-1", code: "T00001", title: "Configurar columnas por estado", assigneeEmail: "diana.dev@devhub.local", status: "En curso" }, { id: "task-board-2", code: "T00002", title: "Validar drag and drop", assigneeEmail: "sofia.qa@devhub.local", status: "Pendiente" }] },
  { id: "board-4", projectCode: "PROY", key: "HU00006", title: "GitHub webhook parser", status: "Desarrollo finalizado", priority: "High", points: 8, sprintId: "sprint-proy-2" },
  { id: "board-5", projectCode: "PROY", key: "HU00004", title: "PR aprobado a Ready QA", status: "En QA", priority: "High", points: 3, sprintId: "sprint-proy-1" },
  { id: "board-6", projectCode: "PROY", key: "HU00001", title: "Auth JWT + refresh", status: "Finalizado", priority: "Critical", points: 8, sprintId: "sprint-proy-1" },
  { id: "board-7", projectCode: "PROY", key: "HU00007", title: "MFA optional rollout", status: "Bloqueada", priority: "Low", points: 3, sprintId: null },
  { id: "board-8", projectCode: "QA", key: "HU00008", title: "Crear suite de regresion", status: "Por hacer", priority: "High", points: 8, sprintId: "sprint-qa-1" },
  { id: "board-9", projectCode: "QA", key: "HU00009", title: "Automatizar smoke tests", status: "En curso", priority: "Medium", points: 5, sprintId: null }
];

export default function BoardPage() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [sprints, setSprints] = useState<BoardSprint[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [showSprintForm, setShowSprintForm] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });
  const [projectSprintWeeks, setProjectSprintWeeks] = useState<Record<string, number>>({});
  const [viewingItem, setViewingItem] = useState<BoardItem | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [accessContext, setAccessContext] = useState<UserAccessContext | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(boardStorageKey);
    if (saved) {
      setItems(
        (JSON.parse(saved) as BoardItem[]).map((item, index) => ({
          ...item,
          key: item.key.startsWith("HU") ? item.key : `HU${String(index + 1).padStart(5, "0")}`,
          projectCode: item.projectCode ?? item.key.split("-")[0] ?? "PROY",
          sprintId: item.sprintId ?? null,
          status: normalizeStoryStatus(String(item.status)),
          tasks: normalizeTasks(item.tasks)
        }))
      );
    }

    const savedSprints = localStorage.getItem(sprintStorageKey);
    if (savedSprints) setSprints(JSON.parse(savedSprints) as BoardSprint[]);

    const access = getUserAccessContext();
    setAccessContext(access);
    const savedSprintWeeks = localStorage.getItem(sprintWeeksStorageKey);
    if (savedSprintWeeks) setProjectSprintWeeks(JSON.parse(savedSprintWeeks) as Record<string, number>);
    const savedProjects = localStorage.getItem("devhub.projects");
    if (savedProjects) {
      const activeProjects = (JSON.parse(savedProjects) as ProjectSummary[])
        .map((project) => ({ ...project, status: normalizeProjectStatus(project.status) }))
        .filter((project) => (project.status === "Desarrollo" || project.status === "Pruebas") && canSeeProject(project, access));
      if (activeProjects.length) {
        setProjects(activeProjects);
        setSelectedProject((current) => activeProjects.some((project) => project.code === current) ? current : activeProjects[0].code);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(boardStorageKey, JSON.stringify(items));
  }, [hydrated, items]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(sprintStorageKey, JSON.stringify(sprints));
  }, [hydrated, sprints]);

  const selectedProjectData = projects.find((project) => project.code === selectedProject);
  const selectedProjectSprintWeeks = getProjectSprintWeeks(selectedProjectData, projectSprintWeeks);
  const visibleItems = useMemo(() => items.filter((item) => item.projectCode === selectedProject), [items, selectedProject]);
  const projectSprints = useMemo(() => {
    const filtered = sprints.filter((sprint) => sprint.projectCode === selectedProject);
    if (!accessContext?.onlyActiveSprint) return filtered;
    const active = filtered.filter(isActiveSprint);
    return active.length ? active : filtered.slice(0, 1);
  }, [accessContext, sprints, selectedProject]);
  const visibleSprintIds = useMemo(() => new Set(projectSprints.map((sprint) => sprint.id)), [projectSprints]);
  const boardItems = useMemo(() => accessContext?.onlyActiveSprint ? visibleItems.filter((item) => item.sprintId && visibleSprintIds.has(item.sprintId)) : visibleItems, [accessContext, visibleItems, visibleSprintIds]);
  const backlogItems = useMemo(() => accessContext?.onlyActiveSprint ? [] : boardItems.filter((item) => !item.sprintId), [accessContext, boardItems]);
  const orderedSprintGroups = useMemo(() => {
    const groups = projectSprints.map((sprint) => {
      const sprintItems = boardItems.filter((item) => item.sprintId === sprint.id);
      return { sprint, items: sprintItems, state: sprintItems.length === 0 ? "No iniciado" as SprintState : getSprintState(sprintItems) };
    });
    const order: Record<SprintState, number> = { "En curso": 0, "No iniciado": 1, Finalizado: 2 };
    return groups.sort((a, b) => order[a.state] - order[b.state] || a.sprint.name.localeCompare(b.sprint.name));
  }, [boardItems, projectSprints]);

  function handleCreateSprint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = sprintForm.name.trim();
    if (!name) {
      toast.error("Ingresa el nombre del sprint");
      return;
    }
    const endDate = calculateSprintEndDate(sprintForm.startDate, selectedProjectSprintWeeks);
    const sprint: BoardSprint = {
      id: `sprint-${selectedProject.toLowerCase()}-${Date.now()}`,
      projectCode: selectedProject,
      name,
      goal: sprintForm.goal.trim(),
      startDate: sprintForm.startDate,
      endDate
    };
    setSprints((current) => [...current, sprint]);
    setSprintForm({ name: "", goal: "", startDate: "", endDate: "" });
    setShowSprintForm(false);
    toast.success("Sprint creado");
  }

  function updateSprintStartDate(startDate: string) {
    setSprintForm((current) => ({ ...current, startDate, endDate: calculateSprintEndDate(startDate, selectedProjectSprintWeeks) }));
  }

  function deleteSprint(sprint: BoardSprint) {
    const sprintItems = items.filter((item) => item.sprintId === sprint.id);
    if (sprintItems.length > 0) {
      toast.error("Solo puedes eliminar sprints vacios");
      return;
    }
    setSprints((current) => current.filter((item) => item.id !== sprint.id));
    removeEmptySprintActivityFromProjects(sprint.id);
    toast.success("Sprint eliminado");
  }

  function handleDragEnd(event: DragEndEvent) {
    const itemId = String(event.active.id);
    const overId = String(event.over?.id ?? "");
    if (!overId) return;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const destination = getDropDestination(overId, items);
    if (!destination) return;
    const changedGroup = (item.sprintId ?? null) !== destination.sprintId || item.status !== destination.status;
    if (!changedGroup && !overId.startsWith("card:")) return;

    setItems((current) => {
      const moving = current.find((candidate) => candidate.id === itemId);
      if (!moving) return current;
      const withoutMoving = current.filter((candidate) => candidate.id !== itemId);

      if (overId.startsWith("card:")) {
        const targetId = overId.replace("card:", "");
        const targetIndex = withoutMoving.findIndex((candidate) => candidate.id === targetId);
        if (targetIndex === -1) return current;
        const next = [...withoutMoving];
        next.splice(targetIndex, 0, { ...moving, sprintId: destination.sprintId, status: destination.status });
        return next;
      }

      return [...withoutMoving, { ...moving, sprintId: destination.sprintId, status: destination.status }];
    });

    if (changedGroup) toast.success(`${item.key} actualizada`);
  }

  return (
    <AppShell>
      {!hydrated ? (
        <PageLoading message="Cargando Scrum Board real..." />
      ) : (
      <>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Scrum Board</h1>
          <p className="mt-1 text-sm text-slate-400">Estados por sprint, con calculo automatico del avance del sprint.</p>
          {(accessContext?.restrictToAssignedProjects || accessContext?.onlyActiveSprint) && <p className="mt-1 text-xs text-cyan-300">Vista limitada por perfil.</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="space-y-2">
            <span className="text-xs text-slate-400">Proyecto</span>
            <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="h-10 min-w-64 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
              {projects.map((project) => <option key={project.code} value={project.code}>{project.code} - {project.name}</option>)}
            </select>
          </label>
          <button onClick={() => setShowSprintForm(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            <Plus className="h-4 w-4" />
            Crear sprint
          </button>
        </div>
      </div>

      {showSprintForm && (
        <form onSubmit={handleCreateSprint} className="mb-5 grid gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-4 md:grid-cols-5">
          <label className="space-y-2">
            <span className="text-xs text-slate-400">Nombre</span>
            <input value={sprintForm.name} onChange={(event) => setSprintForm((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500" placeholder="Sprint 3" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs text-slate-400">Goal</span>
            <input value={sprintForm.goal} onChange={(event) => setSprintForm((current) => ({ ...current, goal: event.target.value }))} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500" placeholder="Objetivo del sprint" />
          </label>
          <label className="space-y-2">
            <span className="text-xs text-slate-400">Inicio</span>
            <input type="date" value={sprintForm.startDate} onChange={(event) => updateSprintStartDate(event.target.value)} className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500" />
          </label>
          <label className="space-y-2">
            <span className="text-xs text-slate-400">Fin calculado ({selectedProjectSprintWeeks} semanas)</span>
            <input value={sprintForm.endDate || "Selecciona inicio"} readOnly className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500" />
          </label>
          <div className="flex gap-2 md:col-span-5">
            <button className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Guardar</button>
            <button type="button" onClick={() => setShowSprintForm(false)} className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">Cancelar</button>
          </div>
        </form>
      )}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          <BacklogGroup title="Backlog" subtitle={selectedProjectData ? `${selectedProjectData.code} - historias sin sprint` : "Historias sin sprint"} items={backlogItems} onOpenItem={setViewingItem} />
          {orderedSprintGroups.map((group) => (
            <SprintGroup key={group.sprint.id} sprint={group.sprint} state={group.state} items={group.items} onOpenItem={setViewingItem} onDelete={deleteSprint} />
          ))}
          {projectSprints.length === 0 && <div className="rounded-lg border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">Crea un sprint para comenzar a planificar este proyecto.</div>}
        </div>
      </DndContext>

      {viewingItem && (
        <StoryViewModal
          item={viewingItem}
          sprint={sprints.find((sprint) => sprint.id === viewingItem.sprintId)}
          onClose={() => setViewingItem(null)}
        />
      )}
      </>
      )}
    </AppShell>
  );
}

function normalizeProjectStatus(status: string) {
  const statusMap: Record<string, string> = {
    PLANNED: "Requerimientos",
    ACTIVE: "Desarrollo",
    PAUSED: "Pruebas",
    CANCELLED: "Cancelado",
    CLOSED: "Finalizado"
  };
  return statusMap[status] ?? status;
}

function normalizeStoryStatus(status: string): StoryStatus {
  const statusMap: Record<string, StoryStatus> = {
    Backlog: "Por hacer",
    Ready: "Por hacer",
    "In Progress": "En curso",
    "Code Review": "Desarrollo finalizado",
    QA: "En QA",
    UAT: "Listo para QA",
    Done: "Finalizado",
    Blocked: "Bloqueada",
    BACKLOG: "Por hacer",
    READY: "Por hacer",
    IN_PROGRESS: "En curso",
    DONE: "Finalizado",
    BLOCKED: "Bloqueada"
  };
  return storyStatuses.includes(status as StoryStatus) ? status as StoryStatus : statusMap[status] ?? "Por hacer";
}

function formatSprintDates(sprint: BoardSprint) {
  if (!sprint.startDate && !sprint.endDate) return "";
  if (sprint.startDate && sprint.endDate) return `${sprint.startDate} al ${sprint.endDate}`;
  return sprint.startDate || sprint.endDate;
}

function calculateSprintEndDate(startDate: string, weeks: number) {
  if (!startDate) return "";
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Math.max(1, weeks) * 7 - 1);
  return date.toISOString().slice(0, 10);
}

function getProjectSprintWeeks(project: ProjectSummary | undefined, config: Record<string, number>) {
  if (!project) return 2;
  return Math.max(1, config[project.code] ?? project.sprintWeeks ?? 2);
}

function removeEmptySprintActivityFromProjects(sprintId: string) {
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(projectsStorageKey);
    if (!saved) return;
    const projects = JSON.parse(saved) as Array<{ activities?: Array<{ id: string; sprintId?: string; parentId?: string }> }>;
    const updated = projects.map((project) => {
      const activities = project.activities ?? [];
      const sprintActivity = activities.find((activity) => activity.sprintId === sprintId || activity.id === `sprint-activity-${sprintId}`);
      if (!sprintActivity) return project;
      const hasChildren = activities.some((activity) => activity.parentId === sprintActivity.id);
      if (hasChildren) return project;
      return { ...project, activities: activities.filter((activity) => activity.id !== sprintActivity.id) };
    });
    localStorage.setItem(projectsStorageKey, JSON.stringify(updated));
  } catch {
    // La eliminacion del sprint no debe fallar si el cache local de proyectos esta corrupto.
  }
}

function getSprintState(items: BoardItem[]): SprintState {
  if (items.length === 0) return "No iniciado";
  if (items.every((item) => item.status === "Finalizado")) return "Finalizado";
  if (items.every((item) => item.status === "Por hacer")) return "No iniciado";
  return "En curso";
}

function getDropDestination(overId: string, items: BoardItem[]): { sprintId: string | null; status: StoryStatus } | null {
  if (overId === backlogDropId) return { sprintId: null, status: "Por hacer" };
  if (overId.startsWith("status:")) {
    const [, sprintId, status] = overId.split(":");
    return { sprintId, status: normalizeStoryStatus(status) };
  }
  if (overId.startsWith("card:")) {
    const target = items.find((candidate) => candidate.id === overId.replace("card:", ""));
    return target ? { sprintId: target.sprintId ?? null, status: target.status } : null;
  }
  return null;
}

function stateBadgeClass(state: SprintState) {
  if (state === "Finalizado") return "bg-emerald-500/10 text-emerald-300";
  if (state === "No iniciado") return "bg-slate-800 text-slate-300";
  return "bg-cyan-500/10 text-cyan-300";
}

function normalizeTasks(tasks: StoryTask[] | undefined) {
  return (tasks ?? []).map((task, index) => ({
    ...task,
    code: task.code || `T${String(index + 1).padStart(5, "0")}`
  }));
}

function BacklogGroup({ title, subtitle, items, onOpenItem }: { title: string; subtitle: string; items: BoardItem[]; onOpenItem: (item: BoardItem) => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const { isOver, setNodeRef } = useDroppable({ id: backlogDropId });
  const storyPoints = items.reduce((sum, item) => sum + item.points, 0);
  return (
    <section ref={setNodeRef} className={cn("rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition", isOver && "border-cyan-400 bg-cyan-500/10")}>
      <GroupHeader isOpen={isOpen} onToggle={() => setIsOpen((value) => !value)} title={title} subtitle={subtitle} count={items.length} points={storyPoints} />
      {isOpen && (
        <div className="grid min-h-28 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => <BoardCard key={item.id} item={item} onOpenItem={onOpenItem} />)}
          {items.length === 0 && <div className="grid min-h-24 place-items-center rounded-md border border-dashed border-slate-800 text-xs text-slate-500 md:col-span-2 xl:col-span-3">Soltar historias aqui</div>}
        </div>
      )}
    </section>
  );
}

function SprintGroup({ sprint, state, items, onOpenItem, onDelete }: { sprint: BoardSprint; state: SprintState; items: BoardItem[]; onOpenItem: (item: BoardItem) => void; onDelete: (sprint: BoardSprint) => void }) {
  const [isOpen, setIsOpen] = useState(state !== "No iniciado");
  const storyPoints = items.reduce((sum, item) => sum + item.points, 0);
  const canDelete = items.length === 0;

  useEffect(() => {
    if (state === "No iniciado") setIsOpen(false);
  }, [state]);

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <GroupHeader
        isOpen={isOpen}
        onToggle={() => setIsOpen((value) => !value)}
        title={sprint.name}
        subtitle={[sprint.goal, formatSprintDates(sprint)].filter(Boolean).join(" - ")}
        count={items.length}
        points={storyPoints}
        badge={state}
        badgeClassName={stateBadgeClass(state)}
        action={
          <button
            type="button"
            disabled={!canDelete}
            title={canDelete ? "Eliminar sprint vacio" : "Solo se puede eliminar si no tiene historias"}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(sprint);
            }}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-700 px-2.5 text-xs font-semibold text-slate-300 transition hover:border-rose-400 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-700 disabled:hover:text-slate-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        }
      />
      {isOpen && (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-max grid-flow-col auto-cols-[minmax(240px,260px)] gap-3">
            {storyStatuses.map((status) => (
              <StatusColumn key={status} sprintId={sprint.id} status={status} items={items.filter((item) => item.status === status)} onOpenItem={onOpenItem} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GroupHeader({ isOpen, onToggle, title, subtitle, count, points, badge, badgeClassName, action }: { isOpen: boolean; onToggle: () => void; title: string; subtitle: string; count: number; points: number; badge?: string; badgeClassName?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <button type="button" onClick={onToggle} className="flex min-w-0 items-start gap-2 text-left">
        <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition", !isOpen && "-rotate-90")} />
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        {badge && <span className={cn("rounded px-2 py-1 text-xs", badgeClassName)}>{badge}</span>}
        <span className="rounded bg-slate-800 px-2 py-1 text-xs">{count} historias</span>
        <span className="rounded bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">{points} pts</span>
        {action}
      </div>
    </div>
  );
}

function StatusColumn({ sprintId, status, items, onOpenItem }: { sprintId: string; status: StoryStatus; items: BoardItem[]; onOpenItem: (item: BoardItem) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `status:${sprintId}:${status}` });
  const storyPoints = items.reduce((sum, item) => sum + item.points, 0);
  return (
    <section ref={setNodeRef} className={cn("w-full rounded-md border border-slate-800 bg-slate-950/60 p-3 transition", isOver && "border-cyan-400 bg-cyan-500/10")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-slate-300">{status}</h3>
        <span className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">{items.length} / {storyPoints} pts</span>
      </div>
      <div className="min-h-32 space-y-3">
        {items.map((item) => <BoardCard key={item.id} item={item} onOpenItem={onOpenItem} />)}
        {items.length === 0 && <div className="grid min-h-20 place-items-center rounded border border-dashed border-slate-800 text-[11px] text-slate-500">Soltar aqui</div>}
      </div>
    </section>
  );
}

function BoardCard({ item, onOpenItem }: { item: BoardItem; onOpenItem: (item: BoardItem) => void }) {
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: item.id });
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({ id: `card:${item.id}` });
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
      onDoubleClick={() => onOpenItem(item)}
      className={cn("cursor-grab rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm shadow-md transition active:cursor-grabbing", isDragging && "z-50 opacity-70 ring-2 ring-cyan-400", isOver && !isDragging && "border-cyan-400")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-xs text-cyan-300">{item.key}</div>
          <div className="mt-1 line-clamp-2 font-medium">{item.title}</div>
        </div>
        <span className="rounded bg-slate-800 px-2 py-1 text-xs">{item.points}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{item.priority}</span>
        <span>{item.status}</span>
      </div>
      <div className={cn("mt-3 h-1.5 rounded", item.priority === "Critical" ? "bg-rose-400" : item.priority === "High" ? "bg-amber-300" : "bg-cyan-400")} />
    </div>
  );
}

function StoryViewModal({ item, sprint, onClose }: { item: BoardItem; sprint?: BoardSprint; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Visualizacion historia de usuario</h2>
            <div className="mt-1 font-mono text-xs text-cyan-300">{item.key}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Cerrar
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_160px_120px_220px]">
            <input value={item.title} readOnly className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 outline-none" />
            <select value={item.priority} disabled className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 outline-none">
              <option>{item.priority}</option>
            </select>
            <input value={item.points} readOnly className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 outline-none" />
            <select value={sprint?.id ?? ""} disabled className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 outline-none">
              <option value="">{sprint ? sprint.name : "Backlog"}</option>
              {sprint && <option value={sprint.id}>{sprint.name}</option>}
            </select>
          </div>
          <input value={`${item.projectCode} - ${item.status}`} readOnly className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-300 outline-none" />
          <textarea value={sprint ? `Sprint: ${sprint.name}\nPeriodo: ${formatSprintDates(sprint) || "Sin fechas"}\nEstado actual: ${item.status}` : `Ubicacion: Backlog\nEstado actual: ${item.status}`} readOnly className="min-h-36 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none" />
          <div>
            <div className="mb-2 text-xs text-slate-400">Dependencias entre historias</div>
            <div className="rounded-md border border-slate-800 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-slate-300">Dependencias asociadas</div>
                <button type="button" disabled className="h-8 rounded-md border border-slate-800 px-3 text-xs text-slate-500">Buscar</button>
              </div>
              <div className="rounded border border-dashed border-slate-800 p-3 text-xs text-slate-500">Vista de solo lectura desde Scrum Board</div>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs text-slate-400">Tareas de la historia</div>
            <div className="rounded-md border border-slate-800 p-3">
              {(item.tasks ?? []).length === 0 && <div className="rounded border border-dashed border-slate-800 p-3 text-xs text-slate-500">Sin tareas asociadas</div>}
              <div className="space-y-2">
                {normalizeTasks(item.tasks).map((task) => (
                  <div key={task.id} className="grid gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs md:grid-cols-[90px_1fr_220px_130px] md:items-center">
                    <div className="font-mono text-cyan-300">{task.code}</div>
                    <div className="font-medium text-slate-200">{task.title}</div>
                    <div className="text-slate-400">{task.assigneeEmail || "Sin asignar"}</div>
                    <div className="rounded bg-slate-800 px-2 py-1 text-center text-slate-300">{task.status}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
