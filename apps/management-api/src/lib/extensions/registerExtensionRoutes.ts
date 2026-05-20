import type { IRouter } from 'express';

import type { PrometheusExporter } from './prometheus/prometheusExporter.js';
import { registerPrometheusRoutes } from './prometheus/registerPrometheusRoutes.js';

/** Subset of `config.extensions` used when registering extension routes. */
export type ExtensionRoutesConfig = {
  prometheus: {
    enabled: boolean;
  };
};

export type RegisterExtensionRoutesRuntime = {
  prometheus?: PrometheusExporter;
};

/**
 * Registers versioned routes for enabled extension services (below feature routers in app bootstrap).
 */
export function registerExtensionRoutes(
  router: IRouter,
  apiVersionBasePath: string,
  extensions: ExtensionRoutesConfig,
  runtime: RegisterExtensionRoutesRuntime = {}
): void {
  if (extensions.prometheus.enabled && runtime.prometheus) {
    registerPrometheusRoutes(router, apiVersionBasePath, runtime.prometheus.endpoint);
  }
}
