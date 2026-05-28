/** Same prefix as extension-metrics HTTP middleware (`/extensions/` scrape and health). */
const EXTENSION_METRICS_PATH_PREFIX = '/extensions/';

export const shouldSkipObservabilityResponseHeaders = (path: string): boolean => {
  if (path.startsWith(EXTENSION_METRICS_PATH_PREFIX)) {
    return true;
  }
  return path === '/health' || path.endsWith('/health') || path.endsWith('/health/ready');
};
