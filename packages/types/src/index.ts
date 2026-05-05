export type RoleName =
  | "SUPER_ADMIN"
  | "PORTFOLIO_MANAGER"
  | "PROJECT_MANAGER"
  | "SCRUM_MASTER"
  | "PRODUCT_OWNER"
  | "DEVELOPER"
  | "QA"
  | "VIEWER"
  | "EXECUTIVE";

export type WorkItemType = "EPIC" | "FEATURE" | "STORY" | "TASK" | "BUG" | "SPIKE";
export type Priority = "LOWEST" | "LOW" | "MEDIUM" | "HIGH" | "HIGHEST" | "CRITICAL";
export type ProjectStatus = "PLANNED" | "ACTIVE" | "PAUSED" | "CANCELLED" | "CLOSED";

export interface DashboardMetric {
  label: string;
  value: string;
  trend: number;
}
