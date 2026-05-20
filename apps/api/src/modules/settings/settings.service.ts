import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { AppSettings } from "./settings.types";

@Injectable()
export class SettingsService {
  private readonly settingsPath: string;

  constructor(private readonly config: ConfigService) {
    this.settingsPath = resolve(this.config.get("APP_SETTINGS_PATH", "storage/config/app-settings.json"));
  }

  getSettings(): AppSettings {
    const fromFile = this.readSettingsFile();
    return mergeSettings(this.defaults(), fromFile);
  }

  updateSettings(input: Partial<AppSettings>) {
    const current = this.getSettings();
    const next = mergeSettings(current, input);
    if (next.storage.provider === "local" && next.storage.localBasePath.trim()) {
      try {
        mkdirSync(resolve(next.storage.localBasePath), { recursive: true });
      } catch {
        // La ruta puede requerir permisos elevados en el servidor. Se guarda la configuracion
        // y la carga de adjuntos reportara el error si el proceso no puede escribir ahi.
      }
    }
    mkdirSync(dirname(this.settingsPath), { recursive: true });
    writeFileSync(this.settingsPath, JSON.stringify(next, null, 2), "utf8");
    return next;
  }

  getAllowedMicrosoftDomains() {
    return this.getSettings().microsoftAuth.allowedDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean);
  }

  isMicrosoftDomainAllowed(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();
    const allowed = this.getAllowedMicrosoftDomains();
    return Boolean(domain) && (allowed.length === 0 || allowed.includes(domain));
  }

  getAllowedGoogleDomains() {
    return this.getSettings().googleAuth.allowedDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean);
  }

  isGoogleDomainAllowed(email: string) {
    const domain = email.split("@")[1]?.toLowerCase();
    const allowed = this.getAllowedGoogleDomains();
    return Boolean(domain) && (allowed.length === 0 || allowed.includes(domain));
  }

  getLocalStoragePath() {
    return resolve(this.getSettings().storage.localBasePath);
  }

  ensureProjectStorageFolder(input: { projectCode?: string; projectName?: string }) {
    const settings = this.getSettings();
    const projectFolder = toSafeFolderName(input.projectCode || input.projectName || "project");
    if (settings.storage.provider === "sharepoint") {
      return {
        provider: "sharepoint" as const,
        folderName: projectFolder,
        path: `${settings.storage.sharePointFolderPath.replace(/^\/|\/$/g, "")}/${projectFolder}`
      };
    }
    const basePath = this.getLocalStoragePath();
    const projectPath = join(basePath, projectFolder);
    mkdirSync(projectPath, { recursive: true });
    return {
      provider: "local" as const,
      folderName: projectFolder,
      path: projectPath
    };
  }

  storeProjectFile(input: { projectCode?: string; projectName?: string }, file: Express.Multer.File) {
    const folder = this.ensureProjectStorageFolder(input);
    if (folder.provider !== "local") return folder;
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const absolutePath = join(folder.path, safeName);
    renameSync(file.path, absolutePath);
    return {
      ...folder,
      fileName: file.originalname,
      storedFileName: safeName,
      url: `/api/settings/storage/project-file/${encodeURIComponent(folder.folderName)}/${encodeURIComponent(safeName)}`,
      physicalPath: absolutePath,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  getProjectFilePath(projectFolder: string, fileName: string) {
    const folder = toSafeFolderName(projectFolder);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const basePath = this.getLocalStoragePath();
    const fullPath = resolve(basePath, folder, safeName);
    const allowedRoot = resolve(basePath, folder);
    if (!fullPath.startsWith(allowedRoot)) return null;
    return existsSync(fullPath) ? fullPath : null;
  }

  private readSettingsFile(): Partial<AppSettings> {
    if (!existsSync(this.settingsPath)) return {};
    return JSON.parse(readFileSync(this.settingsPath, "utf8")) as Partial<AppSettings>;
  }

  private defaults(): AppSettings {
    return {
      storage: {
        provider: this.config.get<AppSettings["storage"]["provider"]>("ATTACHMENT_STORAGE_PROVIDER", "local"),
        localBasePath: this.config.get("ATTACHMENT_LOCAL_BASE_PATH", "C:\\DatosApp"),
        sharePointSiteId: this.config.get("SHAREPOINT_SITE_ID", ""),
        sharePointDriveId: this.config.get("SHAREPOINT_DRIVE_ID", ""),
        sharePointFolderPath: this.config.get("SHAREPOINT_FOLDER_PATH", "DevOpsHub/Attachments")
      },
      microsoftAuth: {
        enabled: this.config.get("MICROSOFT_AUTH_ENABLED", "false") === "true",
        allowedDomains: this.config.get("MICROSOFT_ALLOWED_DOMAINS", "")
          .split(",")
          .map((domain: string) => domain.trim().toLowerCase())
          .filter(Boolean)
      },
      googleAuth: {
        enabled: this.config.get("GOOGLE_AUTH_ENABLED", "false") === "true",
        allowedDomains: this.config.get("GOOGLE_ALLOWED_DOMAINS", "")
          .split(",")
          .map((domain: string) => domain.trim().toLowerCase())
          .filter(Boolean)
      },
      emailNotifications: {
        enabled: this.config.get("EMAIL_NOTIFICATIONS_ENABLED", "false") === "true",
        host: this.config.get("SMTP_HOST", ""),
        port: Number(this.config.get("SMTP_PORT", 587)),
        secure: this.config.get("SMTP_SECURE", "false") === "true",
        user: this.config.get("SMTP_USER", ""),
        passwordEnvVar: this.config.get("SMTP_PASSWORD_ENV_VAR", "SMTP_PASSWORD"),
        from: this.config.get("SMTP_FROM", ""),
        notifyTaskAssignment: true,
        notifyBugDetected: true,
        notifyTestFinished: true
      },
      githubIntegration: {
        enabled: this.config.get("GITHUB_INTEGRATION_ENABLED", "false") === "true",
        authMode: this.config.get<"token" | "app">("GITHUB_AUTH_MODE", "token"),
        defaultOwner: this.config.get("GITHUB_DEFAULT_OWNER", ""),
        tokenEnvVar: this.config.get("GITHUB_TOKEN_ENV_VAR", "GITHUB_TOKEN"),
        appId: this.config.get("GITHUB_APP_ID", ""),
        privateKeyEnvVar: this.config.get("GITHUB_PRIVATE_KEY_ENV_VAR", "GITHUB_PRIVATE_KEY"),
        webhookSecretEnvVar: this.config.get("GITHUB_WEBHOOK_SECRET_ENV_VAR", "GITHUB_WEBHOOK_SECRET"),
        apiBaseUrl: this.config.get("GITHUB_API_BASE_URL", "https://api.github.com")
      }
    };
  }
}

function toSafeFolderName(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "project";
}

function mergeSettings(base: AppSettings, input: Partial<AppSettings>): AppSettings {
  return {
    storage: { ...base.storage, ...(input.storage ?? {}) },
    microsoftAuth: {
      ...base.microsoftAuth,
      ...(input.microsoftAuth ?? {}),
      allowedDomains: input.microsoftAuth?.allowedDomains ?? base.microsoftAuth.allowedDomains
    },
    googleAuth: {
      ...base.googleAuth,
      ...(input.googleAuth ?? {}),
      allowedDomains: input.googleAuth?.allowedDomains ?? base.googleAuth.allowedDomains
    },
    emailNotifications: { ...base.emailNotifications, ...(input.emailNotifications ?? {}) },
    githubIntegration: { ...base.githubIntegration, ...(input.githubIntegration ?? {}) }
  };
}
