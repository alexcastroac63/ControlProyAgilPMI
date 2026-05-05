export type UserAccessContext = {
  email: string;
  role: string;
  restrictToAssignedProjects: boolean;
  onlyActiveSprint: boolean;
  isManager: boolean;
};

type PersonRecord = {
  email?: string;
  accessRole?: string;
};

type ProjectLike = {
  staffing?: Array<{ email?: string }>;
  projectManager?: string;
};

type SprintLike = {
  startDate?: string;
  endDate?: string;
};

const managerRoles = new Set(["Super Admin", "Project Manager", "Portfolio Manager"]);

export function getUserAccessContext(): UserAccessContext {
  const email = localStorage.getItem("currentUserEmail")?.toLowerCase() || "admin@devhub.local";
  const people = readArray<PersonRecord>("devhub.people");
  const person = people.find((item) => item.email?.toLowerCase() === email);
  const role = person?.accessRole || (email === "admin@devhub.local" ? "Super Admin" : "Viewer");
  const restrictions = readRecord<Record<string, { restrictToAssignedProjects?: boolean; onlyActiveSprint?: boolean }>>("devhub.roleRestrictions");
  const roleRestriction = restrictions[role] ?? {};
  const isManager = managerRoles.has(role);
  return {
    email,
    role,
    restrictToAssignedProjects: !isManager && Boolean(roleRestriction.restrictToAssignedProjects),
    onlyActiveSprint: !isManager && Boolean(roleRestriction.onlyActiveSprint),
    isManager
  };
}

export function canSeeProject(project: ProjectLike, access: UserAccessContext) {
  if (!access.restrictToAssignedProjects) return true;
  return Boolean(project.staffing?.some((member) => member.email?.toLowerCase() === access.email));
}

export function isActiveSprint(sprint: SprintLike) {
  if (!sprint.startDate || !sprint.endDate) return false;
  const today = new Date();
  const start = new Date(`${sprint.startDate}T00:00:00`);
  const end = new Date(`${sprint.endDate}T23:59:59`);
  return today >= start && today <= end;
}

function readArray<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as T[];
  } catch {
    return [];
  }
}

function readRecord<T>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") as T;
  } catch {
    return {} as T;
  }
}
