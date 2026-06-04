/**
 * Runs once when the Next.js server starts. Warms runtime config and custom themes in
 * memory so requests read from the store without blocking on network I/O.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { buildObservabilityConfigFromEnv } = await import('@podverse/observability/config');
  const { initObservability, registerNextHttpServerInstrumentation } =
    await import('@podverse/observability');

  initObservability(buildObservabilityConfigFromEnv(process.env));
  registerNextHttpServerInstrumentation();

  const { bootstrapManagementWebExtensions, registerManagementWebGracefulShutdownHandlers } =
    await import('./src/lib/extensions/bootstrapManagementWebExtensions');
  bootstrapManagementWebExtensions();
  registerManagementWebGracefulShutdownHandlers();

  const { warmManagementWebRuntimeConfigAtStartup } =
    await import('./src/config/runtime-config-bootstrap.server');
  await warmManagementWebRuntimeConfigAtStartup();
}
