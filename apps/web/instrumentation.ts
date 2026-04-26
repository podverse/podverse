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
  try {
    const { fetchWebRuntimeConfigFromSidecar } = await import('./src/config/runtime-config.server');
    const { setRuntimeConfig } = await import('./src/config/runtime-config-store');
    const runtimeConfig = await fetchWebRuntimeConfigFromSidecar();
    setRuntimeConfig(runtimeConfig);
  } catch {
    // Sidecar unreachable at startup; request-time layout hydration/fallback handles this.
  }
}
