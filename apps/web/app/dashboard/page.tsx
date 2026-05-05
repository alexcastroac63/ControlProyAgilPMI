"use client";

import { Card } from "@devhub/ui";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bug, ClipboardList, Percent } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/layout/app-shell";
import { api } from "@/lib/api";
import { canSeeProject, getUserAccessContext } from "@/lib/access-control";

const fallback = {
  metrics: [
    { label: "Proyectos en desarrollo", value: "1", trend: 8 },
    { label: "Proyectos en requerimientos", value: "1", trend: 4 },
    { label: "% avance desarrollo", value: "50%", trend: 12 },
    { label: "Bugs abiertos", value: "27", trend: -9 }
  ],
  velocity: [{ sprint: "S1", points: 34 }, { sprint: "S2", points: 42 }, { sprint: "S3", points: 39 }, { sprint: "S4", points: 48 }],
  capacityHeatmap: [{ team: "Core", capacity: 84 }, { team: "QA", capacity: 72 }, { team: "BI", capacity: 91 }]
};

export default function DashboardPage() {
  const { data = fallback } = useQuery({ queryKey: ["executive"], queryFn: () => api<typeof fallback>("/dashboard/executive"), retry: false });
  const [localProjects, setLocalProjects] = useState<any[]>([]);
  const metrics = useMemo(() => buildProjectMetrics(localProjects, data.metrics), [localProjects, data.metrics]);
  const icons = [Activity, ClipboardList, Percent, Bug];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("devhub.projects");
      if (saved) {
        const access = getUserAccessContext();
        setLocalProjects((JSON.parse(saved) as any[]).filter((project) => canSeeProject(project, access)));
      }
    } catch {
      setLocalProjects([]);
    }
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard Proyectos</h1>
        </div>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <Card key={metric.label}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{metric.label}</span>
                <Icon className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="mt-4 text-3xl font-semibold">{metric.value}</div>
              <div className={metric.trend >= 0 ? "mt-2 text-sm text-emerald-400" : "mt-2 text-sm text-rose-400"}>{metric.trend}% vs mes anterior</div>
            </Card>
          );
        })}
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-medium">Velocity equipos</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.velocity}>
              <CartesianGrid stroke="var(--chart-grid)" />
              <XAxis dataKey="sprint" stroke="var(--chart-axis)" />
              <YAxis stroke="var(--chart-axis)" />
              <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <Area dataKey="points" stroke="var(--chart-area-stroke)" fill="var(--chart-area-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-medium">Heatmap capacidad</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.capacityHeatmap} layout="vertical">
              <XAxis type="number" stroke="var(--chart-axis)" />
              <YAxis type="category" dataKey="team" stroke="var(--chart-axis)" width={60} />
              <Tooltip contentStyle={{ background: "var(--chart-tooltip-bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <Bar dataKey="capacity" fill="var(--chart-bar-fill)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>
    </AppShell>
  );
}

function buildProjectMetrics(projects: any[], apiMetrics: typeof fallback.metrics) {
  if (!projects.length) return apiMetrics.filter((metric) => metric.label !== "Riesgos criticos" && metric.label !== "Riesgos críticos");
  const normalized = projects.map((project) => ({ ...project, status: normalizeProjectStatus(project.status) }));
  const inDevelopment = normalized.filter((project) => project.status === "Desarrollo");
  const inRequirements = normalized.filter((project) => project.status === "Requerimientos");
  const developmentTasks = inDevelopment.flatMap((project) => Array.isArray(project.storyTasks) ? project.storyTasks : []);
  const completedTasks = developmentTasks.filter((task) => task.status === "Finalizada").length;
  const progress = developmentTasks.length ? Math.round((completedTasks / developmentTasks.length) * 100) : 0;
  const openBugs = inDevelopment.flatMap((project) => Array.isArray(project.storyTasks) ? project.storyTasks : []).filter((task) => String(task.title).toLowerCase().includes("bug") && task.status !== "Finalizada").length;

  return [
    { label: "Proyectos en desarrollo", value: String(inDevelopment.length), trend: 8 },
    { label: "Proyectos en requerimientos", value: String(inRequirements.length), trend: 4 },
    { label: "% avance desarrollo", value: `${progress}%`, trend: 12 },
    { label: "Bugs abiertos", value: String(openBugs), trend: openBugs ? -9 : 0 }
  ];
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
