"use client";

import { Button, Card, Input, cn } from "@devhub/ui";
import { ChevronDown, Download, Image as ImageIcon, Monitor, Palette, Pencil, Plus, Search, Smartphone, Square, Tag, TextCursorInput, Trash2, Type, Upload, Workflow, X } from "lucide-react";
import { FormEvent, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/layout/page-loading";
import { createId } from "@/lib/ids";

type ProjectSummary = { code: string; name: string; status?: string };
type MockupType = "mobile" | "browser" | "flow";
type MockupStatus = "Borrador" | "Revision" | "Aprobado";
type ComponentType = "button" | "input" | "label" | "text" | "logo" | "image" | "card" | "navbar";

type MockupComponent = {
  id: string;
  type: ComponentType;
  label: string;
  helper?: string;
  imageDataUrl?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type MockupScreen = {
  id: string;
  name: string;
  description?: string;
  components: MockupComponent[];
  x?: number;
  y?: number;
};

type MockupConnection = {
  id: string;
  fromScreenId: string;
  toScreenId: string;
  label?: string;
};

type Mockup = {
  id: string;
  projectCode: string;
  name: string;
  type: MockupType;
  screenTitle: string;
  summary: string;
  description: string;
  primaryColor: string;
  status: MockupStatus;
  updatedAt: string;
  elements: string[];
  screens?: MockupScreen[];
  connections?: MockupConnection[];
};

type MockupDraft = Omit<Mockup, "id" | "updatedAt">;

const projectsStorageKey = "devhub.projects";
const mockupsStorageKey = "devhub.mockups";

const demoProjects: ProjectSummary[] = [
  { code: "PROY", name: "DevOps Hub Core", status: "Desarrollo" },
  { code: "QA", name: "QA Automation", status: "Pruebas" }
];

const defaultComponents: MockupComponent[] = [
  { id: "cmp-logo", type: "logo", label: "Logo", x: 24, y: 24, width: 72, height: 72 },
  { id: "cmp-title", type: "text", label: "Titulo principal", helper: "Subtitulo o texto de apoyo", x: 112, y: 28, width: 220, height: 76 },
  { id: "cmp-input", type: "input", label: "Campo de texto", x: 24, y: 136, width: 300, height: 78 },
  { id: "cmp-button", type: "button", label: "Accion principal", x: 24, y: 236, width: 300, height: 48 }
];

const demoMockups: Mockup[] = [
  {
    id: "mockup-proy-mobile",
    projectCode: "PROY",
    name: "App movil - resumen de proyecto",
    type: "mobile",
    screenTitle: "Proyecto PROY",
    summary: "Referencia para vista movil con avance, estado y tareas activas.",
    description: "Pantalla pensada para consulta rapida desde telefono.",
    primaryColor: "#22d3ee",
    status: "Revision",
    updatedAt: "2026-05-14",
    elements: ["Header compacto", "Card avance", "Sprint activo", "Tareas asignadas", "Boton abrir board"],
    screens: [
      { id: "screen-dashboard", name: "Resumen", description: "Vista inicial del proyecto", x: 120, y: 120, components: defaultComponents },
      { id: "screen-tasks", name: "Tareas", description: "Listado operativo", x: 580, y: 120, components: [{ id: "cmp-nav", type: "navbar", label: "Navegacion" }, { id: "cmp-card", type: "card", label: "Tarea asignada", helper: "Estado, responsable y fecha" }, { id: "cmp-button-2", type: "button", label: "Actualizar estado" }] }
    ],
    connections: [{ id: "conn-demo-1", fromScreenId: "screen-dashboard", toScreenId: "screen-tasks", label: "Abrir tareas" }]
  },
  {
    id: "mockup-proy-flow",
    projectCode: "PROY",
    name: "Flujo de aprobacion de HU",
    type: "flow",
    screenTitle: "Aprobacion HU",
    summary: "Diagrama para alinear backlog, desarrollo, QA y cierre.",
    description: "Referencia de proceso para que una historia pase de backlog a sprint, QA y finalizacion.",
    primaryColor: "#38bdf8",
    status: "Borrador",
    updatedAt: "2026-05-14",
    elements: ["Backlog", "Sprint", "Desarrollo", "QA", "Finalizado"],
    screens: []
  }
];

const emptyDraft: MockupDraft = {
  projectCode: "PROY",
  name: "",
  type: "mobile",
  screenTitle: "",
  summary: "",
  description: "",
  primaryColor: "#22d3ee",
  status: "Borrador",
  elements: ["Inicio", "Proceso", "Fin"],
  screens: [{ id: "screen-main", name: "Pantalla principal", description: "", x: 160, y: 140, components: cloneDefaultComponents() }],
  connections: []
};

const mockupTypes = [
  { value: "mobile" as const, label: "Aplicacion movil", icon: Smartphone },
  { value: "browser" as const, label: "Navegador web", icon: Monitor },
  { value: "flow" as const, label: "Diagrama de flujo", icon: Workflow }
];

const componentOptions: Array<{ type: ComponentType; label: string; icon: typeof Type }> = [
  { type: "button", label: "Boton", icon: Square },
  { type: "input", label: "Caja de texto", icon: TextCursorInput },
  { type: "label", label: "Etiqueta", icon: Tag },
  { type: "text", label: "Texto", icon: Type },
  { type: "logo", label: "Logo", icon: Palette },
  { type: "image", label: "Imagen", icon: ImageIcon },
  { type: "card", label: "Tarjeta", icon: Square },
  { type: "navbar", label: "Menu", icon: Monitor }
];

const editorSizes = {
  mobile: { width: 390, height: 680 },
  browser: { width: 980, height: 560 }
};

export default function MockupPage() {
  const [hydrated, setHydrated] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedMockupId, setSelectedMockupId] = useState("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<MockupDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const loadedProjects = readArray<ProjectSummary>(projectsStorageKey).filter((project) => project.code && project.name);
    const nextProjects = loadedProjects.length ? loadedProjects : demoProjects;
    const loadedMockups = readArray<Mockup>(mockupsStorageKey).map(normalizeMockup);
    const nextMockups = loadedMockups.length ? loadedMockups : demoMockups;

    setProjects(nextProjects);
    setMockups(nextMockups);
    setSelectedProject(nextProjects[0]?.code ?? "");
    setSelectedMockupId(nextMockups.find((item) => item.projectCode === nextProjects[0]?.code)?.id ?? "");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(mockupsStorageKey, JSON.stringify(mockups));
  }, [hydrated, mockups]);

  const projectMockups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mockups
      .filter((item) => item.projectCode === selectedProject)
      .filter((item) => !normalizedQuery || [item.name, item.screenTitle, item.summary, item.description].some((value) => value.toLowerCase().includes(normalizedQuery)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [mockups, query, selectedProject]);

  const selectedMockup = projectMockups.find((item) => item.id === selectedMockupId) ?? projectMockups[0];
  const selectedProjectName = projects.find((project) => project.code === selectedProject)?.name ?? selectedProject;

  useEffect(() => {
    setSelectedMockupId((current) => projectMockups.some((item) => item.id === current) ? current : projectMockups[0]?.id ?? "");
  }, [projectMockups]);

  function openCreate() {
    setEditingId(null);
    setDraft({
      ...emptyDraft,
      projectCode: selectedProject || projects[0]?.code || "PROY",
      screenTitle: selectedProjectName,
      screens: [{ id: createId("screen"), name: "Pantalla principal", description: "", x: 160, y: 140, components: cloneDefaultComponents() }],
      connections: []
    });
    setModalOpen(true);
  }

  function openEdit(mockup: Mockup) {
    const normalized = normalizeMockup(mockup);
    setEditingId(normalized.id);
    setDraft({
      projectCode: normalized.projectCode,
      name: normalized.name,
      type: normalized.type,
      screenTitle: normalized.screenTitle,
      summary: normalized.summary,
      description: normalized.description,
      primaryColor: normalized.primaryColor,
      status: normalized.status,
      elements: normalized.elements,
      screens: normalized.screens,
      connections: normalized.connections ?? []
    });
    setModalOpen(true);
  }

  function saveMockup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanElements = draft.elements.map((item) => item.trim()).filter(Boolean);
    const payload: Mockup = {
      id: editingId ?? createId("mockup"),
      ...draft,
      name: draft.name.trim(),
      screenTitle: draft.screenTitle.trim(),
      summary: draft.summary.trim(),
      description: draft.description.trim(),
      elements: cleanElements.length ? cleanElements : screensToElements(draft.screens),
      screens: draft.screens?.length ? draft.screens : [{ id: createId("screen"), name: "Pantalla principal", components: cloneDefaultComponents() }],
      connections: draft.connections ?? [],
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    if (!payload.name || !payload.screenTitle) {
      toast.error("Completa el nombre y titulo del mockup");
      return;
    }

    setMockups((current) => editingId ? current.map((item) => (item.id === editingId ? payload : item)) : [payload, ...current]);
    setSelectedProject(payload.projectCode);
    setSelectedMockupId(payload.id);
    setModalOpen(false);
    toast.success(editingId ? "Mockup actualizado" : "Mockup creado");
  }

  function removeMockup(mockup: Mockup) {
    setMockups((current) => current.filter((item) => item.id !== mockup.id));
    toast.success("Mockup eliminado");
  }

  function exportSvg(mockup: Mockup) {
    const svg = buildSvg(normalizeMockup(mockup));
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${mockup.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!hydrated) {
    return (
      <AppShell>
        <PageLoading message="Cargando mockups del proyecto..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Mockup</p>
            <h1 className="text-3xl font-black text-slate-100 md:text-4xl">Referencias visuales</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Crea pantallas de referencia para movil, navegador y diagramas de flujo por proyecto.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="space-y-1 text-xs font-semibold text-slate-400">
              Proyecto
              <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="h-11 min-w-64 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none">
                {projects.map((project) => <option key={project.code} value={project.code}>{project.code} - {project.name}</option>)}
              </select>
            </label>
            <Button onClick={openCreate} className="mt-auto"><Plus className="h-4 w-4" />Nuevo mockup</Button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-100">Mockups</h2>
                <p className="text-xs text-slate-400">{projectMockups.length} referencias de {selectedProject}</p>
              </div>
              <Palette className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" placeholder="Buscar mockup..." />
            </div>
            <div className="max-h-[calc(100vh-22rem)] space-y-3 overflow-y-auto pr-1">
              {projectMockups.map((mockup) => {
                const normalized = normalizeMockup(mockup);
                const type = mockupTypes.find((item) => item.value === normalized.type) ?? mockupTypes[0];
                const Icon = type.icon;
                return (
                  <button key={normalized.id} type="button" onClick={() => setSelectedMockupId(normalized.id)} className={cn("w-full rounded-xl border p-4 text-left transition", selectedMockup?.id === normalized.id ? "border-cyan-400 bg-cyan-400/10" : "border-slate-800 bg-slate-950/60 hover:border-slate-600")}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-800 text-cyan-300"><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-100">{normalized.name}</span>
                        <span className="mt-1 line-clamp-2 block text-xs text-slate-400">{normalized.summary}</span>
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{normalized.screens?.length ?? 0} pantallas</span>
                      <span>{normalized.status}</span>
                    </div>
                  </button>
                );
              })}
              {!projectMockups.length && <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">No hay mockups para este proyecto.</div>}
            </div>
          </Card>

          <Card className="min-w-0">
            {selectedMockup ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-cyan-300">{selectedMockup.projectCode}</span>
                      <span className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">{selectedMockup.status}</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-slate-100">{selectedMockup.name}</h2>
                    <p className="mt-2 max-w-4xl text-sm text-slate-400">{selectedMockup.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => exportSvg(selectedMockup)}><Download className="h-4 w-4" />Exportar SVG</Button>
                    <Button variant="secondary" onClick={() => openEdit(selectedMockup)}><Pencil className="h-4 w-4" />Editar</Button>
                    <Button variant="ghost" className="bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" onClick={() => removeMockup(selectedMockup)}><Trash2 className="h-4 w-4" />Eliminar</Button>
                  </div>
                </div>
                <MockupPreview mockup={normalizeMockup(selectedMockup)} />
              </div>
            ) : (
              <div className="grid min-h-[480px] place-items-center rounded-xl border border-dashed border-slate-700 text-center">
                <div>
                  <Palette className="mx-auto h-12 w-12 text-cyan-300" />
                  <h2 className="mt-4 text-xl font-black text-slate-100">Sin mockups</h2>
                  <p className="mt-2 text-sm text-slate-400">Crea una referencia visual para {selectedProjectName}.</p>
                  <Button onClick={openCreate} className="mt-5"><Plus className="h-4 w-4" />Nuevo mockup</Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>

      {modalOpen && <MockupModal draft={draft} editing={Boolean(editingId)} projects={projects} onChange={setDraft} onClose={() => setModalOpen(false)} onSubmit={saveMockup} />}
    </AppShell>
  );
}

function MockupPreview({ mockup }: { mockup: Mockup }) {
  if (mockup.type === "flow") return <FlowPreview mockup={mockup} />;

  return (
    <div>
      <ScreensFlowCanvas mockup={mockup} />
    </div>
  );
}

function MobileFrame({ mockup, screen }: { mockup: Mockup; screen?: MockupScreen }) {
  return (
    <div className="grid place-items-center overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="w-full max-w-[23rem] rounded-[2rem] border border-slate-700 bg-slate-900 p-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-slate-700" />
        <div className="min-h-[640px] rounded-[1.5rem] bg-slate-950 p-4">
          <MockupCanvas mockup={mockup} screen={screen} compact />
        </div>
      </div>
    </div>
  );
}

function BrowserFrame({ mockup, screen }: { mockup: Mockup; screen?: MockupScreen }) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="min-w-[820px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex h-12 items-center gap-2 border-b border-slate-800 bg-slate-950 px-4">
          <span className="h-3 w-3 rounded-full bg-rose-400" />
          <span className="h-3 w-3 rounded-full bg-amber-300" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <div className="ml-4 h-7 flex-1 rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-400">{mockup.projectCode.toLowerCase()}.local/{screen?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}</div>
        </div>
        <div className="grid min-h-[560px] grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="border-r border-slate-800 bg-slate-950 p-4">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: mockup.primaryColor }}>{mockup.projectCode.slice(0, 1)}</span>
              <div><p className="font-black text-slate-100">{mockup.projectCode}</p><p className="text-xs text-slate-500">Proyecto</p></div>
            </div>
            {(mockup.screens ?? []).map((item) => <div key={item.id} className={cn("mb-2 rounded-xl px-3 py-3 text-sm font-bold", screen?.id === item.id ? "text-white" : "bg-slate-900 text-slate-300")} style={screen?.id === item.id ? { backgroundColor: mockup.primaryColor } : undefined}>{item.name}</div>)}
          </aside>
          <main className="p-6"><MockupCanvas mockup={mockup} screen={screen} /></main>
        </div>
      </div>
    </div>
  );
}

function MockupCanvas({ mockup, screen, compact = false }: { mockup: Mockup; screen?: MockupScreen; compact?: boolean }) {
  const hasManualLayout = Boolean(screen?.components.some((component) => typeof component.x === "number" && typeof component.y === "number"));
  if (hasManualLayout && screen) {
    const size = mockup.type === "mobile" ? editorSizes.mobile : editorSizes.browser;
    return (
      <div className="overflow-auto">
        <div className="relative rounded-2xl border border-slate-800 bg-slate-950" style={{ width: size.width, height: size.height }}>
          <div className="absolute left-4 right-4 top-4 rounded-2xl p-4 text-white" style={{ backgroundColor: mockup.primaryColor }}>
            <p className="text-xs font-bold uppercase text-white/80">{mockup.projectCode}</p>
            <p className="text-xl font-black">{screen.name}</p>
          </div>
          {screen.components.map((component, index) => (
            <div key={component.id} className="absolute" style={componentStyle(component, index)}>
              <ComponentPreview component={component} color={mockup.primaryColor} compact={compact} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 text-white" style={{ backgroundColor: mockup.primaryColor }}>
        <p className="text-xs font-bold uppercase text-white/80">{mockup.projectCode}</p>
        <h3 className={cn("mt-2 font-black", compact ? "text-2xl" : "text-3xl")}>{screen?.name || mockup.screenTitle}</h3>
        <p className="mt-2 text-sm text-white/85">{screen?.description || mockup.summary}</p>
      </div>
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        {(screen?.components ?? []).map((component) => <ComponentPreview key={component.id} component={component} color={mockup.primaryColor} compact={compact} />)}
      </div>
    </div>
  );
}

function ComponentPreview({ component, color, compact }: { component: MockupComponent; color: string; compact?: boolean }) {
  if (component.type === "button") return <button className="h-11 rounded-lg px-4 text-sm font-black text-white" style={{ backgroundColor: color }}>{component.label}</button>;
  if (component.type === "input") return <div className="rounded-xl border border-slate-700 bg-slate-900 p-3"><p className="mb-2 text-xs font-bold text-slate-400">{component.label}</p><div className="h-10 rounded-lg bg-slate-800" /></div>;
  if (component.type === "label") return <span className="w-fit rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-bold text-slate-200">{component.label}</span>;
  if (component.type === "logo") return <div className="grid h-24 place-items-center rounded-2xl border border-slate-800 bg-slate-900"><span className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-black text-white" style={{ backgroundColor: color }}>{component.label.slice(0, 1)}</span></div>;
  if (component.type === "image") return <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">{component.imageDataUrl ? <img src={component.imageDataUrl} alt={component.label} className={cn("w-full object-cover", compact ? "h-36" : "h-52")} /> : <div className="grid h-40 place-items-center text-slate-500"><ImageIcon className="h-9 w-9" /></div>}<p className="p-3 text-sm font-bold text-slate-200">{component.label}</p></div>;
  if (component.type === "navbar") return <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">{["Inicio", "Detalle", "Mas"].map((item, index) => <span key={item} className={cn("rounded-lg px-3 py-2 text-xs font-bold", index === 0 ? "text-white" : "bg-slate-800 text-slate-300")} style={index === 0 ? { backgroundColor: color } : undefined}>{item}</span>)}</div>;
  if (component.type === "card") return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-lg font-black text-slate-100">{component.label}</p><p className="mt-2 text-sm text-slate-400">{component.helper || "Descripcion de la tarjeta"}</p><div className="mt-4 h-2 rounded-full bg-slate-800"><div className="h-2 w-2/3 rounded-full" style={{ backgroundColor: color }} /></div></div>;
  return <p className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-200">{component.label}<span className="block text-sm text-slate-500">{component.helper}</span></p>;
}

function FlowPreview({ mockup }: { mockup: Mockup }) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <div className="flex min-w-[760px] items-center gap-4">
        {mockup.elements.map((element, index) => (
          <div key={`${element}-${index}`} className="flex items-center gap-4">
            <div className="grid min-h-28 w-44 place-items-center rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center shadow-xl">
              <Workflow className="mb-3 h-6 w-6" style={{ color: mockup.primaryColor }} />
              <p className="text-sm font-black text-slate-100">{element}</p>
            </div>
            {index < mockup.elements.length - 1 && <div className="flex items-center"><span className="h-0.5 w-12" style={{ backgroundColor: mockup.primaryColor }} /><span className="h-0 w-0 border-y-8 border-l-8 border-y-transparent" style={{ borderLeftColor: mockup.primaryColor }} /></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreensFlowCanvas({ mockup }: { mockup: Mockup }) {
  const screens = mockup.screens ?? [];
  const width = Math.max(1100, ...screens.map((screen, index) => (screen.x ?? screenPosition(index).x) + 280));
  const height = Math.max(520, ...screens.map((screen, index) => (screen.y ?? screenPosition(index).y) + 420));
  const connections = mockup.connections ?? [];

  return (
    <div className="overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-100">Lienzo de flujo</p>
          <p className="text-xs text-slate-500">Todas las pantallas conectadas para visualizar la navegacion.</p>
        </div>
        <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400">{screens.length} pantallas</span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950" style={{ width, height }}>
        <CanvasGrid />
        <svg className="pointer-events-none absolute inset-0 z-10" width={width} height={height}>
          <defs>
            <marker id={`arrow-${mockup.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
          </defs>
          {connections.map((connection) => {
            const from = screens.find((screen) => screen.id === connection.fromScreenId);
            const to = screens.find((screen) => screen.id === connection.toScreenId);
            if (!from || !to) return null;
            const start = screenEdgePoint(from, "right");
            const end = screenEdgePoint(to, "left");
            const midX = start.x + Math.max(60, (end.x - start.x) / 2);
            return (
              <g key={connection.id}>
                <path d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`} fill="none" stroke="#94a3b8" strokeWidth="2" markerEnd={`url(#arrow-${mockup.id})`} />
                {connection.label && <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 8} fill="#cbd5e1" fontSize="12">{connection.label}</text>}
              </g>
            );
          })}
        </svg>
        {screens.map((screen, index) => <ScreenNode key={screen.id} screen={screen} index={index} color={mockup.primaryColor} type={mockup.type} />)}
      </div>
    </div>
  );
}

function FlowMapEditor({
  type,
  color,
  screens,
  activeScreenId,
  connectionSourceId,
  connections,
  onSelectScreen,
  onEditScreen,
  onMoveScreen,
  onConnectScreen,
  onRemoveConnection
}: {
  type: MockupType;
  color: string;
  screens: MockupScreen[];
  activeScreenId: string;
  connectionSourceId: string;
  connections: MockupConnection[];
  onSelectScreen: (id: string) => void;
  onEditScreen: (id: string) => void;
  onMoveScreen: (id: string, x: number, y: number) => void;
  onConnectScreen: (id: string) => void;
  onRemoveConnection: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const width = Math.max(1200, ...screens.map((screen, index) => (screen.x ?? screenPosition(index).x) + 320));
  const height = Math.max(620, ...screens.map((screen, index) => (screen.y ?? screenPosition(index).y) + 460));

  function startScreenDrag(event: ReactPointerEvent<HTMLDivElement>, screen: MockupScreen, index: number) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelectScreen(screen.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const initial = screenPosition(index, screen);

    function move(pointerEvent: PointerEvent) {
      const nextX = clamp(initial.x + (pointerEvent.clientX - startX) * scaleX, 16, width - 260);
      const nextY = clamp(initial.y + (pointerEvent.clientY - startY) * scaleY, 16, height - 380);
      onMoveScreen(screen.id, Math.round(nextX), Math.round(nextY));
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-100">Mapa de pantallas</p>
          <p className="text-xs text-slate-500">Arrastra pantallas. Usa Conectar y luego selecciona la pantalla destino.</p>
        </div>
        <span className={cn("rounded-lg px-3 py-1 text-xs font-bold", connectionSourceId ? "bg-cyan-400/10 text-cyan-200" : "bg-slate-900 text-slate-400")}>{connectionSourceId ? "Selecciona destino" : "Modo seleccion"}</span>
      </div>
      <div className="overflow-auto">
        <div ref={canvasRef} className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950" style={{ width, height }}>
          <CanvasGrid />
          <svg className="pointer-events-none absolute inset-0 z-10" width={width} height={height}>
            <defs>
              <marker id="editor-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#67e8f9" />
              </marker>
            </defs>
            {connections.map((connection) => {
              const from = screens.find((screen) => screen.id === connection.fromScreenId);
              const to = screens.find((screen) => screen.id === connection.toScreenId);
              if (!from || !to) return null;
              const start = screenEdgePoint(from, "right");
              const end = screenEdgePoint(to, "left");
              const midX = start.x + Math.max(70, (end.x - start.x) / 2);
              return <path key={connection.id} d={`M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`} fill="none" stroke="#67e8f9" strokeWidth="2.5" markerEnd="url(#editor-arrow)" />;
            })}
          </svg>
          {screens.map((screen, index) => {
            const position = screenPosition(index, screen);
            return (
              <div key={screen.id} className="absolute z-20" style={{ left: position.x, top: position.y }}>
                <div
                  role="button"
                  tabIndex={0}
                  onPointerDown={(event) => startScreenDrag(event, screen, index)}
                  onDoubleClick={() => onEditScreen(screen.id)}
                  className={cn("cursor-move rounded-[1.6rem] outline outline-2 outline-transparent", activeScreenId === screen.id && "outline-cyan-300", connectionSourceId === screen.id && "outline-orange-300")}
                >
                  <ScreenNode screen={screen} index={index} color={color} type={type} compact />
                </div>
                <div className="mt-2 flex gap-2">
                  <Button type="button" variant="secondary" className="h-8 px-2 text-xs" onClick={() => onEditScreen(screen.id)}>Editar</Button>
                  <Button type="button" variant="secondary" className="h-8 px-2 text-xs" onClick={() => onConnectScreen(screen.id)}>Conectar</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!!connections.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {connections.map((connection) => (
            <button key={connection.id} type="button" onClick={() => onRemoveConnection(connection.id)} className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-rose-500/20">
              {screens.find((screen) => screen.id === connection.fromScreenId)?.name} {"->"} {screens.find((screen) => screen.id === connection.toScreenId)?.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CanvasGrid() {
  return <div className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)", backgroundSize: "28px 28px" }} />;
}

function ScreenNode({ screen, index, color, type, compact = false }: { screen: MockupScreen; index: number; color: string; type: MockupType; compact?: boolean }) {
  const size = type === "mobile" ? { width: compact ? 156 : 190, height: compact ? 280 : 340 } : { width: compact ? 250 : 300, height: compact ? 168 : 210 };
  return (
    <div style={{ width: size.width }}>
      <div className="mb-2 text-center">
        <span className="inline-flex max-w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-black text-slate-100 shadow-sm">
          <span className="truncate">Pantalla {index + 1} - {screen.name}</span>
        </span>
      </div>
      <div className="rounded-[1.6rem] border border-slate-700 bg-slate-900 p-2 shadow-2xl" style={{ minHeight: size.height }}>
        <div className="mb-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <div className="space-y-2">
          {screen.components.slice(0, compact ? 4 : 6).map((component) => (
            <div key={component.id} className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5">
              <p className="truncate text-[11px] font-bold text-slate-200">{component.label}</p>
              <p className="text-[10px] text-slate-500">{componentLabel(component.type)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ManualMockupEditor({
  type,
  color,
  screen,
  selectedComponentId,
  onSelect,
  onUpdateComponent,
  onCreateComponentAt
}: {
  type: MockupType;
  color: string;
  screen: MockupScreen;
  selectedComponentId: string;
  onSelect: (id: string) => void;
  onUpdateComponent: (component: MockupComponent) => void;
  onCreateComponentAt: (type: ComponentType, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const size = type === "mobile" ? editorSizes.mobile : editorSizes.browser;

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, component: MockupComponent) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(component.id);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = size.width / rect.width;
    const scaleY = size.height / rect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const originalX = component.x ?? 24;
    const originalY = component.y ?? 120;

    function move(pointerEvent: PointerEvent) {
      const nextX = clamp(originalX + (pointerEvent.clientX - startX) * scaleX, 0, size.width - (component.width ?? 160));
      const nextY = clamp(originalY + (pointerEvent.clientY - startY) * scaleY, 0, size.height - (component.height ?? 48));
      onUpdateComponent({ ...component, x: Math.round(nextX), y: Math.round(nextY) });
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, component: MockupComponent, horizontal: -1 | 0 | 1, vertical: -1 | 0 | 1) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(component.id);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const fallback = positionFor(component.type, screen.components.findIndex((item) => item.id === component.id));
    const scaleX = size.width / rect.width;
    const scaleY = size.height / rect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    const originalX = component.x ?? fallback.x;
    const originalY = component.y ?? fallback.y;
    const originalWidth = component.width ?? fallback.width;
    const originalHeight = component.height ?? fallback.height;
    const minWidth = 48;
    const minHeight = 28;

    function move(pointerEvent: PointerEvent) {
      const deltaX = (pointerEvent.clientX - startX) * scaleX;
      const deltaY = (pointerEvent.clientY - startY) * scaleY;
      let nextX = originalX;
      let nextY = originalY;
      let nextWidth = originalWidth;
      let nextHeight = originalHeight;

      if (horizontal === 1) nextWidth = clamp(originalWidth + deltaX, minWidth, size.width - originalX);
      if (horizontal === -1) {
        nextX = clamp(originalX + deltaX, 0, originalX + originalWidth - minWidth);
        nextWidth = originalWidth + originalX - nextX;
      }
      if (vertical === 1) nextHeight = clamp(originalHeight + deltaY, minHeight, size.height - originalY);
      if (vertical === -1) {
        nextY = clamp(originalY + deltaY, 0, originalY + originalHeight - minHeight);
        nextHeight = originalHeight + originalY - nextY;
      }

      onUpdateComponent({
        ...component,
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextWidth),
        height: Math.round(nextHeight)
      });
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  function editText(component: MockupComponent) {
    const next = window.prompt("Texto del control", component.label);
    if (next !== null) onUpdateComponent({ ...component, label: next });
  }

  function openProperties(event: ReactMouseEvent<HTMLDivElement>, component: MockupComponent) {
    event.preventDefault();
    onSelect(component.id);
    toast.info("Propiedades del control abiertas");
  }

  function allowDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function dropComponent(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/devhub-component") as ComponentType;
    if (!componentOptions.some((option) => option.type === type)) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scaleX = size.width / rect.width;
    const scaleY = size.height / rect.height;
    const fallback = positionFor(type, screen.components.length);
    const x = clamp((event.clientX - rect.left) * scaleX - fallback.width / 2, 0, size.width - fallback.width);
    const y = clamp((event.clientY - rect.top) * scaleY - fallback.height / 2, 0, size.height - fallback.height);
    onCreateComponentAt(type, Math.round(x), Math.round(y));
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-100">Lienzo manual</p>
          <p className="text-xs text-slate-500">Arrastra controles. Doble clic edita texto. Clic derecho abre propiedades.</p>
        </div>
        <span className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400">{size.width} x {size.height}</span>
      </div>
      <div className="min-w-max">
        <div ref={canvasRef} onDragOver={allowDrop} onDrop={dropComponent} className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" style={{ width: size.width, height: size.height }}>
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          {screen.components.map((component, index) => (
            <div
              key={component.id}
              role="button"
              tabIndex={0}
              onPointerDown={(event) => startDrag(event, component)}
              onDoubleClick={() => editText(component)}
              onContextMenu={(event) => openProperties(event, component)}
              className={cn("absolute cursor-move rounded-xl outline outline-2 outline-transparent transition", selectedComponentId === component.id && "outline-cyan-300")}
              style={componentStyle(component, index)}
            >
              <ComponentPreview component={component} color={color} />
              {selectedComponentId === component.id && <ResizeHandles component={component} onResize={startResize} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="space-y-1 text-xs font-semibold text-slate-400">
      {label}
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-10 px-2" />
    </label>
  );
}

function ResizeHandles({ component, onResize }: { component: MockupComponent; onResize: (event: ReactPointerEvent<HTMLButtonElement>, component: MockupComponent, horizontal: -1 | 0 | 1, vertical: -1 | 0 | 1) => void }) {
  const handles: Array<{ key: string; horizontal: -1 | 0 | 1; vertical: -1 | 0 | 1; className: string; cursor: string }> = [
    { key: "nw", horizontal: -1, vertical: -1, className: "-left-1.5 -top-1.5", cursor: "nwse-resize" },
    { key: "n", horizontal: 0, vertical: -1, className: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "ns-resize" },
    { key: "ne", horizontal: 1, vertical: -1, className: "-right-1.5 -top-1.5", cursor: "nesw-resize" },
    { key: "e", horizontal: 1, vertical: 0, className: "-right-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
    { key: "se", horizontal: 1, vertical: 1, className: "-bottom-1.5 -right-1.5", cursor: "nwse-resize" },
    { key: "s", horizontal: 0, vertical: 1, className: "-bottom-1.5 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
    { key: "sw", horizontal: -1, vertical: 1, className: "-bottom-1.5 -left-1.5", cursor: "nesw-resize" },
    { key: "w", horizontal: -1, vertical: 0, className: "-left-1.5 top-1/2 -translate-y-1/2", cursor: "ew-resize" }
  ];

  return (
    <>
      {handles.map((handle) => (
        <button
          key={handle.key}
          type="button"
          aria-label={`Redimensionar ${handle.key}`}
          onPointerDown={(event) => onResize(event, component, handle.horizontal, handle.vertical)}
          className={cn("absolute z-20 h-3 w-3 rounded-full border border-slate-950 bg-cyan-300 shadow", handle.className)}
          style={{ cursor: handle.cursor }}
        />
      ))}
    </>
  );
}

function MockupModal({ draft, editing, projects, onChange, onClose, onSubmit }: { draft: MockupDraft; editing: boolean; projects: ProjectSummary[]; onChange: (draft: MockupDraft) => void; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [activeScreenId, setActiveScreenId] = useState(draft.screens?.[0]?.id ?? "");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [connectionSourceId, setConnectionSourceId] = useState("");
  const [screenEditorId, setScreenEditorId] = useState("");
  const [generalOpen, setGeneralOpen] = useState(false);
  const screens = draft.screens ?? [];
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) ?? screens[0];
  const screenInEditor = screens.find((screen) => screen.id === screenEditorId);
  const selectedComponent = screenInEditor?.components.find((component) => component.id === selectedComponentId);
  const elementText = draft.elements.join("\n");

  useEffect(() => {
    setActiveScreenId(draft.screens?.[0]?.id ?? "");
  }, [draft.screens?.length]);

  function updateScreens(nextScreens: MockupScreen[]) {
    onChange({ ...draft, screens: nextScreens, elements: draft.type === "flow" ? draft.elements : screensToElements(nextScreens) });
  }

  function addScreen() {
    const screen = { id: createId("screen"), name: `Pantalla ${screens.length + 1}`, description: "", components: [] };
    updateScreens([...screens, screen]);
    setActiveScreenId(screen.id);
  }

  function updateScreen(updated: MockupScreen) {
    updateScreens(screens.map((screen) => screen.id === updated.id ? updated : screen));
  }

  function openScreenEditor(screenId: string) {
    setActiveScreenId(screenId);
    setSelectedComponentId("");
    setScreenEditorId(screenId);
  }

  function updateScreenPosition(screenId: string, x: number, y: number) {
    updateScreens(screens.map((screen) => screen.id === screenId ? { ...screen, x, y } : screen));
  }

  function connectScreen(targetScreenId: string) {
    if (!connectionSourceId || connectionSourceId === targetScreenId) {
      setConnectionSourceId(targetScreenId);
      return;
    }
    const exists = (draft.connections ?? []).some((connection) => connection.fromScreenId === connectionSourceId && connection.toScreenId === targetScreenId);
    if (!exists) {
      onChange({
        ...draft,
        connections: [...(draft.connections ?? []), { id: createId("conn"), fromScreenId: connectionSourceId, toScreenId: targetScreenId, label: "Navega" }]
      });
    }
    setConnectionSourceId("");
  }

  function removeConnection(connectionId: string) {
    onChange({ ...draft, connections: (draft.connections ?? []).filter((connection) => connection.id !== connectionId) });
  }

  function removeScreen(screenId: string) {
    if (screens.length <= 1) {
      toast.error("El mockup debe tener al menos una pantalla");
      return;
    }
    const nextScreens = screens.filter((screen) => screen.id !== screenId);
    updateScreens(nextScreens);
    setActiveScreenId(nextScreens[0]?.id ?? "");
    if (screenEditorId === screenId) setScreenEditorId("");
  }

  function addComponent(type: ComponentType) {
    if (!screenInEditor) return;
    const component = createComponent(type, screenInEditor.components.length);
    updateScreen({ ...screenInEditor, components: [...screenInEditor.components, component] });
    setSelectedComponentId(component.id);
  }

  function addComponentAt(type: ComponentType, x: number, y: number) {
    if (!screenInEditor) return;
    const component = { ...createComponent(type, screenInEditor.components.length), x, y };
    updateScreen({ ...screenInEditor, components: [...screenInEditor.components, component] });
    setSelectedComponentId(component.id);
  }

  function startPaletteDrag(event: ReactDragEvent<HTMLButtonElement>, type: ComponentType) {
    event.dataTransfer.setData("application/devhub-component", type);
    event.dataTransfer.effectAllowed = "copy";
  }

  function updateComponent(component: MockupComponent) {
    if (!screenInEditor) return;
    updateScreen({ ...screenInEditor, components: screenInEditor.components.map((item) => item.id === component.id ? component : item) });
  }

  function removeComponent(componentId: string) {
    if (!screenInEditor) return;
    updateScreen({ ...screenInEditor, components: screenInEditor.components.filter((item) => item.id !== componentId) });
    if (selectedComponentId === componentId) setSelectedComponentId("");
  }

  async function loadImage(component: MockupComponent, file?: File) {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    updateComponent({ ...component, type: "image", imageDataUrl: dataUrl, label: component.label || file.name });
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-3">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="text-2xl font-black text-slate-100">{editing ? "Modificar mockup" : "Crear mockup"}</h2><p className="mt-1 text-sm text-slate-400">Administra pantallas y componentes visuales para movil o web.</p></div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800" aria-label="Cerrar"><X className="h-5 w-5" /></button>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900">
          <button type="button" onClick={() => setGeneralOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
            <span>
              <span className="block text-sm font-black text-slate-100">Informacion general</span>
              <span className="block text-xs text-slate-500">{draft.projectCode} - {draft.name || "Mockup sin nombre"} - {draft.status}</span>
            </span>
            <ChevronDown className={cn("h-5 w-5 text-slate-400 transition", generalOpen && "rotate-180")} />
          </button>
          {generalOpen && (
            <div className="grid gap-4 border-t border-slate-800 p-4 md:grid-cols-2">
              <label className="space-y-1 text-sm font-semibold text-slate-300">Proyecto<select value={draft.projectCode} onChange={(event) => onChange({ ...draft, projectCode: event.target.value })} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none">{projects.map((project) => <option key={project.code} value={project.code}>{project.code} - {project.name}</option>)}</select></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300">Tipo<select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as MockupType })} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none">{mockupTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300">Nombre del mockup<Input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="Ej. Login movil" /></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300">Titulo general<Input value={draft.screenTitle} onChange={(event) => onChange({ ...draft, screenTitle: event.target.value })} placeholder="Ej. Iniciar sesion" /></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300">Estado<select value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as MockupStatus })} className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none"><option value="Borrador">Borrador</option><option value="Revision">Revision</option><option value="Aprobado">Aprobado</option></select></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300">Color principal<div className="flex gap-3"><Input type="color" value={draft.primaryColor} onChange={(event) => onChange({ ...draft, primaryColor: event.target.value })} className="w-20 p-1" /><Input value={draft.primaryColor} onChange={(event) => onChange({ ...draft, primaryColor: event.target.value })} /></div></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300 md:col-span-2">Resumen<Input value={draft.summary} onChange={(event) => onChange({ ...draft, summary: event.target.value })} /></label>
              <label className="space-y-1 text-sm font-semibold text-slate-300 md:col-span-2">Descripcion<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" /></label>
            </div>
          )}
        </section>

        {draft.type === "flow" ? (
          <label className="mt-4 block space-y-1 text-sm font-semibold text-slate-300">Pasos del flujo<textarea value={elementText} onChange={(event) => onChange({ ...draft, elements: event.target.value.split("\n") })} rows={6} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-400" /></label>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-100">Pantallas</h3><Button type="button" variant="secondary" className="h-9 px-3" onClick={addScreen}><Plus className="h-4 w-4" /></Button></div>
              <div className="space-y-2">
                {screens.map((screen) => <button key={screen.id} type="button" onClick={() => openScreenEditor(screen.id)} className={cn("flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-bold", activeScreen?.id === screen.id ? "border-cyan-400 bg-cyan-400/10 text-cyan-200" : "border-slate-800 bg-slate-950 text-slate-300")}><span className="truncate">{screen.name}</span><Trash2 className="h-4 w-4" onClick={(event) => { event.stopPropagation(); removeScreen(screen.id); }} /></button>)}
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
              {activeScreen && (
                <>
                  <FlowMapEditor
                    type={draft.type}
                    color={draft.primaryColor}
                    screens={screens}
                    activeScreenId={activeScreen.id}
                    connectionSourceId={connectionSourceId}
                    connections={draft.connections ?? []}
                    onSelectScreen={setActiveScreenId}
                    onEditScreen={openScreenEditor}
                    onMoveScreen={updateScreenPosition}
                    onConnectScreen={connectScreen}
                    onRemoveConnection={removeConnection}
                  />
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                    Selecciona una pantalla desde el listado o usa el boton Editar en el mapa para abrir la edicion detallada de controles.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{editing ? "Guardar cambios" : "Crear mockup"}</Button>
        </div>
      </form>

      {screenInEditor && (
        <ScreenEditorModal
          type={draft.type}
          color={draft.primaryColor}
          screen={screenInEditor}
          selectedComponent={selectedComponent}
          selectedComponentId={selectedComponentId}
          onClose={() => setScreenEditorId("")}
          onUpdateScreen={updateScreen}
          onAddComponent={addComponent}
          onStartPaletteDrag={startPaletteDrag}
          onSelectComponent={setSelectedComponentId}
          onUpdateComponent={updateComponent}
          onRemoveComponent={removeComponent}
          onCreateComponentAt={addComponentAt}
          onLoadImage={loadImage}
        />
      )}
    </div>
  );
}

function ScreenEditorModal({
  type,
  color,
  screen,
  selectedComponent,
  selectedComponentId,
  onClose,
  onUpdateScreen,
  onAddComponent,
  onStartPaletteDrag,
  onSelectComponent,
  onUpdateComponent,
  onRemoveComponent,
  onCreateComponentAt,
  onLoadImage
}: {
  type: MockupType;
  color: string;
  screen: MockupScreen;
  selectedComponent?: MockupComponent;
  selectedComponentId: string;
  onClose: () => void;
  onUpdateScreen: (screen: MockupScreen) => void;
  onAddComponent: (type: ComponentType) => void;
  onStartPaletteDrag: (event: ReactDragEvent<HTMLButtonElement>, type: ComponentType) => void;
  onSelectComponent: (id: string) => void;
  onUpdateComponent: (component: MockupComponent) => void;
  onRemoveComponent: (id: string) => void;
  onCreateComponentAt: (type: ComponentType, x: number, y: number) => void;
  onLoadImage: (component: MockupComponent, file?: File) => Promise<void>;
}) {
  useEffect(() => {
    function handleDelete(event: KeyboardEvent) {
      if (event.key !== "Delete" || !selectedComponentId) return;
      const target = event.target as HTMLElement | null;
      const isEditingField = target?.matches("input, textarea, select, [contenteditable='true']");
      if (isEditingField) return;

      event.preventDefault();
      onRemoveComponent(selectedComponentId);
      toast.success("Componente eliminado");
    }

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [onRemoveComponent, selectedComponentId]);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-3">
      <div className="max-h-[92vh] w-full max-w-7xl overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Pantalla</p>
            <h3 className="text-2xl font-black text-slate-100">{screen.name}</h3>
            <p className="mt-1 text-sm text-slate-400">Edita controles, textos, imagenes y posicionamiento manual de esta pantalla.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800" aria-label="Cerrar pantalla">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-300">Nombre de pantalla<Input value={screen.name} onChange={(event) => onUpdateScreen({ ...screen, name: event.target.value })} /></label>
          <label className="space-y-1 text-sm font-semibold text-slate-300">Descripcion<Input value={screen.description ?? ""} onChange={(event) => onUpdateScreen({ ...screen, description: event.target.value })} /></label>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-black text-slate-100">Componentes</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {componentOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button key={option.type} type="button" draggable onDragStart={(event) => onStartPaletteDrag(event, option.type)} onClick={() => onAddComponent(option.type)} className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300 hover:border-cyan-400 active:cursor-grabbing">
                  <Icon className="h-4 w-4 text-cyan-300" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <ManualMockupEditor
            type={type}
            color={color}
            screen={screen}
            selectedComponentId={selectedComponentId}
            onSelect={onSelectComponent}
            onUpdateComponent={onUpdateComponent}
            onCreateComponentAt={onCreateComponentAt}
          />
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h4 className="text-sm font-black text-slate-100">Propiedades</h4>
            <p className="mt-1 text-xs text-slate-500">Clic derecho selecciona el control. Doble clic edita el texto.</p>
            {selectedComponent ? (
              <div className="mt-4 space-y-3">
                <label className="space-y-1 text-xs font-semibold text-slate-400">Tipo<select value={selectedComponent.type} onChange={(event) => onUpdateComponent({ ...selectedComponent, type: event.target.value as ComponentType })} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none">{componentOptions.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}</select></label>
                <label className="space-y-1 text-xs font-semibold text-slate-400">Texto<Input value={selectedComponent.label} onChange={(event) => onUpdateComponent({ ...selectedComponent, label: event.target.value })} /></label>
                <label className="space-y-1 text-xs font-semibold text-slate-400">Detalle<Input value={selectedComponent.helper ?? ""} onChange={(event) => onUpdateComponent({ ...selectedComponent, helper: event.target.value })} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="X" value={selectedComponent.x ?? 0} onChange={(value) => onUpdateComponent({ ...selectedComponent, x: value })} />
                  <NumberField label="Y" value={selectedComponent.y ?? 0} onChange={(value) => onUpdateComponent({ ...selectedComponent, y: value })} />
                  <NumberField label="Ancho" value={selectedComponent.width ?? 160} onChange={(value) => onUpdateComponent({ ...selectedComponent, width: value })} />
                  <NumberField label="Alto" value={selectedComponent.height ?? 48} onChange={(value) => onUpdateComponent({ ...selectedComponent, height: value })} />
                </div>
                {selectedComponent.type === "image" && <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 p-3 text-sm font-bold text-slate-300 hover:border-cyan-400"><Upload className="h-4 w-4" />Cargar imagen<input type="file" accept="image/*" className="hidden" onChange={(event) => void onLoadImage(selectedComponent, event.target.files?.[0])} /></label>}
                <Button type="button" variant="ghost" className="w-full bg-rose-500/10 text-rose-200 hover:bg-rose-500/20" onClick={() => onRemoveComponent(selectedComponent.id)}><Trash2 className="h-4 w-4" />Eliminar control</Button>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-slate-800 p-4 text-sm text-slate-500">Selecciona un control para editar sus propiedades.</div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onClose}>Cerrar pantalla</Button>
        </div>
      </div>
    </div>
  );
}

function normalizeMockup(mockup: Mockup): Mockup {
  if (mockup.screens?.length) {
    return {
      ...mockup,
      screens: mockup.screens.map((screen) => ({
        ...screen,
        x: screen.x,
        y: screen.y,
        components: screen.components.map((component, index) => normalizeComponent(component, index))
      })).map((screen, index) => ({ ...screen, ...screenPosition(index, screen) })),
      connections: mockup.connections ?? []
    };
  }
  return {
    ...mockup,
    screens: mockup.type === "flow" ? [] : [{
      id: createId("screen"),
      name: mockup.screenTitle || "Pantalla principal",
      description: mockup.summary,
      x: 160,
      y: 140,
      components: (mockup.elements.length ? mockup.elements : ["Contenido principal"]).map((element, index) => normalizeComponent({ id: createId("cmp"), type: "card", label: element }, index))
    }],
    connections: mockup.connections ?? []
  };
}

function normalizeComponent(component: MockupComponent, index: number): MockupComponent {
  const fallback = positionFor(component.type, index);
  return {
    ...component,
    x: component.x ?? fallback.x,
    y: component.y ?? fallback.y,
    width: component.width ?? fallback.width,
    height: component.height ?? fallback.height
  };
}

function createComponent(type: ComponentType, index: number): MockupComponent {
  return normalizeComponent({
    id: createId("cmp"),
    type,
    label: defaultComponentLabel(type),
    helper: type === "card" ? "Detalle informativo" : ""
  }, index);
}

function cloneDefaultComponents() {
  return defaultComponents.map((component, index) => normalizeComponent({ ...component, id: createId("cmp") }, index));
}

function positionFor(type: ComponentType, index: number) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const baseX = 24 + column * 180;
  const baseY = 128 + row * 92;
  const defaults: Record<ComponentType, { width: number; height: number }> = {
    button: { width: 160, height: 48 },
    input: { width: 230, height: 76 },
    label: { width: 120, height: 36 },
    text: { width: 220, height: 72 },
    logo: { width: 84, height: 84 },
    image: { width: 240, height: 150 },
    card: { width: 240, height: 120 },
    navbar: { width: 320, height: 58 }
  };
  return { x: baseX, y: baseY, ...defaults[type] };
}

function screenPosition(index: number, screen?: MockupScreen) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: screen?.x ?? 120 + column * 340,
    y: screen?.y ?? 120 + row * 420
  };
}

function screenEdgePoint(screen: MockupScreen, edge: "left" | "right") {
  const width = 220;
  const height = 260;
  const x = screen.x ?? 120;
  const y = screen.y ?? 120;
  return {
    x: edge === "right" ? x + width : x,
    y: y + height / 2
  };
}

function componentStyle(component: MockupComponent, index = 0) {
  const fallback = positionFor(component.type, index);
  return {
    left: component.x ?? fallback.x,
    top: component.y ?? fallback.y,
    width: component.width ?? fallback.width,
    height: component.height ?? fallback.height
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function screensToElements(screens?: MockupScreen[]) {
  return (screens ?? []).flatMap((screen) => screen.components.map((component) => component.label)).filter(Boolean);
}

function defaultComponentLabel(type: ComponentType) {
  return componentOptions.find((option) => option.type === type)?.label ?? "Elemento";
}

function componentLabel(type: ComponentType) {
  return componentOptions.find((option) => option.type === type)?.label ?? type;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildSvg(mockup: Mockup) {
  const screen = mockup.screens?.[0];
  const size = getSvgSize(mockup.type);
  const margin = mockup.type === "mobile" ? 28 : 40;
  const headerHeight = mockup.type === "mobile" ? 128 : 116;
  const contentTop = margin + headerHeight + 24;
  const contentWidth = size.width - margin * 2;
  const rowHeight = mockup.type === "mobile" ? 54 : 48;
  const rowGap = mockup.type === "mobile" ? 12 : 10;
  const maxRows = Math.max(1, Math.floor((size.height - contentTop - margin - 54) / (rowHeight + rowGap)));
  const components = (screen?.components ?? [])
    .slice(0, maxRows)
    .map((component, index) => {
      const y = contentTop + index * (rowHeight + rowGap);
      const text = `${componentLabel(component.type)}: ${component.label}`;
      return `<rect x="${margin}" y="${y}" width="${contentWidth}" height="${rowHeight}" rx="12" fill="#111827" stroke="#334155"/><text x="${margin + 18}" y="${y + Math.round(rowHeight / 2) + 6}" fill="#e2e8f0" font-size="${mockup.type === "mobile" ? 14 : 16}" font-family="Arial">${escapeXml(truncateSvgText(text, mockup.type === "mobile" ? 34 : 72))}</text>`;
    })
    .join("");
  const overflowNote = (screen?.components?.length ?? 0) > maxRows ? `<text x="${margin}" y="${size.height - margin - 18}" fill="#94a3b8" font-size="14" font-family="Arial">+ ${(screen?.components?.length ?? 0) - maxRows} componentes adicionales</text>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" preserveAspectRatio="xMidYMid meet">
  <rect width="${size.width}" height="${size.height}" rx="${mockup.type === "mobile" ? 36 : 24}" fill="#020617"/>
  <rect x="${margin}" y="${margin}" width="${contentWidth}" height="${headerHeight}" rx="18" fill="${escapeXml(mockup.primaryColor)}"/>
  <text x="${margin + 22}" y="${margin + 42}" fill="#ffffff" font-size="${mockup.type === "mobile" ? 13 : 16}" font-weight="700" font-family="Arial">${escapeXml(mockup.projectCode)} - ${escapeXml(mockup.type)}</text>
  <text x="${margin + 22}" y="${margin + 82}" fill="#ffffff" font-size="${mockup.type === "mobile" ? 26 : 34}" font-weight="900" font-family="Arial">${escapeXml(truncateSvgText(screen?.name || mockup.screenTitle, mockup.type === "mobile" ? 20 : 42))}</text>
  <text x="${margin + 22}" y="${margin + 108}" fill="#e0f2fe" font-size="${mockup.type === "mobile" ? 12 : 14}" font-family="Arial">${escapeXml(truncateSvgText(mockup.summary, mockup.type === "mobile" ? 36 : 86))}</text>
  ${components}
  ${overflowNote}
</svg>`;
}

function getSvgSize(type: MockupType) {
  if (type === "mobile") return { width: 390, height: 844 };
  if (type === "browser") return { width: 1440, height: 900 };
  return { width: 1200, height: 720 };
}

function truncateSvgText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function readArray<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T[] : [];
  } catch {
    return [];
  }
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;"
  })[char] ?? char);
}
