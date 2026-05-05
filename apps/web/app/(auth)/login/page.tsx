"use client";

import { Button, Input } from "@devhub/ui";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useSessionStore } from "@/store/session";

export default function LoginPage() {
  const setToken = useSessionStore((state) => state.setToken);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) window.location.replace("/dashboard");
  }, [isAuthenticated]);

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

        <p className="mt-5 text-center text-xs text-slate-500">
          La sesion vence automaticamente despues de 3 horas.
        </p>
      </section>
    </main>
  );
}
