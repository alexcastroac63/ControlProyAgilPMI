"use client";

import { Button, cn } from "@devhub/ui";
import { BarChart3, Bell, Boxes, GitPullRequest, KanbanSquare, ListTodo, LogOut, Menu, Moon, Search, Settings, ShieldCheck, Sun, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useSessionStore } from "@/store/session";

const nav = [
  { href: "/dashboard", label: "Dashboard", mobile: "Inicio", icon: BarChart3 },
  { href: "/projects", label: "Projects", mobile: "Projects", icon: Boxes },
  { href: "/backlog", label: "Backlog", mobile: "Backlog", icon: ListTodo },
  { href: "/board", label: "Scrum Board", mobile: "Board", icon: KanbanSquare },
  { href: "/qa", label: "QA", mobile: "QA", icon: ShieldCheck },
  { href: "/github", label: "GitHub", mobile: "GitHub", icon: GitPullRequest },
  { href: "/teams", label: "Teams", mobile: "Teams", icon: Users },
  { href: "/settings", label: "Configuracion", mobile: "Config", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, logout } = useSessionStore();
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const restoredFromHistory = navigation?.type === "back_forward";
    const reloadKey = `devhub.historyReloaded:${window.location.pathname}${window.location.search}`;
    if (restoredFromHistory && sessionStorage.getItem(reloadKey) !== "1") {
      sessionStorage.setItem(reloadKey, "1");
      window.location.reload();
      return;
    }
    sessionStorage.removeItem(reloadKey);

    const savedTheme = localStorage.getItem("devhub.theme") === "light" ? "light" : "dark";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("theme-light", savedTheme === "light");

    let timer: number | undefined;
    let fallbackTimer: number | undefined;

    const clearSessionTimer = () => {
      if (timer) window.clearTimeout(timer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      timer = undefined;
      fallbackTimer = undefined;
    };

    const validateSession = () => {
      clearSessionTimer();
      if (!isAuthenticated()) {
        if (window.location.pathname !== "/login") window.location.replace("/login");
        return;
      }

      const expiresAt = localStorage.getItem("accessTokenExpiresAt");
      const expiresAtTime = new Date(expiresAt ?? 0).getTime();
      const timeout = expiresAtTime - Date.now();
      if (!Number.isFinite(timeout) || timeout <= 0) {
        logout();
        window.location.replace("/login?expired=1");
        return;
      }
      timer = window.setTimeout(() => {
        logout();
        window.location.replace("/login?expired=1");
      }, timeout);
    };

    const validateVisibleSession = () => {
      if (document.visibilityState === "visible") validateSession();
    };

    validateSession();
    fallbackTimer = window.setTimeout(validateSession, 800);
    window.addEventListener("pageshow", validateSession);
    window.addEventListener("focus", validateSession);
    window.addEventListener("popstate", validateSession);
    document.addEventListener("visibilitychange", validateVisibleSession);

    return () => {
      clearSessionTimer();
      window.removeEventListener("pageshow", validateSession);
      window.removeEventListener("focus", validateSession);
      window.removeEventListener("popstate", validateSession);
      document.removeEventListener("visibilitychange", validateVisibleSession);
    };
  }, [isAuthenticated, logout]);

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    document.body.classList.toggle("mobile-menu-open", menuOpen);
    return () => document.body.classList.remove("mobile-menu-open");
  }, [menuOpen]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("devhub.theme", nextTheme);
    document.documentElement.classList.toggle("theme-light", nextTheme === "light");
  }

  function signOut() {
    logout();
    window.location.replace("/login");
  }

  return (
    <div className="app-shell min-h-svh md:grid md:h-screen md:grid-cols-[20rem_minmax(0,1fr)] md:overflow-hidden">
      {menuOpen && <button type="button" aria-label="Cerrar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />}

      <aside className={cn("app-sidebar fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-80 -translate-x-full flex-col border-r shadow-2xl transition-transform md:static md:h-screen md:w-auto md:max-w-none md:translate-x-0 md:shadow-none", menuOpen && "translate-x-0")}>
        <div className="flex h-24 shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500 text-xl font-black text-white">D</div>
            <div className="min-w-0">
              <div className="truncate text-lg font-black text-slate-100">DevOps Hub</div>
              <div className="truncate text-xs text-slate-400">Project management</div>
            </div>
          </div>
          <button type="button" onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl text-slate-300 hover:bg-slate-800 md:hidden" aria-label="Cerrar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-sm font-semibold text-white">A</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-100">ALEX CASTRO</div>
            <div className="truncate text-xs text-slate-400">Administrador</div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <a key={item.href} href={item.href} className={cn("app-nav-link flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold", active && "app-nav-link-active")}>
                <Icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-800 p-4">
          <Button variant="ghost" className="h-11 rounded-xl bg-slate-800 px-3" onClick={toggleTheme}>
            {theme === "dark" ? <Moon className="h-4 w-4 text-sky-300" /> : <Sun className="h-4 w-4 text-orange-400" />}
          </Button>
          <Button variant="ghost" className="h-11 rounded-xl bg-slate-800 px-3" onClick={signOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </aside>

      <main className="min-w-0 md:h-screen md:overflow-hidden md:p-7">
        <section className="app-main-panel flex min-h-svh flex-col md:h-[calc(100vh-3.5rem)] md:min-h-0 md:overflow-hidden md:rounded-3xl md:border">
          <header className="app-topbar sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-3 md:h-20 md:rounded-t-3xl md:px-5">
            <button type="button" onClick={() => setMenuOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-900 text-slate-100 md:hidden" aria-label="Abrir menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 text-slate-400 md:max-w-xl">
              <Search className="h-4 w-4 shrink-0" />
              <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar..." />
            </div>
            <Button variant="ghost" className="h-11 w-11 shrink-0 px-0">
              <Bell className="h-5 w-5" />
            </Button>
          </header>

          <div className="mobile-content min-h-0 min-w-0 flex-1 overflow-auto p-3 md:p-6">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
