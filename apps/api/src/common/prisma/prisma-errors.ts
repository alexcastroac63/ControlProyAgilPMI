export function isDatabaseUnavailable(error: unknown) {
  // Permite que el modo desarrollo responda con datos demo cuando PostgreSQL no esta activo.
  const candidate = error as { code?: string; name?: string; message?: string };
  return (
    candidate?.code === "P1001" ||
    candidate?.name === "PrismaClientInitializationError" ||
    String(candidate?.message ?? "").includes("Can't reach database server")
  );
}
