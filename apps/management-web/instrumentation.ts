/**
 * Runs once when the Next.js server instance starts. Warms the runtime-config
 * cache so the first user request does not block on the sidecar.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  if (!process.env.RUNTIME_CONFIG_URL) {
    return;
  }
  const { fetchManagementWebRuntimeConfigFromSidecar } =
    await import('./src/config/runtime-config.server');
  await fetchManagementWebRuntimeConfigFromSidecar();
}
