"use client";

import { Button, Input } from "@devhub/ui";
import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

type OAuthProvider = {
  enabled: boolean;
  configured: boolean;
  missing: string[];
  redirectUri: string;
  allowedDomains: string[];
};

export default function LoginPage() {
  const setToken = useSessionStore((state) => state.setToken);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "microsoft" | null>(null);
  const [providers, setProviders] = useState<{ google: OAuthProvider; microsoft: OAuthProvider } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) window.location.replace("/dashboard");
  }, [isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") !== "success") return;
    setOauthLoading("microsoft");
    void api<{ accessToken: string; expiresAt: string; user?: { email?: string } }>("/auth/bootstrap")
      .then((result) => {
        setToken(result.accessToken, result.expiresAt, result.user?.email);
        window.location.replace("/dashboard");
      })
      .catch(() => {
        toast.error("No se pudo completar el inicio de sesion federado");
        window.history.replaceState({}, "", "/login");
      })
      .finally(() => setOauthLoading(null));
  }, [setToken]);

  useEffect(() => {
    void api<{ google: OAuthProvider; microsoft: OAuthProvider }>("/auth/providers")
      .then(setProviders)
      .catch(() => setProviders(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    if (!email || !password) {
      toast.error("Ingresa usuario y contrasena");
      return;
    }
    if (!email.includes("@") || password.length < 8) {
      toast.error("Credenciales no cumplen el formato requerido");
      return;
    }

    setLoading(true);
    try {
      const result = await api<{ accessToken: string; expiresAt: string; user?: { email?: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(result.accessToken, result.expiresAt, result.user?.email ?? email);
      window.location.replace("/dashboard");
    } catch {
      toast.error("Credenciales invalidas o usuario bloqueado");
    } finally {
      setLoading(false);
    }
  }

  async function startFederatedLogin(provider: "google" | "microsoft") {
    const providerStatus = providers?.[provider];
    if (providerStatus && (!providerStatus.enabled || !providerStatus.configured)) {
      const providerName = provider === "google" ? "Google" : "Microsoft";
      const reason = !providerStatus.enabled ? "no esta habilitado" : `no esta configurado. Falta: ${providerStatus.missing.join(", ")}`;
      toast.error(`Login ${providerName} ${reason}`);
      return;
    }
    setOauthLoading(provider);
    try {
      const result = await api<{ url: string }>(`/auth/${provider}/url`);
      window.location.href = result.url;
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : provider === "google" ? "Login Google no disponible" : "Login Microsoft no disponible";
      toast.error(message);
      setOauthLoading(null);
    }
  }

  function isProviderDisabled(provider: "google" | "microsoft") {
    const status = providers?.[provider];
    return oauthLoading !== null || Boolean(status && (!status.enabled || !status.configured));
  }

  function getProviderTitle(provider: "google" | "microsoft") {
    const status = providers?.[provider];
    if (!status) return "Validando configuracion";
    if (!status.enabled) return "Proveedor deshabilitado en configuracion";
    if (!status.configured) return `Falta configurar: ${status.missing.join(", ")}`;
    return `Redirect URI: ${status.redirectUri}`;
  }

  return (
    <main className="grid min-h-svh place-items-center overflow-hidden bg-[#050910] px-3 py-4 text-slate-100 sm:px-4 sm:py-8">
      <section className="w-full max-w-[min(28rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-700/80 bg-[#24272c] px-5 py-6 shadow-2xl sm:px-8 sm:py-9">
        <div className="mb-6 text-center sm:mb-7">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full border border-slate-600 bg-[#1c2026] sm:h-28 sm:w-28">
            <ShieldCheck className="h-11 w-11 text-white sm:h-16 sm:w-16" strokeWidth={1.7} />
          </div>
          <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-slate-400">Accede para continuar al dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4 sm:space-y-5" autoComplete="on">
          <label className="block space-y-2">
            <span className="text-base font-semibold text-slate-200">Nombre de usuario</span>
            <Input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="nombre de usuario"
              className="h-12 border-slate-600 bg-slate-700/80 text-base sm:h-14"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-base font-semibold text-slate-200">Contrasena</span>
            <div className="flex overflow-hidden rounded-md border border-slate-600 bg-slate-700/80 focus-within:border-orange-400">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                minLength={8}
                placeholder="contrasena"
                className="h-12 min-w-0 flex-1 bg-transparent px-4 text-base text-slate-100 outline-none placeholder:text-slate-400 sm:h-14"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="grid h-12 w-12 shrink-0 place-items-center border-l border-slate-600 bg-[#22252a] text-slate-200 sm:h-14 sm:w-14"
                aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          <Button disabled={loading} className="h-12 w-full rounded-md bg-[#ef9a00] text-base font-bold text-white hover:bg-[#d98900] sm:h-14">
            {loading ? "Validando..." : "Entrar"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          <span>o ingresar con</span>
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isProviderDisabled("google")}
            title={getProviderTitle("google")}
            onClick={() => startFederatedLogin("google")}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800/70 px-3 text-sm font-semibold text-slate-100 transition hover:border-orange-300 hover:bg-slate-700 disabled:opacity-60"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-slate-900">G</span>
            {oauthLoading === "google" ? "Conectando..." : "Google"}
          </button>
          <button
            type="button"
            disabled={isProviderDisabled("microsoft")}
            title={getProviderTitle("microsoft")}
            onClick={() => startFederatedLogin("microsoft")}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-slate-600 bg-slate-800/70 px-3 text-sm font-semibold text-slate-100 transition hover:border-orange-300 hover:bg-slate-700 disabled:opacity-60"
          >
            <Mail className="h-4 w-4" />
            {oauthLoading === "microsoft" ? "Conectando..." : "Microsoft"}
          </button>
        </div>

        {providers && (
          <div className="mt-4 rounded-md border border-slate-700 bg-slate-900/60 p-3 text-xs text-slate-400">
            {(["google", "microsoft"] as const).map((provider) => {
              const status = providers[provider];
              const name = provider === "google" ? "Google" : "Microsoft";
              const state = !status.enabled ? "deshabilitado" : status.configured ? "listo" : `incompleto: ${status.missing.join(", ")}`;
              return <div key={provider}>{name}: {state}</div>;
            })}
          </div>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          La sesion vence automaticamente despues de 3 horas.
        </p>
      </section>
    </main>
  );
}
