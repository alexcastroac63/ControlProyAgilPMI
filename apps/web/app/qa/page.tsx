"use client";

import { Card, cn } from "@devhub/ui";
import { AlertTriangle, BarChart3, Bug, CheckCircle2, ClipboardCheck, FileCheck2, FolderKanban, KanbanSquare, Layers3, ListChecks, PlayCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";

type ProjectSummary = {
  id?: string;
  code: string;
  name: string;
  status?: string;
};

type WorkItem = {
  id: string;
  projectId?: string;
  projectCode?: string;
  key: string;
  title: string;
  type: string;
  priority: string;
  status: string;
};

type BoardItem = {
  id: string;
  projectCode: string;
  key: string;
  title: string;
  status: string;
  priority: string;
};

type ScrumStatus = "Por hacer" | "En curso" | "Bloqueada" | "Desarrollo finalizado" | "Listo para QA" | "En QA" | "Finalizado";

type TestCase = {
  id: string;
  projectCode: string;
  key: string;
  name: string;
  type: "Manual" | "Automatizado";
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Draft" | "Approved" | "Deprecated";
  coverage: string[];
  suite: string;
  owner: string;
};

type TestExecution = {
  id: string;
  projectCode: string;
  key: string;
  name: string;
  environment: string;
  version: string;
  status: "Pending" | "Passed" | "Failed" | "Blocked";
  executedBy: string;
  executedAt: string;
  cases: { caseKey: string; status: "Pending" | "Passed" | "Failed" | "Blocked" }[];
};

type Defect = {
  id: string;
  projectCode: string;
  key: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  linkedCase: string;
  linkedStory: string;
};

const projectsStorageKey = "devhub.projects";
const boardStorageKey = "devhub.scrumBoard";
const qaStorageKey = "devhub.qaXray";
const tabs = ["Resumen", "Planes y suites", "Casos de prueba", "Ejecuciones", "Trazabilidad"] as const;

const demoProjects: ProjectSummary[] = [
  { id: "demo-proy", code: "PROY", name: "DevOps Hub Core", status: "Desarrollo" },
  { id: "demo-qa", code: "QA", name: "QA Automation", status: "Pruebas" }
];

const demoCases: TestCase[] = [
  { id: "tc-1", projectCode: "PROY", key: "TC-PROY-001", name: "Login valido con JWT", type: "Manual", priority: "Critical", status: "Approved", coverage: ["HU00001"], suite: "Autenticacion", owner: "Sofia QA" },
  { id: "tc-2", projectCode: "PROY", key: "TC-PROY-002", name: "Bloqueo por intentos fallidos", type: "Manual", priority: "High", status: "Approved", coverage: ["HU00001"], suite: "Autenticacion", owner: "Sofia QA" },
  { id: "tc-3", projectCode: "PROY", key: "TC-PROY-003", name: "Mover HU a Ready QA desde PR aprobado", type: "Automatizado", priority: "High", status: "Approved", coverage: ["HU00004"], suite: "GitHub Integration", owner: "Ivan Automation" },
  { id: "tc-4", projectCode: "PROY", key: "TC-PROY-004", name: "Drag and drop en Scrum Board", type: "Manual", priority: "High", status: "Draft", coverage: ["HU00002"], suite: "Scrum Board", owner: "Laura QA Lead" },
  { id: "tc-5", projectCode: "QA", key: "TC-QA-001", name: "Crear suite de regresion", type: "Manual", priority: "High", status: "Approved", coverage: ["HU00005"], suite: "Regression", owner: "Laura QA Lead" },
  { id: "tc-6", projectCode: "QA", key: "TC-QA-002", name: "Publicar evidencia en ejecucion", type: "Automatizado", priority: "Medium", status: "Draft", coverage: ["HU00006"], suite: "Evidence", owner: "Ivan Automation" }
];

const demoExecutions: TestExecution[] = [
  { id: "exec-1", projectCode: "PROY", key: "TE-PROY-001", name: "Smoke Sprint 1", environment: "QA", version: "1.0.0", status: "Passed", executedBy: "Sofia QA", executedAt: "2026-05-01", cases: [{ caseKey: "TC-PROY-001", status: "Passed" }, { caseKey: "TC-PROY-002", status: "Passed" }] },
  { id: "exec-2", projectCode: "PROY", key: "TE-PROY-002", name: "Regression Sprint 2", environment: "QA", version: "1.1.0", status: "Failed", executedBy: "Laura QA Lead", executedAt: "2026-05-01", cases: [{ caseKey: "TC-PROY-003", status: "Failed" }, { caseKey: "TC-PROY-004", status: "Blocked" }] },
  { id: "exec-3", projectCode: "QA", key: "TE-QA-001", name: "Regression Base", environment: "QA", version: "0.9.0", status: "Pending", executedBy: "Ivan Automation", executedAt: "2026-05-02", cases: [{ caseKey: "TC-QA-001", status: "Pending" }, { caseKey: "TC-QA-002", status: "Pending" }] }
];

const demoDefects: Defect[] = [
  { id: "bug-1", projectCode: "PROY", key: "BUG-PROY-001", title: "Webhook PR aprobado no mueve HU", severity: "High", status: "In Progress", linkedCase: "TC-PROY-003", linkedStory: "HU00004" },
  { id: "bug-2", projectCode: "PROY", key: "BUG-PROY-002", title: "Board no persiste movimiento tras recarga", severity: "Critical", status: "Open", linkedCase: "TC-PROY-004", linkedStory: "HU00002" }
];

export default function QaPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>(demoProjects);
  const [selectedProject, setSelectedProject] = useState("PROY");
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Resumen");
  const [cases, setCases] = useState<TestCase[]>(demoCases);
  const [executions, setExecutions] = useState<TestExecution[]>(demoExecutions);
  const [defects, setDefects] = useState<Defect[]>(demoDefects);
  const [stories, setStories] = useState<WorkItem[]>([]);

  useEffect(() => {
    const savedProjects = localStorage.getItem(projectsStorageKey);
    if (savedProjects) {
      const parsed = (JSON.parse(savedProjects) as ProjectSummary[]).filter((project) => project.code && project.name);
      if (parsed.length) {
        setProjects(parsed);
        setSelectedProject((current) => parsed.some((project) => project.code === current) ? current : parsed[0].code);
      }
    }

    const savedBoard = localStorage.getItem(boardStorageKey);
    if (savedBoard) {
      setStories((JSON.parse(savedBoard) as BoardItem[]).map((item) => ({
        id: item.id,
        projectCode: item.projectCode,
        key: item.key,
        title: item.title,
        type: "STORY",
        priority: item.priority,
        status: item.status
      })));
    }

    const savedQa = localStorage.getItem(qaStorageKey);
    if (savedQa) {
      const parsed = JSON.parse(savedQa) as { cases?: TestCase[]; executions?: TestExecution[]; defects?: Defect[] };
      if (parsed.cases) setCases(parsed.cases);
      if (parsed.executions) setExecutions(parsed.executions);
      if (parsed.defects) setDefects(parsed.defects);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(qaStorageKey, JSON.stringify({ cases, executions, defects }));
  }, [cases, executions, defects]);

  const project = projects.find((item) => item.code === selectedProject) ?? projects[0];
  const projectCases = useMemo(() => cases.filter((item) => item.projectCode === selectedProject), [cases, selectedProject]);
  const projectExecutions = useMemo(() => executions.filter((item) => item.projectCode === selectedProject), [executions, selectedProject]);
  const projectDefects = useMemo(() => defects.filter((item) => item.projectCode === selectedProject), [defects, selectedProject]);
  const projectStories = useMemo(() => stories.filter((item) => item.projectCode === selectedProject), [stories, selectedProject]);

  const suites = useMemo(() => {
    const grouped = new Map<string, TestCase[]>();
    for (const item of projectCases) grouped.set(item.suite, [...(grouped.get(item.suite) ?? []), item]);
    return Array.from(grouped.entries()).map(([name, items]) => ({
      name,
      cases: items,
      approved: items.filter((item) => item.status === "Approved").length,
      automated: items.filter((item) => item.type === "Automatizado").length
    }));
  }, [projectCases]);

  const metrics = useMemo(() => {
    const executedCaseResults = projectExecutions.flatMap((execution) => execution.cases);
    const passed = executedCaseResults.filter((item) => item.status === "Passed").length;
    const failed = executedCaseResults.filter((item) => item.status === "Failed").length;
    const blocked = executedCaseResults.filter((item) => item.status === "Blocked").length;
    const coverageStories = new Set(projectCases.flatMap((item) => item.coverage));
    const coverage = projectStories.length ? Math.round((coverageStories.size / projectStories.length) * 100) : projectCases.length ? 100 : 0;
    const passRate = executedCaseResults.length ? Math.round((passed / executedCaseResults.length) * 100) : 0;
    return {
      totalCases: projectCases.length,
      executions: projectExecutions.length,
      openDefects: projectDefects.filter((item) => item.status !== "Closed").length,
      criticalDefects: projectDefects.filter((item) => item.severity === "Critical" && item.status !== "Closed").length,
      coverage,
      passRate,
      passed,
      failed,
      blocked
    };
  }, [projectCases, projectDefects, projectExecutions, projectStories]);

  function updateScrumStoryStatus(storyKey: string, status: ScrumStatus) {
    const savedBoard = localStorage.getItem(boardStorageKey);
    const boardItems = savedBoard ? JSON.parse(savedBoard) as BoardItem[] : [];
    const existsInBoard = boardItems.some((item) => item.projectCode === selectedProject && item.key === storyKey);
    if (!existsInBoard) {
      toast.error("La HU no existe en Scrum Board");
      return;
    }

    const nextBoardItems = boardItems.map((item) => item.projectCode === selectedProject && item.key === storyKey ? { ...item, status } : item);
    localStorage.setItem(boardStorageKey, JSON.stringify(nextBoardItems));
    setStories((current) => current.map((item) => (item.projectCode === selectedProject && item.key === storyKey ? { ...item, status } : item)));
    toast.success(`${storyKey} movida a ${status} en Scrum Board`);
  }

  function sendFailedExecutionToBoard(execution: TestExecution) {
    const failedCaseKeys = execution.cases.filter((item) => item.status === "Failed" || item.status === "Blocked").map((item) => item.caseKey);
    const impactedStories = new Set(projectCases.filter((item) => failedCaseKeys.includes(item.key)).flatMap((item) => item.coverage));
    if (impactedStories.size === 0) {
      toast.error("La ejecucion no tiene HU trazadas con fallo");
      return;
    }
    impactedStories.forEach((storyKey) => updateScrumStoryStatus(storyKey, "Bloqueada"));
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">QA Testing</h1>
          <p className="mt-1 text-sm text-slate-400">Gestion tipo Xray Jira: planes, suites, casos, ejecuciones, defectos y trazabilidad por proyecto.</p>
        </div>
        <label className="space-y-2">
          <span className="text-xs text-slate-400">Proyecto</span>
          <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="h-11 min-w-72 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
            {projects.map((item) => <option key={item.code} value={item.code}>{item.code} - {item.name}</option>)}
          </select>
        </label>
      </div>

      <section className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{project?.name ?? "Proyecto"}</h2>
              <p className="text-sm text-slate-400">{project?.code} · Estado {project?.status ?? "Sin estado"} · Calidad segmentada por proyecto</p>
            </div>
          </div>
          <span className="w-fit rounded bg-slate-800 px-3 py-2 text-xs text-slate-300">{projectCases.length} casos · {projectExecutions.length} ejecuciones</span>
        </div>
      </section>

      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Casos de prueba" value={metrics.totalCases} detail={`${suites.length} suites`} icon={FileCheck2} tone="cyan" />
        <MetricCard label="Cobertura HU" value={`${metrics.coverage}%`} detail={`${projectStories.length || projectCases.length} items trazables`} icon={Layers3} tone="emerald" />
        <MetricCard label="Pass rate" value={`${metrics.passRate}%`} detail={`${metrics.passed} passed / ${metrics.failed} failed`} icon={CheckCircle2} tone="amber" />
        <MetricCard label="Defectos abiertos" value={metrics.openDefects} detail={`${metrics.criticalDefects} criticos`} icon={Bug} tone="rose" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn("rounded-md border px-3 py-2 text-sm font-semibold transition", activeTab === tab ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800")}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Resumen" && <SummaryView metrics={metrics} suites={suites} executions={projectExecutions} defects={projectDefects} stories={projectStories} cases={projectCases} onSendFailedExecutionToBoard={sendFailedExecutionToBoard} onUpdateStoryStatus={updateScrumStoryStatus} />}
      {activeTab === "Planes y suites" && <SuitesView suites={suites} />}
      {activeTab === "Casos de prueba" && <CasesView cases={projectCases} />}
      {activeTab === "Ejecuciones" && <ExecutionsView executions={projectExecutions} />}
      {activeTab === "Trazabilidad" && <TraceabilityView stories={projectStories} cases={projectCases} defects={projectDefects} onUpdateStoryStatus={updateScrumStoryStatus} />}
    </AppShell>
  );
}

function SummaryView({
  metrics,
  suites,
  executions,
  defects,
  stories,
  cases,
  onSendFailedExecutionToBoard,
  onUpdateStoryStatus
}: {
  metrics: { passed: number; failed: number; blocked: number };
  suites: { name: string; cases: TestCase[]; approved: number; automated: number }[];
  executions: TestExecution[];
  defects: Defect[];
  stories: WorkItem[];
  cases: TestCase[];
  onSendFailedExecutionToBoard: (execution: TestExecution) => void;
  onUpdateStoryStatus: (storyKey: string, status: ScrumStatus) => void;
}) {
  const qaStories = stories.filter((story) => ["Listo para QA", "En QA", "Bloqueada", "Desarrollo finalizado"].includes(story.status));
  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-semibold">Estado de ejecuciones</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <StatusBlock label="Passed" value={metrics.passed} className="bg-emerald-500" />
          <StatusBlock label="Failed" value={metrics.failed} className="bg-rose-500" />
          <StatusBlock label="Blocked" value={metrics.blocked} className="bg-amber-400" />
        </div>
        <div className="mt-5 space-y-3">
          {executions.map((execution) => <ExecutionRow key={execution.id} execution={execution} onSendToBoard={onSendFailedExecutionToBoard} />)}
        </div>
      </Card>
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-300" />
          <h2 className="text-lg font-semibold">Defectos recientes</h2>
        </div>
        <div className="space-y-3">
          {defects.map((defect) => <DefectRow key={defect.id} defect={defect} />)}
          {defects.length === 0 && <EmptyState text="Sin defectos registrados para este proyecto." />}
        </div>
      </Card>
      <div className="xl:col-span-2">
        <ScrumQaSyncPanel stories={qaStories} cases={cases} defects={defects} onUpdateStoryStatus={onUpdateStoryStatus} />
      </div>
      <div className="xl:col-span-2">
        <SuitesView suites={suites} compact />
      </div>
    </div>
  );
}

function SuitesView({ suites, compact = false }: { suites: { name: string; cases: TestCase[]; approved: number; automated: number }[]; compact?: boolean }) {
  return (
    <section className={cn("rounded-lg border border-slate-800 bg-slate-900/50", compact && "bg-transparent")}>
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-semibold">Planes y suites de prueba</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">Agrupacion equivalente a Test Plan / Test Set en Xray.</p>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {suites.map((suite) => (
          <article key={suite.name} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{suite.name}</h3>
              <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{suite.cases.length} casos</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="rounded bg-slate-950 p-2">Aprobados: {suite.approved}</div>
              <div className="rounded bg-slate-950 p-2">Automatizados: {suite.automated}</div>
            </div>
            <div className="mt-3 space-y-2">
              {suite.cases.slice(0, 4).map((item) => <div key={item.id} className="truncate rounded bg-slate-950 px-2 py-2 text-xs text-slate-300">{item.key} · {item.name}</div>)}
            </div>
          </article>
        ))}
        {suites.length === 0 && <EmptyState text="Sin suites de prueba para este proyecto." />}
      </div>
    </section>
  );
}

function CasesView({ cases }: { cases: TestCase[] }) {
  return (
    <DataPanel title="Casos de prueba" icon={ListChecks} subtitle="Catalogo de Test Cases con cobertura de historias de usuario.">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="bg-slate-900 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-3">Caso</th>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Suite</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Prioridad</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Cobertura</th>
            <th className="px-4 py-3">Owner</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id} className="border-t border-slate-800">
              <td className="px-4 py-4 font-mono text-cyan-300">{item.key}</td>
              <td className="px-4 py-4 font-medium">{item.name}</td>
              <td className="px-4 py-4">{item.suite}</td>
              <td className="px-4 py-4">{item.type}</td>
              <td className="px-4 py-4">{item.priority}</td>
              <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
              <td className="px-4 py-4">{item.coverage.join(", ") || "Sin HU"}</td>
              <td className="px-4 py-4 text-slate-400">{item.owner}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataPanel>
  );
}

function ExecutionsView({ executions }: { executions: TestExecution[] }) {
  return (
    <DataPanel title="Ejecuciones" icon={PlayCircle} subtitle="Corridas por ambiente, version y resultado de cada caso.">
      <div className="grid gap-4 p-4 md:grid-cols-2">
        {executions.map((execution) => (
          <article key={execution.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-cyan-300">{execution.key}</div>
                <h3 className="mt-1 font-semibold">{execution.name}</h3>
                <p className="mt-1 text-xs text-slate-400">{execution.environment} · Version {execution.version} · {execution.executedAt}</p>
              </div>
              <StatusBadge status={execution.status} />
            </div>
            <div className="space-y-2">
              {execution.cases.map((item) => (
                <div key={`${execution.id}-${item.caseKey}`} className="flex items-center justify-between gap-3 rounded bg-slate-950 px-3 py-2 text-xs">
                  <span className="font-mono text-slate-300">{item.caseKey}</span>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </article>
        ))}
        {executions.length === 0 && <EmptyState text="Sin ejecuciones para este proyecto." />}
      </div>
    </DataPanel>
  );
}

function TraceabilityView({ stories, cases, defects, onUpdateStoryStatus }: { stories: WorkItem[]; cases: TestCase[]; defects: Defect[]; onUpdateStoryStatus: (storyKey: string, status: ScrumStatus) => void }) {
  const rows = stories.length ? stories : cases.flatMap((item) => item.coverage).map((key) => ({ id: key, key, title: "Historia vinculada", type: "STORY", priority: "MEDIUM", status: "Sin estado" }));
  return (
    <DataPanel title="Matriz de trazabilidad" icon={ClipboardCheck} subtitle="Relacion entre historias, casos de prueba, ejecuciones y defectos.">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-900 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-3">Historia</th>
            <th className="px-4 py-3">Titulo</th>
            <th className="px-4 py-3">Casos asociados</th>
            <th className="px-4 py-3">Defectos</th>
            <th className="px-4 py-3">Estado Scrum</th>
            <th className="px-4 py-3">Accion QA</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((story) => {
            const linkedCases = cases.filter((item) => item.coverage.includes(story.key));
            const linkedDefects = defects.filter((item) => item.linkedStory === story.key);
            return (
              <tr key={story.id} className="border-t border-slate-800">
                <td className="px-4 py-4 font-mono text-cyan-300">{story.key}</td>
                <td className="px-4 py-4 font-medium">{story.title}</td>
                <td className="px-4 py-4">{linkedCases.map((item) => item.key).join(", ") || "Sin casos"}</td>
                <td className="px-4 py-4">{linkedDefects.map((item) => item.key).join(", ") || "Sin defectos"}</td>
                <td className="px-4 py-4"><StatusBadge status={story.status} /></td>
                <td className="px-4 py-4">
                  <ScrumStatusActions storyKey={story.key} compact onUpdateStoryStatus={onUpdateStoryStatus} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </DataPanel>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone }: { label: string; value: string | number; detail: string; icon: typeof ShieldCheck; tone: "cyan" | "emerald" | "amber" | "rose" }) {
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
          <div className="mt-3 text-3xl font-semibold">{value}</div>
          <div className="mt-2 text-xs text-slate-500">{detail}</div>
        </div>
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function DataPanel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof ShieldCheck; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function StatusBlock({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <span className={cn("h-3 w-3 rounded-full", className)} />
        <span className="text-2xl font-semibold">{value}</span>
      </div>
    </div>
  );
}

function ScrumQaSyncPanel({ stories, cases, defects, onUpdateStoryStatus }: { stories: WorkItem[]; cases: TestCase[]; defects: Defect[]; onUpdateStoryStatus: (storyKey: string, status: ScrumStatus) => void }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-semibold">Interaccion con Scrum Board</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">Historias trazadas desde QA y acciones directas para moverlas en el tablero.</p>
      </div>
      <div className="grid gap-3 p-4">
        {stories.map((story) => {
          const linkedCases = cases.filter((item) => item.coverage.includes(story.key));
          const linkedDefects = defects.filter((item) => item.linkedStory === story.key && item.status !== "Closed");
          return (
            <article key={story.id} className="grid gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 xl:grid-cols-[1fr_180px_1fr] xl:items-center">
              <div className="min-w-0">
                <div className="font-mono text-xs text-cyan-300">{story.key}</div>
                <div className="mt-1 truncate text-sm font-semibold">{story.title}</div>
                <div className="mt-2 text-xs text-slate-400">{linkedCases.length} casos · {linkedDefects.length} defectos abiertos</div>
              </div>
              <StatusBadge status={story.status} />
              <ScrumStatusActions storyKey={story.key} onUpdateStoryStatus={onUpdateStoryStatus} />
            </article>
          );
        })}
        {stories.length === 0 && <EmptyState text="No hay historias en estados QA dentro del Scrum Board para este proyecto." />}
      </div>
    </section>
  );
}

function ScrumStatusActions({ storyKey, compact = false, onUpdateStoryStatus }: { storyKey: string; compact?: boolean; onUpdateStoryStatus: (storyKey: string, status: ScrumStatus) => void }) {
  const actions: { label: string; status: ScrumStatus }[] = [
    { label: "Listo QA", status: "Listo para QA" },
    { label: "En QA", status: "En QA" },
    { label: "Bloquear", status: "Bloqueada" },
    { label: "Finalizar", status: "Finalizado" }
  ];
  return (
    <div className={cn("flex flex-wrap gap-2", compact && "min-w-64")}>
      {actions.map((action) => (
        <button key={action.status} type="button" onClick={() => onUpdateStoryStatus(storyKey, action.status)} className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-200">
          {action.label}
        </button>
      ))}
    </div>
  );
}

function ExecutionRow({ execution, onSendToBoard }: { execution: TestExecution; onSendToBoard: (execution: TestExecution) => void }) {
  const hasFailures = execution.cases.some((item) => item.status === "Failed" || item.status === "Blocked");
  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-950/60 p-3 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="font-mono text-xs text-cyan-300">{execution.key}</div>
        <div className="mt-1 text-sm font-medium">{execution.name}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">{execution.cases.length} casos</span>
        <StatusBadge status={execution.status} />
        {hasFailures && (
          <button type="button" onClick={() => onSendToBoard(execution)} className="rounded-md border border-rose-500/40 px-2 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/10">
            Bloquear HU
          </button>
        )}
      </div>
    </div>
  );
}

function DefectRow({ defect }: { defect: Defect }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-rose-300">{defect.key}</div>
          <div className="mt-1 text-sm font-medium">{defect.title}</div>
          <div className="mt-2 text-xs text-slate-400">{defect.linkedStory} · {defect.linkedCase}</div>
        </div>
        <StatusBadge status={defect.severity} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const className = normalized.includes("pass") || normalized.includes("approved") || normalized.includes("cubierta")
    ? "bg-emerald-500/10 text-emerald-300"
    : normalized.includes("fail") || normalized.includes("critical") || normalized.includes("open")
      ? "bg-rose-500/10 text-rose-300"
      : normalized.includes("block") || normalized.includes("high")
        ? "bg-amber-500/10 text-amber-300"
        : "bg-slate-800 text-slate-300";
  return <span className={cn("inline-flex rounded px-2 py-1 text-xs", className)}>{status}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">{text}</div>;
}
