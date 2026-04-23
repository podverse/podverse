/**
 * Runs once when the Next.js server starts. Fetches runtime config from the sidecar
 * and stores it so the first request does not block on the sidecar.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }
  if (process.env.RUNTIME_CONFIG_URL === undefined || process.env.RUNTIME_CONFIG_URL === '') {
    return;
  }
  const { fetchManagementWebRuntimeConfigFromSidecar } =
    await import('./src/config/runtime-config.server');
  const { setRuntimeConfig } = await import('./src/config/runtime-config-store');
  const runtimeConfig = await fetchManagementWebRuntimeConfigFromSidecar();
  setRuntimeConfig(runtimeConfig);
}
