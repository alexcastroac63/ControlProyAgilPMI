export type StorageProvider = "local" | "sharepoint";

export type AppSettings = {
  storage: {
    provider: StorageProvider;
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
