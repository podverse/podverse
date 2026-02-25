export async function register() {
  // Only run on Node.js server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { fetchWebRuntimeConfigFromSidecar } = await import('./config/runtime-config.server');
    const { setRuntimeConfig } = await import('./config/runtime-config-store');

    const runtimeConfig = await fetchWebRuntimeConfigFromSidecar();
    setRuntimeConfig(runtimeConfig);
  }
}
