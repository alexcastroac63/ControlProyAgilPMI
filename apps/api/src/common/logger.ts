export function logActivity(scope: string, message: string, metadata?: unknown) {
  const payload = metadata ? ` ${JSON.stringify(metadata)}` : "";
  console.info(`[${new Date().toISOString()}] [${scope}] ${message}${payload}`);
}
