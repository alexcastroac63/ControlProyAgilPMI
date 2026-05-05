import { create } from "zustand";

interface SessionState {
  collapsed: boolean;
  toggleSidebar: () => void;
  setToken: (token: string, expiresAt?: string, email?: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useSessionStore = create<SessionState>((set) => ({
  collapsed: false,
  toggleSidebar: () => set((state) => ({ collapsed: !state.collapsed })),
  setToken: (token, expiresAt, email) => {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("accessTokenExpiresAt", expiresAt ?? getJwtExpiry(token) ?? new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString());
    if (email) localStorage.setItem("currentUserEmail", email.toLowerCase());
  },
  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("accessTokenExpiresAt");
    localStorage.removeItem("currentUserEmail");
  },
  isAuthenticated: () => {
    const token = localStorage.getItem("accessToken");
    const expiresAt = localStorage.getItem("accessTokenExpiresAt");
    if (!token || !expiresAt) return false;
    if (new Date(expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("accessTokenExpiresAt");
      return false;
    }
    return true;
  }
}));

function getJwtExpiry(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000).toISOString() : undefined;
  } catch {
    return undefined;
  }
}
