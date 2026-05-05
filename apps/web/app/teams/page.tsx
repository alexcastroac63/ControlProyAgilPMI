"use client";

import { Button, Card, Input, cn } from "@devhub/ui";
import { BarChart3, Check, Code2, Crown, KeyRound, Mail, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { createId } from "@/lib/ids";

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  defaultRole: string;
  accessRole: string;
  profileIcon: string;
  department: string;
  status: "ACTIVE" | "INACTIVE";
  capacity: number;
  skills: string[];
};

type PermissionAction = "read" | "write" | "delete";
type RolePolicy = Record<string, Record<PermissionAction, boolean>>;
type RoleRestriction = {
  restrictToAssignedProjects: boolean;
  onlyActiveSprint: boolean;
};

const peopleKey = "devhub.people";
const policyKey = "devhub.rolePolicies";
const rolesKey = "devhub.accessRoles";
const restrictionsKey = "devhub.roleRestrictions";
const accessRoles = ["Super Admin", "Portfolio Manager", "Project Manager", "Scrum Master", "Product Owner", "Developer", "QA", "Viewer", "Executive"];
const operationalRoles = ["Encargado del proyecto", "Product Owner", "Scrum Master", "Desarrollador", "QA", "DevOps", "UX/UI", "Viewer"];
const modules = ["Portafolio", "Proyectos", "Backlog", "Sprints", "Board", "QA", "Personas", "Reportes", "Notificaciones", "GitHub"];
const icons = ["user", "code", "shield", "crown", "chart", "team"];

const demoPeople: Person[] = [
  { id: "person-1", firstName: "Alex", lastName: "Admin", email: "admin@devhub.local", defaultRole: "Encargado del proyecto", accessRole: "Super Admin", profileIcon: "crown", department: "Tecnologia", status: "ACTIVE", capacity: 40, skills: ["Arquitectura", "NestJS", "Next.js"] },
  { id: "person-2", firstName: "Diana", lastName: "Developer", email: "diana.dev@devhub.local", defaultRole: "Desarrollador", accessRole: "Developer", profileIcon: "code", department: "Tecnologia", status: "ACTIVE", capacity: 100, skills: ["React", "TypeScript", "Prisma"] },
  { id: "person-3", firstName: "Marco", lastName: "Frontend", email: "marco.frontend@devhub.local", defaultRole: "Desarrollador", accessRole: "Developer", profileIcon: "code", department: "Tecnologia", status: "ACTIVE", capacity: 80, skills: ["UX", "Tailwind", "Next.js"] },
  { id: "person-4", firstName: "Sofia", lastName: "QA", email: "sofia.qa@devhub.local", defaultRole: "QA", accessRole: "QA", profileIcon: "shield", department: "QA", status: "ACTIVE", capacity: 60, skills: ["Playwright", "API Testing"] }
];

export default function TeamsPage() {
  const [section, setSection] = useState<"users" | "roles">("users");
  const [people, setPeople] = useState<Person[]>(demoPeople);
  const [roleList, setRoleList] = useState<string[]>(accessRoles);
  const [policies, setPolicies] = useState<Record<string, RolePolicy>>(() => buildDefaultPolicies());
  const [restrictions, setRestrictions] = useState<Record<string, RoleRestriction>>(() => buildDefaultRestrictions());
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(demoPeople[0].id);
  const [selectedRole, setSelectedRole] = useState("Project Manager");
  const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", defaultRole: "Desarrollador", accessRole: "Viewer" });
  const [newRoleName, setNewRoleName] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<Person | null>(null);

  useEffect(() => {
    const savedPeople = localStorage.getItem(peopleKey);
    const savedPolicies = localStorage.getItem(policyKey);
    const savedRoles = localStorage.getItem(rolesKey);
    const savedRestrictions = localStorage.getItem(restrictionsKey);
    if (savedPeople) setPeople((JSON.parse(savedPeople) as Person[]).map(normalizePerson));
    else localStorage.setItem(peopleKey, JSON.stringify(demoPeople));
    if (savedRoles) setRoleList(JSON.parse(savedRoles));
    else localStorage.setItem(rolesKey, JSON.stringify(accessRoles));
    if (savedPolicies) setPolicies(JSON.parse(savedPolicies));
    else localStorage.setItem(policyKey, JSON.stringify(buildDefaultPolicies()));
    if (savedRestrictions) setRestrictions(JSON.parse(savedRestrictions));
    else localStorage.setItem(restrictionsKey, JSON.stringify(buildDefaultRestrictions()));
  }, []);

  useEffect(() => {
    localStorage.setItem(peopleKey, JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem(policyKey, JSON.stringify(policies));
  }, [policies]);

  useEffect(() => {
    localStorage.setItem(rolesKey, JSON.stringify(roleList));
  }, [roleList]);

  useEffect(() => {
    localStorage.setItem(restrictionsKey, JSON.stringify(restrictions));
  }, [restrictions]);

  const filteredUsers = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return people;
    return people.filter((person) => `${person.firstName} ${person.lastName} ${person.email} ${person.accessRole} ${person.defaultRole}`.toLowerCase().includes(term));
  }, [people, query]);

  const selectedUser = people.find((person) => person.id === selectedUserId) ?? people[0];

  function updateUser(id: string, patch: Partial<Person>) {
    setPeople((current) => current.map((person) => (person.id === id ? { ...person, ...patch } : person)));
    toast.success("Usuario actualizado");
  }

  function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = newUser.email.toLowerCase().trim();
    if (!newUser.firstName.trim() || !newUser.lastName.trim() || !email) {
      toast.error("Completa nombre, apellido y correo");
      return;
    }
    if (people.some((person) => person.email === email)) {
      toast.error("Ya existe un usuario con ese correo");
      return;
    }
    const person: Person = {
      id: createId("person"),
      firstName: newUser.firstName.trim(),
      lastName: newUser.lastName.trim(),
      email,
      defaultRole: newUser.defaultRole,
      accessRole: newUser.accessRole,
      profileIcon: "user",
      department: "Tecnologia",
      status: "ACTIVE",
      capacity: 100,
      skills: []
    };
    setPeople((current) => [person, ...current]);
    setSelectedUserId(person.id);
    setNewUser({ firstName: "", lastName: "", email: "", defaultRole: "Desarrollador", accessRole: "Viewer" });
    setShowCreateUser(false);
    toast.success("Usuario creado");
  }

  function saveEditingUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;
    const email = editingUser.email.toLowerCase().trim();
    if (!editingUser.firstName.trim() || !editingUser.lastName.trim() || !email) {
      toast.error("Completa nombre, apellido y correo");
      return;
    }
    if (people.some((person) => person.email === email && person.id !== editingUser.id)) {
      toast.error("Ya existe otro usuario con ese correo");
      return;
    }
    setPeople((current) => current.map((person) => (person.id === editingUser.id ? { ...editingUser, email } : person)));
    setEditingUser(null);
    toast.success("Usuario actualizado");
  }

  function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const role = newRoleName.trim();
    if (!role) {
      toast.error("Ingresa nombre del perfil");
      return;
    }
    if (roleList.includes(role)) {
      toast.error("El perfil ya existe");
      return;
    }
    setRoleList((current) => [...current, role]);
    setPolicies((current) => ({ ...current, [role]: buildEmptyPolicy() }));
    setRestrictions((current) => ({ ...current, [role]: { restrictToAssignedProjects: true, onlyActiveSprint: false } }));
    setSelectedRole(role);
    setNewRoleName("");
    toast.success("Perfil creado");
  }

  function deleteRole(role: string) {
    const assignedUsers = people.filter((person) => person.accessRole === role);
    if (assignedUsers.length) {
      setSelectedRole(role);
      toast.error("No se puede eliminar un perfil con usuarios asociados");
      return;
    }
    const nextRoles = roleList.filter((item) => item !== role);
    setRoleList(nextRoles);
    setPolicies((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
    setRestrictions((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
    setSelectedRole(nextRoles[0] ?? "Viewer");
    toast.success("Perfil eliminado");
  }

  function togglePermission(module: string, action: PermissionAction) {
    setPolicies((current) => ({
      ...current,
      [selectedRole]: {
        ...current[selectedRole],
        [module]: {
          ...current[selectedRole]?.[module],
          [action]: !current[selectedRole]?.[module]?.[action]
        }
      }
    }));
  }

  function updateRestriction(patch: Partial<RoleRestriction>) {
    setRestrictions((current) => ({
      ...current,
      [selectedRole]: { ...(current[selectedRole] ?? { restrictToAssignedProjects: false, onlyActiveSprint: false }), ...patch }
    }));
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Administracion de usuarios, perfiles y permisos</h1>
          <p className="mt-1 text-sm text-slate-400">Usuarios con rol asignado y roles con permisos por modulo.</p>
        </div>
        <div className="flex h-10 min-w-80 items-center gap-3 rounded-md border border-slate-800 bg-slate-950 px-3 text-slate-400">
          <Search className="h-4 w-4" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Buscar usuario o rol" />
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Button variant={section === "users" ? "default" : "secondary"} onClick={() => setSection("users")}><Users className="h-4 w-4" />Administracion de usuarios</Button>
        <Button variant={section === "roles" ? "default" : "secondary"} onClick={() => setSection("roles")}><KeyRound className="h-4 w-4" />Perfiles y permisos</Button>
      </div>

      {section === "users" ? (
        <section>
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 p-4">
              <h2 className="text-lg font-medium">Usuarios</h2>
              <Button variant="secondary" onClick={() => setShowCreateUser(true)}>Agregar usuario</Button>
            </div>
            <div className="divide-y divide-slate-900">
              {filteredUsers.map((person) => (
                <button key={person.id} onClick={() => setSelectedUserId(person.id)} onDoubleClick={() => setEditingUser(person)} className={cn("grid w-full gap-3 p-4 text-left hover:bg-slate-900 md:grid-cols-[1fr_180px_180px]", selectedUserId === person.id && "bg-cyan-500/10")}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-md bg-slate-900 text-cyan-300"><ProfileIcon name={person.profileIcon} className="h-5 w-5" /></div>
                    <div>
                      <div className="font-medium">{person.firstName} {person.lastName}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><Mail className="h-3 w-3" />{person.email}</div>
                    </div>
                  </div>
                  <span className="text-sm text-slate-300">{person.defaultRole}</span>
                  <span className="text-sm text-cyan-300">{person.accessRole}</span>
                </button>
              ))}
            </div>
          </Card>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <Card className="p-0">
            <div className="border-b border-slate-800 p-4">
              <h2 className="text-lg font-medium">Roles</h2>
            </div>
            <form onSubmit={createRole} className="grid gap-2 border-b border-slate-800 p-4">
              <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Nuevo perfil" />
              <Button type="submit" variant="secondary">Crear perfil</Button>
            </form>
            <div className="divide-y divide-slate-900">
              {roleList.map((role) => (
                <button key={role} onClick={() => setSelectedRole(role)} className={cn("flex w-full items-center justify-between p-4 text-left hover:bg-slate-900", selectedRole === role && "bg-cyan-500/10 text-cyan-300")}>
                  <span>{role}</span>
                  <KeyRound className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">{selectedRole}</h2>
                <p className="mt-1 text-sm text-slate-400">Selecciona permisos de lectura, escritura o eliminacion por elemento.</p>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-cyan-300" />
                <Button type="button" variant="secondary" onClick={() => deleteRole(selectedRole)}>Eliminar perfil</Button>
              </div>
            </div>
            <div className="mb-4 rounded-md border border-slate-800 p-3">
              <div className="mb-2 text-sm font-medium">Usuarios asociados ({people.filter((person) => person.accessRole === selectedRole).length})</div>
              <div className="flex flex-wrap gap-2">
                {people.filter((person) => person.accessRole === selectedRole).length === 0 && <span className="text-sm text-slate-500">Sin usuarios asociados</span>}
                {people.filter((person) => person.accessRole === selectedRole).map((person) => (
                  <span key={person.id} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">{person.firstName} {person.lastName}</span>
                ))}
              </div>
            </div>
            <div className="mb-4 grid gap-3 rounded-md border border-slate-800 p-3 md:grid-cols-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(restrictions[selectedRole]?.restrictToAssignedProjects)}
                  disabled={["Super Admin", "Project Manager", "Portfolio Manager"].includes(selectedRole)}
                  onChange={(event) => updateRestriction({ restrictToAssignedProjects: event.target.checked })}
                  className="h-4 w-4 accent-cyan-400"
                />
                <span className="text-sm">Solo ver proyectos asignados</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(restrictions[selectedRole]?.onlyActiveSprint)}
                  disabled={["Super Admin", "Project Manager", "Portfolio Manager"].includes(selectedRole)}
                  onChange={(event) => updateRestriction({ onlyActiveSprint: event.target.checked })}
                  className="h-4 w-4 accent-cyan-400"
                />
                <span className="text-sm">Solo ver sprint activo</span>
              </label>
              <p className="text-xs text-slate-500 md:col-span-2">Estas restricciones no aplican a Super Admin, Project Manager ni Portfolio Manager.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr><th className="py-3">Elemento</th><th>Lectura</th><th>Escritura</th><th>Eliminacion</th></tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module} className="border-b border-slate-900">
                      <td className="py-3 font-medium">{module}</td>
                      {(["read", "write", "delete"] as PermissionAction[]).map((action) => (
                        <td key={action}>
                          <input type="checkbox" checked={Boolean(policies[selectedRole]?.[module]?.[action])} onChange={() => togglePermission(module, action)} className="h-4 w-4 accent-cyan-400" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {showCreateUser && (
        <UserModal title="Crear usuario" onClose={() => setShowCreateUser(false)}>
          <form onSubmit={createUser} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={newUser.firstName} onChange={(event) => setNewUser((value) => ({ ...value, firstName: event.target.value }))} placeholder="Nombre" />
              <Input value={newUser.lastName} onChange={(event) => setNewUser((value) => ({ ...value, lastName: event.target.value }))} placeholder="Apellido" />
            </div>
            <Input value={newUser.email} onChange={(event) => setNewUser((value) => ({ ...value, email: event.target.value }))} type="email" placeholder="correo@empresa.com" />
            <div className="grid gap-3 md:grid-cols-2">
              <select value={newUser.defaultRole} onChange={(event) => setNewUser((value) => ({ ...value, defaultRole: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                {operationalRoles.map((role) => <option key={role}>{role}</option>)}
              </select>
              <select value={newUser.accessRole} onChange={(event) => setNewUser((value) => ({ ...value, accessRole: event.target.value }))} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                {roleList.map((role) => <option key={role}>{role}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateUser(false)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </UserModal>
      )}

      {editingUser && (
        <UserModal title="Editar usuario" onClose={() => setEditingUser(null)}>
          <form onSubmit={saveEditingUser} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={editingUser.firstName} onChange={(event) => setEditingUser((value) => value ? { ...value, firstName: event.target.value } : value)} placeholder="Nombre" />
              <Input value={editingUser.lastName} onChange={(event) => setEditingUser((value) => value ? { ...value, lastName: event.target.value } : value)} placeholder="Apellido" />
            </div>
            <Input value={editingUser.email} onChange={(event) => setEditingUser((value) => value ? { ...value, email: event.target.value } : value)} type="email" placeholder="correo@empresa.com" />
            <div className="grid gap-3 md:grid-cols-2">
              <select value={editingUser.defaultRole} onChange={(event) => setEditingUser((value) => value ? { ...value, defaultRole: event.target.value } : value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                {operationalRoles.map((role) => <option key={role}>{role}</option>)}
              </select>
              <select value={editingUser.accessRole} onChange={(event) => setEditingUser((value) => value ? { ...value, accessRole: event.target.value } : value)} className="h-10 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-cyan-500">
                {roleList.map((role) => <option key={role}>{role}</option>)}
              </select>
            </div>
            <div>
              <div className="mb-2 text-xs text-slate-400">Icono de perfil</div>
              <div className="grid grid-cols-6 gap-2">
                {icons.map((icon) => (
                  <button key={icon} type="button" onClick={() => setEditingUser((value) => value ? { ...value, profileIcon: icon } : value)} className={cn("grid h-10 place-items-center rounded-md border border-slate-800 bg-slate-950 text-slate-400", editingUser.profileIcon === icon && "border-cyan-500 bg-cyan-500/10 text-cyan-300")}>
                    <ProfileIcon name={icon} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </UserModal>
      )}
    </AppShell>
  );
}

function ProfileIcon({ name, className }: { name?: string; className?: string }) {
  if (name === "code") return <Code2 className={className} />;
  if (name === "shield") return <ShieldCheck className={className} />;
  if (name === "crown") return <Crown className={className} />;
  if (name === "chart") return <BarChart3 className={className} />;
  if (name === "team") return <Users className={className} />;
  return <UserRound className={className} />;
}

function UserModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur">
      <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

function buildDefaultPolicies() {
  const policies = Object.fromEntries(accessRoles.map((role) => [role, buildEmptyPolicy()])) as Record<string, RolePolicy>;
  for (const module of modules) {
    policies["Super Admin"][module] = { read: true, write: true, delete: true };
    policies["Viewer"][module] = { read: true, write: false, delete: false };
  }
  for (const module of ["Proyectos", "Backlog", "Sprints", "Board", "Reportes"]) {
    policies["Project Manager"][module] = { read: true, write: true, delete: module !== "Reportes" };
    policies["Scrum Master"][module] = { read: true, write: true, delete: false };
    policies["Product Owner"][module] = { read: true, write: ["Backlog", "Sprints"].includes(module), delete: false };
  }
  for (const module of ["Backlog", "Board", "GitHub"]) policies["Developer"][module] = { read: true, write: true, delete: false };
  for (const module of ["QA", "Board", "Reportes"]) policies["QA"][module] = { read: true, write: module !== "Reportes", delete: false };
  for (const module of ["Portafolio", "Proyectos", "Reportes"]) policies["Portfolio Manager"][module] = { read: true, write: true, delete: module !== "Reportes" };
  for (const module of ["Portafolio", "Proyectos", "Reportes"]) policies["Executive"][module] = { read: true, write: false, delete: false };
  return policies;
}

function buildEmptyPolicy(): RolePolicy {
  return Object.fromEntries(modules.map((module) => [module, { read: false, write: false, delete: false }])) as RolePolicy;
}

function buildDefaultRestrictions() {
  return Object.fromEntries(accessRoles.map((role) => [
    role,
    {
      restrictToAssignedProjects: !["Super Admin", "Project Manager", "Portfolio Manager"].includes(role),
      onlyActiveSprint: ["Developer", "QA", "Viewer"].includes(role)
    }
  ])) as Record<string, RoleRestriction>;
}

function normalizePerson(person: Person) {
  return {
    ...person,
    accessRole: person.accessRole ?? roleToAccessRole(person.defaultRole),
    profileIcon: person.profileIcon ?? "user"
  };
}

function roleToAccessRole(role: string) {
  if (role === "Encargado del proyecto") return "Project Manager";
  if (role === "Desarrollador") return "Developer";
  if (role === "QA") return "QA";
  return role || "Viewer";
}
