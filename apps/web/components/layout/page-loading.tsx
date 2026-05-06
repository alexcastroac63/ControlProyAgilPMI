"use client";

import { Card } from "@devhub/ui";

export function PageLoading({ message = "Cargando datos del sistema..." }: { message?: string }) {
  return (
    <Card className="grid min-h-[360px] place-items-center text-center">
      <div>
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-300" />
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </Card>
  );
}
