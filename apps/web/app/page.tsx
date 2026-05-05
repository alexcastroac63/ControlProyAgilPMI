"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const expiresAt = localStorage.getItem("accessTokenExpiresAt");
    const isValidSession = Boolean(token && expiresAt && new Date(expiresAt).getTime() > Date.now());
    window.location.replace(isValidSession ? "/dashboard" : "/login");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#050910] px-4 text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-8 py-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-orange-500 text-xl font-black text-white">D</div>
        <p className="text-sm text-slate-300">Cargando DevOps Hub...</p>
      </div>
    </main>
  );
}
