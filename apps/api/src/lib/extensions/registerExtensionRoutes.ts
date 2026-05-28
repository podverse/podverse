import type { IRouter } from 'express';

/**
 * Reserved for future in-app extension HTTP routes.
 * Prometheus metrics are served by the extension-prometheus sidecar only (OTLP from this process).
 */
export function registerExtensionRoutes(_router: IRouter, _apiVersionBasePath: string): void {
  // no-op (v1)
}
