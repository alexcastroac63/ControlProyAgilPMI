"use client";

import { Button, Card, Input, cn } from "@devhub/ui";
import { ChevronDown, Github, GitBranch, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageLoading } from "@/components/layout/page-loading";
import { api } from "@/lib/api";

type AppSettings = {
  storage: {
    provider: "local" | "sharepoint";
    localBasePath: string;
    sharePointSiteId: string;
    sharePointDriveId: string;
    sharePointFolderPath: string;
  };
  microsoftAuth: {
    enabled: boolean;
    allowedDomains: string[];
  };
  googleAuth: {
    enabled: boolean;
    allowedDomains: string[];
  };
  emailNotifications: {
    enabled: boolean;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    passwordEnvVar: string;
    from: string;
    notifyTaskAssignment: boolean;
    notifyBugDetected: boolean;
    notifyTestFinished: boolean;
  };
  githubIntegration: {
    enabled: boolean;
    authMode: "token" | "app";
    defaultOwner: string;
    tokenEnvVar: string;
    appId: string;
    privateKeyEnvVar: string;
    webhookSecretEnvVar: string;
    apiBaseUrl: string;
  };
};

type ProjectSummary = {
  code: string;
  name: string;
  status?: string;
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

const defaultSettings: AppSettings = {
  storage: {
    provider: "local",
    localBasePath: "C:\\DatosApp",
    sharePointSiteId: "",
    sharePointDriveId: "",
    sharePointFolderPath: "DevOpsHub/Attachments"
  },
  microsoftAuth: {
    enabled: false,
    allowedDomains: []
  },
  googleAuth: {
    enabled: false,
    allowedDomains: []
  },
  emailNotifications: {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    passwordEnvVar: "SMTP_PASSWORD",
    from: "",
    notifyTaskAssignment: true,
    notifyBugDetected: true,
    notifyTestFinished: true
  },
  githubIntegration: {
    enabled: false,
    authMode: "token",
    defaultOwner: "",
    tokenEnvVar: "GITHUB_TOKEN",
    appId: "",
    privateKeyEnvVar: "GITHUB_PRIVATE_KEY",
    webhookSecretEnvVar: "GITHUB_WEBHOOK_SECRET",
    apiBaseUrl: "https://api.github.com"
  }
};

const projectsStorageKey = "devhub.projects";
const githubStorageKey = "devhub.githubStats";

const fallbackProjects: ProjectSummary[] = [
  { code: "PROY", name: "DevOps Hub Core", status: "Desarrollo" },
  { code: "QA", name: "QA Automation", status: "Pruebas" }
];

const emptyRepositoryForm = {
  projectCode: "",
  owner: "",
  name: "",
  defaultBranch: "main"
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [domains, setDomains] = useState("");
  const [googleDomains, setGoogleDomains] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [repositoryForm, setRepositoryForm] = useState(emptyRepositoryForm);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    void api<AppSettings>("/settings")
      .then((data) => {
        setSettings(data);
        setDomains(data.microsoftAuth.allowedDomains.join(", "));
        setGoogleDomains(data.googleAuth.allowedDomains.join(", "));
      })
      .catch(() => toast.error("No se pudo cargar la configuracion"));
  }, []);

  useEffect(() => {
    const savedProjects = localStorage.getItem(projectsStorageKey);
    const parsedProjects = savedProjects ? (JSON.parse(savedProjects) as ProjectSummary[]).filter((project) => project.code && project.name) : [];
    const nextProjects = parsedProjects;
    const savedRepositories = localStorage.getItem(githubStorageKey);
    const parsedRepositories = savedRepositories ? (JSON.parse(savedRepositories) as GithubRepository[]) : [];
    setProjects(nextProjects);
    setRepositories(parsedRepositories);
    setRepositoryForm((value) => ({
      ...value,
      projectCode: nextProjects[0]?.code ?? "",
      owner: settings.githubIntegration.defaultOwner || value.owner
    }));
    setHydrated(true);
  }, [settings.githubIntegration.defaultOwner]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(githubStorageKey, JSON.stringify(repositories));
  }, [hydrated, repositories]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const payload: AppSettings = {
        ...settings,
        microsoftAuth: {
          ...settings.microsoftAuth,
          allowedDomains: domains.split(",").map((domain) => domain.trim().toLowerCase()).filter(Boolean)
        },
        googleAuth: {
          ...settings.googleAuth,
          allowedDomains: googleDomains.split(",").map((domain) => domain.trim().toLowerCase()).filter(Boolean)
        }
      };
      const updated = await api<AppSettings>("/settings", { method: "PATCH", body: JSON.stringify(payload) });
      setSettings(updated);
      setDomains(updated.microsoftAuth.allowedDomains.join(", "));
      setGoogleDomains(updated.googleAuth.allowedDomains.join(", "));
      toast.success("Configuracion actualizada");
    } catch (error) {
      toast.error(error instanceof Error && error.message ? `No se pudo guardar: ${error.message}` : "No se pudo guardar la configuracion");
    } finally {
      setLoading(false);
    }
  }

  function addRepository() {
    const owner = repositoryForm.owner.trim();
    const name = repositoryForm.name.trim();
    if (!owner || !name) {
      toast.error("Ingresa owner y repositorio");
      return;
    }
    const exists = repositories.some((repo) => repo.projectCode === repositoryForm.projectCode && repo.owner.toLowerCase() === owner.toLowerCase() && repo.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      toast.error("El repositorio ya esta asociado a este proyecto");
      return;
    }
    const now = new Date();
    const nextRepository: GithubRepository = {
      id: `repo-${repositoryForm.projectCode}-${owner}-${name}-${now.getTime()}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
      projectCode: repositoryForm.projectCode,
      owner,
      name,
      defaultBranch: repositoryForm.defaultBranch.trim() || "main",
      branches: 0,
      commits: 0,
      pullRequests: 0,
      openPullRequests: 0,
      actions: 0,
      successfulActions: 0,
      releases: 0,
      issuesSynced: 0,
      lastSync: now.toLocaleString("es-SV")
    };
    setRepositories((current) => [...current, nextRepository]);
    setRepositoryForm((value) => ({ ...value, name: "" }));
    toast.success("Repositorio asociado al proyecto");
  }

  function removeRepository(id: string) {
    setRepositories((current) => current.filter((repo) => repo.id !== id));
    toast.success("Repositorio removido");
  }

  function simulateSyncRepository(id: string) {
    setRepositories((current) => current.map((repo) => repo.id === id
      ? {
          ...repo,
          branches: Math.max(repo.branches, 1),
          commits: repo.commits + 3,
          pullRequests: repo.pullRequests + 1,
          openPullRequests: repo.openPullRequests + 1,
          actions: repo.actions + 1,
          successfulActions: repo.successfulActions + 1,
          lastSync: new Date().toLocaleString("es-SV")
        }
      : repo));
    toast.success("Repositorio sincronizado");
  }

  const webhookUrl = typeof window === "undefined" ? "/api/github/webhook" : `${window.location.origin}/api/github/webhook`;

  return (
    <AppShell>
      {!hydrated ? (
        <PageLoading message="Cargando configuracion real..." />
      ) : (
      <>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Configuracion</h1>
        <p className="mt-1 text-sm text-slate-400">Almacenamiento de adjuntos, SharePoint y acceso Microsoft.</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <SettingsSection
          title="Almacenamiento de adjuntos"
          summary={`${settings.storage.provider === "local" ? "Servidor local" : "SharePoint"} - ${settings.storage.provider === "local" ? settings.storage.localBasePath : settings.storage.sharePointFolderPath}`}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Proveedor</span>
              <select
                value={settings.storage.provider}
                onChange={(event) => setSettings((value) => ({ ...value, storage: { ...value.storage, provider: event.target.value as AppSettings["storage"]["provider"] } }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="local">Recurso del equipo / servidor</option>
                <option value="sharepoint">SharePoint</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Ruta local del servidor</span>
              <Input
                value={settings.storage.localBasePath}
                onChange={(event) => setSettings((value) => ({ ...value, storage: { ...value.storage, localBasePath: event.target.value } }))}
                placeholder="C:\\DatosApp"
              />
              <p className="text-xs text-slate-500">Ruta del servidor donde corre la aplicacion. Se creara una subcarpeta por proyecto, por ejemplo C:\DatosApp\PROY.</p>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">SharePoint Site ID</span>
              <Input value={settings.storage.sharePointSiteId} onChange={(event) => setSettings((value) => ({ ...value, storage: { ...value.storage, sharePointSiteId: event.target.value } }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">SharePoint Drive ID</span>
              <Input value={settings.storage.sharePointDriveId} onChange={(event) => setSettings((value) => ({ ...value, storage: { ...value.storage, sharePointDriveId: event.target.value } }))} />
            </label>
            <label className="space-y-2 lg:col-span-2">
              <span className="text-sm text-slate-300">Carpeta SharePoint</span>
              <Input value={settings.storage.sharePointFolderPath} onChange={(event) => setSettings((value) => ({ ...value, storage: { ...value.storage, sharePointFolderPath: event.target.value } }))} />
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Inicio de sesion Microsoft"
          summary={`${settings.microsoftAuth.enabled ? "Habilitado" : "Deshabilitado"} - ${domains || "sin dominios"}`}
        >
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <label className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
              <input
                type="checkbox"
                checked={settings.microsoftAuth.enabled}
                onChange={(event) => setSettings((value) => ({ ...value, microsoftAuth: { ...value.microsoftAuth, enabled: event.target.checked } }))}
              />
              <span className="text-sm">Habilitar Microsoft</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Dominios permitidos</span>
              <Input value={domains} onChange={(event) => setDomains(event.target.value)} placeholder="empresa.com, grupocampestre.com" />
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Inicio de sesion Google"
          summary={`${settings.googleAuth.enabled ? "Habilitado" : "Deshabilitado"} - ${googleDomains || "sin dominios"}`}
        >
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <label className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
              <input
                type="checkbox"
                checked={settings.googleAuth.enabled}
                onChange={(event) => setSettings((value) => ({ ...value, googleAuth: { ...value.googleAuth, enabled: event.target.checked } }))}
              />
              <span className="text-sm">Habilitar Google</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Dominios permitidos</span>
              <Input value={googleDomains} onChange={(event) => setGoogleDomains(event.target.value)} placeholder="empresa.com, grupocampestre.com" />
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Conexion GitHub"
          summary={`${settings.githubIntegration.enabled ? "Habilitado" : "Deshabilitado"} - ${repositories.length} repositorios asociados`}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
              <input
                type="checkbox"
                checked={settings.githubIntegration.enabled}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, enabled: event.target.checked } }))}
              />
              <span className="text-sm">Habilitar integracion</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Modo de autenticacion</span>
              <select
                value={settings.githubIntegration.authMode}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, authMode: event.target.value as AppSettings["githubIntegration"]["authMode"] } }))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500"
              >
                <option value="token">Token personal / PAT</option>
                <option value="app">GitHub App</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Owner por defecto</span>
              <Input
                value={settings.githubIntegration.defaultOwner}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, defaultOwner: event.target.value } }))}
                placeholder="organizacion-o-usuario"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Variable del token</span>
              <Input
                value={settings.githubIntegration.tokenEnvVar}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, tokenEnvVar: event.target.value } }))}
                placeholder="GITHUB_TOKEN"
              />
              <p className="text-xs text-slate-500">El valor real del token debe vivir en el servidor, no en el navegador.</p>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">GitHub App ID</span>
              <Input
                value={settings.githubIntegration.appId}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, appId: event.target.value } }))}
                placeholder="123456"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Variable llave privada App</span>
              <Input
                value={settings.githubIntegration.privateKeyEnvVar}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, privateKeyEnvVar: event.target.value } }))}
                placeholder="GITHUB_PRIVATE_KEY"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Variable secreto webhook</span>
              <Input
                value={settings.githubIntegration.webhookSecretEnvVar}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, webhookSecretEnvVar: event.target.value } }))}
                placeholder="GITHUB_WEBHOOK_SECRET"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">GitHub API URL</span>
              <Input
                value={settings.githubIntegration.apiBaseUrl}
                onChange={(event) => setSettings((value) => ({ ...value, githubIntegration: { ...value.githubIntegration, apiBaseUrl: event.target.value } }))}
                placeholder="https://api.github.com"
              />
            </label>
            <div className="rounded-md border border-slate-800 p-3">
              <span className="text-sm text-slate-300">Webhook para GitHub</span>
              <code className="mt-2 block truncate rounded bg-slate-950 px-3 py-2 text-xs text-cyan-100">{webhookUrl}</code>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-800">
            <div className="border-b border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <Github className="h-5 w-5 text-cyan-300" />
                <h3 className="font-semibold">Repositorios por proyecto</h3>
              </div>
              <p className="mt-1 text-sm text-slate-400">Asocia repositorios al proyecto para visualizar estadisticas en el modulo GitHub.</p>
            </div>

            <div className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_1fr_140px_auto]">
              <label className="space-y-2">
                <span className="text-xs text-slate-400">Proyecto</span>
                <select
                  value={repositoryForm.projectCode}
                  onChange={(event) => setRepositoryForm((value) => ({ ...value, projectCode: event.target.value }))}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500"
                >
                  {projects.map((project) => <option key={project.code} value={project.code}>{project.code} - {project.name}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs text-slate-400">Owner</span>
                <Input value={repositoryForm.owner} onChange={(event) => setRepositoryForm((value) => ({ ...value, owner: event.target.value }))} placeholder="owner" />
              </label>
              <label className="space-y-2">
                <span className="text-xs text-slate-400">Repositorio</span>
                <Input value={repositoryForm.name} onChange={(event) => setRepositoryForm((value) => ({ ...value, name: event.target.value }))} placeholder="repo-name" />
              </label>
              <label className="space-y-2">
                <span className="text-xs text-slate-400">Branch</span>
                <Input value={repositoryForm.defaultBranch} onChange={(event) => setRepositoryForm((value) => ({ ...value, defaultBranch: event.target.value }))} placeholder="main" />
              </label>
              <Button type="button" onClick={addRepository} className="self-end"><Plus className="h-4 w-4" />Agregar</Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-950 text-xs text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Repositorio</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Commits</th>
                    <th className="px-4 py-3">PR abiertos</th>
                    <th className="px-4 py-3">Ultima sync</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {repositories.map((repo) => {
                    const project = projects.find((item) => item.code === repo.projectCode);
                    return (
                      <tr key={repo.id} className="border-t border-slate-800">
                        <td className="px-4 py-3">{repo.projectCode} <span className="text-slate-500">{project?.name}</span></td>
                        <td className="px-4 py-3 font-medium">{repo.owner}/{repo.name}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><GitBranch className="h-4 w-4 text-cyan-300" />{repo.defaultBranch}</span></td>
                        <td className="px-4 py-3">{repo.commits}</td>
                        <td className="px-4 py-3">{repo.openPullRequests}</td>
                        <td className="px-4 py-3 text-slate-400">{repo.lastSync}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => simulateSyncRepository(repo.id)} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" title="Sincronizar">
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => removeRepository(repo.id)} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {repositories.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Sin repositorios asociados.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Email para notificaciones"
          summary={`${settings.emailNotifications.enabled ? "Habilitado" : "Deshabilitado"} - ${settings.emailNotifications.host || "sin SMTP"}`}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
              <input
                type="checkbox"
                checked={settings.emailNotifications.enabled}
                onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, enabled: event.target.checked } }))}
              />
              <span className="text-sm">Habilitar email</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Servidor SMTP</span>
              <Input value={settings.emailNotifications.host} onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, host: event.target.value } }))} placeholder="smtp.office365.com" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Puerto</span>
              <Input type="number" value={settings.emailNotifications.port} onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, port: Number(event.target.value || 587) } }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Usuario SMTP</span>
              <Input value={settings.emailNotifications.user} onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, user: event.target.value } }))} placeholder="notificaciones@empresa.com" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Variable de entorno para clave</span>
              <Input value={settings.emailNotifications.passwordEnvVar} onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, passwordEnvVar: event.target.value } }))} placeholder="SMTP_PASSWORD" />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Correo remitente</span>
              <Input value={settings.emailNotifications.from} onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, from: event.target.value } }))} placeholder="DevOps Hub <notificaciones@empresa.com>" />
            </label>
            <label className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
              <input
                type="checkbox"
                checked={settings.emailNotifications.secure}
                onChange={(event) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, secure: event.target.checked } }))}
              />
              <span className="text-sm">Usar conexion segura</span>
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <NotificationToggle label="Asignacion de tareas" checked={settings.emailNotifications.notifyTaskAssignment} onChange={(checked) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, notifyTaskAssignment: checked } }))} />
            <NotificationToggle label="Deteccion de bug" checked={settings.emailNotifications.notifyBugDetected} onChange={(checked) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, notifyBugDetected: checked } }))} />
            <NotificationToggle label="Finalizacion de pruebas" checked={settings.emailNotifications.notifyTestFinished} onChange={(checked) => setSettings((value) => ({ ...value, emailNotifications: { ...value.emailNotifications, notifyTestFinished: checked } }))} />
          </div>
        </SettingsSection>

        <div className="flex justify-end">
          <Button disabled={loading}><Save className="h-4 w-4" />{loading ? "Guardando..." : "Guardar configuracion"}</Button>
        </div>
      </form>
      </>
      )}
    </AppShell>
  );
}

function SettingsSection({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <Card className="p-0">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-900"
      >
        <div className="min-w-0">
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="mt-1 truncate text-sm text-slate-400">{summary}</p>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition", collapsed && "-rotate-90")} />
      </button>
      {!collapsed && <div className="border-t border-slate-800 p-4">{children}</div>}
    </Card>
  );
}

function NotificationToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-slate-800 p-3">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
